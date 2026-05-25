import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

export type ClassRow = Tables<"classes">;

// Only the profile fields needed when listing students in a class.
export type ClassStudent = Pick<
  Tables<"profiles">,
  "id" | "email" | "first_name" | "last_name" | "grade" | "student_id"
>;

export async function getClassById(classId: string): Promise<ClassRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (error) return null;
  return data;
}

export async function getClassesForTeacher(
  teacherId: string
): Promise<ClassRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getStudentsInClass(
  classId: string
): Promise<ClassStudent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_students")
    .select(
      "profiles!inner(id, email, first_name, last_name, grade, student_id)"
    )
    .eq("class_id", classId)
    .eq("enrollment_status", "active");

  if (error) return [];

  return (data ?? []).flatMap((row) => {
    const p = row.profiles;
    if (!p || Array.isArray(p)) return [];
    return [p as ClassStudent];
  });
}
