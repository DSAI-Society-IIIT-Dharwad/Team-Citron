"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Navbar from "../../../components/Navbar";
import { Session } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PinProtection from "../../../components/PinProtection";
import { useLanguage } from "../../../components/LanguageContext";

const COLORS = ['#fc6736', '#fca5a5', '#fbbf24', '#34d399', '#60a5fa'];

export default function TranscriptAnalytics() {
    const { id } = useParams();
    const router = useRouter();
    const { language } = useLanguage();

    const [transcript, setTranscript] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [session, setSession] = useState<Session | null>(null);
    const [userMetadata, setUserMetadata] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) {
                router.push("/login");
            } else {
                setUserMetadata(session.user.user_metadata || {});
                if (id) fetchTranscriptAndAnalyze(id as string);
            }
        });
    }, [id, router]);

    const fetchTranscriptAndAnalyze = async (transcriptId: string) => {
        try {
            // 1. Fetch transcript from db
            const { data, error: sbError } = await supabase
                .from("transcripts")
                .select("*")
                .eq("id", transcriptId)
                .single();

            if (sbError || !data) throw new Error("Transcript not found.");
            setTranscript(data);

            // 2. Extrapolate analytics utilizing the translated text if available
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    text: data.translated_text || data.raw_text,
                    targetLanguage: language
                })
            });

            const analyzeData = await res.json();
            if (!res.ok) throw new Error(analyzeData.error || "Analysis failed.");

            setAnalytics(analyzeData);

        } catch (err: any) {
            console.error("Analytics Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black font-sans text-zinc-50 relative overflow-hidden">
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />
            <Navbar />

            <PinProtection requiredPinEncoded={userMetadata?.req_pin_analytics ? userMetadata?.pin_hash : null}>
                <main className="relative z-10 p-8 max-w-5xl mx-auto w-full flex flex-col pt-16 flex-1">
                <button
                    onClick={() => router.push("/transcripts")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-fit mb-8"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Transcripts
                </button>

                {isLoading ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center pt-20">
                        <svg className="animate-spin h-10 w-10 text-brand-500 mb-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-zinc-400 text-lg font-medium animate-pulse">Extracting financial insights ...</p>
                    </div>
                ) : error ? (
                    <div className="w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-8 backdrop-blur-xl flex flex-col items-center justify-center mt-10">
                        <svg className="w-12 h-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
                        <p className="text-red-400 text-center">{error}</p>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in">
                        {/* ---------------- ANALYSIS SECTION ---------------- */}
                        <div className="flex flex-col gap-6 mb-10 border-b border-white/5 pb-10">
                            <h2 className="text-xl font-bold tracking-tight text-white mb-2">Objective Analysis</h2>
                            
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Intent Card */}
                                <div className="flex-[2] bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-lg overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full translate-x-10 -translate-y-10" />
                                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-2">Categorized Intent</h3>
                                    <p className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent leading-tight mt-2">
                                        {analytics?.intent || "General Discussion"}
                                    </p>
                                </div>

                                {/* Graphical Breakdown */}
                                <div className="flex-[3] bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-lg">
                                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-6">Topic Breakdown (%)</h3>
                                    <div className="w-full h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analytics?.chartData || []}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {(analytics?.chartData || []).map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Legend verticalAlign="middle" layout="vertical" align="right" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Entities Tracker */}
                                <div className="flex-[2] bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-lg relative">
                                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-4">Extracted Entities</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {analytics?.entities?.map((ent: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-brand-500/10 text-brand-300 border border-brand-500/20 rounded-lg text-sm font-medium">
                                                {ent}
                                            </span>
                                        ))}
                                        {(!analytics?.entities || analytics.entities.length === 0) && (
                                            <span className="text-zinc-500 italic">No specific financial entities extracted.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Original Source Text */}
                                <div className="flex-[3] bg-black/30 border border-white/5 rounded-3xl p-6 shadow-inner">
                                    <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">Original Source Text</h3>
                                    <p className="text-zinc-400 text-sm italic leading-relaxed">
                                        "{transcript?.raw_text}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ---------------- SUGGESTIONS SECTION ---------------- */}
                        {!userMetadata?.disable_financial_suggestions && (
                            <div className="w-full flex flex-col gap-6">
                                <div className="bg-zinc-900/80 border border-brand-500/20 rounded-3xl p-8 shadow-lg shadow-brand-500/5">
                                    <h3 className="text-lg font-bold uppercase tracking-widest text-brand-400 mb-2 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Financial Suggestions
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-zinc-500 leading-snug mb-8 border-l-2 border-zinc-700 pl-3 italic max-w-4xl">
                                        The Financial Suggestions contain information for suggestive purposes only, and should not be taken as professional or legal advice and we assume no liability for any errors, omissions, or financial decisions made based on its suggestions.
                                    </p>
                                    
                                    <div className="space-y-4">
                                        {analytics?.suggestions?.map((sug: string, idx: number) => (
                                            <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-black/40 border border-white/5 items-start">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm mt-0.5">
                                                    {idx + 1}
                                                </div>
                                                <p 
                                                    className="text-zinc-300 leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: sug.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:text-brand-300 underline underline-offset-2">$1</a>') }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                </main>
            </PinProtection>
        </div>
    );
}
