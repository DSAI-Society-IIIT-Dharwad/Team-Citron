# Citron: Voice-Enabled Fractional CFO

Citron is an intelligent, voice-first financial assistant designed to act as your personalized Fractional CFO. By seamlessly blending state-of-the-art ambient edge-listening with powerful multilingual transcription, Citron empowers users to capture complex financial thoughts, business ideas, and expense records at the speed of thought.

## Core Architecture

- **True Ambient Mode**: Say goodbye to complex toggles. Citron's browser-native ambient engine continuously "listens" to the room completely offline. Upon detecting distinct financial terminology or custom wake-words, it seamlessly activates the HD recording pipeline to capture all adjacent business context for 10 seconds.
- **Multilingual Support via Sarvam AI**: Dictate business metrics across 11 native Indian languages (Hindi, Tamil, Bengali, Telugu, etc.). The system transcribes everything losslessly.
- **Unified Analytics**: Captured transcripts are routed through Llama-3.3 on Groq to provide immediate, actionable fractional CFO insights, categorizing structural focus (e.g., Marketing, OpEx) and compiling them into a visual analytics dashboard.
- **Hardened Security & PII Redaction**: Advanced privacy auditing ensures that bank details, addresses, and phone numbers are instantaneously swept and redacted (`***`) by the AI before ever being written into our Supabase persistence layer. High-profile settings are naturally pin-gated.

## Tech Stack Overview

- **Frontend Configuration**: Next.js 16 (App Router), React 19, Tailwind CSS (v4), Recharts.
- **Backing Logic Layer**: Groq (Llama-3), Sarvam AI (Regional Speech-to-Text).
- **Storage Profile**: Supabase Authenticaton + Data persistence.
## View Website
Website can be found at: https://team-citron.vercel.app/

## Run Locally

Ensure you have your environment keys staged (`NEXT_PUBLIC_SARVAM_API_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the client-side instance.