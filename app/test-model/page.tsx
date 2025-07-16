"use client";

import React, { useState, useRef } from "react";

export default function TestModelPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [matches, setMatches] = useState<any[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/mp4", "audio/aac"].includes(file.type)) {
        setError("Unsupported audio format. Please upload a .wav, .mp3, or .m4a file.");
        setAudioFile(null);
        return;
      }
      setAudioFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setMatches(null);
    setError(null);
    if (!audioFile) {
      setError("Please upload an audio file.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      const response = await fetch("/api/test-openai-proxy", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unknown error");
      } else {
        setResult(data.text);
        setMatches(data.matches || null);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="bg-card border border-border rounded-xl shadow p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Test GPT-4o Transcribe</h1>
        <p className="mb-4 text-muted-foreground">Upload or record an audio file to test OpenAI GPT-4o's transcription capabilities. The audio will be sent to the GPT-4o Transcribe endpoint via a secure proxy.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp3,audio/x-m4a,audio/mp4,audio/aac"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 px-4 font-medium hover:bg-primary/90 disabled:opacity-50"
            disabled={loading || !audioFile}
          >
            {loading ? "Transcribing..." : "Transcribe Audio"}
          </button>
        </form>
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive border border-destructive rounded-lg text-sm">
            {typeof error === 'object' ? JSON.stringify(error) : error}
          </div>
        )}
        {result && (
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Transcription Result (Whisper):</h2>
            <div className="bg-muted rounded p-3 whitespace-pre-wrap mb-4">
              {typeof result === 'object' ? JSON.stringify(result) : result}
            </div>
            {matches && (
              <div>
                <h3 className="font-semibold mb-2">Top 3 Ayah Matches:</h3>
                <ol className="space-y-2">
                  {matches.map((m, i) => (
                    <li key={i} className="border border-border rounded p-2">
                      <div><span className="font-semibold">Surah:</span> {m.surah}</div>
                      <div><span className="font-semibold">Ayah:</span> {m.ayahNumber}</div>
                      <div><span className="font-semibold">Text:</span> <span className="font-arabic text-lg">{m.text}</span></div>
                      <div><span className="font-semibold">Similarity:</span> {(m.similarity * 100).toFixed(1)}%</div>
                      {i === 0 && result && (
                        <div className="mt-2">
                          <span className="font-semibold">Diff:</span> {renderDiff(result, m.text)}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Add a simple diff function for optional highlighting
function renderDiff(transcribed: string, ayah: string) {
  // Basic word diff: highlight words in transcribed not in ayah
  const tWords = transcribed.split(/\s+/);
  const aWords = ayah.split(/\s+/);
  return (
    <span>
      {tWords.map((w, i) =>
        aWords.includes(w) ? (
          <span key={i}>{w} </span>
        ) : (
          <span key={i} className="bg-yellow-200 text-red-700 rounded px-1">{w} </span>
        )
      )}
    </span>
  );
} 