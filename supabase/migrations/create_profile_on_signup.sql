-- Migration: create_profile_on_signup
--
-- Creates a Postgres trigger that automatically inserts a row into
-- public.profiles whenever a new user is created in auth.users.
--
-- This replaces the client-side profile creation that was previously attempted
-- inside AuthProvider (contexts/auth-context.tsx) using a useEffect. That
-- approach had race condition risks: two concurrent renders could both detect
-- a missing profile and race to insert it, and the insert could fail silently
-- while the UI was already rendering.
--
-- The trigger fires synchronously inside the same transaction as the auth.users
-- INSERT, so by the time Supabase returns the session to the client a profile
-- row is guaranteed to exist.
--
-- To apply: run this file against your Supabase project with:
--   supabase db push
-- or paste into the SQL editor in the Supabase dashboard.

-- -------------------------------------------------------------------------
-- Function
-- -------------------------------------------------------------------------
-- SECURITY DEFINER: runs with the privileges of the function owner (postgres)
-- so it can write to public.profiles regardless of RLS policies.
-- SET search_path = public: prevents search-path injection attacks.

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

-- -------------------------------------------------------------------------
-- Trigger
-- -------------------------------------------------------------------------
-- Drop first so re-running this migration is idempotent.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
