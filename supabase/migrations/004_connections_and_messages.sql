-- ============================================================
-- Last Minuties — Migration 004: Connections & Messages
-- Phase 4: Buyer–Seller Connection System
-- ============================================================
-- This migration creates:
--   1. public.connections   — buyer/seller connection state machine
--   2. public.messages      — in-app private messaging
--   3. public.notifications — user notification inbox (if not exists)
--   4. RLS policies for all tables
--   5. Triggers for state machine, auto-timestamps, cascade on SOLD
-- ============================================================

-- ============================================================
-- SECTION 1: connections table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.connections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id       UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  seller_id      UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  status         TEXT        NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','COMPLETED')),
  initial_message TEXT,   -- optional first message from buyer when contacting
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate requests for same listing by same buyer
  UNIQUE (listing_id, buyer_id),

  -- Prevent self-contact
  CONSTRAINT no_self_connection CHECK (buyer_id <> seller_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_connections_buyer_id      ON public.connections(buyer_id);
CREATE INDEX IF NOT EXISTS idx_connections_seller_id     ON public.connections(seller_id);
CREATE INDEX IF NOT EXISTS idx_connections_listing_id    ON public.connections(listing_id);
CREATE INDEX IF NOT EXISTS idx_connections_status        ON public.connections(status);

-- ============================================================
-- SECTION 2: messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  UUID        NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id      UUID        NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
  content        TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_read        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON public.messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id     ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at    ON public.messages(created_at);

-- ============================================================
-- SECTION 3: notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL
               CHECK (type IN (
                 'connection_request','request_accepted','request_declined',
                 'new_message','listing_sold','listing_expiring','listing_expired',
                 'match_found','rating_received','request_cancelled'
               )),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  data       JSONB,          -- e.g. {"connection_id": "...", "listing_id": "...", "movie": "..."}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- SECTION 4: auto-updated_at trigger for connections
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_connections_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_connections_updated_at ON public.connections;
CREATE TRIGGER trg_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_connections_set_updated_at();

-- ============================================================
-- SECTION 5: State Machine Enforcement Trigger
-- Allowed transitions:
--   PENDING  → ACCEPTED   (by seller)
--   PENDING  → DECLINED   (by seller)
--   PENDING  → CANCELLED  (by buyer)
--   ACCEPTED → CANCELLED  (by buyer or seller)
--   ACCEPTED → COMPLETED  (by buyer or seller)
-- Anything else → ERROR
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_enforce_connection_state_machine()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old TEXT := OLD.status;
  v_new TEXT := NEW.status;
  v_uid UUID := auth.uid();
BEGIN
  -- No actual change — allow
  IF v_old = v_new THEN RETURN NEW; END IF;

  -- Prevent changing buyer_id or seller_id
  IF NEW.buyer_id  <> OLD.buyer_id  THEN
    RAISE EXCEPTION 'Tampering with buyer_id is not allowed.';
  END IF;
  IF NEW.seller_id <> OLD.seller_id THEN
    RAISE EXCEPTION 'Tampering with seller_id is not allowed.';
  END IF;
  IF NEW.listing_id <> OLD.listing_id THEN
    RAISE EXCEPTION 'Tampering with listing_id is not allowed.';
  END IF;

  -- PENDING → ACCEPTED (seller only)
  IF v_old = 'PENDING' AND v_new = 'ACCEPTED' THEN
    IF v_uid <> OLD.seller_id THEN
      RAISE EXCEPTION 'Only the seller can accept a connection request.';
    END IF;
    RETURN NEW;
  END IF;

  -- PENDING → DECLINED (seller only)
  IF v_old = 'PENDING' AND v_new = 'DECLINED' THEN
    IF v_uid <> OLD.seller_id THEN
      RAISE EXCEPTION 'Only the seller can decline a connection request.';
    END IF;
    RETURN NEW;
  END IF;

  -- PENDING → CANCELLED (buyer only)
  IF v_old = 'PENDING' AND v_new = 'CANCELLED' THEN
    IF v_uid <> OLD.buyer_id THEN
      RAISE EXCEPTION 'Only the buyer can cancel a pending request.';
    END IF;
    RETURN NEW;
  END IF;

  -- ACCEPTED → CANCELLED (buyer or seller)
  IF v_old = 'ACCEPTED' AND v_new = 'CANCELLED' THEN
    IF v_uid <> OLD.buyer_id AND v_uid <> OLD.seller_id THEN
      RAISE EXCEPTION 'Only the buyer or seller can cancel an accepted connection.';
    END IF;
    RETURN NEW;
  END IF;

  -- ACCEPTED → COMPLETED (buyer or seller)
  IF v_old = 'ACCEPTED' AND v_new = 'COMPLETED' THEN
    IF v_uid <> OLD.buyer_id AND v_uid <> OLD.seller_id THEN
      RAISE EXCEPTION 'Only the buyer or seller can mark a connection as completed.';
    END IF;
    RETURN NEW;
  END IF;

  -- System-level override (DB admin / service_role) — allow CANCELLED from any state
  -- This covers the cascade cancel on listing SOLD
  -- (service_role bypasses RLS so it won't hit the uid check above)
  IF v_new = 'CANCELLED' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid connection status transition: % → %', v_old, v_new;
END;
$$;

DROP TRIGGER IF EXISTS trg_connection_state_machine ON public.connections;
CREATE TRIGGER trg_connection_state_machine
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_connection_state_machine();

-- ============================================================
-- SECTION 6: Validate connection INSERT
-- Prevent contacting for SOLD/EXPIRED/CANCELLED listings
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validate_connection_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing_status TEXT;
  v_expires_at     TIMESTAMPTZ;
BEGIN
  SELECT status, expires_at
    INTO v_listing_status, v_expires_at
    FROM public.listings
   WHERE id = NEW.listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found.';
  END IF;

  IF UPPER(v_listing_status) NOT IN ('AVAILABLE', 'CONTACTED') THEN
    RAISE EXCEPTION 'Cannot create a connection request for a listing with status: %', v_listing_status;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RAISE EXCEPTION 'Cannot create a connection request for an expired listing.';
  END IF;

  -- Ensure seller_id matches the listing's actual seller
  PERFORM 1 FROM public.listings
   WHERE id = NEW.listing_id AND seller_id = NEW.seller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'seller_id does not match the listing seller.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_connection_insert ON public.connections;
CREATE TRIGGER trg_validate_connection_insert
  BEFORE INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_connection_insert();

-- ============================================================
-- SECTION 7: Auto-update listing status to CONTACTED when
-- first PENDING connection is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_update_listing_on_connection()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'PENDING' THEN
    UPDATE public.listings
       SET status = 'CONTACTED', updated_at = NOW()
     WHERE id = NEW.listing_id AND UPPER(status) = 'AVAILABLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_contacted ON public.connections;
CREATE TRIGGER trg_listing_contacted
  AFTER INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_listing_on_connection();

-- ============================================================
-- SECTION 8: Cancel pending connections when listing is SOLD
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_cancel_pending_on_sold()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- When listing transitions to SOLD or CANCELLED, cancel all PENDING connections
  IF (NEW.status IN ('SOLD', 'CANCELLED', 'EXPIRED') AND OLD.status NOT IN ('SOLD', 'CANCELLED', 'EXPIRED')) THEN
    UPDATE public.connections
       SET status = 'CANCELLED', updated_at = NOW()
     WHERE listing_id = NEW.id AND status = 'PENDING';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_pending_on_sold ON public.listings;
CREATE TRIGGER trg_cancel_pending_on_sold
  AFTER UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.fn_cancel_pending_on_sold();

-- ============================================================
-- SECTION 9: Validate message sender is a participant
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validate_message_sender()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conn RECORD;
BEGIN
  SELECT buyer_id, seller_id, status INTO v_conn
    FROM public.connections
   WHERE id = NEW.connection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found.';
  END IF;

  IF NEW.sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'sender_id must match authenticated user.';
  END IF;

  IF NEW.sender_id <> v_conn.buyer_id AND NEW.sender_id <> v_conn.seller_id THEN
    RAISE EXCEPTION 'You are not a participant in this connection.';
  END IF;

  IF v_conn.status <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Messages can only be sent in ACCEPTED connections.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_message_sender ON public.messages;
CREATE TRIGGER trg_validate_message_sender
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_message_sender();

-- ============================================================
-- SECTION 10: Row Level Security
-- ============================================================

-- ── connections ──
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- SELECT: only participants
CREATE POLICY "connections_select_own"
  ON public.connections FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- INSERT: buyer must be authenticated user, listing must be valid
CREATE POLICY "connections_insert_buyer"
  ON public.connections FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- UPDATE: participants only (state machine trigger handles further checks)
CREATE POLICY "connections_update_participants"
  ON public.connections FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- ── messages ──
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: only participants of the connection
CREATE POLICY "messages_select_participants"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connections c
       WHERE c.id = messages.connection_id
         AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- INSERT: sender = auth user, must be participant in ACCEPTED connection (trigger also enforces)
CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.connections c
       WHERE c.id = messages.connection_id
         AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
         AND c.status = 'ACCEPTED'
    )
  );

-- UPDATE: only own messages for marking read
CREATE POLICY "messages_update_read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.connections c
       WHERE c.id = messages.connection_id
         AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- ── notifications ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: own notifications only
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: service_role only (via database functions/triggers, not client)
-- Clients cannot insert their own notifications
CREATE POLICY "notifications_insert_service"
  ON public.notifications FOR INSERT
  WITH CHECK (FALSE); -- blocked for anon/authenticated; service_role bypasses RLS

-- UPDATE: own notifications (mark read)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- SECTION 11: Enable Supabase Realtime for these tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- SECTION 12: Notification helper function (called by edge functions or triggers)
-- Creates a notification record for a user
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_notification(
  p_user_id UUID,
  p_type    TEXT,
  p_title   TEXT,
  p_body    TEXT,
  p_data    JSONB DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- SECTION 13: Notify seller when buyer creates connection request
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notify_seller_on_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_buyer_name   TEXT;
  v_movie        TEXT;
  v_listing_id   UUID;
BEGIN
  -- Get buyer name
  SELECT name INTO v_buyer_name
    FROM public.users WHERE id = NEW.buyer_id;
  v_buyer_name := COALESCE(v_buyer_name, 'A student');

  -- Get listing movie
  SELECT movie, id INTO v_movie, v_listing_id
    FROM public.listings WHERE id = NEW.listing_id;

  -- Notify seller
  PERFORM public.fn_create_notification(
    NEW.seller_id,
    'connection_request',
    'Someone wants your ticket!',
    v_buyer_name || ' is interested in your ' || COALESCE(v_movie, 'ticket') || '.',
    jsonb_build_object(
      'connection_id', NEW.id,
      'listing_id',    NEW.listing_id,
      'buyer_id',      NEW.buyer_id,
      'movie',         v_movie
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_on_request ON public.connections;
CREATE TRIGGER trg_notify_seller_on_request
  AFTER INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_seller_on_request();

-- ============================================================
-- SECTION 14: Notify buyer when seller accepts/declines
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notify_buyer_on_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_movie TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT movie INTO v_movie
    FROM public.listings WHERE id = NEW.listing_id;

  IF NEW.status = 'ACCEPTED' THEN
    PERFORM public.fn_create_notification(
      NEW.buyer_id,
      'request_accepted',
      'Request accepted! 🎉',
      'The seller accepted your request for ' || COALESCE(v_movie, 'the ticket') || '. You can now chat with them.',
      jsonb_build_object(
        'connection_id', NEW.id,
        'listing_id',    NEW.listing_id,
        'movie',         v_movie
      )
    );
  ELSIF NEW.status = 'DECLINED' THEN
    PERFORM public.fn_create_notification(
      NEW.buyer_id,
      'request_declined',
      'Request declined',
      'The seller declined your request for ' || COALESCE(v_movie, 'the ticket') || '.',
      jsonb_build_object(
        'connection_id', NEW.id,
        'listing_id',    NEW.listing_id,
        'movie',         v_movie
      )
    );
  ELSIF NEW.status = 'CANCELLED' AND OLD.status = 'PENDING' THEN
    -- Seller's listing was sold — notify buyer
    PERFORM public.fn_create_notification(
      NEW.buyer_id,
      'request_cancelled',
      'Ticket no longer available',
      'Your request for ' || COALESCE(v_movie, 'this ticket') || ' was cancelled as the listing is no longer active.',
      jsonb_build_object(
        'connection_id', NEW.id,
        'listing_id',    NEW.listing_id,
        'movie',         v_movie
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_buyer_on_status ON public.connections;
CREATE TRIGGER trg_notify_buyer_on_status
  AFTER UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_buyer_on_status_change();
