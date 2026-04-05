"use client";
import Link from "next/link";
import { useLanguage, Language } from "./LanguageContext";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

export default function Navbar() {
    const { language, setLanguage, t } = useLanguage();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <nav className="relative z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-red-500 bg-clip-text text-transparent tracking-tight hover:opacity-80 transition-opacity">
                Citron
            </Link>
            <div className="flex items-center gap-4 sm:gap-6 text-sm font-medium">

                {/* Language Switcher */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors bg-white/5 px-4 py-1.5 rounded-full border border-white/10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        {(() => {
                            const MAP: Record<string, string> = {
                                English: "English", Hindi: "हिंदी", Bengali: "বাংলা", Tamil: "தமிழ்", Telugu: "తెలుగు", Gujarati: "ગુજરાતી", Kannada: "ಕನ್ನಡ", Malayalam: "മലയാളം", Marathi: "मराठी", Punjabi: "ਪੰਜਾਬੀ", Odia: "ଓଡ଼ିଆ"
                            };
                            return MAP[language] || "English";
                        })()}
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-64 overflow-y-auto custom-scrollbar">
                            {[
                                { name: "English", display: "English" },
                                { name: "Hindi", display: "हिंदी" },
                                { name: "Bengali", display: "বাংলা" },
                                { name: "Tamil", display: "தமிழ்" },
                                { name: "Telugu", display: "తెలుగు" },
                                { name: "Gujarati", display: "ગુજરાતી" },
                                { name: "Kannada", display: "ಕನ್ನಡ" },
                                { name: "Malayalam", display: "മലയാളം" },
                                { name: "Marathi", display: "मराठी" },
                                { name: "Punjabi", display: "ਪੰਜਾਬੀ" },
                                { name: "Odia", display: "ଓଡ଼ିଆ" },
                            ].map((lang) => (
                                <button
                                    key={lang.name}
                                    onClick={() => { setLanguage(lang.name as Language); setIsDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2 hover:bg-white/5 transition-colors ${language === lang.name ? "text-brand-500 font-bold" : "text-zinc-300"}`}
                                >
                                    {lang.display}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <Link href="/transcripts" className="text-zinc-400 hover:text-white transition-colors">{t("transcripts")}</Link>
                <Link href="/analytics" className="text-zinc-400 hover:text-white transition-colors">{t("analytics")}</Link>
                <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
                <Link href="/profile" className="flex items-center gap-3 group">
                    <span className="text-zinc-500 group-hover:text-zinc-300 hidden md:inline-block transition-colors">
                        {session?.user?.email}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-500 group-hover:bg-brand-500/30 group-hover:text-brand-400 transition-all shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                </Link>
            </div>
        </nav>
    );
}
