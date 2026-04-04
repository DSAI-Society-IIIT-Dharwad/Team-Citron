import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("Transcribing file:", file.name, "Type:", file.type);
    
    // Prepare the payload for Sarvam API
    const sarvamFormData = new FormData();
    sarvamFormData.append("file", file);
    sarvamFormData.append("model", "saaras:v3"); 

    console.log("Sarvam API Key status:", process.env.SARVAM_API_KEY ? "Present" : "Missing!");
    console.log("Sending to Sarvam AI...");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY || "",
      },
      body: sarvamFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam API Error:", errorText);
      return NextResponse.json(
        { error: "Sarvam API request failed", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Sarvam API usually returns the text under "transcript" 
    const transcriptText = data.transcript || data.text || "";
    
    return NextResponse.json({ text: transcriptText });
  } catch (error: any) {
    console.error("Transcription route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
