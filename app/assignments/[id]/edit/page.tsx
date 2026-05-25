import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parsePacificDateTime, getTomorrowDatePST } from "@/lib/date-utils"
import { EditAssignmentForm } from "./edit-assignment-form"

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: assignmentId } = await params
  const supabase = await createClient()

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // ── Assignment + ownership check ───────────────────────────────────────────
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .single()

  if (error || !assignment) notFound()
  if (assignment.teacher_id !== user.id) notFound()

  // ── Current student list — parallel with class student lookup ──────────────
  const [assignedResult, classStudentsResult] = await Promise.all([
    supabase
      .from("assignment_students")
      .select("student_id")
      .eq("assignment_id", assignmentId),
    supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", assignment.class_id!)
      .eq("enrollment_status", "active"),
  ])

  const assignedIds = (assignedResult.data ?? []).map((r) => r.student_id)
  const allClassIds = (classStudentsResult.data ?? []).map((r) => r.student_id)

  const assignToAll =
    allClassIds.length > 0 &&
    allClassIds.length === assignedIds.length &&
    allClassIds.every((id) => assignedIds.includes(id))

  // ── Parse stored Pacific timestamp back to wall-clock date + time ──────────
  // The old edit page used new Date().getHours() which reads the *browser* TZ —
  // wrong for any teacher outside America/Los_Angeles.  parsePacificDateTime
  // uses Intl and is correct regardless of server or browser locale.
  const { date: initialDate, time: initialTime } = assignment.due_date
    ? parsePacificDateTime(assignment.due_date)
    : { date: getTomorrowDatePST(), time: "" }

  return (
    <EditAssignmentForm
      assignmentId={assignmentId}
      classId={assignment.class_id!}
      initialSurahName={assignment.surah_name ?? ""}
      initialStartAyah={assignment.start_ayah ?? 1}
      initialEndAyah={assignment.end_ayah ?? 1}
      initialDate={initialDate}
      initialTime={initialTime}
      initialStudentIds={assignedIds}
      initialAssignToAll={assignToAll}
    />
  )
}
