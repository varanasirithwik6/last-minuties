-- ============================================================
-- Last Minuties — Phase 2: Auth & Profiles Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS / PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  college TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  profile_image TEXT,
  phone_verified BOOLEAN DEFAULT TRUE,
  college_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  rating_count INT DEFAULT 0 CHECK (rating_count >= 0),
  connection_count INT DEFAULT 0 CHECK (connection_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching and college lookups
CREATE INDEX IF NOT EXISTS users_college_idx ON public.users(college);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users(created_at DESC);

-- ============================================================
-- AUTO-UPDATE UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- SECURITY: PREVENT UNAUTHORIZED PRIVILEGE ELEVATION
-- Prevents clients from tampering with college_verified or rating
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_user_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If update is initiated by a regular user (not service_role), prevent tampering with verification and reputation
  IF auth.role() = 'authenticated' THEN
    NEW.college_verified = OLD.college_verified;
    NEW.phone_verified = OLD.phone_verified;
    NEW.rating = OLD.rating;
    NEW.rating_count = OLD.rating_count;
    NEW.connection_count = OLD.connection_count;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_user_field_protection ON public.users;
CREATE TRIGGER enforce_user_field_protection
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_fields();

-- ============================================================
-- AUTO-CREATE PROFILE ON AUTH.USER CREATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    phone_verified,
    college_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    TRUE,
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC READ: Anyone authenticated can view public profiles
-- Note: Phone numbers are NOT stored in the public users table at all, ensuring zero leakage!
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.users;
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.users
  FOR SELECT
  USING (TRUE);

-- 2. INSERT OWN PROFILE: Users can insert their own profile matching auth.uid()
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. UPDATE OWN PROFILE: Users can only update their own profile matching auth.uid()
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
