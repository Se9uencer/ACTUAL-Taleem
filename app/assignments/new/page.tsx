import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewAssignmentForm } from "./new-assignment-form"

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>
}) {
  const { class: preselectedClassId = null } = await searchParams
  const supabase = await createClient()

  // ── Auth + role guard ────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "teacher") redirect("/dashboard")

  // ── Teacher's classes — DB-filtered, no client-side re-filter needed ─────
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <NewAssignmentForm
      userId={user.id}
      classes={classes ?? []}
      preselectedClassId={preselectedClassId}
    />
  )
}
