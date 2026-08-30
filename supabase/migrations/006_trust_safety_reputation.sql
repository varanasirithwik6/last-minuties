-- ============================================================
-- Last Minuties — Migration 006: Trust, Reputation, Reporting & Safety
-- Phase 6: Ratings, Reports, Blocks & Security Enforcement
-- ============================================================

-- ============================================================
-- SECTION 1: Alter users table with account_status
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED'));

CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);

-- ============================================================
-- SECTION 2: ratings table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID        NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  from_user_id  UUID        NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
  to_user_id    UUID        NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
  rating        INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT        CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate rating from same user for the same connection
  UNIQUE (connection_id, from_user_id),

  -- Prevent self-rating
  CONSTRAINT no_self_rating CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_to_user_id   ON public.ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_from_user_id ON public.ratings(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_connection   ON public.ratings(connection_id);

-- Trigger: Automatically recompute user's average rating and rating count
CREATE OR REPLACE FUNCTION public.fn_recalculate_user_reputation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_target_user UUID;
  v_avg_rating  NUMERIC(3,2);
  v_count       INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_user := OLD.to_user_id;
  ELSE
    v_target_user := NEW.to_user_id;
  END IF;

  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)
    INTO v_avg_rating, v_count
    FROM public.ratings
   WHERE to_user_id = v_target_user;

  UPDATE public.users
     SET rating = v_avg_rating,
         rating_count = v_count,
         updated_at = NOW()
   WHERE id = v_target_user;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_user_reputation ON public.ratings;
CREATE TRIGGER trg_recalculate_user_reputation
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_user_reputation();

-- ============================================================
-- SECTION 3: reports table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID        NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
  reported_user_id UUID        REFERENCES public.users(id)                ON DELETE SET NULL,
  listing_id       UUID        REFERENCES public.listings(id)             ON DELETE SET NULL,
  message_id       UUID        REFERENCES public.messages(id)             ON DELETE SET NULL,
  connection_id    UUID        REFERENCES public.connections(id)          ON DELETE SET NULL,
  reason           TEXT        NOT NULL,
  description      TEXT        CHECK (description IS NULL OR char_length(description) <= 1000),
  status           TEXT        NOT NULL DEFAULT 'PENDING'
                               CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id      ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_listing_id       ON public.reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_status           ON public.reports(status);

-- ============================================================
-- SECTION 4: blocks table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks(blocked_id);

-- ============================================================
-- SECTION 5: Safety Validation Triggers
-- ============================================================

-- 1. Prevent blocked users and suspended users from creating connection requests
CREATE OR REPLACE FUNCTION public.fn_validate_connection_safety()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_buyer_status  TEXT;
  v_seller_status TEXT;
BEGIN
  -- Check user account status
  SELECT account_status INTO v_buyer_status  FROM public.users WHERE id = NEW.buyer_id;
  SELECT account_status INTO v_seller_status FROM public.users WHERE id = NEW.seller_id;

  IF v_buyer_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Your account is currently % and cannot create connection requests.', v_buyer_status;
  END IF;

  IF v_seller_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'This seller account is no longer active.';
  END IF;

  -- Check if blocker/blocked relationship exists
  IF EXISTS (
    SELECT 1 FROM public.blocks
     WHERE (blocker_id = NEW.seller_id AND blocked_id = NEW.buyer_id)
        OR (blocker_id = NEW.buyer_id AND blocked_id = NEW.seller_id)
  ) THEN
    RAISE EXCEPTION 'Unable to connect with this user.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_connection_safety ON public.connections;
CREATE TRIGGER trg_validate_connection_safety
  BEFORE INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_connection_safety();

-- 2. Prevent suspended users from creating listings
CREATE OR REPLACE FUNCTION public.fn_validate_listing_seller_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT account_status INTO v_status FROM public.users WHERE id = NEW.seller_id;
  IF v_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Account is % and cannot create new ticket listings.', v_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_listing_seller_status ON public.listings;
CREATE TRIGGER trg_validate_listing_seller_status
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_listing_seller_status();

-- 3. Prevent messaging if user is suspended or blocked
CREATE OR REPLACE FUNCTION public.fn_validate_message_safety()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conn RECORD;
  v_sender_status TEXT;
  v_recipient_id  UUID;
BEGIN
  SELECT account_status INTO v_sender_status FROM public.users WHERE id = NEW.sender_id;
  IF v_sender_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Your account is % and cannot send messages.', v_sender_status;
  END IF;

  SELECT buyer_id, seller_id INTO v_conn FROM public.connections WHERE id = NEW.connection_id;
  IF NEW.sender_id = v_conn.buyer_id THEN
    v_recipient_id := v_conn.seller_id;
  ELSE
    v_recipient_id := v_conn.buyer_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks
     WHERE (blocker_id = v_recipient_id AND blocked_id = NEW.sender_id)
        OR (blocker_id = NEW.sender_id AND blocked_id = v_recipient_id)
  ) THEN
    RAISE EXCEPTION 'Unable to send message to this user.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_message_safety ON public.messages;
CREATE TRIGGER trg_validate_message_safety
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_message_safety();

-- ============================================================
-- SECTION 6: Row Level Security (RLS)
-- ============================================================

-- ── ratings ──
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_select_involved"
  ON public.ratings FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "ratings_insert_from_user"
  ON public.ratings FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.connections c
       WHERE c.id = ratings.connection_id
         AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
         AND c.status IN ('ACCEPTED', 'COMPLETED')
    )
  );

-- ── reports ──
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_reporter"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Only the reporter can see their own filed reports (reported user CANNOT see)
CREATE POLICY "reports_select_reporter"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Updates to reports status are restricted to service role / admin
CREATE POLICY "reports_update_service"
  ON public.reports FOR UPDATE
  USING (FALSE);

-- ── blocks ──
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_select_own"
  ON public.blocks FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "blocks_insert_own"
  ON public.blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own"
  ON public.blocks FOR DELETE
  USING (blocker_id = auth.uid());

-- Enable Realtime for ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;
