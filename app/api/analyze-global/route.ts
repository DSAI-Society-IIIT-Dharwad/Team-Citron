import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { transcripts, targetLanguage = "English" } = await req.json();

    if (!transcripts || !Array.isArray(transcripts) || transcripts.length === 0) {
      return NextResponse.json({ error: 'At least one transcript is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ 
        error: 'GROQ_API_KEY is missing in your .env.local file' 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const combinedText = transcripts.map((t: any, i: number) => `[Transcript ${i+1} Date: ${t.date}]: "${t.text}"`).join("\n\n");

    const prompt = `You are an objective financial insight extractor. 
Your goal is to improve financial accountability and help users make more informed long-term financial decisions by providing only contextual summaries and objective analytics of their transcriptions.
You strictly do not provide direct financial advice as an authoritative figure.

IMPORTANT TRANSLATION DIRECTIVE: You MUST translate every single JSON string value strictly and completely into the ${targetLanguage} language! Do not output English unless ${targetLanguage} is English.

I am providing you with a chronological list of ALL financial voice memos and transcripts recorded by the user over time.

You MUST output raw, valid JSON matching this exact schema:
{
  "primaryFocus": "A 2-3 word title describing the user's primary financial focus (e.g., Debt Management, Wealth Accumulation, Expense Tracking)",
  "objectiveSummary": "A deep, 2-paragraph objective summary of the user's financial trajectory, identifying factual trends and overarching context based squarely on the combined transcripts.",
  "suggestions": [
    "A highly detailed suggestion analyzing the data. You MUST include a markdown link to a relevant Indian financial source, tool, or educational article (e.g. [RBI Guidelines](https://rbi.org.in)).",
    "Another detailed suggestion with a markdown link to an objective resource."
  ],
  "chartData": [
    { "name": "Topic/Asset 1", "value": <Number percentage> }
  ]
}
Make chartData represent an accurate percentage distribution of the major macro-topics or assets focused on across ALL recordings (must roughly sum to 100). Minimum 4 categories. Make them highly relevant to the aggregate topics.

Transcripts: 
${combinedText}`;

    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an objective financial structurer outputting valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const resultString = completion.choices[0].message.content || '{}';
    return NextResponse.json(JSON.parse(resultString));
  } catch (error: any) {
    console.error("Groq Global Analysis Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to generate global analysis' }, { status: 500 });
  }
}
