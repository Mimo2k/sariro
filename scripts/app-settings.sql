-- ════════════════════════════════════════════════════════════════
-- SARIRO — App Settings table (for super-admin UI editing)
-- ════════════════════════════════════════════════════════════════
-- Allows super-admins to edit Razorpay links and pricing from the
-- dashboard (no code changes needed to update payment URLs or prices).
--
-- Schema: key-value pairs. Keys are namespaced like:
--   razorpay.beginner.1:4
--   razorpay.beginner.1:1
--   razorpay.intermediate.1:4
--   ...
--   price.beginner
--   price.intermediate
--   price.advanced
--
-- All values stored as TEXT. App code parses them as needed.
-- RLS: only super_admins can read/write.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  UUID REFERENCES public.profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS 'Key-value store for super-admin editable settings (Razorpay links, prices, etc.)';

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS settings_super_admin_read ON public.app_settings;
DROP POLICY IF EXISTS settings_super_admin_write ON public.app_settings;

-- Only super_admins can read
CREATE POLICY settings_super_admin_read
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.current_user_role() = 'super_admin');

-- Only super_admins can insert/update/delete
CREATE POLICY settings_super_admin_write
  ON public.app_settings FOR ALL TO authenticated
  USING (public.current_user_role() = 'super_admin')
  WITH CHECK (public.current_user_role() = 'super_admin');

-- Seed with current values from sariro-data.ts (so they show up in UI immediately)
INSERT INTO public.app_settings (key, value) VALUES
  ('razorpay.beginner.1:4',       'https://pages.razorpay.com/sarirobeginner'),
  ('razorpay.beginner.1:1',       'https://pages.razorpay.com/sarirobeginnerpremium'),
  ('razorpay.intermediate.1:4',   'https://pages.razorpay.com/sarirointermediate'),
  ('razorpay.intermediate.1:1',   'https://pages.razorpay.com/sarirointermediatepremium'),
  ('razorpay.advanced.1:4',       'https://pages.razorpay.com/sariroadvanced'),
  ('razorpay.advanced.1:1',       'https://pages.razorpay.com/sariroadvancedpremium'),
  ('price.beginner',              '199'),
  ('price.intermediate',          '299'),
  ('price.advanced',              '699'),
  ('price.1:1_premium_addon',     '100')
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT key, value FROM public.app_settings ORDER BY key;
