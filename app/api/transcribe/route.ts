import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseConfig } from "@/lib/config"
import { normalizeArabicText, calculateSimilarity } from "@/lib/arabic-utils"
import { getExpectedVerses, getIndividualVerses } from "@/lib/quran-data"
import OpenAI from 'openai'
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// File upload security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/x-m4a",
  "audio/wav"
]

// Minimum fraction of expected words that must be present to consider a verse
// attempted rather than missing entirely.
const VERSE_WORD_BUFFER_RATIO = 0.2

// Accuracy thresholds used to classify recitation quality for per-verse and
// overall feedback shown to students and teachers.
const ACCURACY_EXCELLENT_THRESHOLD = 0.95
const ACCURACY_GOOD_THRESHOLD = 0.85
const ACCURACY_NEEDS_IMPROVEMENT_THRESHOLD = 0.70

// TODO: Future security enhancements
// - Add virus scanning for uploaded files
// - Add file content validation beyond MIME type checking
// - Implement file hash verification for duplicate detection

// ---------------------------------------------------------------------------
// Rate limiting — sliding window
// ---------------------------------------------------------------------------
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// are set (production / staging). Falls back to an in-process Map for local
// dev and the test suite, where no Redis instance is available.

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// ── In-process fallback ───────────────────────────────────────────────────
const rateLimitStore = new Map<string, number[]>()

// ── Upstash singleton (lazily initialised) ────────────────────────────────
let _upstashLimiter: Ratelimit | null = null

function getUpstashLimiter(): Ratelimit | null {
  if (_upstashLimiter) return _upstashLimiter
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  _upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, "1 h"),
    analytics: true,
    prefix: "taleem_rl",
  })
  return _upstashLimiter
}

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const limiter = getUpstashLimiter()

  if (limiter) {
    // Upstash path — shared across all instances
    const { success, reset } = await limiter.limit(userId)
    if (!success) {
      return { allowed: false, retryAfterSeconds: Math.ceil((reset - Date.now()) / 1000) }
    }
    return { allowed: true }
  }

  // In-process fallback — sufficient for single-instance / tests
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (rateLimitStore.get(userId) ?? []).filter(t => t > windowStart)

  if (timestamps.length >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
    rateLimitStore.set(userId, timestamps)
    return { allowed: false, retryAfterSeconds }
  }

  timestamps.push(now)
  rateLimitStore.set(userId, timestamps)
  return { allowed: true }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// File validation helper function
function validateAudioFile(file: File): { isValid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { isValid: false, error: "No file uploaded" }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    }
  }

  // Check file type
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Unsupported file type. Allowed types: ${ALLOWED_AUDIO_TYPES.join(", ")}` 
    }
  }

  return { isValid: true }
}

// Generate verse-by-verse feedback
function generateVerseFeedback(transcribedText: string, expectedVerses: any[], surahNumber: number) {
  const normalizedTranscription = normalizeArabicText(transcribedText)
  const transcriptionWords = normalizedTranscription.split(' ').filter(word => word.trim().length > 0)
  
  const verseFeedback = []
  let currentWordIndex = 0
  
  for (const verse of expectedVerses) {
    const verseWords = verse.normalizedText.split(' ')
    const verseWordCount = verseWords.length
    
    // Extract the portion of transcription for this verse
    const verseTranscriptionWords = transcriptionWords.slice(currentWordIndex, currentWordIndex + verseWordCount)
    const verseTranscription = verseTranscriptionWords.join(' ').trim()
    
    // Check if verse is completely missing or mostly empty
    const transcribedWordCount = verseTranscriptionWords.filter(word => word.trim().length > 0).length
    const isMissing = transcribedWordCount === 0 || transcribedWordCount < Math.ceil(verseWordCount * VERSE_WORD_BUFFER_RATIO)
    
    let verseAccuracy = 0
    let differences = []
    let feedback = ""
    
    if (isMissing) {
      // Mark as missing - no word-by-word differences
      verseAccuracy = 0
      differences = []
      feedback = "Missing recitation"
    } else {
      // Calculate accuracy for this verse normally
      verseAccuracy = calculateSimilarity(verse.normalizedText, verseTranscription)
      
      // Find differences only for non-missing verses
      for (let i = 0; i < Math.max(verseWords.length, verseTranscriptionWords.length); i++) {
        const expected = verseWords[i] || "[missing]"
        const transcribed = verseTranscriptionWords[i] || "[missing]"
        
        if (expected !== transcribed) {
          differences.push({
            position: i + 1,
            expected: expected,
            transcribed: transcribed
          })
        }
      }
      
      feedback = verseAccuracy >= ACCURACY_EXCELLENT_THRESHOLD ? "Excellent!" :
                verseAccuracy >= ACCURACY_GOOD_THRESHOLD ? "Very good" :
                verseAccuracy >= ACCURACY_NEEDS_IMPROVEMENT_THRESHOLD ? "Good effort" : "Needs practice"
    }
    
    verseFeedback.push({
      surah: surahNumber,
      ayah: verse.ayah,
      expectedText: verse.text,
      transcribedText: verseTranscription || "",
      normalizedExpected: verse.normalizedText,
      normalizedTranscribed: verseTranscription,
      accuracy: verseAccuracy,
      differences: differences,
      feedback: feedback,
      isMissing: isMissing
    })
    
    currentWordIndex += verseWordCount
  }
  
  return verseFeedback
}

export async function POST(request: Request) {
  try {
    // Authentication check
    let accessToken: string | null = null
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.replace("Bearer ", "").trim()
    } else {
      const cookie = request.headers.get("cookie") || ""
      const match = cookie.match(/sb-access-token=([^;]+)/)
      if (match) accessToken = match[1]
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized: No access token provided." }, { status: 401 })
    }

    // Verify user
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 500 });
    }
    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid session." }, { status: 401 })
    }

    // Rate limit check
    const rateLimit = await checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 recitations per hour." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const audioFile = formData.get("file") as File | null
    const assignmentId = formData.get("assignmentId") as string

    // Validate required fields
    if (!audioFile) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (!assignmentId) {
      return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 })
    }

    // Validate audio file
    const fileValidation = validateAudioFile(audioFile)
    if (!fileValidation.isValid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // Get assignment details
    const serviceSupabase = await createServiceRoleClient()
    const { data: assignment, error: assignmentError } = await serviceSupabase
      .from("assignments")
      .select("surah_name, start_ayah, end_ayah")
      .eq("id", assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: `Assignment not found: ${assignmentError?.message}` }, { status: 404 })
    }

    // Extract surah number from surah_name (e.g., "1. Al-Fatihah (The Opening)" -> 1)
    const surahMatch = assignment.surah_name?.match(/^(\d+)/)
    const surahNumber = surahMatch ? parseInt(surahMatch[1], 10) : null

    if (!surahNumber || !assignment.start_ayah || !assignment.end_ayah) {
      return NextResponse.json({ error: "Invalid assignment configuration" }, { status: 400 })
    }

    const expectedText = getExpectedVerses(surahNumber, assignment.start_ayah, assignment.end_ayah)
    const individualVerses = getIndividualVerses(surahNumber, assignment.start_ayah, assignment.end_ayah)
    
    if (!expectedText || individualVerses.length === 0) {
      return NextResponse.json({ error: "Could not find expected verses" }, { status: 400 })
    }

    // Transcribe audio using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ar", // Arabic
      response_format: "text"
    })

    const transcribedText = transcription.trim()

    if (!transcribedText) {
      return NextResponse.json({ error: "Transcription failed: No text detected" }, { status: 400 })
    }

    // Upload audio to Supabase Storage (non-fatal — recitation is saved even if upload fails)
    let audioStoragePath: string | null = null
    try {
      const ext =
        audioFile.name?.split(".").pop()?.toLowerCase() ||
        audioFile.type.split("/")[1]?.replace("x-m4a", "m4a") ||
        "audio"
      const storagePath = `${user.id}/${assignmentId}/${Date.now()}.${ext}`
      const arrayBuffer = await audioFile.arrayBuffer()
      const { error: uploadError } = await serviceSupabase.storage
        .from("recitations")
        .upload(storagePath, arrayBuffer, { contentType: audioFile.type, upsert: false })
      if (uploadError) {
        console.error("[transcribe] Audio storage upload failed:", uploadError.message)
      } else {
        audioStoragePath = storagePath
      }
    } catch (uploadErr) {
      console.error("[transcribe] Audio storage upload error:", uploadErr)
      // Non-fatal — continue without audio_url
    }

    // Normalize texts for comparison
    const normalizedTranscription = normalizeArabicText(transcribedText)
    const normalizedExpected = normalizeArabicText(expectedText)

    // Calculate accuracy
    const accuracy = calculateSimilarity(normalizedTranscription, normalizedExpected)

    // Generate verse-by-verse feedback
    const verseFeedback = generateVerseFeedback(transcribedText, individualVerses, surahNumber)
    
    // Calculate overall verse statistics
    const verseAccuracies = verseFeedback.map(v => v.accuracy)
    const averageVerseAccuracy = verseAccuracies.reduce((sum, acc) => sum + acc, 0) / verseAccuracies.length
    const excellentVerses = verseFeedback.filter(v => v.accuracy >= ACCURACY_EXCELLENT_THRESHOLD).length
    const goodVerses = verseFeedback.filter(v => v.accuracy >= ACCURACY_NEEDS_IMPROVEMENT_THRESHOLD).length

    // Generate overall feedback
    let feedback = ""
    const status = "completed"

    if (averageVerseAccuracy >= ACCURACY_EXCELLENT_THRESHOLD) {
      feedback = `Excellent recitation! ${excellentVerses}/${verseFeedback.length} verses were nearly perfect.`
    } else if (averageVerseAccuracy >= ACCURACY_GOOD_THRESHOLD) {
      feedback = `Very good recitation! ${excellentVerses} excellent verses, ${goodVerses} verses need minor improvement.`
    } else if (averageVerseAccuracy >= ACCURACY_NEEDS_IMPROVEMENT_THRESHOLD) {
      feedback = `Good effort! ${goodVerses}/${verseFeedback.length} verses were good. Keep practicing the challenging verses.`
    } else {
      feedback = `Keep practicing! Focus on individual verses for better pronunciation. ${goodVerses}/${verseFeedback.length} verses were acceptable.`
    }

    // Create recitation record
    const { data: recitation, error: recitationError } = await serviceSupabase
      .from("recitations")
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        audio_url: audioStoragePath,
        transcription: transcribedText,
        transcription_status: status,
        submitted_at: new Date().toISOString(),
        is_latest: true,
        verse_feedback: verseFeedback
      })
      .select()
      .single()

    if (recitationError) {
      return NextResponse.json({ error: "Failed to save recitation" }, { status: 500 })
    }

    // Create feedback record
    const { error: feedbackError } = await serviceSupabase
      .from("feedback")
      .insert({
        recitation_id: recitation.id,
        accuracy: accuracy,
        notes: feedback
      })

    if (feedbackError) {
      console.error("Failed to save feedback:", feedbackError)
    }

    // Mark any previous submissions as not latest
    await serviceSupabase
      .from("recitations")
      .update({ is_latest: false })
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .neq("id", recitation.id)

    return NextResponse.json({
      success: true,
      recitationId: recitation.id,
      transcription: transcribedText,
      expectedText: expectedText,
      accuracy: Math.round(averageVerseAccuracy * 100),
      feedback: feedback,
      verseFeedback: verseFeedback,
      statistics: {
        totalVerses: verseFeedback.length,
        excellentVerses: excellentVerses,
        goodVerses: goodVerses,
        averageAccuracy: Math.round(averageVerseAccuracy * 100)
      }
    })

  } catch (error: any) {
    console.error("Transcription error:", error)
    return NextResponse.json({ 
      error: `Failed to process recitation: ${error.message}` 
    }, { status: 500 })
  }
} 