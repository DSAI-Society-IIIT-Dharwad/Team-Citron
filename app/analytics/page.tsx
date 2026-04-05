"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useLanguage } from "../../components/LanguageContext";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PinProtection from "../../components/PinProtection";

const COLORS = ['#fc6736', '#fca5a5', '#fbbf24', '#34d399', '#60a5fa', '#818cf8'];

export default function AnalyticsPage() {
    const { language, t } = useLanguage();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [macroAnalytics, setMacroAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userMetadata, setUserMetadata] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) {
                router.push("/login");
            } else {
                setUserMetadata(session.user.user_metadata || {});
                fetchGlobalAnalytics(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) router.push("/login");
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const fetchGlobalAnalytics = async (userId: string) => {
        setIsLoading(true);
        try {
            // 1. Fetch all transcripts for this user
            const { data: transcripts, error: sbError } = await supabase
                .from("transcripts")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: true }); // chronological

            if (sbError) throw sbError;

            if (!transcripts || transcripts.length === 0) {
                throw new Error("No transcripts found. Please record some audio first!");
            }

            // Map them into a secure structured array utilizing english translations where possible
            const payload = transcripts.map(t => ({
                date: new Date(t.created_at).toLocaleDateString(),
                text: t.translated_text || t.raw_text
            }));

            // 2. Fetch Fractional CFO Analysis from Groq
            const res = await fetch("/api/analyze-global", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcripts: payload, targetLanguage: language })
            });

            const analyzeData = await res.json();
            if (!res.ok) throw new Error(analyzeData.error || "Analysis failed");

            setMacroAnalytics(analyzeData);

        } catch (err: any) {
            console.error("Global Analytics Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black font-sans text-zinc-50 relative overflow-hidden">
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 blur-[120px] rounded-full pointer-events-none" />

            <Navbar />

            <PinProtection requiredPinEncoded={userMetadata?.req_pin_analytics ? userMetadata?.pin_hash : null}>
                <main className="relative z-10 p-8 max-w-5xl mx-auto w-full flex flex-col pt-16 flex-1">
                <div className="mb-10 flex items-center justify-between">
                    <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                        <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t("your_analysis")}
                    </h1>
                </div>

                {isLoading ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center pt-20">
                        <svg className="animate-spin h-10 w-10 text-brand-500 mb-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-zinc-400 text-lg font-medium animate-pulse">Conducting Financial Analysis ...</p>
                    </div>
                ) : error ? (
                    <div className="w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-8 backdrop-blur-xl flex flex-col items-center justify-center mt-10">
                        <svg className="w-12 h-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-xl font-bold text-white mb-2">Notice</h2>
                        <p className="text-red-400 text-center">{error}</p>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in flex flex-col gap-6 pb-20">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Persona Identity Component */}
                            <div className="lg:w-1/3 bg-zinc-900/80 border border-brand-500/30 rounded-3xl p-8 shadow-lg shadow-brand-500/10 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-brand-600/5 to-transparent pointer-events-none" />
                                <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4">{t("primary_focus")}</h3>
                                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-white">{macroAnalytics?.primaryFocus}</p>
                            </div>

                            {/* CFO Macro Analysis Component */}
                            <div className="lg:w-2/3 bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-lg">
                                <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t("objective_summary")}
                                </h3>
                                <p className="text-zinc-300 leading-relaxed font-medium">
                                    {macroAnalytics?.objectiveSummary}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Roadmap Component */}
                            {!userMetadata?.disable_financial_suggestions && (
                                <div className="lg:w-1/2 bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-lg h-full">
                                    <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        {t("financial_suggestions")}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-zinc-500 leading-snug mb-6 border-l-2 border-zinc-700 pl-3 italic">
                                        {t("financial_disclaimer")}
                                    </p>
                                    <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                                        {macroAnalytics?.suggestions?.map((step: string, idx: number) => (
                                            <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-black/40 border border-white/5">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <p
                                                    className="text-zinc-300 text-sm leading-relaxed mt-1"
                                                    dangerouslySetInnerHTML={{ __html: step.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:text-brand-300 underline underline-offset-2">$1</a>') }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Graphic Chart Component */}
                            <div className={`${userMetadata?.disable_financial_suggestions ? 'lg:w-full' : 'lg:w-1/2'} bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-lg`}>
                                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                    {t("topic_spread")}
                                </h3>
                                <div className="w-full h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={macroAnalytics?.chartData || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {(macroAnalytics?.chartData || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </main>
            </PinProtection>
        </div>
    );
}
