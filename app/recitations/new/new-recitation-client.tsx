"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { AlertCircle } from "lucide-react"
import { RecitationRecorder } from "@/components/recitation-recorder"
import { RecitationFeedback } from "@/components/recitation-feedback"
import { removeDiacritics } from "@/lib/arabic-utils"
import { getExpectedVerses, generateAssignmentTitle } from "@/lib/quran-data"
import { formatDateTimePST } from "@/lib/date-utils"

// ── Prop types ────────────────────────────────────────────────────────────────

interface AssignmentData {
  id: string
  title: string | null
  surah_name: string | null
  surah: string | null
  start_ayah: number | null
  end_ayah: number | null
  due_date: string | null
  class_id: string | null
}

interface PreviousSubmission {
  id: string
  submitted_at: string | null
}

interface NewRecitationClientProps {
  assignment: AssignmentData
  userId: string
  assignmentId: string
  previousSubmission: PreviousSubmission | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAssignmentDisplayTitle(a: AssignmentData): string {
  if (a.title) return a.title
  if (a.surah_name && a.start_ayah && a.end_ayah) {
    return generateAssignmentTitle(a.surah_name, a.start_ayah, a.end_ayah)
  }
  return a.surah ?? ""
}

/** Returns the combined Arabic text for all ayahs in the assignment, or "" */
function getAssignmentAyahsText(a: AssignmentData): string {
  const match = (a.surah_name ?? "").match(/^(\d+)/)
  if (!match || !a.start_ayah || !a.end_ayah) return ""
  return getExpectedVerses(parseInt(match[1], 10), a.start_ayah, a.end_ayah)
}

/**
 * Renders the assignment Arabic text with letter-level coloring based on the
 * transcription. Letters are green (correct), red (wrong), or gray (missing).
 */
function renderColoredText(expectedText: string, transcription: string | null) {
  if (!transcription) {
    return (
      <span
        className="text-3xl font-arabic text-foreground leading-relaxed text-center"
        style={{ wordBreak: "break-word" }}
      >
        {expectedText}
      </span>
    )
  }

  // Strip harakat for comparison; normalise hamzat al-wasl → alif
  const normalize = (s: string) =>
    removeDiacritics(s).replace(/ٱ/g, "ا").replace(/\s+/g, "")

  const expectedLetters = normalize(expectedText).split("")
  const actualLetters = normalize(transcription).split("")

  return (
    <span
      className="text-3xl font-arabic leading-relaxed text-center"
      style={{ wordBreak: "break-word" }}
    >
      {expectedLetters.map((char, i) => {
        const userChar = actualLetters[i]
        const color =
          userChar === undefined
            ? "text-gray-400"
            : userChar === char
              ? "text-green-600"
              : "text-red-500"
        return (
          <span key={i} className={color}>
            {char}
          </span>
        )
      })}
      {/* Extra letters in transcription shown as red */}
      {actualLetters.length > expectedLetters.length &&
        actualLetters
          .slice(expectedLetters.length)
          .map((char, j) => (
            <span key={`extra-${j}`} className="text-red-500">
              {char}
            </span>
          ))}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewRecitationClient({
  assignment,
  userId,
  assignmentId,
  previousSubmission,
}: NewRecitationClientProps) {
  const [submittedRecitationId, setSubmittedRecitationId] = useState<string | null>(null)

  const ayahsText = getAssignmentAyahsText(assignment)

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
          {/* Assignment info */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {getAssignmentDisplayTitle(assignment)}
            </h2>
            <p className="text-muted-foreground mt-1">
              {assignment.surah_name ? (
                <>
                  Surah: {assignment.surah_name.split(" (")[0].replace(/^\d+\.\s+/, "")}
                  {assignment.start_ayah && assignment.end_ayah && (
                    <>, Ayahs: {assignment.start_ayah}–{assignment.end_ayah}</>
                  )}
                </>
              ) : (
                <>Surah: {assignment.surah}</>
              )}
            </p>
            {assignment.due_date && (
              <p className="text-muted-foreground">
                Due: {formatDateTimePST(assignment.due_date)} (Pacific)
              </p>
            )}
          </div>

          {/* Previous submission notice */}
          {previousSubmission && !submittedRecitationId && (
            <div className="mb-6 bg-info/10 p-4 rounded-lg border border-info/20">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-info mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-info">
                    You have already submitted this assignment
                  </h3>
                  <p className="text-sm text-info mt-1">
                    Your previous submission was on{" "}
                    {previousSubmission.submitted_at
                      ? formatDateTimePST(previousSubmission.submitted_at)
                      : "an unknown date"}{" "}
                    (Pacific). You can submit again to replace it.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Recorder or feedback */}
            {submittedRecitationId ? (
              <RecitationFeedback recitationId={submittedRecitationId} />
            ) : (
              <RecitationRecorder
                assignmentId={assignmentId}
                studentId={userId}
                onRecitationSubmitted={setSubmittedRecitationId}
                assignmentDueDate={assignment.due_date ?? undefined}
              />
            )}

            {/* Arabic ayahs visual cue — shown before submission */}
            {ayahsText && !submittedRecitationId && (
              <div className="flex justify-center">
                <div
                  className="mt-4 w-full max-w-xl rounded-2xl shadow-lg p-6 flex flex-col items-center"
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(180,180,255,0.18)",
                  }}
                >
                  {renderColoredText(ayahsText, null)}
                </div>
              </div>
            )}

            {/* Submit another */}
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
