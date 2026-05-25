import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "./dashboard-client"
import type { DashboardClass, LateSubmission } from "./dashboard-client"
import type { Assignment } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Auth guard — must happen server-side before any HTML is sent
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  // ─── Teacher ───────────────────────────────────────────────────────────────
  if (profile.role === "teacher") {
    // 1. Classes + schools (1 query)
    const { data: classesData } = await supabase
      .from("classes")
      .select("*, schools(name)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })

    const rawClasses = classesData ?? []

    // 2. Student counts — single batched query replacing the old N+1 Promise.all
    let countMap: Record<string, number> = {}
    if (rawClasses.length > 0) {
      const classIds = rawClasses.map((c) => c.id)
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id")
        .in("class_id", classIds)
        .eq("enrollment_status", "active")

      countMap = (enrollments ?? []).reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.class_id] = (acc[row.class_id] ?? 0) + 1
          return acc
        },
        {}
      )
    }

    const classes: DashboardClass[] = rawClasses.map((c) => ({
      id: c.id,
      name: c.name,
      grade_level: c.grade_level,
      teacher_id: c.teacher_id,
      created_at: c.created_at,
      schools: Array.isArray(c.schools) ? c.schools[0] ?? null : c.schools,
      student_count: countMap[c.id] ?? 0,
    }))

    // 3. Assignments + late submissions — fire in parallel
    const [assignmentsResult, lateResult] = await Promise.all([
      supabase
        .from("assignments")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("recitations")
        .select(
          "id, submitted_at, assignment_id, assignments!inner(title, due_date, teacher_id, surah_name, start_ayah, end_ayah), profiles!inner(first_name, last_name)"
        )
        .eq("assignments.teacher_id", user.id)
        .not("submitted_at", "is", null),
    ])

    const assignments = (assignmentsResult.data ?? []) as Assignment[]

    const lateSubmissions: LateSubmission[] = (lateResult.data ?? [])
      .filter((rec: any) => {
        const due = rec.assignments?.due_date
        return due && new Date(rec.submitted_at) > new Date(due)
      })
      .map((rec: any) => ({
        id: rec.id,
        submitted_at: rec.submitted_at,
        assignment_id: rec.assignment_id,
        assignments: rec.assignments,
        profiles: rec.profiles,
        student: `${rec.profiles.first_name ?? ""} ${rec.profiles.last_name ?? ""}`.trim(),
        assignment:
          rec.assignments.title ??
          `${rec.assignments.surah_name ?? ""} ${rec.assignments.start_ayah ?? ""}–${rec.assignments.end_ayah ?? ""}`,
        due_date: rec.assignments.due_date,
      }))

    return (
      <DashboardClient
        profile={profile}
        data={{ role: "teacher", classes, assignments, lateSubmissions }}
      />
    )
  }

  // ─── Student ───────────────────────────────────────────────────────────────
  if (profile.role === "student") {
    // Batch 1 — all independent of each other
    const [classResult, assignmentResult, streakResult, studentBadgesResult] =
      await Promise.all([
        supabase
          .from("class_students")
          .select(
            "classes!inner(id, name, grade_level, teacher_id, created_at, schools(name))"
          )
          .eq("student_id", user.id),
        supabase
          .from("assignment_students")
          .select("assignments!inner(*)")
          .eq("student_id", user.id),
        supabase
          .from("student_streaks")
          .select("current_streak, longest_streak")
          .eq("student_id", user.id)
          .maybeSingle(),
        supabase
          .from("student_badges")
          .select("badge_id, awarded_at")
          .eq("student_id", user.id),
      ])

    const classes: DashboardClass[] = (classResult.data ?? []).map(
      (item: any) => {
        const c = item.classes
        return {
          id: c.id,
          name: c.name,
          grade_level: c.grade_level,
          teacher_id: c.teacher_id,
          created_at: c.created_at,
          schools: Array.isArray(c.schools) ? c.schools[0] ?? null : c.schools,
        }
      }
    )

    const assignments = (assignmentResult.data ?? []).map(
      (item: any) => item.assignments
    ) as Assignment[]

    // Batch 2 — recitations check (needs assignment IDs) + badge details (needs badge IDs)
    const earnedBadgeIds = (studentBadgesResult.data ?? []).map(
      (b) => b.badge_id
    )
    const [recitationsResult, badgesResult] = await Promise.all([
      supabase
        .from("recitations")
        .select("assignment_id")
        .eq("student_id", user.id)
        .not("submitted_at", "is", null),
      earnedBadgeIds.length > 0
        ? supabase
            .from("badges")
            .select("id, name, description, icon_url, points")
            .in("id", earnedBadgeIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const completedIds = new Set(
      (recitationsResult.data ?? []).map((r) => r.assignment_id)
    )
    const completedAssignments = assignments.filter((a) =>
      completedIds.has(a.id)
    )

    // Merge badge details with awarded_at from student_badges
    const awardedAtMap = Object.fromEntries(
      (studentBadgesResult.data ?? []).map((b) => [b.badge_id, b.awarded_at])
    )
    const badges = (badgesResult.data ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon_url: b.icon_url,
      points: b.points,
      awarded_at: awardedAtMap[b.id] ?? "",
    }))

    return (
      <DashboardClient
        profile={profile}
        data={{
          role: "student",
          classes,
          assignments,
          completedAssignments,
          streak: streakResult.data ?? null,
          badges,
        }}
      />
    )
  }

  // ─── Parent (and any unrecognised role) ────────────────────────────────────
  return <DashboardClient profile={profile} data={{ role: "parent" }} />
}
