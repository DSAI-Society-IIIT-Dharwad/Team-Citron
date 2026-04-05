import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ 
        error: 'GROQ_API_KEY is missing' 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const prompt = `You are an elite linguistic interpreter and strict privacy auditor. Your goals are:
1. Accurately translate any text, code-mixed language (like Hinglish), or foreign language strictly to English.
2. Maintain the exact original text, but fully redact identifying PII (addresses, phone numbers, bank details, credit cards, emails, SSN/Aadhar) with asterisks (***).
3. Ensure the English translation is similarly redacted.

Return ONLY raw, valid JSON containing the translated and redacted components. Do not add any stylistic notes or conversational prose. 

Output Schema:
{ 
  "redacted_original": "The mathematically original string, with ONLY the PII explicitly replaced by ***",
  "translation": "The perfectly translated English representation, also fully redacted."
}

Source text to translate: "${text}"`;

    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a translation API. You output raw valid JSON strictly without markdown framing.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const resultString = completion.choices[0].message.content || '{}';
    return NextResponse.json(JSON.parse(resultString));
  } catch (error: any) {
    console.error("Translation API Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to translate' }, { status: 500 });
  }
}
