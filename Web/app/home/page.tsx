"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
      } else {
        setUser(session.user);
        setLoadingAuth(false);
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          router.push("/");
        } else {
          setUser(session.user);
          setLoadingAuth(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      setStatus("Requesting microphone access...");
      // Ask for microphone permission and start stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setStatus("Processing audio...");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("Recording...");
    } catch (err) {
      console.error("Error accessing mic:", err);
      setStatus("Error: Could not access microphone. Make sure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all audio tracks entirely so the browser "recording" indicator goes away
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      setStatus("Transcribing audio...");
      // Send audio to local FastAPI server
      const response = await fetch("http://localhost:8000/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setTranscript(data.text);
      setStatus("Transcript ready");

      // Save the result to Supabase
      saveTranscript(data.text);
    } catch (error) {
      console.error("Transcription error:", error);
      setStatus("Error: Transcription failed. Is the FastAPI server running?");
    }
  };

  const saveTranscript = async (text: string) => {
    try {
      if (!text) return;
      
      setStatus("Saving to database...");
      const { error } = await supabase
        .from("transcripts")
        .insert([{ 
          raw_text: text, 
          entities: {}, 
          user_id: user?.id
        }]);

      if (error) throw error;
      setStatus("Saved successfully!");
    } catch (err) {
      console.error("Supabase insert error:", err);
      setStatus("Error: Could not save transcript to database.");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-sans">
        Validating session...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-zinc-50 dark:bg-zinc-950 font-sans relative">
      <button 
        onClick={handleSignOut}
        className="absolute top-8 right-8 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        Sign Out
      </button>
      <main className="flex flex-col items-center w-full max-w-2xl bg-white dark:bg-black p-10 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">Voice Transcriber</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">Record your audio and see the transcript below.</p>

        <div className="flex space-x-4 mb-8">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors flex items-center space-x-2"
            >
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-colors flex items-center space-x-2"
            >
              <div className="w-3 h-3 bg-white rounded-sm" />
              <span>Stop Recording</span>
            </button>
          )}
        </div>

        {status && (
          <div className="mb-6 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">
            {status}
          </div>
        )}

        <div className="w-full">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-50">Transcript</h2>
          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl min-h-[8rem] border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
            {transcript ? (
              <p className="leading-relaxed">{transcript}</p>
            ) : (
              <p className="text-zinc-400 dark:text-zinc-600 italic">No transcript yet. Start recording to see the results here.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
