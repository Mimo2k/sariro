-- ════════════════════════════════════════════════════════════════
-- SARIRO — Backfill pre-existing enrollments
-- ════════════════════════════════════════════════════════════════
-- For students who paid via Razorpay BEFORE the new purchase_intent
-- system was wired up. Their payment went through, but no enrollment
-- row exists in the new schema.
--
-- Run this for EACH pre-existing student. Replace the placeholders.
-- ════════════════════════════════════════════════════════════════

-- STEP 1: Find the student's user_id (run this first to see it)
-- Replace with the student's email:
SELECT id, full_name, email FROM public.profiles WHERE email = 'STUDENT_EMAIL@example.com';

-- STEP 2: Insert the enrollment (replace ALL placeholders)
-- Use the user_id from step 1
INSERT INTO public.enrollments (
  user_id,
  track,
  level,
  ratio,
  status,
  started_at,
  created_at
) VALUES (
  'PASTE_USER_ID_HERE',                           -- from step 1
  'web',                                           -- track: web|app|saas|agent|data|cloud|design|game|automation|security
  'beginner',                                      -- level: beginner|intermediate|advanced
  '1:4',                                            -- ratio: 1:4 or 1:1
  'active',                                         -- status: pending|active|completed|dropped
  '2025-06-01T00:00:00Z',                          -- when they started (ISO date)
  NOW()
);

-- STEP 3: (Optional) Also backfill a purchase_intent so the audit trail is complete
INSERT INTO public.purchase_intents (
  user_id,
  track,
  level,
  ratio,
  razorpay_link,
  status,
  created_at,
  confirmed_at
) VALUES (
  'PASTE_USER_ID_HERE',
  'web',
  'beginner',
  '1:4',
  'https://pages.razorpay.com/sarirobeginner',     -- the link they paid through
  'confirmed',                                      -- mark as confirmed since they already paid
  '2025-06-01T00:00:00Z',
  '2025-06-01T00:05:00Z'
);

-- STEP 4: Verify
SELECT * FROM public.enrollments WHERE user_id = 'PASTE_USER_ID_HERE';
SELECT * FROM public.purchase_intents WHERE user_id = 'PASTE_USER_ID_HERE';
