-- ============================================================
-- Last Minuties — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COLLEGES
-- ============================================================
CREATE TABLE IF NOT EXISTS colleges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  verification_method TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  college TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  profile_image TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  college_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  connection_count INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  movie TEXT NOT NULL,
  theatre TEXT NOT NULL,
  date DATE NOT NULL,
  show_time TIME NOT NULL,
  seats TEXT[] NOT NULL DEFAULT '{}',
  quantity INT DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 10),
  original_price DECIMAL(10,2) NOT NULL CHECK (original_price >= 0),
  asking_price DECIMAL(10,2) NOT NULL CHECK (asking_price >= 0),
  ticket_image_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'contacted', 'sold', 'expired', 'cancelled')),
  urgency_score INT DEFAULT 50 CHECK (urgency_score >= 0 AND urgency_score <= 100),
  urgency_level TEXT DEFAULT 'available' CHECK (urgency_level IN ('available', 'soon', 'hot', 'urgent')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_expires_at_idx ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_urgency_score_idx ON listings(urgency_score DESC);
CREATE INDEX IF NOT EXISTS listings_seller_id_idx ON listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_movie_idx ON listings USING GIN(to_tsvector('english', movie));

-- Auto-expire trigger
CREATE OR REPLACE FUNCTION expire_listings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE listings 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'available' 
    AND expires_at < NOW()
    AND id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, buyer_id) -- Prevent duplicate connection requests
);

CREATE INDEX IF NOT EXISTS connections_buyer_idx ON connections(buyer_id);
CREATE INDEX IF NOT EXISTS connections_seller_idx ON connections(seller_id);
CREATE INDEX IF NOT EXISTS connections_listing_idx ON connections(listing_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL CHECK (LENGTH(message) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_connection_idx ON messages(connection_id, created_at);

-- ============================================================
-- MATCH PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS match_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  movie TEXT,
  theatre TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  max_price DECIMAL(10,2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_prefs_user_idx ON match_preferences(user_id);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, from_user_id) -- One rating per user per connection
);

-- Auto-update user rating when a new rating is inserted
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET 
    rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE to_user_id = NEW.to_user_id),
    rating_count = (SELECT COUNT(*) FROM ratings WHERE to_user_id = NEW.to_user_id)
  WHERE id = NEW.to_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_insert
AFTER INSERT ON ratings
FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifs_user_read_idx ON notifications(user_id, read, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- USERS: anyone can read public profile, only owner can edit
CREATE POLICY "Users are publicly readable" ON users FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- LISTINGS: available listings are public, sellers manage own
CREATE POLICY "Available listings are public" ON listings
  FOR SELECT USING (status IN ('available', 'contacted') OR seller_id = auth.uid());
CREATE POLICY "Sellers can insert listings" ON listings
  FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Sellers can update own listings" ON listings
  FOR UPDATE USING (seller_id = auth.uid());

-- CONNECTIONS: only participants can read
CREATE POLICY "Connection participants can read" ON connections
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "Buyers can create connections" ON connections
  FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Sellers can update connection status" ON connections
  FOR UPDATE USING (seller_id = auth.uid());

-- MESSAGES: only connection participants can read/write
CREATE POLICY "Connection participants can read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM connections c
      WHERE c.id = messages.connection_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );
CREATE POLICY "Connection participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM connections c
      WHERE c.id = connection_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        AND c.status = 'accepted'
    )
  );

-- MATCH PREFERENCES: owner only
CREATE POLICY "Users manage own preferences" ON match_preferences
  FOR ALL USING (user_id = auth.uid());

-- RATINGS: participants only
CREATE POLICY "Rating participants can read" ON ratings
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users can rate connections" ON ratings
  FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- NOTIFICATIONS: user only
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE); -- Service role only in production

-- COLLEGES: public read
CREATE POLICY "Colleges are publicly readable" ON colleges FOR SELECT USING (TRUE);

-- ============================================================
-- ENABLE REALTIME for live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
