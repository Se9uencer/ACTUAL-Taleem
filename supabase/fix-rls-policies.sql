-- Fix RLS Policies Script
-- This script drops all existing RLS policies and recreates them to fix infinite recursion issues

-- ============================================================================
-- DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Parents can view children's profiles" ON profiles;

-- Drop classes policies
DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
DROP POLICY IF EXISTS "Anyone can view classes by code" ON classes;

-- Drop class_students policies
DROP POLICY IF EXISTS "Teachers can view class enrollments" ON class_students;
DROP POLICY IF EXISTS "Teachers can add students to classes" ON class_students;
DROP POLICY IF EXISTS "Teachers can remove students from classes" ON class_students;
DROP POLICY IF EXISTS "Students can view own enrollments" ON class_students;
DROP POLICY IF EXISTS "Students can join classes" ON class_students;
DROP POLICY IF EXISTS "Students can leave classes" ON class_students;
DROP POLICY IF EXISTS "Parents can view children's enrollments" ON class_students;

-- Drop assignments policies
DROP POLICY IF EXISTS "Teachers can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can create assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can delete own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view assigned assignments" ON assignments;
DROP POLICY IF EXISTS "Parents can view children's assignments" ON assignments;

-- Drop recitations policies
DROP POLICY IF EXISTS "Students can view own recitations" ON recitations;
DROP POLICY IF EXISTS "Students can create recitations" ON recitations;
DROP POLICY IF EXISTS "Students can update own recitations" ON recitations;
DROP POLICY IF EXISTS "Teachers can view class recitations" ON recitations;
DROP POLICY IF EXISTS "Parents can view children's recitations" ON recitations;

-- Drop assignment_students policies
DROP POLICY IF EXISTS "Teachers can view assignment assignments" ON assignment_students;
DROP POLICY IF EXISTS "Teachers can assign students to assignments" ON assignment_students;
DROP POLICY IF EXISTS "Teachers can remove students from assignments" ON assignment_students;
DROP POLICY IF EXISTS "Students can view own assignment assignments" ON assignment_students;
DROP POLICY IF EXISTS "Parents can view children's assignment assignments" ON assignment_students;

-- Drop feedback policies
DROP POLICY IF EXISTS "Students can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Teachers can create feedback" ON feedback;
DROP POLICY IF EXISTS "Teachers can update feedback" ON feedback;
DROP POLICY IF EXISTS "Parents can view children's feedback" ON feedback;

-- Drop parent_child_link policies
DROP POLICY IF EXISTS "Parents can view own relationships" ON parent_child_link;
DROP POLICY IF EXISTS "Parents can create relationships" ON parent_child_link;
DROP POLICY IF EXISTS "Parents can delete relationships" ON parent_child_link;
DROP POLICY IF EXISTS "Children can view own relationships" ON parent_child_link;

-- ============================================================================
-- RECREATE POLICIES (from rls-policies.sql)
-- ============================================================================

-- PROFILES TABLE POLICIES
-- Allow users to view their own profile (even if it doesn't exist yet)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND auth.uid() = id
    );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND auth.uid() = id
    );

-- Allow users to insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = id
    );

-- Allow authenticated users to create their profile if it doesn't exist
CREATE POLICY "Users can create profile if not exists" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = id
        AND NOT EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
        )
    );

-- Teachers can view student profiles in their classes
CREATE POLICY "Teachers can view student profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM class_students cs
            JOIN classes c ON cs.class_id = c.id
            WHERE cs.student_id = profiles.id
            AND c.teacher_id = auth.uid()
        )
    );

-- Parents can view their claimed children's profiles
CREATE POLICY "Parents can view children's profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = profiles.id
        )
    );

-- CLASSES TABLE POLICIES
CREATE POLICY "Teachers can view own classes" ON classes
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can create classes" ON classes
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own classes" ON classes
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own classes" ON classes
    FOR DELETE USING (teacher_id = auth.uid());

CREATE POLICY "Students can view enrolled classes" ON classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM class_students cs
            WHERE cs.class_id = classes.id
            AND cs.student_id = auth.uid()
        )
    );

-- CLASS_STUDENTS TABLE POLICIES
CREATE POLICY "Teachers can view class enrollments" ON class_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_students.class_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can add students to classes" ON class_students
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_students.class_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can remove students from classes" ON class_students
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_students.class_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view own enrollments" ON class_students
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can join classes" ON class_students
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can leave classes" ON class_students
    FOR DELETE USING (student_id = auth.uid());

CREATE POLICY "Parents can view children's enrollments" ON class_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = class_students.student_id
        )
    );

-- ASSIGNMENTS TABLE POLICIES
CREATE POLICY "Teachers can view own assignments" ON assignments
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can create assignments" ON assignments
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own assignments" ON assignments
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own assignments" ON assignments
    FOR DELETE USING (teacher_id = auth.uid());

CREATE POLICY "Students can view assigned assignments" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignment_students as
            WHERE as.assignment_id = assignments.id
            AND as.student_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view children's assignments" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignment_students as
            JOIN parent_child_link pcl ON as.student_id = pcl.child_id
            WHERE as.assignment_id = assignments.id
            AND pcl.parent_id = auth.uid()
        )
    );

-- RECITATIONS TABLE POLICIES
CREATE POLICY "Students can view own recitations" ON recitations
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create recitations" ON recitations
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own recitations" ON recitations
    FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Teachers can view class recitations" ON recitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = recitations.assignment_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view children's recitations" ON recitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = recitations.student_id
        )
    );

-- ASSIGNMENT_STUDENTS TABLE POLICIES
CREATE POLICY "Teachers can view assignment assignments" ON assignment_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_students.assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can assign students to assignments" ON assignment_students
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_students.assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can remove students from assignments" ON assignment_students
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_students.assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view own assignment assignments" ON assignment_students
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view children's assignment assignments" ON assignment_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = assignment_students.student_id
        )
    );

-- FEEDBACK TABLE POLICIES
CREATE POLICY "Students can view own feedback" ON feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recitations r
            WHERE r.id = feedback.recitation_id
            AND r.student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create feedback" ON feedback
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM recitations r
            JOIN assignments a ON r.assignment_id = a.id
            JOIN classes c ON a.class_id = c.id
            WHERE r.id = feedback.recitation_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update feedback" ON feedback
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM recitations r
            JOIN assignments a ON r.assignment_id = a.id
            JOIN classes c ON a.class_id = c.id
            WHERE r.id = feedback.recitation_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view children's feedback" ON feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recitations r
            JOIN parent_child_link pcl ON r.student_id = pcl.child_id
            WHERE r.id = feedback.recitation_id
            AND pcl.parent_id = auth.uid()
        )
    );

-- PARENT_CHILD_LINK TABLE POLICIES
CREATE POLICY "Parents can view own relationships" ON parent_child_link
    FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Parents can create relationships" ON parent_child_link
    FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can delete relationships" ON parent_child_link
    FOR DELETE USING (parent_id = auth.uid());

CREATE POLICY "Children can view own relationships" ON parent_child_link
    FOR SELECT USING (child_id = auth.uid()); 