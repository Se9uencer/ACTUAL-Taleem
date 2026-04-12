-- =============================================================================
-- Fix: Infinite recursion in RLS policies
-- =============================================================================
-- The circular dependency chain was:
--   class_students policy → queries classes → classes policy → queries class_students → ∞
--   assignment_students policy → queries assignments → assignments policy → queries assignment_students → ∞
--
-- Fix: Use SECURITY DEFINER helper functions for cross-table lookups.
-- SECURITY DEFINER means the function runs as its creator (bypassing RLS),
-- so there is no recursive policy evaluation inside the function body.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Helper functions (all SECURITY DEFINER to bypass RLS inside)
-- ---------------------------------------------------------------------------

-- Returns all class IDs where the current user is the teacher
CREATE OR REPLACE FUNCTION public.get_teaching_class_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT id FROM classes WHERE teacher_id = auth.uid();
$$;

-- Returns all class IDs where the current user is an enrolled student
CREATE OR REPLACE FUNCTION public.get_enrolled_class_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT class_id FROM class_students WHERE student_id = auth.uid();
$$;

-- Returns all assignment IDs where the current user is the teacher
CREATE OR REPLACE FUNCTION public.get_teaching_assignment_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT id FROM assignments WHERE teacher_id = auth.uid();
$$;

-- Returns all assignment IDs assigned to the current user (as student)
CREATE OR REPLACE FUNCTION public.get_assigned_assignment_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT assignment_id FROM assignment_students WHERE student_id = auth.uid();
$$;


-- ---------------------------------------------------------------------------
-- Drop and recreate all policies that caused circular references
-- ---------------------------------------------------------------------------

-- classes: Students can view enrolled classes
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
CREATE POLICY "Students can view enrolled classes" ON classes
  FOR SELECT USING (id IN (SELECT public.get_enrolled_class_ids()));

-- class_students: Teachers
DROP POLICY IF EXISTS "Teachers can view class enrollments" ON class_students;
DROP POLICY IF EXISTS "Teachers can add students" ON class_students;
DROP POLICY IF EXISTS "Teachers can remove students" ON class_students;

CREATE POLICY "Teachers can view class enrollments" ON class_students
  FOR SELECT USING (class_id IN (SELECT public.get_teaching_class_ids()));

CREATE POLICY "Teachers can add students" ON class_students
  FOR INSERT WITH CHECK (class_id IN (SELECT public.get_teaching_class_ids()));

CREATE POLICY "Teachers can remove students" ON class_students
  FOR DELETE USING (class_id IN (SELECT public.get_teaching_class_ids()));

-- assignments: Students can view assigned assignments
DROP POLICY IF EXISTS "Students can view assigned assignments" ON assignments;
CREATE POLICY "Students can view assigned assignments" ON assignments
  FOR SELECT USING (id IN (SELECT public.get_assigned_assignment_ids()));

-- assignments: Parents can view children assignments
DROP POLICY IF EXISTS "Parents can view children assignments" ON assignments;
CREATE POLICY "Parents can view children assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignment_students ast
      JOIN parent_child_link pcl ON ast.student_id = pcl.child_id
      WHERE ast.assignment_id = assignments.id AND pcl.parent_id = auth.uid()
    )
  );

-- assignment_students: Teachers
DROP POLICY IF EXISTS "Teachers can view assignment students" ON assignment_students;
DROP POLICY IF EXISTS "Teachers can assign students" ON assignment_students;
DROP POLICY IF EXISTS "Teachers can unassign students" ON assignment_students;

CREATE POLICY "Teachers can view assignment students" ON assignment_students
  FOR SELECT USING (assignment_id IN (SELECT public.get_teaching_assignment_ids()));

CREATE POLICY "Teachers can assign students" ON assignment_students
  FOR INSERT WITH CHECK (assignment_id IN (SELECT public.get_teaching_assignment_ids()));

CREATE POLICY "Teachers can unassign students" ON assignment_students
  FOR DELETE USING (assignment_id IN (SELECT public.get_teaching_assignment_ids()));
