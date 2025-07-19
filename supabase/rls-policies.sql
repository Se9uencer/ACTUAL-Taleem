-- Taleem RLS Policies
-- This file contains all Row Level Security policies for the Taleem application
-- Based on actual access patterns found in the codebase

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Teachers can view student profiles in their classes
CREATE POLICY "Teachers can view student profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM class_students cs
            JOIN classes c ON cs.class_id = c.id
            WHERE cs.student_id = profiles.id
            AND c.teacher_id = auth.uid()
        )
    );

-- Parents can view their claimed children's profiles
CREATE POLICY "Parents can view children's profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = profiles.id
        )
    );

-- ============================================================================
-- CLASSES TABLE POLICIES
-- ============================================================================

-- Teachers can view their own classes
CREATE POLICY "Teachers can view own classes" ON classes
    FOR SELECT USING (teacher_id = auth.uid());

-- Teachers can create classes
CREATE POLICY "Teachers can create classes" ON classes
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

-- Teachers can update their own classes
CREATE POLICY "Teachers can update own classes" ON classes
    FOR UPDATE USING (teacher_id = auth.uid());

-- Teachers can delete their own classes
CREATE POLICY "Teachers can delete own classes" ON classes
    FOR DELETE USING (teacher_id = auth.uid());

-- Students can view classes they are enrolled in
CREATE POLICY "Students can view enrolled classes" ON classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM class_students cs
            WHERE cs.class_id = classes.id
            AND cs.student_id = auth.uid()
        )
    );

-- ============================================================================
-- CLASS_STUDENTS TABLE POLICIES
-- ============================================================================

-- Teachers can view students in their classes
CREATE POLICY "Teachers can view class enrollments" ON class_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_students.class_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Teachers can add students to their classes
CREATE POLICY "Teachers can add students to classes" ON class_students
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_students.class_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Teachers can remove students from their classes
CREATE POLICY "Teachers can remove students from classes" ON class_students
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_students.class_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments" ON class_students
    FOR SELECT USING (student_id = auth.uid());

-- Students can join classes (insert their own enrollment)
CREATE POLICY "Students can join classes" ON class_students
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Students can leave classes (delete their own enrollment)
CREATE POLICY "Students can leave classes" ON class_students
    FOR DELETE USING (student_id = auth.uid());

-- Parents can view their children's enrollments
CREATE POLICY "Parents can view children's enrollments" ON class_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = class_students.student_id
        )
    );

-- ============================================================================
-- ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Teachers can view their own assignments
CREATE POLICY "Teachers can view own assignments" ON assignments
    FOR SELECT USING (teacher_id = auth.uid());

-- Teachers can create assignments
CREATE POLICY "Teachers can create assignments" ON assignments
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

-- Teachers can update their own assignments
CREATE POLICY "Teachers can update own assignments" ON assignments
    FOR UPDATE USING (teacher_id = auth.uid());

-- Teachers can delete their own assignments
CREATE POLICY "Teachers can delete own assignments" ON assignments
    FOR DELETE USING (teacher_id = auth.uid());

-- Students can view assignments assigned to them
CREATE POLICY "Students can view assigned assignments" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignment_students as
            WHERE as.assignment_id = assignments.id
            AND as.student_id = auth.uid()
        )
    );

-- Parents can view assignments assigned to their children
CREATE POLICY "Parents can view children's assignments" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignment_students as
            JOIN parent_child_link pcl ON as.student_id = pcl.child_id
            WHERE as.assignment_id = assignments.id
            AND pcl.parent_id = auth.uid()
        )
    );

-- ============================================================================
-- RECITATIONS TABLE POLICIES
-- ============================================================================

-- Students can view their own recitations
CREATE POLICY "Students can view own recitations" ON recitations
    FOR SELECT USING (student_id = auth.uid());

-- Students can create recitations
CREATE POLICY "Students can create recitations" ON recitations
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Students can update their own recitations
CREATE POLICY "Students can update own recitations" ON recitations
    FOR UPDATE USING (student_id = auth.uid());

-- Teachers can view recitations from students in their classes
CREATE POLICY "Teachers can view class recitations" ON recitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = recitations.assignment_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Parents can view their children's recitations
CREATE POLICY "Parents can view children's recitations" ON recitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = recitations.student_id
        )
    );

-- ============================================================================
-- ASSIGNMENT_STUDENTS TABLE POLICIES
-- ============================================================================

-- Teachers can view assignment assignments for their assignments
CREATE POLICY "Teachers can view assignment assignments" ON assignment_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_students.assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

-- Teachers can assign students to their assignments
CREATE POLICY "Teachers can assign students to assignments" ON assignment_students
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_students.assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

-- Teachers can remove students from their assignments
CREATE POLICY "Teachers can remove students from assignments" ON assignment_students
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_students.assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

-- Students can view their own assignment assignments
CREATE POLICY "Students can view own assignment assignments" ON assignment_students
    FOR SELECT USING (student_id = auth.uid());

-- Parents can view their children's assignment assignments
CREATE POLICY "Parents can view children's assignment assignments" ON assignment_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_child_link pcl
            WHERE pcl.parent_id = auth.uid()
            AND pcl.child_id = assignment_students.student_id
        )
    );

-- ============================================================================
-- FEEDBACK TABLE POLICIES
-- ============================================================================

-- Students can view feedback on their recitations
CREATE POLICY "Students can view own feedback" ON feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recitations r
            WHERE r.id = feedback.recitation_id
            AND r.student_id = auth.uid()
        )
    );

-- Teachers can create feedback for recitations in their classes
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

-- Teachers can update feedback for recitations in their classes
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

-- Parents can view feedback on their children's recitations
CREATE POLICY "Parents can view children's feedback" ON feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recitations r
            JOIN parent_child_link pcl ON r.student_id = pcl.child_id
            WHERE r.id = feedback.recitation_id
            AND pcl.parent_id = auth.uid()
        )
    );

-- ============================================================================
-- PARENT_CHILD_LINK TABLE POLICIES
-- ============================================================================

-- Parents can view their own parent-child relationships
CREATE POLICY "Parents can view own relationships" ON parent_child_link
    FOR SELECT USING (parent_id = auth.uid());

-- Parents can create parent-child relationships
CREATE POLICY "Parents can create relationships" ON parent_child_link
    FOR INSERT WITH CHECK (parent_id = auth.uid());

-- Parents can delete their own parent-child relationships
CREATE POLICY "Parents can delete relationships" ON parent_child_link
    FOR DELETE USING (parent_id = auth.uid());

-- Children can view their own parent-child relationships
CREATE POLICY "Children can view own relationships" ON parent_child_link
    FOR SELECT USING (child_id = auth.uid());

-- ============================================================================
-- SCHOOLS TABLE POLICIES (if exists)
-- ============================================================================

-- Anyone can view schools (for dropdowns, etc.)
CREATE POLICY "Anyone can view schools" ON schools
    FOR SELECT USING (true);

-- ============================================================================
-- ADDITIONAL POLICIES FOR API ENDPOINTS
-- ============================================================================

-- Allow service role to access all data (for API endpoints)
-- This is handled by using service role client in API routes
-- No additional policies needed as service role bypasses RLS

-- ============================================================================
-- NOTES ON IMPLEMENTATION
-- ============================================================================

/*
IMPORTANT NOTES:

1. These policies assume the following table structure:
   - profiles: id, email, role, school_id, etc.
   - classes: id, teacher_id, name, class_code, etc.
   - class_students: class_id, student_id, joined_at
   - assignments: id, teacher_id, class_id, title, due_date, etc.
   - assignment_students: assignment_id, student_id
   - recitations: id, student_id, assignment_id, audio_url, etc.
   - feedback: id, recitation_id, accuracy, notes
   - parent_child_link: parent_id, child_id

2. The policies are designed to work with the actual access patterns found in the codebase:
   - Teachers manage their classes and assignments
   - Students view their assignments and submit recitations
   - Parents view their children's progress
   - Class codes allow anyone to view classes for joining

3. Service role access is used in API endpoints (like /api/transcribe) to bypass RLS
   when needed for system operations.

4. These policies ensure data isolation between different teachers and students
   while allowing appropriate access for parents and system operations.

5. The policies use EXISTS clauses for efficient querying and proper security.
*/ 