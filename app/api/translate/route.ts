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

    const prompt = `You are an elite linguistic interpreter. Your goal is to accurately translate any text, code-mixed language (like Hinglish), or foreign language strictly to English.
Return ONLY raw, valid JSON containing the translated sentence. Do not add any stylistic notes or conversational prose. 

Output Schema:
{ 
  "translation": "The perfectly translated English representation of the source text."
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
