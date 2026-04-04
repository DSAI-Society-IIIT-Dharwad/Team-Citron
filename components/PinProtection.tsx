"use client";

import { useState } from "react";

interface PinProtectionProps {
    requiredPinEncoded: string | null;
    children: React.ReactNode;
}

export default function PinProtection({ requiredPinEncoded, children }: PinProtectionProps) {
    const [isVerified, setIsVerified] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [error, setError] = useState(false);

    // If no pin required or already verified, return children
    if (!requiredPinEncoded || isVerified) {
        return <>{children}</>;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const encodedInput = btoa(pinInput);
        if (encodedInput === requiredPinEncoded) {
            setIsVerified(true);
            setError(false);
        } else {
            setError(true);
            setPinInput("");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-600/20 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-10 shadow-2xl relative z-10 w-full max-w-sm flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
                <p className="text-zinc-400 text-center text-sm mb-8">
                    Enter your security PIN to view this page.
                </p>

                <form onSubmit={handleSubmit} className="w-full">
                    <input
                        type="password"
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => {
                            setPinInput(e.target.value);
                            setError(false);
                        }}
                        placeholder="••••"
                        className={`w-full text-center tracking-[1em] text-2xl py-4 bg-black/40 border ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-brand-500/50'} focus:border-transparent rounded-2xl text-white outline-none focus:ring-2 transition-all mb-4`}
                        autoFocus
                    />
                    
                    {error && (
                        <p className="text-red-400 text-sm text-center mb-4 animate-shake">
                            Incorrect PIN. Please try again.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!pinInput}
                        className="w-full py-4 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 transition disabled:opacity-50"
                    >
                        Unlock
                    </button>
                </form>
            </div>
        </div>
    );
}
