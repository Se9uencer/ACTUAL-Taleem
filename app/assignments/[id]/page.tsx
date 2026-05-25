import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AssignmentDetailClient } from "./assignment-detail-client"
import type { AssignmentRow, ClassStudent } from "./assignment-detail-client"

export default async function AssignmentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: assignmentId } = await params
  const supabase = await createClient()

  // ── Auth guard ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // ── Assignment + ownership check ──────────────────────────────────────────
  const { data: assignmentData, error: assignmentError } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .single()

  if (assignmentError || !assignmentData) notFound()
  if (assignmentData.teacher_id !== user.id) notFound()

  // ── Parallel fetches now that we have class_id ────────────────────────────
  const [classResult, submissionsResult, classStudentsResult, assignedResult] =
    await Promise.all([
      supabase
        .from("classes")
        .select("name")
        .eq("id", assignmentData.class_id!)
        .single(),
      supabase
        .from("recitations")
        .select("*", { count: "exact", head: true })
        .eq("assignment_id", assignmentId),
      supabase
        .from("class_students")
        .select("profiles!inner(id, first_name, last_name)")
        .eq("class_id", assignmentData.class_id!),
      supabase
        .from("assignment_students")
        .select("student_id")
        .eq("assignment_id", assignmentId),
    ])

  const className = classResult.data?.name ?? ""
  const submissionCount = submissionsResult.count ?? 0
  const assignedStudentIds = (assignedResult.data ?? []).map((r) => r.student_id)
  const studentCount = assignedStudentIds.length

  // Normalise the profiles join (object vs array guard)
  const classStudents: ClassStudent[] = (classStudentsResult.data ?? [])
    .map((row) => {
      const p = row.profiles
      return Array.isArray(p) ? p[0] ?? null : p
    })
    .filter((p): p is ClassStudent => p != null)

  const assignment: AssignmentRow = {
    id: assignmentData.id,
    title: assignmentData.title,
    surah: assignmentData.surah,
    surah_name: assignmentData.surah_name,
    start_ayah: assignmentData.start_ayah,
    end_ayah: assignmentData.end_ayah,
    due_date: assignmentData.due_date,
    class_id: assignmentData.class_id,
    teacher_id: assignmentData.teacher_id,
  }

  return (
    <AssignmentDetailClient
      assignment={assignment}
      className={className}
      submissionCount={submissionCount}
      studentCount={studentCount}
      classStudents={classStudents}
      assignedStudentIds={assignedStudentIds}
    />
  )
}
