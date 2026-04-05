"use client";

import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { useLanguage } from "../../components/LanguageContext";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import PinProtection from "../../components/PinProtection";
import InlinePinModal from "../../components/InlinePinModal";

interface Transcript {
    id: string;
    created_at: string;
    raw_text: string;
    translated_text?: string;
    source?: string;
    is_locked?: boolean;
}

export default function TranscriptsPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [savingId, setSavingId] = useState<string | null>(null);
    
    // Filtering and Sorting State
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Security 
    const [userMetadata, setUserMetadata] = useState<any>(null);
    const [pendingLockToggle, setPendingLockToggle] = useState<{id: string, current: boolean} | null>(null);

    const handleSaveEdit = async (id: string, currentText: string) => {
        if (!editValue.trim() || editValue === currentText) {
            setEditingId(null);
            return;
        }
        setSavingId(id);
        
        try {
            // First, re-translate the edited text so analytics stays perfectly accurate
            const translateRes = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: editValue })
            });
            const translateData = await translateRes.json();
            const translatedEnglishText = translateData.translation || editValue;

            // Update in Supabase
            const { data, error } = await supabase
                .from("transcripts")
                .update({ 
                    raw_text: editValue,
                    translated_text: translatedEnglishText
                })
                .eq("id", id)
                .select();
                
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Supabase blocked the update! Database Row Level Security (RLS) is likely missing an UPDATE policy.");
            }
            
            // Update local state
            setTranscripts(prev => prev.map(t => 
                t.id === id 
                ? { ...t, ...data[0] }
                : t
            ));
            setEditingId(null);
        } catch (err: any) {
            console.error("Error saving transcript:", err);
            alert(`Failed to save changes: ${err.message || 'Unknown error'}`);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            const { data, error } = await supabase
                .from("transcripts")
                .delete()
                .eq("id", id)
                .select();
                
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Supabase blocked the deletion! Your Database RLS is likely missing a DELETE policy.");
            }
            
            setTranscripts(prev => prev.filter(t => t.id !== id));
            setDeleteConfirmId(null);
        } catch (err: any) {
            console.error("Error deleting transcript:", err);
            alert(`Failed to delete: ${err.message || 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleLock = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("transcripts")
                .update({ is_locked: !currentStatus })
                .eq("id", id);
                
            if (error) throw error;
            
            setTranscripts(prev => prev.map(t => 
                t.id === id ? { ...t, is_locked: !currentStatus } : t
            ));
        } catch (err: any) {
            console.error("Error toggling lock:", err);
            alert(`Failed to lock transcript: ${err.message || 'Unknown error'}`);
        }
    };

    const handleToggleLockWithCheck = (id: string, currentStatus: boolean) => {
        if (userMetadata?.req_pin_lock && userMetadata?.pin_hash) {
            setPendingLockToggle({ id, current: currentStatus });
        } else {
            handleToggleLock(id, currentStatus);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) {
                router.push("/login");
            } else {
                setUserMetadata(session.user.user_metadata || {});
                fetchTranscripts(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) router.push("/login");
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const fetchTranscripts = async (userId: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("transcripts")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTranscripts(data || []);
        } catch (error) {
            console.error("Error fetching transcripts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const filteredTranscripts = transcripts
        .filter(t => t.raw_text.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        });

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black font-sans text-zinc-50 relative overflow-hidden">
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />

            <Navbar />

            <PinProtection requiredPinEncoded={userMetadata?.req_pin_transcripts ? userMetadata?.pin_hash : null}>
                <main className="relative z-10 p-8 max-w-5xl mx-auto w-full flex flex-col pt-16 flex-1">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-4xl font-bold tracking-tight text-white">{t("transcripts")}</h1>
                    <span className="bg-brand-500/10 text-brand-400 px-4 py-1.5 rounded-full text-sm font-semibold border border-brand-500/20">
                        {transcripts.length} {t("total")}
                    </span>
                </div>

                {!isLoading && transcripts.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder={t("search_transcripts")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 border border-white/5 rounded-2xl leading-5 bg-zinc-900/50 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all shadow-inner backdrop-blur-md"
                            />
                        </div>
                        <div className="sm:w-48 relative">
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
                                className="block w-full pl-4 pr-10 py-3 text-base font-medium border border-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 rounded-2xl bg-zinc-900/50 text-zinc-200 appearance-none cursor-pointer transition-all shadow-inner backdrop-blur-md"
                            >
                                <option value="desc">{t("most_recent")}</option>
                                <option value="asc">{t("oldest_first")}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center">
                        <svg className="animate-spin h-10 w-10 text-brand-500 mb-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-zinc-400 font-medium">Loading history...</p>
                    </div>
                ) : transcripts.length === 0 ? (
                    <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-12 backdrop-blur-xl flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <p className="text-xl font-medium text-zinc-300">{t("transcripts_empty")}</p>
                        <p className="text-zinc-500 mt-2">Any recordings you make will be securely saved here.</p>
                    </div>
                ) : filteredTranscripts.length === 0 ? (
                    <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-12 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                        <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-xl font-medium text-zinc-300">No matching transcripts found</p>
                        <p className="text-zinc-500 mt-2">Try adjusting your search filters.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 pb-20">
                        {filteredTranscripts.map((tItem) => (
                            <div key={tItem.id} className="w-full bg-zinc-900/80 border border-white/10 hover:border-brand-500/30 transition-all rounded-3xl p-6 shadow-lg relative group overflow-hidden">
                                {/* Subtle decorative gradient */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-2xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-brand-500/20 transition-colors" />
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        {tItem.source === "ambient" ? (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-xs font-bold uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                                {t("ambient")}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-md text-xs font-bold uppercase tracking-wider">
                                                {t("manual")}
                                            </span>
                                        )}
                                        <span className="text-sm font-medium text-zinc-500">{formatDate(tItem.created_at)}</span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            className={`transition-colors p-1 flex items-center gap-2 font-medium text-sm border border-transparent rounded-lg px-3 ${tItem.is_locked ? 'text-brand-400 bg-brand-500/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                            title={tItem.is_locked ? "Unlock Transcript" : "Lock Transcript"}
                                            onClick={() => handleToggleLockWithCheck(tItem.id, !!tItem.is_locked)}
                                        >
                                            {tItem.is_locked ? (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                            {tItem.is_locked ? t("unlock") : t("lock")}
                                        </button>

                                        <button 
                                          className={`transition-colors p-1 flex items-center gap-2 font-medium text-sm border border-transparent rounded-lg px-3 ${tItem.is_locked ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'}`}
                                          title={tItem.is_locked ? "Locked" : "Delete Transcript"}
                                          disabled={tItem.is_locked}
                                          onClick={() => setDeleteConfirmId(tItem.id)}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            {t("delete")}
                                        </button>

                                        <button 
                                          className={`transition-colors p-1 flex items-center gap-2 font-medium text-sm border border-transparent rounded-lg px-3 ${tItem.is_locked ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'text-zinc-500 hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/10'}`}
                                          title={tItem.is_locked ? "Locked" : "Edit Transcript"}
                                          disabled={tItem.is_locked}
                                          onClick={() => {
                                              setEditingId(tItem.id);
                                              setEditValue(tItem.raw_text);
                                          }}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            {t("edit")}
                                        </button>

                                        <button 
                                          className="text-zinc-500 hover:text-brand-400 transition-colors p-1 flex items-center gap-2 font-medium text-sm border border-transparent hover:border-brand-500/30 hover:bg-brand-500/10 rounded-lg px-3"
                                          title="View Analytics"
                                          onClick={() => router.push(`/transcripts/${tItem.id}`)}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            {t("view_analytics")}
                                        </button>
                                    </div>
                                </div>
                                
                                {editingId === tItem.id ? (
                                    <div className="relative z-10 w-full animate-in fade-in zoom-in-95 duration-200">
                                        <textarea
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-full bg-black/40 border border-brand-500/30 rounded-xl p-4 text-white resize-none outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[120px] mb-3"
                                        />
                                        <div className="flex gap-3 justify-end">
                                            <button 
                                                onClick={() => setEditingId(null)}
                                                disabled={savingId === tItem.id}
                                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={() => handleSaveEdit(tItem.id, tItem.raw_text)}
                                                disabled={savingId === tItem.id}
                                                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 transition flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {savingId === tItem.id ? (
                                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : "Save Changes"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-zinc-200 text-lg leading-relaxed relative z-10">{tItem.raw_text}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {deleteConfirmId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200 px-4">
                        <div className="bg-zinc-900 border border-white/10 shadow-2xl rounded-3xl p-8 max-w-md w-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4 relative z-10">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2 relative z-10">Delete Transcript?</h2>
                                <p className="text-zinc-400 mb-8 text-sm relative z-10 leading-relaxed max-w-[90%]">
                                    This action cannot be undone. Are you sure you want to permanently delete this transcript from your history?
                                </p>
                                <div className="flex w-full gap-3 relative z-10">
                                    <button 
                                        onClick={() => setDeleteConfirmId(null)}
                                        disabled={isDeleting}
                                        className="flex-1 px-4 py-3 rounded-xl font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(deleteConfirmId)}
                                        disabled={isDeleting}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition flex items-center justify-center disabled:opacity-50"
                                    >
                                        {isDeleting ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {pendingLockToggle && userMetadata?.pin_hash && (
                    <InlinePinModal 
                        requiredPinEncoded={userMetadata.pin_hash}
                        onSuccess={() => {
                            handleToggleLock(pendingLockToggle.id, pendingLockToggle.current);
                            setPendingLockToggle(null);
                        }}
                        onCancel={() => setPendingLockToggle(null)}
                    />
                )}
                </main>
            </PinProtection>
        </div>
    );
}
