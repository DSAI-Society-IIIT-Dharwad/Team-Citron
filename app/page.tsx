"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import Navbar from "../components/Navbar";
import { useLanguage } from "../components/LanguageContext";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [showConsent, setShowConsent] = useState(false);
  const [ambientAllowed, setAmbientAllowed] = useState(false);
  const [isAmbientLive, setIsAmbientLive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [financeKeywords, setFinanceKeywords] = useState<string[]>([]);
  const [showKeywordError, setShowKeywordError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // VAD Refs
  const ambientStreamRef = useRef<MediaStream | null>(null);
  const ambientAudioContextRef = useRef<AudioContext | null>(null);
  const ambientAnalyserRef = useRef<AnalyserNode | null>(null);
  const ambientAnimationFrameRef = useRef<number | null>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);

  const router = useRouter();
  const { t } = useLanguage();

  const SARVAM_API_KEY = process.env.NEXT_PUBLIC_SARVAM_API_KEY;

  // Auth setup (unchanged)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingAuth(false);
      if (!session) router.push("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch keywords on mount
  useEffect(() => {
    async function fetchKeywords() {
      const { data, error } = await supabase.from('finance_keywords').select('keyword');
      if (!error && data) {
        setFinanceKeywords(data.map((item: any) => item.keyword.toLowerCase()));
      }
    }
    fetchKeywords();
  }, []);

  // Consent & ambient settings (unchanged)
  useEffect(() => {
    if (session) {
      const hasConsented = localStorage.getItem("ambient_consent_seen");
      if (!hasConsented) setShowConsent(true);

      const allowed = localStorage.getItem("ambient_enabled") === "true";
      setAmbientAllowed(allowed);
      if (allowed) {
        setIsAmbientLive(localStorage.getItem("ambient_live") !== "false");
      }
    }
  }, [session]);

  const handleConsent = (enabled: boolean) => {
    localStorage.setItem("ambient_consent_seen", "true");
    if (enabled) {
      localStorage.setItem("ambient_enabled", "true");
      localStorage.setItem("ambient_live", "true");
      setAmbientAllowed(true);
      setIsAmbientLive(true);
    }
    setShowConsent(false);
  };

  const toggleAmbientLive = () => {
    const newState = !isAmbientLive;
    setIsAmbientLive(newState);
    localStorage.setItem("ambient_live", String(newState));
  };

  // Ambient Volume-Activity Detection & Wake Word
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (ambientAllowed && isAmbientLive && !isRecording && !isProcessing) {
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Stops after one utterance to wait for next volume trigger
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-IN";

        recognitionRef.current.onend = () => {
          isRecognitionActiveRef.current = false;
        };
      }

      // Update handler explicitly to avoid stale closures on financeKeywords
      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const spoken = result[0].transcript.toLowerCase();
        
        if (financeKeywords.some((w: string) => spoken.includes(w))) {
          recognitionRef.current?.stop();
          isRecognitionActiveRef.current = false;
          stopAmbientVAD();
          startRecording();
        }
      };

      startAmbientVAD();
    } else {
      stopAmbientVAD();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        isRecognitionActiveRef.current = false;
      }
    }

    return () => {
      stopAmbientVAD();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        isRecognitionActiveRef.current = false;
      }
    };
  }, [ambientAllowed, isAmbientLive, isRecording, isProcessing, financeKeywords]);

  const stopAmbientVAD = () => {
    if (ambientAnimationFrameRef.current) {
      cancelAnimationFrame(ambientAnimationFrameRef.current);
      ambientAnimationFrameRef.current = null;
    }
    if (ambientStreamRef.current) {
      ambientStreamRef.current.getTracks().forEach(track => track.stop());
      ambientStreamRef.current = null;
    }
    if (ambientAudioContextRef.current) {
      ambientAudioContextRef.current.close().catch(() => {});
      ambientAudioContextRef.current = null;
    }
  };

  const startAmbientVAD = async () => {
    if (ambientStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ambientStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      ambientAudioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      ambientAnalyserRef.current = analyser;

      const checkVolumeTrigger = () => {
        if (!ambientAnalyserRef.current) return;
        const array = new Uint8Array(ambientAnalyserRef.current.frequencyBinCount);
        ambientAnalyserRef.current.getByteFrequencyData(array);
        const average = array.reduce((a, b) => a + b, 0) / array.length;

        const threshold = 5;
        if (average > threshold && !isRecognitionActiveRef.current) {
          isRecognitionActiveRef.current = true;
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Ignore racing issues when context is already started
          }
        }
        
        ambientAnimationFrameRef.current = requestAnimationFrame(checkVolumeTrigger);
      };

      checkVolumeTrigger();
    } catch (err) {
      console.warn("Could not start VAD microphone:", err);
    }
  };

  // Improved silence detection
  const checkSilence = useCallback(() => {
    if (!analyserRef.current) return;
    const array = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(array);
    const average = array.reduce((a, b) => a + b, 0) / array.length;

    if (average < 5) { // Slightly tuned threshold
      if (silenceStartRef.current === null) {
        silenceStartRef.current = Date.now();
      } else if (Date.now() - silenceStartRef.current > 6000) {
        stopRecording();
        return;
      }
    } else {
      silenceStartRef.current = null;
    }
    animationFrameRef.current = requestAnimationFrame(checkSilence);
  }, []);

  const startRecording = async () => {
    try {
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (_) {}

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      silenceStartRef.current = null;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        await processAudio(audioBlob);
      };

      mediaRecorder.start(1000); // chunks every second
      setIsRecording(true);
      setTranscript("");
      setStatusMessage(t("recording") || "Recording...");
      checkSilence();

    } catch (err) {
      console.error("Microphone error:", err);
      alert("Could not access microphone. Please allow permission.");
    }
  };

  const stopRecording = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      setStatusMessage(t("processing") || "Processing...");
    }
  };

  const convertWebmToWav = async (webmBlob: Blob): Promise<Blob> => {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [], sampleRate = audioBuffer.sampleRate;
    let offset = 0, pos = 0;

    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16);         // length: 16
    setUint16(1);          // PCM
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);              // block-align
    setUint16(16);                         // 16-bit

    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4);

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (offset < audioBuffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  // Sarvam AI Saaras v3 Transcription (Best for Hinglish)
  const processAudio = async (blob: Blob) => {
    if (!SARVAM_API_KEY) {
      setTranscript("Error: Missing Sarvam API key. Add NEXT_PUBLIC_SARVAM_API_KEY to .env.local");
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Convert WebM to WAV dynamically on the frontend so Sarvam universally accepts it
      const wavBlob = await convertWebmToWav(blob);

      const formData = new FormData();
      formData.append("file", wavBlob, "recording.wav");

      const response = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "API-Subscription-Key": SARVAM_API_KEY,
        },
        body: formData,   // Most Sarvam examples use multipart/form-data for file
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sarvam API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      // Saaras v3 returns different structures depending on mode
      const rawMixedTranscript = data.transcript || data.text || JSON.stringify(data);

      setStatusMessage("Translating and checking context...");
      
      // Attempt Translation to pure English using Groq
      const translateRes = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawMixedTranscript })
      });
      const translateData = await translateRes.json();
      const translatedEnglishText = translateData.translation || rawMixedTranscript;

      // Validate against financial keywords using the TRANSLATED text
      const lowerTranscript = translatedEnglishText.toLowerCase();
      const hasFinanceKeyword = financeKeywords.length === 0 || financeKeywords.some((kw: string) => lowerTranscript.includes(kw.toLowerCase()));

      if (!hasFinanceKeyword) {
        setShowKeywordError(true);
        setTranscript("");
        return; // Skip saving
      }

      // As requested, display the original language itself in the active UI
      setTranscript(rawMixedTranscript);

      // Save both the original and English versions to Supabase
      const { error } = await supabase.from("transcripts").insert({
        raw_text: rawMixedTranscript,
        translated_text: translatedEnglishText,
        user_id: session?.user?.id,
        source: isAmbientLive ? "ambient" : "manual",
      });

      if (error) {
        console.error("Supabase insert error:", error);
        setTranscript(prev => prev + `\n\n[Database Save Failed: ${error.message}]`);
      }

    } catch (err: any) {
      console.error("Transcription failed:", err);
      setTranscript(`Transcription error: ${err.message || "Check API key and quota."}`);
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
        <svg className="animate-spin h-10 w-10 text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black font-sans text-zinc-50 relative overflow-hidden">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />

      <Navbar />

      <main className="relative flex flex-col items-center justify-center flex-1 z-10 w-full px-8 py-12">
        {(ambientAllowed && isAmbientLive) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none z-0 flex items-center justify-center">
            <div className="absolute w-[500px] h-[500px] bg-brand-500/15 blur-[80px] rounded-full animate-pulse duration-[3000ms]" />
            <div className="absolute w-[600px] h-[600px] rounded-full border-[2px] border-brand-500/30 animate-[ping_4s_ease-out_infinite]" />
            <div className="absolute w-[600px] h-[600px] rounded-full border-[1px] border-red-500/20 animate-[ping_4s_ease-out_infinite_1.5s]" />
          </div>
        )}

        <div className="w-full max-w-2xl px-8 py-12 bg-zinc-900 border border-white/10 shadow-2xl rounded-[40px] relative z-10">
          <div className="flex flex-col items-center text-center mb-10">
            {ambientAllowed && (
              <div className="flex items-center gap-3 mb-6 bg-black/40 px-5 py-2.5 rounded-full border border-white/5 shadow-inner">
                <button
                  role="switch"
                  aria-checked={isAmbientLive}
                  onClick={toggleAmbientLive}
                  className={`${isAmbientLive ? 'bg-brand-600' : 'bg-white/10 hover:bg-white/20'} relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                >
                  <span className={`${isAmbientLive ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                </button>
                <span className={`text-sm font-semibold tracking-wide transition-colors ${isAmbientLive ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(252,103,54,0.5)]' : 'text-zinc-500'}`}>
                  {isAmbientLive ? t("ambient_live") : t("ambient_off")}
                </span>
                {isAmbientLive && (
                  <span className="relative flex h-2.5 w-2.5 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 duration-1000"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                  </span>
                )}
              </div>
            )}

            <h2 className="text-3xl font-semibold tracking-tight text-white mb-2 relative z-10">{t("record_audio")}</h2>
            <p className="text-zinc-400 relative z-10">{t("capture_voice")}</p>
          </div>

          <div className="flex flex-col items-center gap-8 w-full">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`
                relative flex items-center justify-center w-36 h-36 rounded-full transition-all duration-500 shadow-2xl z-20
                ${isProcessing ? 'opacity-50 cursor-not-allowed bg-zinc-800' :
                  isRecording ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50' :
                    (ambientAllowed && isAmbientLive) ? 'bg-brand-500/10 hover:bg-brand-500/20 border-brand-500/40' : 'bg-zinc-800/50 hover:bg-zinc-800 border-white/10'}
                border-[3px]
                disabled:scale-100 disabled:hover:bg-zinc-800
              `}
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
              )}

              <div className={`flex items-center justify-center transition-all duration-300 ${isRecording ? 'scale-110' : 'scale-100'}`}>
                {isRecording ? (
                  <div className="w-10 h-10 bg-red-500 rounded-md transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-all duration-500 ${(ambientAllowed && isAmbientLive) ? 'text-brand-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-105' : 'text-zinc-400'}`}>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    {(ambientAllowed && isAmbientLive) && (
                      <>
                        <path d="M22 8v8M2 8v8" className="animate-pulse opacity-80 duration-1000" />
                        <path d="M24 10v4M0 10v4" className="animate-pulse opacity-50 duration-1000 delay-150" />
                      </>
                    )}
                  </svg>
                )}
              </div>
            </button>

            <div className="text-lg font-medium tracking-wide relative z-10">
              {isProcessing ? (
                <span className="text-zinc-400 flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t("processing")}
                </span>
              ) : isRecording ? (
                <span className="text-red-400 animate-pulse">{t("recording")}</span>
              ) : (
                <span className="text-zinc-400">{t("click_to_start")}</span>
              )}
            </div>

            <div className="w-full mt-6 flex flex-col gap-3 relative z-10">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 pl-2">{t("transcript_label")}</h3>
              <div className="w-full min-h-[120px] p-6 bg-black/40 border border-white/5 rounded-3xl text-zinc-300 leading-relaxed shadow-inner">
                {transcript ? (
                  <p className="animate-in fade-in duration-500">{transcript}</p>
                ) : (
                  <p className="text-zinc-600 italic">{t("no_transcript")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showKeywordError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-zinc-900/90 border border-white/10 p-10 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.15)] flex flex-col items-center gap-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent mb-6 tracking-tight">
                Analysis Failed
              </h3>

              <div className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-red-500/10 border border-red-500/20 shadow-inner">
                 <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                 </svg>
              </div>

              <div className="flex flex-col gap-3 text-sm text-zinc-400 leading-relaxed">
                <p className="font-medium text-white/90">The recorded audio cannot be analysed because it does not contain any relevant financial parameters.</p>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-4 mt-4 w-full">
              <button
                onClick={() => setShowKeywordError(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showConsent && (
        /* Your original consent modal - unchanged */
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-zinc-900/90 border border-white/10 p-10 rounded-3xl shadow-[0_0_80px_rgba(252,103,54,0.15)] flex flex-col items-center gap-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent mb-6 tracking-tight">
                {t("ambient_title")}
              </h3>

              <div className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-brand-500/10 border border-brand-500/20 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-400 drop-shadow-[0_0_15px_rgba(252,103,54,0.5)]">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <path d="M22 8v8M2 8v8" />
                  <path d="M24 10v4M0 10v4" />
                </svg>
              </div>

              <div className="flex flex-col gap-3 text-sm text-zinc-400 leading-relaxed">
                <p className="font-medium text-white/90">{t("ambient_desc_1")}</p>
                <p className="text-brand-300/80">{t("ambient_desc_2")}</p>
                <p className="text-zinc-500">{t("ambient_desc_3")}</p>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-4 mt-4 w-full">
              <button
                onClick={() => handleConsent(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
              >
                {t("skip")}
              </button>
              <button
                onClick={() => handleConsent(true)}
                className="flex-1 py-3 rounded-2xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all"
              >
                {t("enable")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}