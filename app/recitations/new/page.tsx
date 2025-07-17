"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase/client"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { AlertCircle } from "lucide-react"
import { RecitationRecorder } from "@/components/recitation-recorder"
import { RecitationFeedback } from "@/components/recitation-feedback"
import { removeDiacritics } from "@/lib/arabic-utils";
// Dynamic import for quran.json to avoid static import issues

export default function NewRecitationPage() {
  const [assignment, setAssignment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [previousSubmission, setPreviousSubmission] = useState<any>(null)
  const [submittedRecitationId, setSubmittedRecitationId] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<string | null>(null);

  const router = useRouter()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get("assignment")

  useEffect(() => {
    const supabase = createClientComponentClient()

    const loadData = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          router.push("/login")
          return
        }

        setUser(sessionData.session.user)

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()

        if (profileError || !profileData) {
          setError("Failed to load profile")
          setLoading(false)
          return
        }

        if (profileData.role !== "student") {
          router.push("/dashboard")
          return
        }

        if (!assignmentId) {
          setError("No assignment specified")
          setLoading(false)
          return
        }

        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("*, classes(*)")
          .eq("id", assignmentId)
          .single()

        if (assignmentError || !assignmentData) {
          setError("Assignment not found")
          setLoading(false)
          return
        }
        
        const { data: enrollment, error: enrollmentError } = await supabase
          .from("class_students")
          .select("*")
          .eq("class_id", assignmentData.class_id)
          .eq("student_id", sessionData.session.user.id)
          .single()

        if (enrollmentError || !enrollment) {
          setError("You are not enrolled in this class")
          setLoading(false)
          return
        }

        const { data: assignmentStudent, error: assignmentStudentError } = await supabase
          .from("assignment_students")
          .select("*")
          .eq("assignment_id", assignmentId)
          .eq("student_id", sessionData.session.user.id)
          .single()

        if (assignmentStudentError || !assignmentStudent) {
          setError("This assignment is not assigned to you")
          setLoading(false)
          return
        }

        const { data: existingSubmissions, error: submissionsError } = await supabase
          .from("recitations")
          .select("*")
          .eq("assignment_id", assignmentId)
          .eq("student_id", sessionData.session.user.id)
          .eq("is_latest", true)
          .order("submitted_at", { ascending: false })
          .limit(1)

        if (!submissionsError && existingSubmissions && existingSubmissions.length > 0) {
          setPreviousSubmission(existingSubmissions[0])
          setSubmittedRecitationId(typeof existingSubmissions[0].id === "string" ? existingSubmissions[0].id : null)
        }

        setAssignment(assignmentData as any)
        
      } catch (err: any) {
        console.error("Error loading data:", err)
        setError(typeof err === "string" ? err : "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [assignmentId, router])

  const handleRecitationSubmitted = (recitationId: string) => {
    setSubmittedRecitationId(recitationId)
  }

  const generateAssignmentTitle = (surahName: string, startAyah: number, endAyah: number) => {
    const surahNameOnly = surahName.replace(/^\d+\.\s+/, "").split(" (")[0];
    if (startAyah === endAyah) {
        return `${surahNameOnly} - Ayah ${startAyah}`;
    }
    return `${surahNameOnly} - Ayahs ${startAyah}-${endAyah}`;
  }

  // Helper to get the first ayah text for the assignment
  const [quran, setQuran] = useState<Record<string, any[]> | null>(null);
  useEffect(() => {
    if (!quran) {
      (async () => {
        try {
          const res = await fetch('/quran.json');
          if (res.ok) {
            const data = await res.json();
            setQuran(data);
          } else {
            setQuran(null);
          }
        } catch {
          setQuran(null);
        }
      })();
    }
  }, [quran]);

  function getFirstAyahText(assignment: any) {
    if (!assignment?.surah && !assignment?.surah_name) return null;
    if (!assignment?.start_ayah) return null;
    if (!quran) return null;

    // Try to get surah number as number
    let surahNum: number | null = null;
    if (typeof assignment.surah === "number") {
      surahNum = assignment.surah;
    } else if (typeof assignment.surah === "string") {
      // Try to parse number from string (e.g., "1. Al-Fatihah")
      const match = assignment.surah.match(/^(\d+)/);
      if (match) surahNum = parseInt(match[1], 10);
    } else if (assignment.surah_name) {
      const match = assignment.surah_name.match(/^(\d+)/);
      if (match) surahNum = parseInt(match[1], 10);
    }
    if (!surahNum) return (
      <span className="text-xs text-destructive">Could not determine surah number (got: {String(assignment.surah || assignment.surah_name)})</span>
    );

    const ayahs = quran?.[String(surahNum)] || quran?.[surahNum];
    if (!ayahs || !Array.isArray(ayahs)) return (
      <span className="text-xs text-destructive">No ayahs found for surah {String(surahNum)}</span>
    );

    // Try to match ayah number as number or string, and check for 'verse', 'ayah', or 'chapter' keys
    const startAyahNum = typeof assignment.start_ayah === "number" ? assignment.start_ayah : parseInt(assignment.start_ayah, 10);
    let ayah = ayahs.find((a: any) => {
      // Support 'verse', 'ayah', and 'chapter' keys
      const ayahNum = a.verse ?? a.ayah ?? a.chapter;
      return ayahNum == startAyahNum || String(ayahNum) == String(startAyahNum);
    });
    // Fallback: try off-by-one (sometimes data is 0-based)
    if (!ayah && startAyahNum > 0) {
      ayah = ayahs.find((a: any) => {
        const ayahNum = a.verse ?? a.ayah ?? a.chapter;
        return ayahNum == startAyahNum + 1 || String(ayahNum) == String(startAyahNum + 1);
      });
    }
    if (!ayah) {
      return (
        <span className="text-xs text-destructive">Could not find ayah {String(assignment.start_ayah)} in surah {String(surahNum)}</span>
      );
    }
    return ayah.text || null;
  }

  // Helper to get the full assignment ayah text (for the assigned range)
  function getAssignmentAyahsText(assignment: any): string {
    if (!assignment?.surah && !assignment?.surah_name) return "";
    if (!assignment?.start_ayah || !assignment?.end_ayah || !quran) return "";
    // Get surah number
    let surahNum: number | null = null;
    if (typeof assignment.surah === "number") {
      surahNum = assignment.surah;
    } else if (typeof assignment.surah === "string") {
      const match = assignment.surah.match(/^(\d+)/);
      if (match) surahNum = parseInt(match[1], 10);
    } else if (assignment.surah_name) {
      const match = assignment.surah_name.match(/^(\d+)/);
      if (match) surahNum = parseInt(match[1], 10);
    }
    if (!surahNum) return "";
    const ayahs = quran?.[String(surahNum)] || quran?.[surahNum];
    if (!ayahs || !Array.isArray(ayahs)) return "";
    // Get all ayahs in the assignment range
    const start = typeof assignment.start_ayah === "number" ? assignment.start_ayah : parseInt(assignment.start_ayah, 10);
    const end = typeof assignment.end_ayah === "number" ? assignment.end_ayah : parseInt(assignment.end_ayah, 10);
    const ayahTexts = ayahs
      .filter((a: any) => {
        const ayahNum = a.verse ?? a.ayah ?? a.chapter;
        return ayahNum >= start && ayahNum <= end;
      })
      .map((a: any) => a.text);
    return ayahTexts.join(" ");
  }

  // Helper to render colored ayahs for the whole assignment
  function renderColoredAssignmentAyahs(assignmentText: string, transcription: string | null) {
    if (!transcription) return (
      <span className="text-3xl font-arabic text-foreground leading-relaxed text-center" style={{ wordBreak: 'break-word' }}>{assignmentText}</span>
    );
    // Remove harakat and normalize hamzat al-wasl for comparison
    const expected = removeDiacritics(assignmentText).replace(/ٱ/g, "ا").replace(/\s+/g, "");
    const actual = transcription.replace(/ٱ/g, "ا").replace(/\s+/g, "");
    const expectedLetters = expected.split("");
    const actualLetters = actual.split("");
    return (
      <span className="text-3xl font-arabic leading-relaxed text-center" style={{ wordBreak: 'break-word' }}>
        {expectedLetters.map((char: string, i: number) => {
          const userChar = actualLetters[i];
          let color = "text-foreground";
          if (userChar === undefined) color = "text-gray-400"; // missing
          else if (userChar === char) color = "text-green-600";
          else color = "text-red-500";
          return <span key={i} className={color}>{char}</span>;
        })}
        {/* Show extra letters in transcription as red */}
        {actualLetters.length > expectedLetters.length && actualLetters.slice(expectedLetters.length).map((char: string, j: number) => (
          <span key={"extra-"+j} className="text-red-500">{char}</span>
        ))}
      </span>
    );
  }

  // Fetch transcription after submission
  useEffect(() => {
    const fetchTranscription = async () => {
      if (!submittedRecitationId) return;
      try {
        const supabase = createClientComponentClient();
        const { data, error } = await supabase
          .from("recitations")
          .select("transcription")
          .eq("id", submittedRecitationId)
          .single();
        if (!error && data && data.transcription) {
          setTranscription(data.transcription);
        } else {
          setTranscription(null);
        }
      } catch {
        setTranscription(null);
      }
    };
    fetchTranscription();
  }, [submittedRecitationId]);

  // Helper to render colored ayah after submission
  function renderColoredAyah(ayahText: string, transcription: string | null) {
    if (!transcription) return (
      <span className="text-3xl font-arabic text-foreground leading-relaxed text-center" style={{ wordBreak: 'break-word' }}>{ayahText}</span>
    );
    // Remove harakat from ayah for comparison and normalize hamzat al-wasl to regular alif
    const ayahNoHarakat = removeDiacritics(ayahText).replace(/ٱ/g, "ا");
    // Remove spaces from both for letter comparison
    const ayahLetters = ayahNoHarakat.replace(/\s+/g, "").split("");
    // Also normalize hamzat al-wasl in transcription
    const transLetters = transcription.replace(/\s+/g, "").replace(/ٱ/g, "ا").split("");
    return (
      <span className="text-3xl font-arabic leading-relaxed text-center" style={{ wordBreak: 'break-word' }}>
        {ayahLetters.map((char: string, i: number) => {
          const userChar = transLetters[i];
          let color = "text-foreground";
          if (userChar === undefined) color = "text-gray-400"; // missing
          else if (userChar === char) color = "text-green-600";
          else color = "text-red-500";
          return <span key={i} className={color}>{char}</span>;
        })}
        {/* Show extra letters in transcription as red */}
        {transLetters.length > ayahLetters.length && transLetters.slice(ayahLetters.length).map((char: string, j: number) => (
          <span key={"extra-"+j} className="text-red-500">{char}</span>
        ))}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-6 rounded-lg max-w-md w-full">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
          <div className="min-h-screen bg-background">
              <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <TaleemLogo className="h-8 w-auto text-purple-600 mr-2" />
            <h1 className="text-2xl font-bold text-foreground">Submit Recitation</h1>
          </div>
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-800">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card shadow rounded-lg p-6">
          {assignment && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {assignment.title ||
                  (assignment.surah_name && assignment.start_ayah && assignment.end_ayah
                    ? generateAssignmentTitle(assignment.surah_name, assignment.start_ayah, assignment.end_ayah)
                    : assignment.surah)}
              </h2>
              <p className="text-muted-foreground mt-1">
                {assignment.surah_name ? (
                  <>
                    Surah: {assignment.surah_name.split(" (")[0].replace(/^\d+\.\s+/, "")}
                    {assignment.start_ayah && assignment.end_ayah && (
                      <>
                        , Ayahs: {assignment.start_ayah}-{assignment.end_ayah}
                      </>
                    )}
                  </>
                ) : (
                  <>Surah: {assignment.surah}</>
                )}
              </p>
              <p className="text-muted-foreground">
                Due: {new Date(assignment.due_date).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          )}

          {previousSubmission && !submittedRecitationId && (
            <div className="mb-6 bg-info/10 p-4 rounded-lg border border-info/20">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-info mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-info">
                    You have already submitted this assignment
                  </h3>
                  <p className="text-sm text-info mt-1">
                    Your previous submission was on{" "}
                    {new Date(previousSubmission.submitted_at).toLocaleString("en-US", {
                      timeZone: "America/Los_Angeles",
                    })}
                    . You can submit again to replace your previous submission.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {submittedRecitationId ? (
              <RecitationFeedback recitationId={submittedRecitationId} />
            ) : (
              assignment && user && (
                <RecitationRecorder
                  assignmentId={assignmentId!}
                  studentId={user.id}
                  onRecitationSubmitted={handleRecitationSubmitted}
                  assignmentDueDate={assignment.due_date}
                />
              )
            )}

            {/* Assignment Ayahs Visual Cue - now below the record/upload box */}
            {assignment && getAssignmentAyahsText(assignment) && !submittedRecitationId && (
              <div className="flex justify-center">
                <div
                  className="mt-4 w-full max-w-xl glassmorphic-box rounded-2xl shadow-lg p-6 flex flex-col items-center"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(180,180,255,0.18)',
                  }}
                >
                  <span className="text-3xl font-arabic text-foreground leading-relaxed text-center" style={{ wordBreak: 'break-word' }}>{getAssignmentAyahsText(assignment)}</span>
                </div>
              </div>
            )}

            {submittedRecitationId && (
              <div className="flex justify-center">
                <Button onClick={() => setSubmittedRecitationId(null)} variant="outline">
                  Submit Another Recitation
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}