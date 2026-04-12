-- =============================================================================
-- Taleem — Complete Database Schema
-- =============================================================================
-- Run this entire file in the Supabase SQL Editor to set up a fresh project.
-- Order matters: tables with no foreign keys first, then tables that reference them.
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- TABLES
-- =============================================================================

-- schools — created without admin_id FK first to avoid circular dependency
CREATE TABLE IF NOT EXISTS schools (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  admin_id    UUID,  -- FK added after profiles is created
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- profiles — one row per auth user, created automatically by trigger below
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  role                TEXT DEFAULT 'student',   -- 'teacher' | 'student' | 'parent'
  first_name          TEXT,
  last_name           TEXT,
  school_id           UUID REFERENCES schools(id) ON DELETE SET NULL,
  grade               TEXT,
  student_id          TEXT,
  parent_email        TEXT,
  parent_phone        TEXT,
  theme_accent_color  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Now add the circular FK: schools.admin_id → profiles
ALTER TABLE schools
  ADD CONSTRAINT schools_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- classes — created by teachers
CREATE TABLE IF NOT EXISTS classes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  grade_level  TEXT NOT NULL,
  description  TEXT,
  class_code   TEXT UNIQUE,
  teacher_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id    UUID REFERENCES schools(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  start_date   DATE,
  end_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- assignments — a teacher assigns a Quran passage to a class
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT,
  class_id    UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  surah       TEXT,
  surah_name  TEXT,
  start_ayah  INTEGER,
  end_ayah    INTEGER,
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- assignment_students — which students are assigned to which assignment
CREATE TABLE IF NOT EXISTS assignment_students (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id  UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

-- class_students — which students are enrolled in which class
CREATE TABLE IF NOT EXISTS class_students (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id           UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_status  TEXT NOT NULL DEFAULT 'active',
  joined_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, student_id)
);

-- recitations — a student's audio submission for an assignment
CREATE TABLE IF NOT EXISTS recitations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id         UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id            UUID REFERENCES profiles(id) ON DELETE CASCADE,
  audio_url             TEXT,
  transcription         TEXT,
  transcription_status  TEXT DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'error'
  transcription_date    TIMESTAMPTZ,
  transcription_error   TEXT,
  verse_feedback        JSONB,
  is_latest             BOOLEAN DEFAULT TRUE,
  is_late               BOOLEAN DEFAULT FALSE,
  is_late_submission    BOOLEAN DEFAULT FALSE,
  submitted_at          TIMESTAMPTZ DEFAULT NOW()
);

-- feedback — AI accuracy score for a recitation
CREATE TABLE IF NOT EXISTS feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recitation_id   UUID REFERENCES recitations(id) ON DELETE CASCADE,
  accuracy        NUMERIC,
  notes           TEXT
);

-- parent_child_link — connects a parent account to a student account
CREATE TABLE IF NOT EXISTS parent_child_link (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_id, child_id)
);

-- activity_logs — audit trail of user actions
CREATE TABLE IF NOT EXISTS activity_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type  TEXT NOT NULL,
  entity_type    TEXT,
  entity_id      UUID,
  details        JSONB,
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- class_deletion_logs — notifies students when a class they were in gets deleted
CREATE TABLE IF NOT EXISTS class_deletion_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  deleted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  class_name  TEXT NOT NULL,
  message     TEXT NOT NULL,
  dismissed   BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- badges — achievement badges students can earn
CREATE TABLE IF NOT EXISTS badges (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  icon_url     TEXT,
  points       INTEGER DEFAULT 0,
  criteria     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- student_badges — which badges a student has earned
CREATE TABLE IF NOT EXISTS student_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- student_progress — running totals per student per class
CREATE TABLE IF NOT EXISTS student_progress (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id               UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  assignments_total      INTEGER DEFAULT 0,
  assignments_completed  INTEGER DEFAULT 0,
  assignments_late       INTEGER DEFAULT 0,
  average_accuracy       NUMERIC,
  total_points           INTEGER DEFAULT 0,
  last_submission_at     TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, class_id)
);

-- student_streaks — consecutive-day activity streaks
CREATE TABLE IF NOT EXISTS student_streaks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak      INTEGER DEFAULT 0,
  longest_streak      INTEGER DEFAULT 0,
  last_activity_date  DATE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users — legacy/mirror table (Supabase auth is the source of truth)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- VIEWS
-- =============================================================================

-- class_performance_summary — per-class stats for the teacher dashboard
CREATE OR REPLACE VIEW class_performance_summary AS
SELECT
  c.id                                    AS class_id,
  c.name                                  AS class_name,
  c.teacher_id,
  COUNT(DISTINCT cs.student_id)           AS total_students,
  COUNT(DISTINCT a.id)                    AS total_assignments,
  AVG(f.accuracy)                         AS average_accuracy
FROM classes c
LEFT JOIN class_students cs ON cs.class_id = c.id
LEFT JOIN assignments a     ON a.class_id  = c.id
LEFT JOIN recitations r     ON r.assignment_id = a.id AND r.is_latest = TRUE
LEFT JOIN feedback f        ON f.recitation_id = r.id
GROUP BY c.id, c.name, c.teacher_id;

-- recent_student_activity — latest recitations with student name (teacher feed)
CREATE OR REPLACE VIEW recent_student_activity AS
SELECT
  r.student_id,
  p.first_name,
  p.last_name,
  a.title  AS assignment_title,
  r.submitted_at,
  f.accuracy
FROM recitations r
JOIN profiles   p ON p.id = r.student_id
JOIN assignments a ON a.id = r.assignment_id
LEFT JOIN feedback f ON f.recitation_id = r.id
WHERE r.is_latest = TRUE;

-- student_assignment_status — per-student per-assignment completion status
CREATE OR REPLACE VIEW student_assignment_status AS
SELECT
  ast.student_id,
  ast.assignment_id,
  p.first_name,
  p.last_name,
  a.title      AS assignment_title,
  a.due_date,
  r.submitted_at,
  f.accuracy,
  CASE
    WHEN r.id IS NULL                          THEN 'not_submitted'
    WHEN r.transcription_status = 'completed'  THEN 'completed'
    ELSE r.transcription_status
  END AS status
FROM assignment_students ast
JOIN profiles    p ON p.id = ast.student_id
JOIN assignments a ON a.id = ast.assignment_id
LEFT JOIN recitations r ON r.assignment_id = ast.assignment_id
                       AND r.student_id    = ast.student_id
                       AND r.is_latest     = TRUE
LEFT JOIN feedback f ON f.recitation_id = r.id;


-- =============================================================================
-- TRIGGER: auto-create profile on signup
-- =============================================================================
-- Fires synchronously inside the same transaction as the auth.users INSERT,
-- so a profile is guaranteed to exist by the time the client gets the session.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Enable RLS on every table, then grant access via policies.
-- The service_role key (used in API routes) bypasses RLS automatically.

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools             ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE recitations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback            ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_link   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_deletion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_streaks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Teachers can view student profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON cs.class_id = c.id
    WHERE cs.student_id = profiles.id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Parents can view children profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM parent_child_link pcl
    WHERE pcl.parent_id = auth.uid() AND pcl.child_id = profiles.id
  )
);

-- ----------------------------------------------------------------------------
-- schools
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone can view schools" ON schools FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- classes
-- ----------------------------------------------------------------------------
CREATE POLICY "Teachers can view own classes"   ON classes FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can create classes"     ON classes FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can update own classes" ON classes FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can delete own classes" ON classes FOR DELETE USING (teacher_id = auth.uid());

CREATE POLICY "Students can view enrolled classes" ON classes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    WHERE cs.class_id = classes.id AND cs.student_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- class_students
-- ----------------------------------------------------------------------------
CREATE POLICY "Teachers can view class enrollments" ON class_students FOR SELECT USING (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_students.class_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can add students"    ON class_students FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_students.class_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can remove students" ON class_students FOR DELETE USING (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_students.class_id AND c.teacher_id = auth.uid())
);

CREATE POLICY "Students can view own enrollments" ON class_students FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can join classes"         ON class_students FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can leave classes"        ON class_students FOR DELETE USING (student_id = auth.uid());

CREATE POLICY "Parents can view children enrollments" ON class_students FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM parent_child_link pcl
    WHERE pcl.parent_id = auth.uid() AND pcl.child_id = class_students.student_id
  )
);

-- ----------------------------------------------------------------------------
-- assignments
-- ----------------------------------------------------------------------------
CREATE POLICY "Teachers can view own assignments"   ON assignments FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can create assignments"     ON assignments FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can update own assignments" ON assignments FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can delete own assignments" ON assignments FOR DELETE USING (teacher_id = auth.uid());

CREATE POLICY "Students can view assigned assignments" ON assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignment_students ast
    WHERE ast.assignment_id = assignments.id AND ast.student_id = auth.uid()
  )
);

CREATE POLICY "Parents can view children assignments" ON assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignment_students ast
    JOIN parent_child_link pcl ON ast.student_id = pcl.child_id
    WHERE ast.assignment_id = assignments.id AND pcl.parent_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- assignment_students
-- ----------------------------------------------------------------------------
CREATE POLICY "Teachers can view assignment students" ON assignment_students FOR SELECT USING (
  EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_students.assignment_id AND a.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can assign students"   ON assignment_students FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_students.assignment_id AND a.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can unassign students" ON assignment_students FOR DELETE USING (
  EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_students.assignment_id AND a.teacher_id = auth.uid())
);

CREATE POLICY "Students can view own assignment_students" ON assignment_students FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view children assignment_students" ON assignment_students FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM parent_child_link pcl
    WHERE pcl.parent_id = auth.uid() AND pcl.child_id = assignment_students.student_id
  )
);

-- ----------------------------------------------------------------------------
-- recitations
-- ----------------------------------------------------------------------------
CREATE POLICY "Students can view own recitations"   ON recitations FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can create recitations"     ON recitations FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own recitations" ON recitations FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Teachers can view class recitations" ON recitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = recitations.assignment_id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Parents can view children recitations" ON recitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM parent_child_link pcl
    WHERE pcl.parent_id = auth.uid() AND pcl.child_id = recitations.student_id
  )
);

-- ----------------------------------------------------------------------------
-- feedback
-- ----------------------------------------------------------------------------
CREATE POLICY "Students can view own feedback" ON feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM recitations r WHERE r.id = feedback.recitation_id AND r.student_id = auth.uid())
);

CREATE POLICY "Teachers can create feedback" ON feedback FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM recitations r
    JOIN assignments a ON r.assignment_id = a.id
    JOIN classes c ON a.class_id = c.id
    WHERE r.id = feedback.recitation_id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update feedback" ON feedback FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM recitations r
    JOIN assignments a ON r.assignment_id = a.id
    JOIN classes c ON a.class_id = c.id
    WHERE r.id = feedback.recitation_id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Parents can view children feedback" ON feedback FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM recitations r
    JOIN parent_child_link pcl ON r.student_id = pcl.child_id
    WHERE r.id = feedback.recitation_id AND pcl.parent_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- parent_child_link
-- ----------------------------------------------------------------------------
CREATE POLICY "Parents can view own links"    ON parent_child_link FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Parents can create links"      ON parent_child_link FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Parents can delete own links"  ON parent_child_link FOR DELETE USING (parent_id = auth.uid());
CREATE POLICY "Children can view own links"   ON parent_child_link FOR SELECT USING (child_id = auth.uid());

-- ----------------------------------------------------------------------------
-- class_deletion_logs
-- ----------------------------------------------------------------------------
CREATE POLICY "Students can view own deletion logs"    ON class_deletion_logs FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can dismiss own deletion logs" ON class_deletion_logs FOR UPDATE  USING (student_id = auth.uid());

-- ----------------------------------------------------------------------------
-- student_progress / student_streaks / student_badges
-- ----------------------------------------------------------------------------
CREATE POLICY "Students can view own progress" ON student_progress FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can view class progress" ON student_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = student_progress.class_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Parents can view children progress" ON student_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM parent_child_link pcl WHERE pcl.parent_id = auth.uid() AND pcl.child_id = student_progress.student_id)
);

CREATE POLICY "Students can view own streaks"  ON student_streaks FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can view own badges"   ON student_badges  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Anyone can view badges"         ON badges          FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- activity_logs
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (user_id = auth.uid());
