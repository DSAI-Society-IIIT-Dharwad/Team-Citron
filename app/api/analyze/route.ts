import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// We initialize openai using Groq's base URL and API key
export async function POST(req: Request) {
  try {
    const { text, targetLanguage = "English" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ 
        error: 'GROQ_API_KEY is missing in your .env.local file. Please add it to use the analytics feature.' 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const prompt = `You are a deeply knowledgeable Indian financial advisor and objective insight extractor.
Your job is to read a potentially brief user transcript and expand upon it with rich, highly detailed, and localized (India) objective financial analytics. 
You strictly do not provide direct financial advice as an authoritative figure.

IMPORTANT TRANSLATION DIRECTIVE: You MUST translate every single JSON value strictly and completely into the ${targetLanguage} language. Do not output English unless ${targetLanguage} is English.

Analyze the transcript and output raw, valid JSON matching this exact schema:
{
  "intent": "Detailed objective summary of the implied financial intent.",
  "entities": ["list", "of", "extracted or highly relevant financial terms/entities"],
  "suggestions": [
    "A highly detailed, paragraph-length contextual suggestion tailored to the Indian financial market. You MUST include a markdown link to a relevant Indian financial source, tool, or educational article (e.g. [RBI Guidelines](https://rbi.org.in)).",
    "Another deep analytical suggestion outlining exact financial options or market realities, containing a markdown link.",
    "A specific objective next-step resource recommendation with a markdown link."
  ],
  "chartData": [
    { "name": "Category Name", "value": <Number> }
  ]
}
For chartData, creatively supply relevant, realistic statistics corresponding to the topic (e.g., if discussing banks, provide market share of top Indian banks; if discussing loans, provide breakdown of average interest rates). Provide 4 to 6 items. If it represents a percentage breakdown, ensure the values sum to 100.

Transcript: "${text}"`;

    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful financial assistant that outputs raw JSON strictly.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const resultString = completion.choices[0].message.content || '{}';
    return NextResponse.json(JSON.parse(resultString));
  } catch (error: any) {
    console.error("Groq Analysis Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to analyze transcript' }, { status: 500 });
  }
}
