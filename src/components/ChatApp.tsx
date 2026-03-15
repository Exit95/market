import React, { useState, useEffect, useRef } from 'react';
import { Search, Info, ShieldAlert, Paperclip, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import * as Ably from 'ably';

type User = { id: string; firstName: string; lastName: string; idVerified?: boolean };
type Listing = { id: string; title: string; price: number; status: string; images: { url: string }[] };
type Message = { id?: string; body: string; createdAt: Date | string; senderId: string };
type Conversation = { id: string; listing: Listing; buyerId: string; sellerId: string; buyer: User; seller: User; messages: Message[] };

export default function ChatApp({ currentUserId }: { currentUserId: string }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [fraudWarning, setFraudWarning] = useState('');
    const [showBanner, setShowBanner] = useState(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<Ably.RealtimeChannel | null>(null);
    const ablyRef = useRef<Ably.Realtime | null>(null);

    // 1. Fetch conversations
    useEffect(() => {
        fetch('/api/conversations')
            .then(res => res.json())
            .then(data => {
                setConversations(data);
                if (data.length > 0) setActiveConvId(data[0].id);
            })
            .catch(err => console.error("Error fetching conversations:", err));
    }, []);

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

    // Client-side scam scanner
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputText(val);

        const lowerVal = val.toLowerCase();
        const scamKeywords = ['paypal freunde', 'family & friends', 'vorkasse', 'western union', 'crypto', 'whatsapp', 't.me'];
        if (scamKeywords.some(kw => lowerVal.includes(kw))) {
            setFraudWarning("⚠️ Achtung: Bitte bleibe für die sichere Abwicklung auf der Plattform. Der Wechsel zu anderen Messengern oder riskanten Zahlungsarten gefährdet deinen Käuferschutz.");
        } else {
            setFraudWarning('');
        }
    };

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

    return (
        <div className="flex h-full w-full bg-white divide-x divide-slate-200">
            {/* Sidebar */}
            <aside className="w-80 flex flex-col flex-shrink-0 bg-slate-50 relative z-10 hidden md:flex">
                <div className="p-5 border-b border-slate-200 bg-white">
                    <h2 className="text-lg font-bold text-slate-800">Meine Chats</h2>
                </div>
                <div className="p-4 border-b border-slate-200">
                    <div className="relative bg-white border border-slate-300 rounded-lg shadow-sm flex items-center px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-[var(--ehren-primary)] focus-within:border-[var(--ehren-primary)]">
                        <Search className="w-4 h-4 text-slate-400 mr-2" />
                        <input type="text" placeholder="Chats durchsuchen..." className="w-full bg-transparent outline-none" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto w-full">
                    {conversations.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500">Keine aktiven Chats.</div>
                    ) : (
                        conversations.map(conv => {
                            const partner = conv.buyerId === currentUserId ? conv.seller : conv.buyer;
                            const isActive = conv.id === activeConvId;
                            const lastMsg = conv.messages?.[0]; // ordered desc
                            return (
                                <div 
                                    key={conv.id} 
                                    onClick={() => setActiveConvId(conv.id)}
                                    className={`flex items-start gap-3 p-4 border-b border-slate-100 cursor-pointer transition-colors ${isActive ? 'bg-[var(--ehren-blue)]/5 border-l-4 border-l-[var(--ehren-blue)]' : 'hover:bg-slate-100 border-l-4 border-l-transparent'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 flex items-center justify-center font-bold uppercase shrink-0">
                                        {partner?.firstName?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-semibold text-sm truncate text-slate-800">{partner?.firstName} {partner?.lastName?.charAt(0)}.</span>
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">{lastMsg?.body || 'Noch keine Nachrichten'}</div>
                                        <div className="text-[10px] uppercase font-bold text-[var(--ehren-primary)] mt-1 truncate">{conv.listing.title}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* Chat Area */}
            {activeConvId && otherUser && activeConv ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 shadow-sm z-10 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--ehren-accent)] to-[var(--ehren-blue)] text-white flex items-center justify-center font-bold">
                                {otherUser.firstName.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {otherUser.firstName} {otherUser.lastName?.charAt(0)}.
                                    {(activeConv?.seller.idVerified || activeConv?.buyer.idVerified) && (
                                        <ShieldCheck className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                                </div>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            {activeConv.listing.images?.[0]?.url ? (
                                <img src={activeConv.listing.images[0].url} alt="" className="w-10 h-10 object-cover rounded shadow-sm" />
                            ) : (
                                <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-xs">📦</div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold max-w-[150px] truncate">{activeConv.listing.title}</span>
                                <span className="text-sm font-black text-[var(--ehren-primary)]">{activeConv.listing.price.toLocaleString('de-DE')} €</span>
                            </div>
                        </div>
                    </div>

                    {/* Fraud Banner */}
                    {showBanner && (
                        <div className="bg-amber-50 border-b border-amber-200 p-3 flex gap-3 text-xs text-amber-800 relative shadow-sm">
                            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600" />
                            <div className="flex-1 pr-6 leading-relaxed">
                                <strong>Ehren-Deal Sicherheitscheck:</strong> Zahle niemals per "PayPal Freunde", Krypto oder auf ausländische Bankkonten. 
                                Nutze für diesen Deal ausschließlich den integrierten Handschlag-Käuferschutz.
                            </div>
                            <button onClick={() => setShowBanner(false)} className="absolute top-3 right-3 text-amber-400 hover:text-amber-600">✕</button>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-[#f8fafc]">
                        {messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUserId;
                            const d = new Date(msg.createdAt);
                            const timeStr = isNaN(d.getTime()) ? '' : `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                            return (
                                <div key={msg.id || idx} className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                    <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center font-bold text-xs">
                                        {isMe ? 'Du' : otherUser?.firstName?.charAt(0)}
                                    </div>
                                    <div className={`p-3 rounded-2xl relative shadow-sm text-sm ${isMe ? 'bg-[var(--ehren-primary)] text-white rounded-tr-sm border-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                        <span className={`block text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-slate-400'}`}>{timeStr}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Treuhand CTA */}
                    <div className="bg-green-50 border-y border-green-200 p-3 flex items-center justify-between text-sm px-6">
                        <div className="flex items-center gap-2 text-green-800 font-semibold">
                            <CheckCircle2 className="w-5 h-5" />
                            Der Verkäufer ist für lokale Ehren-Deals bereit.
                        </div>
                        <button className="bg-white border shadow-sm border-green-200 text-green-700 px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-green-100 transition-colors">
                            Handschlag anbieten
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                        {fraudWarning && (
                            <div className="text-xs text-red-600 font-medium mb-3 flex items-center gap-1.5 bg-red-50 p-2 rounded border border-red-100">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                {fraudWarning}
                            </div>
                        )}
                        <div className="flex items-end gap-3 max-w-4xl mx-auto">
                            <button className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <textarea
                                value={inputText}
                                onChange={handleInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                                }}
                                placeholder="Schreibe eine sichere Nachricht..."
                                className="flex-1 max-h-32 min-h-[44px] bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--ehren-primary)] resize-none"
                                rows={1}
                            />
                            <button 
                                onClick={sendMessage}
                                disabled={!inputText.trim()}
                                className="p-3 bg-[var(--ehren-primary)] text-white rounded-xl shadow-sm hover:shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="text-[10px] text-center text-slate-400 mt-3 font-medium flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Deine Nachrichten werden durch den Ehren-Deal Betrugsfilter geschützt.</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-[#f8fafc] flex flex-col items-center justify-center text-slate-400">
                    <Info className="w-12 h-12 mb-4 opacity-50" />
                    <p>Wähle einen Chat aus, um eine Nachricht zu senden.</p>
                </div>
            )}
        </div>
    );
}
