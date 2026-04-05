"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    
    const handleTestLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: "test_user_guest@citron.com",
                password: "CitronGuestPassword123"
            });
            if (error) {
                // If it doesn't exist, we'll silently register the test user 
                const { error: signUpError } = await supabase.auth.signUp({
                    email: "test_user_guest@citron.com",
                    password: "CitronGuestPassword123",
                });
                if (signUpError) throw signUpError;
            }
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Failed to provision guest layer.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/");
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert("Success! Please check your email for a confirmation link (if enabled in Supabase) or sign in immediately.");
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during authentication.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black font-sans text-zinc-50 p-6">

            {/* Background ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/20 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative flex flex-col z-10 w-full max-w-md px-8 py-12 bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl rounded-3xl">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-500 to-red-500 bg-clip-text text-transparent tracking-tight mb-2">
                        Citron
                    </h1>
                    <p className="text-zinc-400">
                        {isLogin ? "Welcome back! Please sign in." : "Create a new account."}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-400 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 outline-none transition-all placeholder:text-zinc-600 text-zinc-200"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-400 ml-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 outline-none transition-all placeholder:text-zinc-600 text-zinc-200"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`
              w-full py-3.5 mt-2 rounded-xl font-medium tracking-wide transition-all shadow-lg
              ${isLoading ? 'bg-brand-600/50 text-brand-200 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 hover:shadow-brand-500/25 text-white'}
            `}
                    >
                        {isLoading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
                    </button>
                </form>

                <div className="mt-8 text-center flex flex-col gap-4">
                    <button
                        type="button"
                        onClick={handleTestLogin}
                        className="w-full py-2.5 rounded-xl border-2 border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 text-brand-400 font-semibold tracking-wide transition-all shadow-sm"
                    >
                        Login as Test User
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                        className="text-sm font-medium tracking-wide text-zinc-500 hover:text-brand-400 transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </main>
        </div>
    );
}
