from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os

app = FastAPI()
model = whisper.load_model("tiny") # Use "tiny" or "base" for speed in a hackathon

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # Save temp file and run model.transcribe()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        content = await file.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name

    try:
        result = model.transcribe(temp_audio_path)
        return {"text": result["text"]}
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
