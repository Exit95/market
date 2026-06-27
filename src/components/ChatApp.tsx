import React, { useState, useEffect, useRef } from 'react';
import * as Ably from 'ably';

type User = { id: string; firstName: string; lastName: string; idVerified?: boolean };
type Listing = { id: string; title: string; price: number; status: string; images: { url: string }[] };
type Message = { id?: string; body: string; createdAt: Date | string; senderId: string };
type Conversation = { id: string; listing: Listing; buyerId: string; sellerId: string; buyer: User; seller: User; messages: Message[] };

export default function ChatApp({ currentUserId, listingId }: { currentUserId: string; listingId?: string }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [fraudWarning, setFraudWarning] = useState('');
    const [showBanner, setShowBanner] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSidebar, setShowSidebar] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<Ably.RealtimeChannel | null>(null);
    const ablyRef = useRef<Ably.Realtime | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1. Fetch conversations + auto-create if listingId provided
    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/conversations');
                const data: Conversation[] = await res.json();

                if (listingId) {
                    const existing = data.find(c => c.listing.id === listingId);
                    if (existing) {
                        setConversations(data);
                        setActiveConvId(existing.id);
                        setShowSidebar(false);
                        return;
                    }

                    try {
                        const createRes = await fetch('/api/conversations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ listingId }),
                        });
                        if (createRes.ok) {
                            const newConv = await createRes.json();
                            const refreshRes = await fetch('/api/conversations');
                            const refreshedData: Conversation[] = await refreshRes.json();
                            setConversations(refreshedData);
                            const found = refreshedData.find(c => c.listing.id === listingId);
                            setActiveConvId(found?.id || newConv.id);
                            setShowSidebar(false);
                            return;
                        }
                    } catch (err) {
                        console.error("Error creating conversation:", err);
                    }
                }

                setConversations(data);
                if (data.length > 0) setActiveConvId(data[0].id);
            } catch (err) {
                console.error("Error fetching conversations:", err);
            }
        };
        init();
    }, [listingId]);

    const activeConv = conversations.find(c => c.id === activeConvId);
    const otherUser = activeConv ? (activeConv.buyer.id === currentUserId ? activeConv.seller : activeConv.buyer) : null;

    // 2. Fetch messages & Connect to Ably when active conversation changes
    useEffect(() => {
        if (!activeConvId) return;

        fetch(`/api/conversations/${activeConvId}/messages`)
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error("Fetch messages failed:", err));

        const ably = new Ably.Realtime({
            authUrl: `/api/conversations/${activeConvId}/ably`,
            authMethod: 'GET'
        });
        ablyRef.current = ably;

        const channel = ably.channels.get(`conversation:${activeConvId}`);
        channelRef.current = channel;

        channel.subscribe('message', (messageData) => {
            const newMsg = messageData.data as Message;
            if (newMsg.senderId !== currentUserId) {
                setMessages(prev => [...prev, newMsg]);
            }
        });

        return () => {
            channel.unsubscribe();
            ably.close();
        };
    }, [activeConvId, currentUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // KI-gestützter Echtzeit-Scan mit Debounce (500ms)
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputText(val);

        const lowerVal = val.toLowerCase();
        const instantKeywords = ['paypal freunde', 'family & friends', 'vorkasse', 'western union'];
        if (instantKeywords.some(kw => lowerVal.includes(kw))) {
            setFraudWarning('Achtung: Bitte bleibe für die sichere Abwicklung auf der Plattform. Der Wechsel zu riskanten Zahlungsarten gefährdet deinen Käuferschutz.');
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (val.trim().length < 3) {
            setFraudWarning('');
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch('/api/detect/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: val }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setFraudWarning(data.warning ?? '');
                }
            } catch {
                // Netzwerkfehler – kein Warning anzeigen
            }
        }, 500);
    };

    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    const sendMessage = async () => {
        if (!inputText.trim() || !activeConvId) return;

        const body = inputText.trim();
        setInputText('');
        setFraudWarning('');

        const tempMsg: Message = { body, createdAt: new Date(), senderId: currentUserId };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`Fehler beim Senden: ${err.error || 'Server error'}`);
            }
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery.trim()) return true;
        const partner = conv.buyerId === currentUserId ? conv.seller : conv.buyer;
        const q = searchQuery.toLowerCase();
        return (
            partner?.firstName?.toLowerCase().includes(q) ||
            partner?.lastName?.toLowerCase().includes(q) ||
            conv.listing.title.toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex h-full w-full bg-background">
            {/* ── Sidebar ── */}
            <aside className={`w-full md:w-[340px] flex flex-col flex-shrink-0 border-r border-border ${activeConvId && !showSidebar ? 'hidden md:flex' : 'flex'}`}>
                {/* Sidebar Header */}
                <div className="p-5 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-text">Nachrichten</h2>
                        <span className="text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded-full">
                            {conversations.length} {conversations.length === 1 ? 'Chat' : 'Chats'}
                        </span>
                    </div>
                    <div className="relative flex items-center border border-border rounded-lg bg-surface px-3 py-2">
                        <svg className="w-4 h-4 mr-2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Chats durchsuchen..."
                            className="bg-transparent outline-none w-full text-text text-sm"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-text-muted text-sm">
                            {searchQuery ? 'Keine Chats gefunden.' : 'Keine aktiven Unterhaltungen.'}
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const partner = conv.buyerId === currentUserId ? conv.seller : conv.buyer;
                            const isActive = conv.id === activeConvId;
                            const lastMsg = conv.messages?.[0];
                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => { setActiveConvId(conv.id); setShowSidebar(false); }}
                                    className={`cursor-pointer transition-all duration-200 flex items-start gap-3 px-5 py-4 border-b border-border hover:bg-primary-light/30 ${isActive ? 'bg-primary-light/50 border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'}`}
                                >
                                    <div className="w-[42px] h-[42px] rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {partner?.firstName?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-medium text-sm text-text truncate">
                                                {partner?.firstName} {partner?.lastName?.charAt(0)}.
                                                {partner?.idVerified && (
                                                    <svg className="inline-block w-3.5 h-3.5 ml-1 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                                )}
                                            </span>
                                        </div>
                                        <div className="truncate text-xs text-text-muted">{lastMsg?.body || 'Noch keine Nachrichten'}</div>
                                        <div className="truncate text-[0.65rem] text-primary font-medium mt-1">{conv.listing.title}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className="flex items-center justify-center gap-1.5 py-3 px-5 border-t border-border">
                    <svg className="w-3 h-3 text-success opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span className="text-[0.6rem] text-text-muted uppercase tracking-wider">Ende-zu-Ende verschlüsselt</span>
                </div>
            </aside>

            {/* ── Chat Area ── */}
            {activeConvId && otherUser && activeConv ? (
                <div className={`flex-1 flex flex-col h-full overflow-hidden bg-background ${!showSidebar ? 'flex' : 'hidden md:flex'}`}>
                    {/* Chat Header */}
                    <div className="flex items-center justify-between shrink-0 px-5 py-3 border-b border-border bg-surface">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowSidebar(true)} className="md:hidden p-1 text-primary">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M15 19l-7-7 7-7"/></svg>
                            </button>
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                                {otherUser.firstName.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 font-medium text-text text-sm">
                                    {otherUser.firstName} {otherUser.lastName?.charAt(0)}.
                                    {otherUser.idVerified && (
                                        <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[0.7rem] text-text-muted">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>
                                    Online
                                </div>
                            </div>
                        </div>
                        {/* Listing Preview */}
                        <div className="hidden sm:flex items-center gap-3 px-3 py-2 border border-border rounded-lg bg-background">
                            {activeConv.listing.images?.[0]?.url ? (
                                <img src={activeConv.listing.images[0].url} alt="" className="w-10 h-10 object-cover rounded" />
                            ) : (
                                <div className="w-10 h-10 bg-primary-light flex items-center justify-center rounded">
                                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>
                            )}
                            <div>
                                <div className="truncate max-w-[150px] text-xs font-medium text-text">{activeConv.listing.title}</div>
                                <div className="text-sm font-bold text-primary">{activeConv.listing.price.toLocaleString('de-DE')} EUR</div>
                            </div>
                        </div>
                    </div>

                    {/* Security Banner */}
                    {showBanner && (
                        <div className="relative shrink-0 bg-success-light border-b border-success/20 px-5 py-2.5 flex gap-2.5 items-start">
                            <svg className="w-4 h-4 shrink-0 mt-0.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <div className="flex-1 pr-6 text-xs text-text-secondary leading-relaxed">
                                <strong className="text-text">Sicherheitshinweis:</strong> Zahle niemals per &quot;PayPal Freunde&quot;, Krypto oder auf ausländische Bankkonten. Nutze ausschließlich den integrierten Handschlag-Käuferschutz.
                            </div>
                            <button onClick={() => setShowBanner(false)} className="absolute top-2.5 right-3 text-text-muted hover:text-text text-sm bg-transparent border-none cursor-pointer">x</button>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-5">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center flex-1 text-text-muted">
                                <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                <span className="text-sm">Starte die Unterhaltung</span>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUserId;
                            const d = new Date(msg.createdAt);
                            const timeStr = isNaN(d.getTime()) ? '' : `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                            return (
                                <div key={msg.id || idx} className={`flex gap-2.5 max-w-[85%] sm:max-w-[70%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[0.65rem] font-semibold flex-shrink-0 ${isMe ? 'bg-primary-light text-primary' : 'bg-border text-text-muted'}`}>
                                        {isMe ? 'Du' : otherUser?.firstName?.charAt(0)}
                                    </div>
                                    <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${isMe ? 'bg-primary text-white rounded-[8px_8px_0_8px]' : 'bg-surface border border-border text-text rounded-[8px_8px_8px_0]'}`}>
                                        <p className="whitespace-pre-wrap break-words m-0">{msg.body}</p>
                                        <span className="block text-[0.6rem] mt-1 text-right opacity-60">{timeStr}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Handschlag CTA */}
                    <div className="shrink-0 border-t border-success/20 border-b border-b-success/20 bg-success-light px-5 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-success text-xs font-medium uppercase tracking-wider">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Verkäufer ist für lokale Ehren-Deals bereit
                        </div>
                        <button
                            onClick={() => {
                                if (activeConv) {
                                    window.location.href = `/checkout/${activeConv.listing.id}`;
                                }
                            }}
                            className="border border-success/30 bg-transparent text-success px-3.5 py-1 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-success hover:text-white transition-all rounded">
                            Handschlag anbieten
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 px-5 py-4 border-t border-border">
                        {fraudWarning && (
                            <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-danger/5 border border-danger/20 rounded text-xs text-danger">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                {fraudWarning}
                            </div>
                        )}
                        <div className="flex items-end gap-3">
                            <button className="p-2 text-text-muted hover:text-primary bg-transparent border-none cursor-pointer transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            </button>
                            <textarea
                                value={inputText}
                                onChange={handleInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                                }}
                                placeholder="Nachricht schreiben..."
                                rows={1}
                                className="flex-1 max-h-[120px] min-h-[42px] resize-none bg-surface border border-border text-text px-3.5 py-2.5 text-sm outline-none rounded-lg focus:border-primary transition-colors"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputText.trim()}
                                className={`p-2.5 rounded-lg border-none transition-all ${inputText.trim() ? 'bg-primary text-white cursor-pointer hover:bg-primary/90' : 'bg-primary/10 text-text-muted cursor-default'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-2.5">
                            <svg className="w-3 h-3 text-success opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span className="text-[0.55rem] text-text-muted uppercase tracking-wider">Geschützt durch den Ehren-Deal Betrugsfilter</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`flex-1 flex-col items-center justify-center bg-background ${!showSidebar ? 'flex' : 'hidden md:flex'}`}>
                    <svg className="w-14 h-14 mb-4 text-primary opacity-15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p className="text-text-muted text-sm">Wähle einen Chat aus, um eine Nachricht zu senden.</p>
                </div>
            )}
        </div>
    );
}
