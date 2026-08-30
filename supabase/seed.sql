-- ============================================================
-- Last Minuties — Seed Data (Fictional only)
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Colleges
INSERT INTO colleges (name, verification_method, status) VALUES
  ('IIT Madras', 'email_domain', 'active'),
  ('IIT Bombay', 'email_domain', 'active'),
  ('BITS Pilani', 'email_domain', 'active'),
  ('VIT Vellore', 'manual', 'active'),
  ('NIT Trichy', 'manual', 'active'),
  ('SRM Chennai', 'manual', 'active'),
  ('Amrita University', 'manual', 'active')
ON CONFLICT (name) DO NOTHING;

-- Note: Real user + listing seed data cannot be inserted directly without
-- auth.users entries. Use Supabase Auth test phone numbers (+1 555 000 xxxx)
-- to create test accounts, then insert listings via the application.

-- ============================================================
-- Sample SQL to manually insert a test listing (after creating a user)
-- Replace 'your-user-uuid' with your actual auth user ID
-- ============================================================

-- INSERT INTO listings (
--   seller_id, movie, theatre, date, show_time, seats, quantity,
--   original_price, asking_price, status, urgency_score, urgency_level,
--   expires_at
-- ) VALUES (
--   'your-user-uuid',
--   'Coolie',
--   'PVR VR Chennai',
--   CURRENT_DATE,
--   '21:30',
--   ARRAY['G12', 'G13'],
--   2,
--   220.00,
--   180.00,
--   'available',
--   85,
--   'urgent',
--   NOW() + INTERVAL '3 hours'
-- );
