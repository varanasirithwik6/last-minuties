-- ============================================================
-- Last Minuties — Migration 005: Match Preferences & Smart Discovery
-- Phase 5: AI + Smart Discovery
-- ============================================================

-- ============================================================
-- SECTION 1: match_preferences table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.match_preferences (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  movie       TEXT,
  theatre     TEXT,
  show_date   DATE,
  start_time  TEXT,       -- HH:MM format
  end_time    TEXT,       -- HH:MM format
  max_price   INTEGER     CHECK (max_price IS NULL OR max_price >= 0),
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_match_preferences_user_id ON public.match_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_match_preferences_active  ON public.match_preferences(active);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.fn_match_preferences_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_preferences_updated_at ON public.match_preferences;
CREATE TRIGGER trg_match_preferences_updated_at
  BEFORE UPDATE ON public.match_preferences
  FOR EACH ROW EXECUTE FUNCTION public.fn_match_preferences_set_updated_at();

-- ============================================================
-- SECTION 2: Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.match_preferences ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only see their own preferences
CREATE POLICY "match_preferences_select_own"
  ON public.match_preferences FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: users can only create preferences for themselves
CREATE POLICY "match_preferences_insert_own"
  ON public.match_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: users can only update their own preferences
CREATE POLICY "match_preferences_update_own"
  ON public.match_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: users can only delete their own preferences
CREATE POLICY "match_preferences_delete_own"
  ON public.match_preferences FOR DELETE
  USING (user_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_preferences;
