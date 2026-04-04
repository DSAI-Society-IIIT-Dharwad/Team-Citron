"use client";

import { useState } from "react";

interface InlinePinModalProps {
    requiredPinEncoded: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function InlinePinModal({ requiredPinEncoded, onSuccess, onCancel }: InlinePinModalProps) {
    const [pinInput, setPinInput] = useState("");
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const encodedInput = btoa(pinInput);
        if (encodedInput === requiredPinEncoded) {
            onSuccess();
        } else {
            setError(true);
            setPinInput("");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 shadow-2xl rounded-3xl p-8 max-w-sm w-full relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center mb-4 relative z-10">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 relative z-10">Enter PIN</h2>
                    <p className="text-zinc-400 mb-6 text-sm relative z-10">
                        Please enter your security PIN to perform this action.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full relative z-10">
                        <input
                            type="password"
                            maxLength={6}
                            value={pinInput}
                            onChange={(e) => {
                                setPinInput(e.target.value);
                                setError(false);
                            }}
                            placeholder="••••"
                            className={`w-full text-center tracking-[1em] text-xl py-3 bg-black/40 border ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-brand-500/50'} focus:border-transparent rounded-2xl text-white outline-none focus:ring-2 transition-all mb-4`}
                            autoFocus
                        />
                        
                        {error && (
                            <p className="text-red-400 text-sm text-center mb-4">
                                Incorrect PIN.
                            </p>
                        )}

                        <div className="flex w-full gap-3">
                            <button 
                                type="button"
                                onClick={onCancel}
                                className="flex-1 px-4 py-3 rounded-xl font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={!pinInput}
                                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 transition disabled:opacity-50"
                            >
                                Unlock
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
