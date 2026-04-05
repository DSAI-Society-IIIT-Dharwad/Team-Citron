# Citron: Your AI Financial Intelligence Companion

Citron is an AI-driven intelligence system designed to bridge the gap between informal verbal discussions and structured fiscal planning. Developed by **Team Citron for Hack2Future 2.0**, this application securely captures, transcribes, and analyzes financial mentions in real-time to help users make more informed long-term financial decisions.

---

## The Problem

In many households and professional settings, critical discussions regarding **EMIs, SIPs, and loans** happen verbally. These conversations are often **multilingual or code-mixed (e.g., Hinglish)**, leading to vague details and forgotten commitments because they are rarely documented.

---

## Our Solution

Citron acts as a **"Fractional CFO"** by automating the documentation of natural conversations. It transforms unstructured speech into organized financial insights **without requiring manual data entry**.

---

## Key Features

### Financial "Wake Word" Detection
The system initiates recording only when **finance-related words** are detected, ensuring both **security and privacy**.

### Multilingual & Code-Mixed Support
High-accuracy transcription for **English and regional Indian languages** (Hindi, Tamil, Telugu, etc.), including **code-mixed speech** such as *"EMI manage ho jayega"*.

### Structured Insight Reporting
Generates **summaries, fiscal trends, and analytical insights** for user review.

### Secure User Vault
All transcripts are **encrypted and stored securely** in a structured vault where users maintain full control to **edit, manage, or delete their history**.

---

## Technical Architecture

Citron uses a **multi-layer processing pipeline** to ensure speed and accuracy.

### Input Layer
- Ambient audio capture
- Secure Delay module

### Processing Layer
- Topic Detection to filter non-finance conversations
- Automatic Speech Recognition (ASR)
- Financial NLP Extraction

### Output Layer
- Financial Analytics Generator
- Secure History Layer for long-term tracking

---

## Tech Stack

**Frontend**
- React.js

**Backend**
- Next.js

**Database**
- PostgreSQL (Supabase)

**AI Models**
- BERT  
- FinChat-XS  
- OpenAI GPT-4o-mini

**APIs**
- Sarvam API
- Bhashini (for regional language processing)

---

## Novelty & Impact

### Privacy First
Unlike standard **always-on assistants**, Citron records only when **financial context is detected**.

### User Control
Users can **review and edit transcripts** to maintain accuracy.

### Scalability
Designed to **scale across India** by supporting multiple **regional languages and dialects**.

---

## Getting Started

### Live Demo
https://team-citron.vercel.app/

### Local Setup

1. Clone the repository

```bash
git clone <repo-url>
cd citron
```

2. Configure environment variables
```
SARVAM_API_KEY=
OPENAI_API_KEY=
SUPABASE_URL=
```
3. Install dependencies
```
npm install
```
4. Run the development server
```
npm run dev
```


5. Open in browser
```
http://localhost:3000
`
Team

Team Citron
Indian Institute of Information Technology, Dharwad

Rishik Natra