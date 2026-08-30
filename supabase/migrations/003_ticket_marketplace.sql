-- ============================================================
-- Last Minuties — Phase 3: Ticket Marketplace Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- LISTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  movie TEXT NOT NULL,
  theatre TEXT NOT NULL,
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
  seats TEXT[] NOT NULL DEFAULT '{}',
  quantity INT DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 10),
  original_price DECIMAL(10,2) NOT NULL CHECK (original_price >= 0),
  asking_price DECIMAL(10,2) NOT NULL CHECK (asking_price >= 0),
  ticket_image_path TEXT,
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'CONTACTED', 'SOLD', 'EXPIRED', 'CANCELLED')),
  urgency_score INT DEFAULT 50 CHECK (urgency_score >= 0 AND urgency_score <= 100),
  urgency_level TEXT DEFAULT 'available' CHECK (urgency_level IN ('available', 'soon', 'hot', 'urgent')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR FAST SEARCH & FILTERING
-- ============================================================
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings(status);
CREATE INDEX IF NOT EXISTS listings_expires_at_idx ON public.listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_show_date_idx ON public.listings(show_date);
CREATE INDEX IF NOT EXISTS listings_seller_id_idx ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS listings_movie_trgm_idx ON public.listings USING GIN(to_tsvector('english', movie));
CREATE INDEX IF NOT EXISTS listings_theatre_trgm_idx ON public.listings USING GIN(to_tsvector('english', theatre));

-- ============================================================
-- AUTO-UPDATE UPDATED_AT & RECALCULATE EXPIRES_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_listing_timestamps_and_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Automatically calculate expires_at as a UTC timestamp from show_date and show_time if not explicitly overridden
  IF NEW.show_date IS NOT NULL AND NEW.show_time IS NOT NULL THEN
    NEW.expires_at = (NEW.show_date + NEW.show_time) AT TIME ZONE 'Asia/Kolkata';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_listings_timestamps ON public.listings;
CREATE TRIGGER set_listings_timestamps
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.handle_listing_timestamps_and_expiry();

-- ============================================================
-- SECURITY: PREVENT UNAUTHORIZED STATE TAMPERING
-- Prevents altering seller_id or returning SOLD/CANCELLED to AVAILABLE
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_listing_state_protection()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    -- Prevent changing the seller ID
    IF OLD.seller_id IS NOT NULL AND NEW.seller_id != OLD.seller_id THEN
      RAISE EXCEPTION 'Cannot modify seller_id of an existing listing';
    END IF;

    -- Prevent transitioning from final states (SOLD, CANCELLED) back to AVAILABLE
    IF OLD.status IN ('SOLD', 'CANCELLED') AND NEW.status = 'AVAILABLE' THEN
      RAISE EXCEPTION 'A sold or cancelled listing cannot be reactivated';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_listing_protection ON public.listings;
CREATE TRIGGER enforce_listing_protection
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_listing_state_protection();

-- ============================================================
-- AUTOMATIC EXPIRATION VIEW / FUNCTION
-- ============================================================
CREATE OR REPLACE VIEW public.active_listings AS
SELECT 
  l.*,
  u.name AS seller_name,
  u.college AS seller_college,
  u.phone_verified AS seller_phone_verified,
  u.college_verified AS seller_college_verified,
  u.rating AS seller_rating,
  u.rating_count AS seller_rating_count,
  u.connection_count AS seller_connection_count
FROM public.listings l
JOIN public.users u ON l.seller_id = u.id
WHERE l.status = 'AVAILABLE'
  AND l.expires_at > NOW()
ORDER BY l.expires_at ASC;

-- Helper stored procedure to mark expired listings
CREATE OR REPLACE FUNCTION public.expire_past_listings()
RETURNS INT AS $$
DECLARE
  expired_count INT;
BEGIN
  UPDATE public.listings
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE status IN ('AVAILABLE', 'CONTACTED')
    AND expires_at <= NOW();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Authenticated users can view available listings OR their own listings
DROP POLICY IF EXISTS "Public active listings are viewable by authenticated users" ON public.listings;
CREATE POLICY "Public active listings are viewable by authenticated users"
  ON public.listings
  FOR SELECT
  USING (
    (status = 'AVAILABLE' AND expires_at > NOW())
    OR auth.uid() = seller_id
  );

-- 2. INSERT: Users can only create listings with their own user id
DROP POLICY IF EXISTS "Users can insert own listings" ON public.listings;
CREATE POLICY "Users can insert own listings"
  ON public.listings
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- 3. UPDATE: Users can only update their own listings
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
CREATE POLICY "Users can update own listings"
  ON public.listings
  FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- 4. DELETE: Users can delete their own listings
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
CREATE POLICY "Users can delete own listings"
  ON public.listings
  FOR DELETE
  USING (auth.uid() = seller_id);

-- ============================================================
-- STORAGE BUCKET: ticket-images
-- Note: Execute storage policy if storage extension is available
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-images', 'ticket-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can upload to their own folder: ticket-images/[user_id]/*
DROP POLICY IF EXISTS "Users can upload ticket images to own folder" ON storage.objects;
CREATE POLICY "Users can upload ticket images to own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: Users can read their own uploaded ticket images
DROP POLICY IF EXISTS "Users can view own ticket images" ON storage.objects;
CREATE POLICY "Users can view own ticket images"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ticket-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
