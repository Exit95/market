import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShieldCheck, Camera, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

type Props = {
    dealId: string;
    currentUserId: string;
    role: 'buyer' | 'seller';
    initialStatus: string;
};

export default function HandshakeApp({ dealId, role, initialStatus }: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [token, setToken] = useState('');
    const [expiresAt, setExpiresAt] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    // For Buyer
    useEffect(() => {
        if (role === 'buyer' && status === 'PENDING') {
            generateToken();
        }
    }, [role, status]);

    // Timer for QR code expiration
    useEffect(() => {
        if (!expiresAt) return;
        const interval = setInterval(() => {
            const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            setTimeLeft(left);
            if (left === 0 && !success) {
                generateToken(); // Auto-refresh token
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, success]);

    const generateToken = async () => {
        try {
            const res = await fetch(`/api/deal/${dealId}/handshake`);
            if (res.ok) {
                const data = await res.json();
                setToken(data.token);
                setExpiresAt(data.expiresAt);
                setError('');
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to generate Handshake token.');
            }
        } catch (e) {
            setError('Netzwerkfehler');
        }
    };

    // For Seller Scanner
    useEffect(() => {
        if (role === 'seller' && scanning && status === 'PENDING') {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scanner.render(async (decodedText) => {
                scanner.clear();
                setScanning(false);
                verifyToken(decodedText);
            }, (error) => {
                // Ignore ongoing scan errors
            });

            return () => {
                scanner.clear().catch(e => console.error("Failed to clear scanner", e));
            };
        }
    }, [scanning, role, status]);

    const verifyToken = async (scannedToken: string) => {
        try {
            const res = await fetch(`/api/deal/${dealId}/handshake`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: scannedToken })
            });

            if (res.ok) {
                setSuccess(true);
                setStatus('VERIFIED');
            } else {
                const err = await res.json();
                setError(err.error || 'Verifizierung fehlgeschlagen.');
            }
        } catch (e) {
            setError('Netzwerkfehler');
        }
    };

    // Auto-poll to check if deal status updated (buyer needs to know when seller scanned)
    // In production we would use Ably here instead of polling.
    useEffect(() => {
        if (status === 'VERIFIED') {
            setSuccess(true);
            return;
        }

        const interval = setInterval(async () => {
            try {
                // We'll quickly query the handshake status via API. 
                // We can add a simple status endpoint.
                const res = await fetch(`/api/deal/${dealId}/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.handshakeStatus === 'VERIFIED') {
                        setSuccess(true);
                        setStatus('VERIFIED');
                    }
                }
            } catch (e) {}
        }, 3000);

        return () => clearInterval(interval);
    }, [status, dealId]);

    if (success || status === 'VERIFIED') {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-up">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Deal Erfolgreich!</h2>
                <p className="text-slate-500 mb-8 max-w-sm">
                    Der Ehren-Deal wurde per lokalem Handschlag bestätigt. Das Geld wird nun sicher freigegeben.
                </p>
                <a href="/dashboard" className="bg-[var(--ehren-primary)] text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:shadow-md transition-all">
                    Zurück zum Dashboard
                </a>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-md w-full mx-auto">
            <div className="bg-gradient-to-r from-[var(--ehren-primary)] to-[var(--ehren-blue)] p-6 text-white text-center">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <h2 className="text-xl font-black mb-1">Digitale Übergabe</h2>
                <p className="text-sm text-white/80">Sicherer Handschlag vor Ort</p>
            </div>

            <div className="p-6">
                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 mb-6 text-sm border border-red-100">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {role === 'buyer' ? (
                    <div className="flex flex-col items-center">
                        <p className="text-slate-600 text-sm mb-6 text-center">
                            Zeige diesen Code dem Verkäufer, um den Erhalt der Ware zu bestätigen und die Zahlung freizugeben.
                        </p>
                        
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                            {token ? (
                                <QRCode value={token} size={200} />
                            ) : (
                                <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
                                    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                                </div>
                            )}
                        </div>

                        {token && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
                                <RefreshCw className="w-4 h-4" />
                                Code erneuert sich in <strong className="text-slate-800">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</strong>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <p className="text-slate-600 text-sm mb-6 text-center">
                            Scanne den QR-Code auf dem Smartphone des Käufers, um die sichere Übergabe zu bestätigen.
                        </p>

                        {!scanning ? (
                            <button 
                                onClick={() => setScanning(true)}
                                className="w-full flex items-center justify-center gap-2 bg-[var(--ehren-primary)] text-white py-4 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <Camera className="w-5 h-5" />
                                Scanner aktivieren
                            </button>
                        ) : (
                            <div className="w-full overflow-hidden rounded-xl border-2 border-[var(--ehren-primary)]">
                                <div id="reader"></div>
                                <button 
                                    onClick={() => setScanning(false)}
                                    className="w-full py-3 bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    Deine Zahlung ist durch den Ehren-Deal Käuferschutz abgesichert
                </p>
            </div>
        </div>
    );
}
