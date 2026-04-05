"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import Navbar from "../../components/Navbar";
import { useLanguage } from "../../components/LanguageContext";
import InlinePinModal from "../../components/InlinePinModal";

export default function ProfilePage() {
    const [session, setSession] = useState<Session | null>(null);
    const [ambientAllowed, setAmbientAllowed] = useState(false);
    
    // Application Preferences
    const [disableSuggestions, setDisableSuggestions] = useState(false);
    
    // Security PIN Settings
    const [pinSettings, setPinSettings] = useState({
        pin_hash: null as string | null,
        reqTranscripts: false,
        reqAnalytics: false,
        reqLock: false
    });
    
    // UI State
    const [savingPrefs, setSavingPrefs] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showPinReset, setShowPinReset] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [resetError, setResetError] = useState("");
    
    // Authorization Action Buffers
    const [pendingToggle, setPendingToggle] = useState<{ action: () => void } | null>(null);

    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) {
                router.push("/login");
            } else {
                const meta = session.user.user_metadata || {};
                setDisableSuggestions(!!meta.disable_financial_suggestions);
                setPinSettings({
                    pin_hash: meta.pin_hash || null,
                    reqTranscripts: !!meta.req_pin_transcripts,
                    reqAnalytics: !!meta.req_pin_analytics,
                    reqLock: !!meta.req_pin_lock
                });
            }
        });
    }, [router]);

    useEffect(() => {
        setAmbientAllowed(localStorage.getItem("ambient_enabled") === "true");
    }, []);

    const toggleAmbientAllowed = () => {
        const newState = !ambientAllowed;
        setAmbientAllowed(newState);
        if (newState) {
            localStorage.setItem("ambient_enabled", "true");
            if (localStorage.getItem("ambient_live") === null) {
                localStorage.setItem("ambient_live", "true");
            }
        } else {
            localStorage.setItem("ambient_enabled", "false");
            localStorage.setItem("ambient_live", "false");
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const saveMetadata = async (updates: any) => {
        setSavingPrefs(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: updates
            });
            if (error) throw error;
        } catch (err: any) {
            console.error("Error saving preferences:", err);
            alert("Failed to save changes.");
        } finally {
            setSavingPrefs(false);
        }
    };

    const handleSetPin = async (e: React.FormEvent) => {
        e.preventDefault();
        const hash = btoa(pinInput);
        
        await saveMetadata({ 
            pin_hash: hash, 
            req_pin_transcripts: true, 
            req_pin_analytics: true, 
            req_pin_lock: true 
        });
        
        setPinSettings({
            pin_hash: hash,
            reqTranscripts: true,
            reqAnalytics: true,
            reqLock: true
        });
        
        setPinInput("");
        setShowPinSetup(false);
    };

    const handleResetPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError("");
        if (!session?.user?.email) return;
        
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: session.user.email,
                password: passwordInput
            });
            
            if (signInError) throw signInError;
            
            // Password verified! Wipe PIN securely
            await saveMetadata({
                pin_hash: null,
                req_pin_transcripts: false,
                req_pin_analytics: false,
                req_pin_lock: false
            });
            
            setPinSettings({
                pin_hash: null,
                reqTranscripts: false,
                reqAnalytics: false,
                reqLock: false
            });
            
            setShowPinReset(false);
            setPasswordInput("");
            alert("Your PIN has been successfully removed.");
            
        } catch (err: any) {
            setResetError("Incorrect password. We could not verify your identity.");
        }
    };

    const toggleMetadataFlag = async (key: string, currentValue: boolean) => {
        const newVal = !currentValue;
        
        // Optimistic UI update
        if (key === 'disable_financial_suggestions') setDisableSuggestions(newVal);
        if (key === 'req_pin_transcripts') setPinSettings(p => ({...p, reqTranscripts: newVal}));
        if (key === 'req_pin_analytics') setPinSettings(p => ({...p, reqAnalytics: newVal}));
        if (key === 'req_pin_lock') setPinSettings(p => ({...p, reqLock: newVal}));

        await saveMetadata({ [key]: newVal });
    };

    const handleToggleWithPinCheck = (actionFn: () => void) => {
        if (pinSettings.pin_hash) {
            setPendingToggle({ action: actionFn });
        } else {
            actionFn();
        }
    };

    if (!session) return null;

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black font-sans text-zinc-50 relative overflow-hidden">
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />

            <Navbar />

            <main className="relative z-10 p-8 max-w-2xl mx-auto w-full flex flex-col pt-16">
                <h1 className="text-4xl font-bold mb-8">{t("settings")}</h1>

                <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl flex flex-col gap-10">
                    
                    {/* Account Settings Header */}
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500/50 flex items-center justify-center text-brand-500 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">{t("account_details")}</h2>
                            <p className="text-zinc-400 mt-1">{session.user.email}</p>
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/10" />

                    {/* GENERAL PREFERENCES */}
                    <div>
                        <h3 className="text-brand-400 font-bold uppercase tracking-widest text-sm mb-4">{t("application_preferences")}</h3>

                        <div className="flex items-center justify-between bg-black/20 px-5 py-4 rounded-2xl border border-white/5 mb-4 shadow-inner">
                            <div className="flex flex-col">
                                <span className="text-white font-medium">{t("allow_ambient_recording")}</span>
                                <span className="text-zinc-500 text-xs mt-1">{t("ambient_subtext")}</span>
                            </div>
                            <button
                                role="switch"
                                aria-checked={ambientAllowed}
                                onClick={toggleAmbientAllowed}
                                className={`${ambientAllowed ? 'bg-brand-500' : 'bg-white/10 hover:bg-white/20'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                            >
                                <span className={`${ambientAllowed ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-black/20 px-5 py-4 rounded-2xl border border-white/5 mb-4 shadow-inner">
                            <div className="flex flex-col pr-4">
                                <span className="text-white font-medium">{t("disable_suggestions")}</span>
                                <span className="text-zinc-500 text-xs mt-1">{t("disable_suggestions_sub")}</span>
                            </div>
                            <button
                                role="switch"
                                aria-checked={disableSuggestions}
                                onClick={() => toggleMetadataFlag('disable_financial_suggestions', disableSuggestions)}
                                disabled={savingPrefs}
                                className={`${disableSuggestions ? 'bg-brand-500' : 'bg-white/10 hover:bg-white/20'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                            >
                                <span className={`${disableSuggestions ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/10" />

                    {/* SECURITY SYSTEM */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-brand-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                {t("security_settings")}
                            </h3>
                            {pinSettings.pin_hash && (
                                <button 
                                    onClick={() => setShowPinReset(true)}
                                    className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline transition-all"
                                >
                                    {t("forgot_pin")}
                                </button>
                            )}
                        </div>

                        {!pinSettings.pin_hash ? (
                            <div className="bg-black/30 border border-brand-500/20 rounded-2xl p-6 text-center shadow-inner">
                                <p className="text-zinc-400 text-sm mb-4">You have not set up a security PIN. A PIN allows you to gate aspects of your account locally.</p>
                                <button 
                                    onClick={() => setShowPinSetup(true)}
                                    className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition shadow-lg"
                                >
                                    Set Up PIN
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-black/20 px-5 py-4 rounded-2xl border border-white/5 shadow-inner opacity-50">
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium flex items-center gap-2">
                                            {t("pin_status")}
                                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        <span className="text-green-500/80 text-xs mt-1">{t("pin_status_sub")}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-black/20 px-5 py-4 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex flex-col pr-4">
                                        <span className="text-white font-medium">{t("req_transcripts")}</span>
                                        <span className="text-zinc-500 text-xs mt-1">{t("req_transcripts_sub")}</span>
                                    </div>
                                    <button
                                        role="switch"
                                        aria-checked={pinSettings.reqTranscripts}
                                        onClick={() => handleToggleWithPinCheck(() => toggleMetadataFlag('req_pin_transcripts', pinSettings.reqTranscripts))}
                                        disabled={savingPrefs}
                                        className={`${pinSettings.reqTranscripts ? 'bg-brand-500' : 'bg-white/10 hover:bg-white/20'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                    >
                                        <span className={`${pinSettings.reqTranscripts ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-black/20 px-5 py-4 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex flex-col pr-4">
                                        <span className="text-white font-medium">{t("req_analytics")}</span>
                                        <span className="text-zinc-500 text-xs mt-1">{t("req_analytics_sub")}</span>
                                    </div>
                                    <button
                                        role="switch"
                                        aria-checked={pinSettings.reqAnalytics}
                                        onClick={() => handleToggleWithPinCheck(() => toggleMetadataFlag('req_pin_analytics', pinSettings.reqAnalytics))}
                                        disabled={savingPrefs}
                                        className={`${pinSettings.reqAnalytics ? 'bg-brand-500' : 'bg-white/10 hover:bg-white/20'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                    >
                                        <span className={`${pinSettings.reqAnalytics ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-black/20 px-5 py-4 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex flex-col pr-4">
                                        <span className="text-white font-medium">{t("req_lock")}</span>
                                        <span className="text-zinc-500 text-xs mt-1">{t("req_lock_sub")}</span>
                                    </div>
                                    <button
                                        role="switch"
                                        aria-checked={pinSettings.reqLock}
                                        onClick={() => handleToggleWithPinCheck(() => toggleMetadataFlag('req_pin_lock', pinSettings.reqLock))}
                                        disabled={savingPrefs}
                                        className={`${pinSettings.reqLock ? 'bg-brand-500' : 'bg-white/10 hover:bg-white/20'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                    >
                                        <span className={`${pinSettings.reqLock ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="mt-6 px-6 py-3 w-fit text-sm font-bold rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all text-red-500 self-center"
                    >
                        {t("sign_out_acc")}
                    </button>
                </div>
            </main>

            {/* SETUP PIN MODAL */}
            {showPinSetup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-brand-500/30 shadow-2xl rounded-3xl p-8 max-w-sm w-full relative overflow-hidden">
                        <div className="flex flex-col items-center text-center">
                            <h2 className="text-xl font-bold text-white mb-2">Create Security PIN</h2>
                            <p className="text-zinc-400 mb-6 text-sm">
                                Enter a numeric code. You will need it to bypass security blocks.
                            </p>
                            <form onSubmit={handleSetPin} className="w-full">
                                <input
                                    type="password"
                                    maxLength={6}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    placeholder="••••"
                                    className="w-full text-center tracking-[1em] text-2xl py-4 bg-black/40 border border-white/10 focus:ring-brand-500/50 focus:border-transparent rounded-2xl text-white outline-none focus:ring-2 transition-all mb-6"
                                    autoFocus
                                />
                                <div className="flex w-full gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPinSetup(false)}
                                        className="flex-1 px-4 py-3 rounded-xl font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition"
                                    >Cancel</button>
                                    <button 
                                        type="submit" 
                                        disabled={pinInput.length < 4}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 transition disabled:opacity-50"
                                    >Set PIN</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET PIN MODAL via PASSWORD */}
            {showPinReset && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-red-500/30 shadow-2xl rounded-3xl p-8 max-w-sm w-full relative overflow-hidden">
                        <div className="flex flex-col items-center text-center">
                            <h2 className="text-xl font-bold text-white mb-2">Reset PIN</h2>
                            <p className="text-zinc-400 mb-6 text-sm">
                                To wipe your current security PIN, please verify your identity by entering your <strong className="text-zinc-200">account password</strong>.
                            </p>
                            <form onSubmit={handleResetPin} className="w-full">
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value);
                                        setResetError("");
                                    }}
                                    placeholder="Account Password"
                                    className={`w-full py-3 px-4 bg-black/40 border ${resetError ? 'border-red-500' : 'border-white/10'} focus:ring-brand-500/50 focus:border-transparent rounded-xl text-white outline-none focus:ring-2 transition-all mb-2`}
                                    autoFocus
                                />
                                {resetError && <p className="text-red-400 text-xs mb-4 text-left font-medium">{resetError}</p>}
                                <div className="flex w-full gap-3 mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => { setShowPinReset(false); setResetError(""); setPasswordInput(""); }}
                                        className="flex-1 px-4 py-3 rounded-xl font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition"
                                    >Cancel</button>
                                    <button 
                                        type="submit" 
                                        disabled={!passwordInput}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                                    >Verify & Clear</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* INLINE TOGGLE PIN VALIDATOR */}
            {pendingToggle && pinSettings.pin_hash && (
                <InlinePinModal
                    requiredPinEncoded={pinSettings.pin_hash}
                    onSuccess={() => {
                        pendingToggle.action();
                        setPendingToggle(null);
                    }}
                    onCancel={() => setPendingToggle(null)}
                />
            )}

        </div>
    );
}
