// File: components/recitation-recorder.tsx
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, Square, Play, Pause, Upload, AlertCircle } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { isPastDuePST } from "@/lib/date-utils"

interface RecitationRecorderProps {
  assignmentId: string
  studentId: string
  onRecitationSubmitted: (recitationId: string) => void
  // FIX: Make the due date prop optional to prevent render crashes
  assignmentDueDate?: string; 
}



export function RecitationRecorder({ assignmentId, studentId, onRecitationSubmitted, assignmentDueDate }: RecitationRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0); 
  const [processedAudioDuration, setProcessedAudioDuration] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [recordingSupported, setRecordingSupported] = useState(true)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingStartRef = useRef<number | null>(null);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
    
    // Check MediaRecorder support
    const checkRecordingSupport = () => {
      if (!window.MediaRecorder) {
        setRecordingSupported(false);
        return;
      }
      
      // Test if any supported MIME types work
      const testTypes = ["audio/mp4", "audio/aac", "audio/mpeg", "audio/webm", "audio/wav"];
      const hasSupport = testTypes.some(type => MediaRecorder.isTypeSupported(type));
      setRecordingSupported(hasSupport);
    };
    
    checkRecordingSupport();
    
    return () => {
      stopMediaTracks()
      clearTimerInterval()
      releaseAudioUrl()
    }
  }, [])

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const clearTimerInterval = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const releaseAudioUrl = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
  }

  const resetRecordingStates = (isStartingNewRecording = false) => { 
    if (!isStartingNewRecording) {
        stopMediaTracks();
    }
    clearTimerInterval();
    releaseAudioUrl();
    setAudioBlob(null);
    setRecordingDuration(0);
    setProcessedAudioDuration(null); 
    if (!isStartingNewRecording || error) setError(null);
    setIsPlaying(false);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; 
        audioRef.current.load(); 
        audioRef.current.currentTime = 0;
    }
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch (e) { console.error("Error stopping recorder in reset:", e); }
    }
    mediaRecorderRef.current = null;
    if (!isStartingNewRecording) setIsRecording(false);
    setIsUploading(false);
  }

  const startRecording = async () => {
    resetRecordingStates(true);
    try {
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("Audio recording is not supported on this device. Please use the 'Upload Audio' option instead.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: 44100, min: 22050, max: 48000 },
          channelCount: 1,
        } 
      })
      streamRef.current = stream
      
      let recorder: MediaRecorder | null = null;
      // iOS Safari compatible MIME types (prioritize MP4/AAC for iOS)
      const mimeTypesToTry = [ 
        "audio/mp4", 
        "audio/aac",
        "audio/mpeg",
        "audio/webm;codecs=opus", 
        "audio/webm", 
        "audio/ogg;codecs=opus",
        "audio/wav"
      ];
      
      for (const mimeType of mimeTypesToTry) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          try {
            recorder = new MediaRecorder(stream, { 
              mimeType, 
              audioBitsPerSecond: 128000 // Lower bitrate for iOS compatibility
            });
            console.log(`Using MIME type: ${mimeType}`);
            break;
          } catch (e) {
            console.error(`Failed to create MediaRecorder with ${mimeType}:`, e);
          }
        }
      }
      
      if (!recorder) {
         try {
            // Fallback without specifying options for maximum compatibility
            recorder = new MediaRecorder(stream);
            console.log("Using default MediaRecorder configuration");
         } catch (e) {
            throw new Error("Audio recording is not supported on this device. Please use the 'Upload Audio' option instead.");
         }
      }
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => processRecording();
      recorder.onerror = (event: Event) => {
        setError("Recording system error. Please try again.");
        resetRecordingStates();
      }
      
      recorder.start(250);
      recordingStartRef.current = Date.now();
      setIsRecording(true) 

      setRecordingDuration(0); 
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      setError(`Could not start recording: ${err.message}. Please ensure microphone access is allowed and try again.`)
      resetRecordingStates()
    }
  }

  const stopRecording = () => {
    setIsRecording(false); 
    clearTimerInterval(); 
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
    } else {
      if (audioChunksRef.current.length > 0) processRecording(); else stopMediaTracks();
    }
  }

  const processRecording = () => {
    const fallbackDuration = recordingStartRef.current !== null ? (Date.now() - recordingStartRef.current) / 1000 : null;

    if (audioChunksRef.current.length === 0) {
        setError("No audio data was recorded. Please try recording for a longer duration.");
        resetRecordingStates(); 
        return;
    }

    try {
      const mimeType = mediaRecorderRef.current?.mimeType || audioChunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      
      if (blob.size === 0) {
        setError("Recording resulted in an empty audio file. Please try again.");
        resetRecordingStates();
        return;
      }

      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const newAudioUrl = URL.createObjectURL(blob);
      setAudioUrl(newAudioUrl); 
      
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        const durationFromMetadata = audio.duration;
        const finalDuration = (isNaN(durationFromMetadata) || !isFinite(durationFromMetadata)) ? fallbackDuration : durationFromMetadata;

        if (finalDuration !== null && finalDuration >= 0.5) {
          setAudioBlob(blob);
          setProcessedAudioDuration(finalDuration);
          setError(null);
        } else {
          setError(`Recording too short or invalid (duration: ${finalDuration?.toFixed(2) || 'N/A'}s, min 0.5s). Please try again.`);
          URL.revokeObjectURL(newAudioUrl);
          setAudioUrl(null);
        }
        recordingStartRef.current = null;
      };

      audio.onerror = () => {
        if (fallbackDuration !== null && fallbackDuration >= 0.5) {
            setAudioBlob(blob);
            setProcessedAudioDuration(fallbackDuration);
            setError(null);
        } else {
            setError(`Failed to read audio properties and fallback duration was invalid. Please try re-recording.`);
            URL.revokeObjectURL(newAudioUrl);
            setAudioUrl(null);
        }
        recordingStartRef.current = null;
      };
      
      audio.src = newAudioUrl;
      audio.load();

    } catch (err: any) {
      setError(`Failed to process recording: ${err.message}`);
    } finally {
        stopMediaTracks();
        audioChunksRef.current = [];
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = 0; 
      audioRef.current.play().catch((err) => setError(`Could not play audio: ${err.message}`));
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetRecordingStates(); 
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setError("Please upload a valid audio file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError("File size must be less than 10MB");
      return;
    }
    
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const newUrl = URL.createObjectURL(file);
    setAudioUrl(newUrl); 
    
    const audio = new Audio(newUrl);
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      if (!duration || isNaN(duration) || duration < 0.5) {
        setError("Uploaded audio file is too short (min 0.5s) or invalid.");
        URL.revokeObjectURL(newUrl);
        setAudioUrl(null);
        return;
      }
      setAudioBlob(file); 
      setProcessedAudioDuration(duration);
      setError(null);
    };
    audio.onerror = () => {
      setError("Failed to process uploaded audio file. It may be corrupted.");
      URL.revokeObjectURL(newUrl);
      setAudioUrl(null);
    };
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null || isNaN(seconds)) return "00:00";
    const totalSeconds = Math.max(0, seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  
  const handleSubmit = async () => {
    if (!audioBlob || processedAudioDuration === null || processedAudioDuration < 0.5) {
      setError("A valid audio recording is required for submission.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Get the user's access token
      const supabase = createClientComponentClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("Not authenticated");
      const accessToken = sessionData.session.access_token;

      // Prepare form data for the transcribe API
      const formData = new FormData();
      formData.append("file", audioBlob);
      formData.append("assignmentId", assignmentId);

      // Submit to the new transcribe API endpoint
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process recitation");
      }

      const result = await response.json();

      toast({
        title: "Recitation Submitted Successfully!",
        description: `Accuracy: ${result.accuracy}% - ${result.feedback.split('\n')[0]}`,
      });
      
      onRecitationSubmitted(result.recitationId);
      
    } catch (err: any) {
      let errorMsg: string = "Failed to submit recitation";
      if (typeof err === "string") errorMsg = err;
      else if (err && typeof err.message === "string") errorMsg = err.message;
      else errorMsg = JSON.stringify(err);
      setError(errorMsg);
      setIsUploading(false);
      toast({
        title: "Submission Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium text-foreground mb-4">Record Your Recitation</h3>

          {error && (
            <div className="w-full bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {isRecording ? (
            <div className="text-center w-full">
              <div className="text-2xl font-mono mb-4 text-destructive">{formatTime(recordingDuration)}</div>
              <div className="animate-pulse mb-4 h-16 flex items-center justify-center">
                <div className="bg-red-600 h-8 w-8 rounded-full"></div>
              </div>
              <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full sm:w-auto">
                <Square className="mr-2 h-4 w-4" />
                Stop Recording
              </Button>
            </div>
          ) : audioUrl ? (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-center bg-muted p-4 rounded-md">
                <Button onClick={togglePlayback} variant="outline" size="icon" className="mr-4" disabled={!processedAudioDuration}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <audio
                  ref={audioRef}
                  src={audioUrl} 
                  className="hidden" 
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {isPlaying ? "Playing..." : "Ready to play"} Duration: {formatTime(processedAudioDuration)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  onClick={() => resetRecordingStates(false)}
                  variant="outline"
                >
                  Record/Upload Again
                </Button>
                <Button onClick={handleSubmit} disabled={isUploading || !audioBlob || (processedAudioDuration === null || processedAudioDuration < 0.5)}>
                  {isUploading ? "Submitting..." : "Submit Recitation"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {recordingSupported ? (
                  <Button 
                    onClick={startRecording} 
                    variant="default" 
                    size="lg" 
                    className="w-full sm:w-auto"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <div className="w-full sm:w-auto">
                    <Button 
                      disabled 
                      variant="outline" 
                      size="lg" 
                      className="w-full opacity-50"
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Recording Not Available
                    </Button>
                    {isIOS && (
                      <p className="text-xs text-amber-600 mt-1 text-center">
                        Direct recording not supported on iOS Safari
                      </p>
                    )}
                  </div>
                )}
                <div className="relative w-full sm:w-auto">
                  <Button 
                    variant={recordingSupported ? "outline" : "default"}
                    size="lg"
                    className="w-full"
                    onClick={() => document.getElementById("audio-upload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Audio
                  </Button>
                  <input
                    id="audio-upload"
                    type="file"
                    accept=".mp3,.wav,.m4a,.aac,.ogg,.webm,audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/aac,audio/ogg,audio/webm"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <p>Supported formats: .mp3, .wav, .m4a, .aac, .ogg, .webm</p>
                <p>Maximum file size: 10MB. Minimum duration: 0.5 seconds.</p>
                {isIOS ? (
                                <div className="text-xs mt-2 p-2 bg-blue-50 rounded-md">
                <p className="font-medium text-blue-700">📱 iOS Instructions:</p>
                    <p className="mt-1">1. Record audio using Voice Memos app</p>
                    <p>2. Save to Files app</p>
                    <p>3. Tap "Upload Audio" to select your recording</p>
                  </div>
                ) : (
                  <p className="text-xs mt-1">
                    You can record directly or upload existing audio files
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}