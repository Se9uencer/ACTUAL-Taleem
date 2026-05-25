import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClassDetailsClient } from "./class-details-client"
import type { ClassData, ClassStudentLink } from "./class-details-client"

export default async function ClassDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: classId } = await params
  const supabase = await createClient()

  // ── Auth guard ───────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // ── Class details ────────────────────────────────────────────────────────
  const { data: classDetails, error: classError } = await supabase
    .from("classes")
    .select("*, schools(name)")
    .eq("id", classId)
    .single()

  if (classError || !classDetails) notFound()

  const isTeacher = classDetails.teacher_id === user.id

  // ── Class students + profiles (single query) ─────────────────────────────
  // Fetches every enrolled row with its profile in one round-trip.
  // For students (non-teachers), also acts as the enrollment check.
  const { data: classStudentsRaw, error: studentsError } = await supabase
    .from("class_students")
    .select(
      "student_id, enrollment_status, profiles:profiles(id, email, first_name, last_name, role, grade, parent_email, parent_phone, student_id)"
    )
    .eq("class_id", classId)

  if (studentsError) {
    console.error("Error fetching class students:", studentsError)
  }

  const rawLinks = classStudentsRaw ?? []

  // Access check for non-teachers: must appear in class_students
  if (!isTeacher) {
    const enrolled = rawLinks.some((row) => row.student_id === user.id)
    if (!enrolled) redirect("/dashboard")
  }

  // Normalise the profiles join — PostgREST returns an object for !inner joins,
  // but falls back to an array for left joins on some versions. Guard both.
  const classStudentLinks: ClassStudentLink[] = rawLinks.map((row) => {
    const p = row.profiles
    const profile =
      p == null || Array.isArray(p) ? null : (p as ClassStudentLink["profiles"])
    return {
      student_id: row.student_id,
      enrollment_status: row.enrollment_status,
      profiles: profile,
    }
  })

  // Student count: rows whose profile has role = 'student' (no extra query)
  const studentCount = classStudentLinks.filter(
    (row) => row.profiles?.role === "student"
  ).length

  // Shape passed to the client
  const classData: ClassData = {
    id: classDetails.id,
    name: classDetails.name,
    grade_level: classDetails.grade_level,
    class_code: classDetails.class_code ?? null,
    description: classDetails.description ?? null,
    teacher_id: classDetails.teacher_id,
    schools: Array.isArray(classDetails.schools)
      ? (classDetails.schools[0] ?? null)
      : classDetails.schools,
  }

  return (
    <ClassDetailsClient
      classData={classData}
      initialLinks={classStudentLinks}
      studentCount={studentCount}
      isTeacher={isTeacher}
      userId={user.id}
    />
  )
}
