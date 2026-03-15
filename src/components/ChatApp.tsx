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

                // If listingId is provided, create/find the conversation for that listing
                if (listingId) {
                    // Check if we already have a conversation for this listing
                    const existing = data.find(c => c.listing.id === listingId);
                    if (existing) {
                        setConversations(data);
                        setActiveConvId(existing.id);
                        setShowSidebar(false);
                        return;
                    }

                    // Create a new conversation
                    try {
                        const createRes = await fetch('/api/conversations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ listingId }),
                        });
                        if (createRes.ok) {
                            const newConv = await createRes.json();
                            // Re-fetch full conversation list to get complete data
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

        // Fetch history
        fetch(`/api/conversations/${activeConvId}/messages`)
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error("Fetch messages failed:", err));

        // Setup Ably
        const ably = new Ably.Realtime({
            authUrl: `/api/conversations/${activeConvId}/ably`,
            authMethod: 'GET'
        });
        ablyRef.current = ably;

        const channel = ably.channels.get(`conversation:${activeConvId}`);
        channelRef.current = channel;

        channel.subscribe('message', (messageData) => {
            const newMsg = messageData.data as Message;
            // Only append if it's from the other person (we optimistically add our own)
            if (newMsg.senderId !== currentUserId) {
                setMessages(prev => [...prev, newMsg]);
            }
        });

        return () => {
            channel.unsubscribe();
            ably.close();
        };
    }, [activeConvId, currentUserId]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // KI-gestützter Echtzeit-Scan mit Debounce (500ms)
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputText(val);

        // Sofortige lokale Keywords-Prüfung (instant feedback)
        const lowerVal = val.toLowerCase();
        const instantKeywords = ['paypal freunde', 'family & friends', 'vorkasse', 'western union'];
        if (instantKeywords.some(kw => lowerVal.includes(kw))) {
            setFraudWarning('Achtung: Bitte bleibe für die sichere Abwicklung auf der Plattform. Der Wechsel zu riskanten Zahlungsarten gefährdet deinen Käuferschutz.');
            return;
        }

        // Debounced KI-Scan via API (500ms Verzögerung)
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

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    const sendMessage = async () => {
        if (!inputText.trim() || !activeConvId) return;

        const body = inputText.trim();
        setInputText('');
        setFraudWarning('');

        // Optimistic UI update
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
                // Revert optimistic update gracefully in production
            }
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    // Filter conversations by search
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
        <div className="flex h-full w-full" style={{ background: '#0a0a0b' }}>
            {/* ── Sidebar ── */}
            <aside className={`w-full md:w-[340px] flex flex-col flex-shrink-0 border-r border-[#e8e4de]/[.12] ${activeConvId && !showSidebar ? 'hidden md:flex' : 'flex'}`}>
                {/* Sidebar Header */}
                <div className="p-5 border-b border-[#e8e4de]/[.12]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 300, fontSize: '1.5rem', color: '#e8e4de' }}>
                            Nachrichten
                        </h2>
                        <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '.65rem', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#c8973a', padding: '2px 8px', border: '1px solid rgba(200,151,58,.25)' }}>
                            {conversations.length} {conversations.length === 1 ? 'Chat' : 'Chats'}
                        </span>
                    </div>
                    <div className="relative flex items-center" style={{ border: '1px solid rgba(232,228,222,.15)', background: 'rgba(232,228,222,.04)', padding: '8px 12px' }}>
                        <svg className="w-4 h-4 mr-2" style={{ color: '#6b6b6b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Chats durchsuchen..."
                            style={{ background: 'transparent', outline: 'none', width: '100%', color: '#e8e4de', fontSize: '.85rem', fontFamily: 'Barlow, sans-serif' }}
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center" style={{ color: '#6b6b6b', fontSize: '.85rem', fontFamily: 'Barlow, sans-serif' }}>
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
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 20px',
                                        borderBottom: '1px solid rgba(232,228,222,.08)',
                                        borderLeft: isActive ? '3px solid #c8973a' : '3px solid transparent',
                                        background: isActive ? 'rgba(200,151,58,.06)' : 'transparent',
                                    }}
                                    onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = 'rgba(232,228,222,.04)'); }}
                                    onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'transparent'); }}
                                >
                                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #c8973a, #a37a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0b', fontWeight: 700, fontSize: '.85rem', flexShrink: 0, fontFamily: '"Barlow Condensed", sans-serif' }}>
                                        {partner?.firstName?.charAt(0) || '?'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="flex justify-between items-center" style={{ marginBottom: 2 }}>
                                            <span style={{ fontWeight: 500, fontSize: '.85rem', color: '#e8e4de', fontFamily: 'Barlow, sans-serif' }} className="truncate">
                                                {partner?.firstName} {partner?.lastName?.charAt(0)}.
                                                {partner?.idVerified && (
                                                    <svg className="inline-block w-3.5 h-3.5 ml-1" style={{ color: '#52b788' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                                )}
                                            </span>
                                        </div>
                                        <div className="truncate" style={{ fontSize: '.75rem', color: '#6b6b6b', fontFamily: 'Barlow, sans-serif' }}>{lastMsg?.body || 'Noch keine Nachrichten'}</div>
                                        <div className="truncate" style={{ fontSize: '.6rem', color: '#c8973a', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' as const, letterSpacing: '.06em', fontWeight: 500, marginTop: 4 }}>{conv.listing.title}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sidebar Footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(232,228,222,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <svg className="w-3 h-3" style={{ color: '#c8973a', opacity: .5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span style={{ fontSize: '.6rem', color: '#6b6b6b', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' as const, letterSpacing: '.1em' }}>Ende-zu-Ende verschlusselt</span>
                </div>
            </aside>

            {/* ── Chat Area ── */}
            {activeConvId && otherUser && activeConv ? (
                <div className={`flex-1 flex flex-col h-full overflow-hidden ${!showSidebar ? 'flex' : 'hidden md:flex'}`} style={{ background: '#0a0a0b' }}>
                    {/* Chat Header */}
                    <div className="flex items-center justify-between shrink-0" style={{ padding: '12px 20px', borderBottom: '1px solid rgba(232,228,222,.12)', background: 'rgba(21,21,22,.8)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex items-center gap-3">
                            {/* Mobile back button */}
                            <button onClick={() => setShowSidebar(true)} className="md:hidden p-1" style={{ color: '#c8973a' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M15 19l-7-7 7-7"/></svg>
                            </button>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #c8973a, #a37a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0b', fontWeight: 700, fontSize: '.85rem', fontFamily: '"Barlow Condensed", sans-serif' }}>
                                {otherUser.firstName.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2" style={{ fontWeight: 500, color: '#e8e4de', fontSize: '.9rem', fontFamily: 'Barlow, sans-serif' }}>
                                    {otherUser.firstName} {otherUser.lastName?.charAt(0)}.
                                    {(otherUser.idVerified) && (
                                        <svg className="w-4 h-4" style={{ color: '#52b788' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5" style={{ fontSize: '.7rem', color: '#6b6b6b', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#52b788', display: 'inline-block' }}></span>
                                    Online
                                </div>
                            </div>
                        </div>
                        {/* Listing Preview */}
                        <div className="hidden sm:flex items-center gap-3" style={{ padding: '8px 12px', border: '1px solid rgba(232,228,222,.1)', background: 'rgba(232,228,222,.03)' }}>
                            {activeConv.listing.images?.[0]?.url ? (
                                <img src={activeConv.listing.images[0].url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 2 }} />
                            ) : (
                                <div style={{ width: 40, height: 40, background: '#151516', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg className="w-5 h-5" style={{ color: '#6b6b6b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>
                            )}
                            <div>
                                <div className="truncate" style={{ maxWidth: 150, fontSize: '.75rem', fontWeight: 500, color: '#e8e4de', fontFamily: 'Barlow, sans-serif' }}>{activeConv.listing.title}</div>
                                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#c8973a', fontFamily: '"Cormorant Garamond", serif' }}>{activeConv.listing.price.toLocaleString('de-DE')} EUR</div>
                            </div>
                        </div>
                    </div>

                    {/* Security Banner */}
                    {showBanner && (
                        <div className="relative shrink-0" style={{ background: 'rgba(200,151,58,.06)', borderBottom: '1px solid rgba(200,151,58,.15)', padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#c8973a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <div style={{ flex: 1, paddingRight: 24, fontSize: '.75rem', color: '#e8e4de', opacity: .75, fontFamily: 'Barlow, sans-serif', lineHeight: 1.5 }}>
                                <strong style={{ color: '#c8973a' }}>Sicherheitshinweis:</strong> Zahle niemals per "PayPal Freunde", Krypto oder auf auslandische Bankkonten. Nutze ausschliesslich den integrierten Handschlag-Kauferschutz.
                            </div>
                            <button onClick={() => setShowBanner(false)} style={{ position: 'absolute', top: 10, right: 12, color: 'rgba(200,151,58,.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem' }}>x</button>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto flex flex-col gap-3" style={{ padding: '20px' }}>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center flex-1" style={{ color: '#6b6b6b' }}>
                                <svg className="w-10 h-10 mb-3" style={{ opacity: .3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                <span style={{ fontSize: '.8rem', fontFamily: 'Barlow, sans-serif' }}>Starte die Unterhaltung</span>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUserId;
                            const d = new Date(msg.createdAt);
                            const timeStr = isNaN(d.getTime()) ? '' : `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                            return (
                                <div key={msg.id || idx} className={`flex gap-2.5 max-w-[85%] sm:max-w-[70%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: isMe ? 'rgba(200,151,58,.15)' : 'rgba(232,228,222,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 600, color: isMe ? '#c8973a' : '#6b6b6b', flexShrink: 0, fontFamily: '"Barlow Condensed", sans-serif' }}>
                                        {isMe ? 'Du' : otherUser?.firstName?.charAt(0)}
                                    </div>
                                    <div style={{
                                        padding: '10px 14px',
                                        fontSize: '.85rem',
                                        fontFamily: 'Barlow, sans-serif',
                                        lineHeight: 1.5,
                                        ...(isMe ? {
                                            background: '#c8973a',
                                            color: '#0a0a0b',
                                            borderRadius: '4px 4px 0 4px',
                                        } : {
                                            background: '#151516',
                                            color: '#e8e4de',
                                            border: '1px solid rgba(232,228,222,.1)',
                                            borderRadius: '4px 4px 4px 0',
                                        })
                                    }}>
                                        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{msg.body}</p>
                                        <span style={{ display: 'block', fontSize: '.6rem', marginTop: 4, textAlign: 'right', opacity: .6 }}>{timeStr}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Handschlag CTA */}
                    <div className="shrink-0" style={{ borderTop: '1px solid rgba(82,183,136,.15)', borderBottom: '1px solid rgba(82,183,136,.15)', background: 'rgba(82,183,136,.04)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="flex items-center gap-2" style={{ color: '#52b788', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '.75rem', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Verkaufer ist fur lokale Ehren-Deals bereit
                        </div>
                        <button
                            onClick={() => {
                                if (activeConv) {
                                    window.location.href = `/checkout/${activeConv.listing.id}`;
                                }
                            }}
                            style={{ border: '1px solid rgba(82,183,136,.3)', background: 'transparent', color: '#52b788', padding: '5px 14px', fontSize: '.65rem', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.08em', cursor: 'pointer', transition: 'all .2s' }}>
                            Handschlag anbieten
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0" style={{ padding: '16px 20px', borderTop: '1px solid rgba(232,228,222,.1)' }}>
                        {fraudWarning && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(196,92,92,.08)', border: '1px solid rgba(196,92,92,.2)', fontSize: '.75rem', color: '#c45c5c', fontFamily: 'Barlow, sans-serif' }}>
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                {fraudWarning}
                            </div>
                        )}
                        <div className="flex items-end gap-3">
                            <button style={{ padding: 8, color: '#6b6b6b', background: 'none', border: 'none', cursor: 'pointer', transition: 'color .2s' }}>
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
                                style={{
                                    flex: 1, maxHeight: 120, minHeight: 42, resize: 'none',
                                    background: 'rgba(232,228,222,.05)', border: '1px solid rgba(232,228,222,.12)',
                                    color: '#e8e4de', padding: '10px 14px', fontSize: '.85rem', fontFamily: 'Barlow, sans-serif',
                                    outline: 'none', borderRadius: 4,
                                }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputText.trim()}
                                style={{
                                    padding: '10px 14px', background: inputText.trim() ? '#c8973a' : 'rgba(200,151,58,.2)',
                                    color: inputText.trim() ? '#0a0a0b' : '#6b6b6b', border: 'none', cursor: inputText.trim() ? 'pointer' : 'default',
                                    transition: 'all .2s', borderRadius: 4,
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                            <svg className="w-3 h-3" style={{ color: '#c8973a', opacity: .4 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span style={{ fontSize: '.55rem', color: '#6b6b6b', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' as const, letterSpacing: '.1em' }}>Geschutzt durch den Ehren-Deal Betrugsfilter</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`flex-1 flex-col items-center justify-center ${!showSidebar ? 'flex' : 'hidden md:flex'}`} style={{ background: '#0a0a0b' }}>
                    <svg className="w-14 h-14 mb-4" style={{ color: '#c8973a', opacity: .15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p style={{ color: '#6b6b6b', fontSize: '.85rem', fontFamily: 'Barlow, sans-serif' }}>Wahle einen Chat aus, um eine Nachricht zu senden.</p>
                </div>
            )}
        </div>
    );
}
