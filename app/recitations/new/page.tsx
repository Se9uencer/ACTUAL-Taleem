import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewRecitationClient } from "./new-recitation-client"

export default async function NewRecitationPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>
}) {
  const { assignment: assignmentId } = await searchParams
  const supabase = await createClient()

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // ── Profile + assignment fetched in parallel ─────────────────────────────
  const [profileResult, assignmentResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    assignmentId
      ? supabase
          .from("assignments")
          .select("id, title, surah_name, surah, start_ayah, end_ayah, due_date, class_id")
          .eq("id", assignmentId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ])

  // Role guard — only students can submit recitations
  if (profileResult.data?.role !== "student") redirect("/dashboard")

  // Require a valid assignment ID
  if (!assignmentId || !assignmentResult.data) notFound()

  const assignment = assignmentResult.data

  // ── Enrollment + assignment ownership + previous submission ──────────────
  const [enrollmentResult, assignmentStudentResult, prevSubmissionsResult] = await Promise.all([
    supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", assignment.class_id!)
      .eq("student_id", user.id)
      .single(),
    supabase
      .from("assignment_students")
      .select("student_id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single(),
    supabase
      .from("recitations")
      .select("id, submitted_at")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .eq("is_latest", true)
      .order("submitted_at", { ascending: false })
      .limit(1),
  ])

  if (!enrollmentResult.data) notFound()
  if (!assignmentStudentResult.data) notFound()

  const previousSubmission = prevSubmissionsResult.data?.[0] ?? null

  return (
    <NewRecitationClient
      assignment={assignment}
      userId={user.id}
      assignmentId={assignmentId}
      previousSubmission={previousSubmission}
    />
  )
}
