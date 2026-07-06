-- ============================================================
-- SARIRO — Supabase Schema + Triggers + RLS + FAQ Seed
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- It is IDEMPOTENT — safe to re-run (uses DROP IF EXISTS / IF NOT EXISTS).
-- ============================================================

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE 1: profiles  (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  provider        TEXT DEFAULT 'email',           -- 'google' | 'github' | 'email'
  role            TEXT DEFAULT 'student',          -- 'student' | 'professional' | 'school_admin'
  email_verified  BOOLEAN DEFAULT FALSE,
  phone_verified  BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,        -- gate for the completion modal
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_provider_idx ON public.profiles(provider);

-- ============================================================
-- TABLE 2: chat_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id    TEXT,                            -- cookie-based ID for guests
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'active',           -- 'active' | 'archived'
  metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS chat_conv_user_idx ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS chat_conv_anon_idx ON public.chat_conversations(anonymous_id);

-- ============================================================
-- TABLE 3: chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,                    -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,        -- e.g. {matched_faq_id, confidence}
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_msg_conv_idx ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS chat_msg_created_idx ON public.chat_messages(created_at);

-- ============================================================
-- TABLE 4: faq_knowledge_base  (SLM training data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.faq_knowledge_base (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  category        TEXT NOT NULL,                    -- 'about' | 'courses' | 'pricing' | 'schools' | 'auth' | 'contact' | 'general'
  keywords        TEXT[] DEFAULT '{}',              -- for fast keyword lookup
  priority        INT DEFAULT 5,                    -- 1-10, higher = more authoritative
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faq_cat_idx ON public.faq_knowledge_base(category);
CREATE INDEX IF NOT EXISTS faq_active_idx ON public.faq_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS faq_keywords_idx ON public.faq_knowledge_base USING GIN(keywords);

-- ============================================================
-- TABLE 5: unanswered_questions  (SLM improvement loop)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.unanswered_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question        TEXT NOT NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved        BOOLEAN DEFAULT FALSE,
  resolved_answer TEXT,
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS unanswered_resolved_idx ON public.unanswered_questions(resolved);

-- ============================================================
-- TRIGGER: auto-create profile row when a new auth.users row appears
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, provider, email_verified, profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-update last_message_at on conversations when a new message is inserted
CREATE OR REPLACE FUNCTION public.touch_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_msg_touch_conv ON public.chat_messages;
CREATE TRIGGER chat_msg_touch_conv
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_last_message();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_knowledge_base      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unanswered_questions    ENABLE ROW LEVEL SECURITY;

-- ---------- profiles: user sees/edits only own row ----------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ---------- chat_conversations: owner-only ----------
DROP POLICY IF EXISTS "conv_select_own" ON public.chat_conversations;
CREATE POLICY "conv_select_own" ON public.chat_conversations
  FOR SELECT USING (
    auth.uid() = user_id
    OR anonymous_id IS NOT NULL
  );

DROP POLICY IF EXISTS "conv_insert_own" ON public.chat_conversations;
CREATE POLICY "conv_insert_own" ON public.chat_conversations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (user_id IS NULL AND anonymous_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "conv_update_own" ON public.chat_conversations;
CREATE POLICY "conv_update_own" ON public.chat_conversations
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- ---------- chat_messages: via conversation ownership ----------
DROP POLICY IF EXISTS "msg_select_own" ON public.chat_messages;
CREATE POLICY "msg_select_own" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.user_id = auth.uid() OR c.anonymous_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "msg_insert_own" ON public.chat_messages;
CREATE POLICY "msg_insert_own" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR c.anonymous_id IS NOT NULL)
    )
  );

-- ---------- faq_knowledge_base: public read, admin write ----------
DROP POLICY IF EXISTS "faq_public_select" ON public.faq_knowledge_base;
CREATE POLICY "faq_public_select" ON public.faq_knowledge_base
  FOR SELECT USING (is_active = TRUE);

-- Admin write policies would go here once you have an admin role.
-- For now, manage FAQ via Supabase Dashboard or service_role key (server-side).

-- ---------- unanswered_questions: user can INSERT own, admin SELECT ----------
DROP POLICY IF EXISTS "unanswered_insert_own" ON public.unanswered_questions;
CREATE POLICY "unanswered_insert_own" ON public.unanswered_questions
  FOR INSERT WITH CHECK (TRUE);  -- anyone (anon or authed) can submit

DROP POLICY IF EXISTS "unanswered_select_own" ON public.unanswered_questions;
CREATE POLICY "unanswered_select_own" ON public.unanswered_questions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- FAQ SEED DATA  (~28 entries — SLM training corpus)
-- ============================================================
-- Wipe existing seed (safe — TRUNCATE only seed table)
TRUNCATE public.faq_knowledge_base RESTART IDENTITY CASCADE;

INSERT INTO public.faq_knowledge_base (question, answer, category, keywords, priority) VALUES

-- ===== ABOUT (6) =====
(
  'What is Sariro?',
  'Sariro is a cohort-based AI education studio founded in San Francisco by Mimo Patra. We teach AI the way real builders learn it — through live cohorts, project-first curriculum, and senior mentor feedback. Every cohort ends with a real, working AI artifact you can show an employer, client, or school. We don''t sell tutorials — we ship builders.',
  'about',
  ARRAY['sariro','what is sariro','about','company','brand','who','intro','explain'],
  10
),
(
  'Who is Mimo Patra?',
  'Mimo Patra is the founder and lead educator at Sariro. He has 12+ years of teaching experience, has mentored 5,000+ students across 65 nationalities, published 36 research papers, and filed 7 patents. Mimo leads the flagship AI Foundations cohort personally and writes most of the curriculum. His teaching philosophy: teach thinking, not just typing.',
  'about',
  ARRAY['mimo','patra','founder','who is mimo','educator','teacher'],
  9
),
(
  'What makes Sariro different from other AI courses?',
  'Three things: (1) Cohort-based, not self-paced — our completion rate is 87% vs 4% for self-paced courses. (2) Mentor-led, not video-led — every cohort is run by a senior builder who has shipped AI to production. (3) Project-first — every module ends with something working, not a quiz. We also teach in plain language with no gatekeeping jargon.',
  'about',
  ARRAY['different','unique','vs','compare','why','special','better','difference'],
  9
),
(
  'Where is Sariro based?',
  'Sariro is headquartered in San Francisco, but we are remote-first and teach worldwide. Our cohorts are fully remote so students from any timezone can join. We have taught learners in 65 countries across North America, Europe, Asia, Africa, and Latin America. For school partnerships, we offer both in-person workshops and remote labs.',
  'about',
  ARRAY['where','location','based','san francisco','remote','address','country','worldwide'],
  7
),
(
  'Is Sariro a bootcamp?',
  'Sariro is not a traditional bootcamp. Bootcamps typically run 12+ weeks full-time, cost $10k+, and focus on broad engineering skills. Sariro runs focused 4-12 week cohorts on specific AI topics (RAG, prompt engineering, computer vision, etc.), costs $99-$399 per cohort, and is designed to fit alongside your job or studies. Think of us as specialized AI sprints, not a bootcamp replacement.',
  'about',
  ARRAY['bootcamp','coding bootcamp','like','vs bootcamp','difference bootcamp'],
  6
),
(
  'What is the Sariro philosophy?',
  'Four principles shape every Sariro course: (1) Thinking over typing — we teach you to reason about problems, the typing comes naturally after. (2) Build real things — every course ends with a working AI artifact, not a hello world. (3) Accessible by design — plain language, no jargon, an 8-year-old and a grandpa should both follow along. (4) Community, not customers — once you''re in, you''re in for life with our alumni Slack.',
  'about',
  ARRAY['philosophy','principles','values','method','approach','teaching','thinking'],
  8
),

-- ===== COURSES (6) =====
(
  'What courses does Sariro offer?',
  'Sariro currently offers 6 cohort-based courses: (1) AI Foundations: Thinking in Systems — 8 weeks, $149. (2) Prompt Engineering Mastery — 4 weeks, $99. (3) Building LLM Applications (RAG) — 12 weeks, $349. (4) Computer Vision with PyTorch — 10 weeks, $299. (5) AI Ethics & Responsible Design — 6 weeks, $199. (6) AI Agents & Workflow Automation — 8 weeks, $399. Summer 2026 cohorts are open now.',
  'courses',
  ARRAY['courses','list','offer','available','catalog','what courses','programs'],
  10
),
(
  'How long is each course?',
  'Course lengths vary by topic: Prompt Engineering is 4 weeks (shortest), AI Ethics is 6 weeks, AI Foundations and AI Agents are 8 weeks each, Computer Vision is 10 weeks, and Building LLM Applications is 12 weeks (longest). All cohorts are live with 2 sessions per week (evenings PT). Recordings are always available if you miss a session.',
  'courses',
  ARRAY['how long','duration','weeks','length','time','commitment','schedule'],
  8
),
(
  'Do I need coding experience to enroll?',
  'It depends on the course. AI Foundations and Prompt Engineering require ZERO coding experience — we teach from scratch. Building LLM Applications, Computer Vision, and AI Agents assume basic Python (you can write a function and use a list). AI Ethics requires no technical background at all. If you''re unsure, start with AI Foundations — it''s designed for absolute beginners and gives you the mental models for everything else.',
  'courses',
  ARRAY['coding','experience','beginner','prerequisites','requirements','skills','python','no coding'],
  9
),
(
  'What is the next cohort start date?',
  'Upcoming cohort start dates: Prompt Jam Workshop — Jul 22, 2026. AI Ethics — Aug 05, 2026. AI Foundations — Aug 12, 2026 (Summer cohort, 12 seats left). Building LLM Applications — Sep 03, 2026. Computer Vision — Sep 17, 2026. AI Agents & Automation — Oct 14, 2026. Cohorts fill fast — reserve your seat on the /courses page.',
  'courses',
  ARRAY['next','cohort','start','date','when','schedule','upcoming','session'],
  8
),
(
  'Will I get a certificate?',
  'Yes. Every Sariro cohort awards a Certificate of Completion when you finish. The real value, though, is the portfolio project you ship — that''s what employers actually care about. Builder-tier cohorts include 3 portfolio projects with mentor feedback, plus a career strategy session. Certificates are downloadable from your dashboard within 7 days of cohort completion.',
  'courses',
  ARRAY['certificate','cert','completion','diploma','credential','proof','certificate of completion'],
  7
),
(
  'Can I switch cohorts if I cannot make the dates?',
  'Yes — you can defer to the next cohort of the same course for free, as long as you request it before your original cohort starts. If you need to switch after the cohort has started, we offer one free transfer to a future cohort. Just email support@sariro.com with your enrollment details and the cohort you''d like to move to.',
  'courses',
  ARRAY['switch','defer','transfer','change','move cohort','reschedule','dates'],
  6
),

-- ===== PRICING (5) =====
(
  'How much do Sariro courses cost?',
  'Course prices range from $99 to $399 per cohort. Prompt Engineering is $99, AI Foundations is $149, AI Ethics is $199, Computer Vision is $299, Building LLM Applications is $349, and AI Agents is $399. We are currently running a Summer 2026 launch discount of 25% off — visible on the /pricing page. School Pro packages are custom-quoted based on campus size and scope.',
  'pricing',
  ARRAY['cost','price','how much','fee','tuition','pay','pricing','money'],
  10
),
(
  'Do you offer scholarships?',
  'Yes. We reserve 15% of every cohort for needs-based scholarships. To apply, email contact@sariro.com with a one-paragraph note about your situation and which course you want to take. We respond within 7 days and do not require any financial documentation — we trust you. Scholarships cover 50-100% of the course fee based on need.',
  'pricing',
  ARRAY['scholarship','financial aid','free','discount','need','assist','help pay','cant afford'],
  9
),
(
  'Can my employer pay for the course?',
  'Absolutely. We send proper invoices and accept POs from companies. Most Builder-tier enrollments are now reimbursed through L&D budgets. After enrollment, reply to your confirmation email with your company''s billing details and we''ll send a custom invoice. If you need a letter justifying the course for your manager, we can provide one.',
  'pricing',
  ARRAY['employer','company','reimburse','invoice','po','purchase order','work pay','ld budget','learning budget'],
  7
),
(
  'What is your refund policy?',
  '14-day money-back guarantee on every enrollment — no questions, no friction. If you start a cohort and it''s not the right fit within the first 14 days, email support@sariro.com for a full refund. After 14 days, refunds are pro-rated based on sessions attended. School Pro packages have a separate refund clause in the contract.',
  'pricing',
  ARRAY['refund','money back','cancel','guarantee','return','cancel','guarantee'],
  8
),
(
  'Are there any hidden fees?',
  'No. One price covers everything: live sessions, recordings, mentor feedback, community access during the cohort, and your certificate. The only upsell is the Builder tier (vs Starter), which adds 1:1 mentor sessions, lifetime community access, and 3 portfolio projects reviewed instead of 1. We will never charge you for "premium content" or "bonus modules".',
  'pricing',
  ARRAY['hidden','fees','extra','upsell','additional','surprise','transparent'],
  6
),

-- ===== SCHOOLS (3) =====
(
  'Can Sariro come to my school?',
  'Yes. We partner with schools and districts to deliver AI curriculum on campus. Options range from single workshops (1-2 days) to full-semester AI labs (12-16 weeks). We handle curriculum, teacher training, and ongoing mentor support. Visit the /schools page or email schools@sariro.com to start a conversation.',
  'schools',
  ARRAY['school','campus','visit','partner','district','workshop','on site','class'],
  9
),
(
  'Do you train teachers?',
  'Yes — teacher training is included in every School Pro package. We train up to 10 of your staff on the Sariro teaching method, our curriculum framework, and how to run live AI labs. Training is 2 full days (in-person or remote) plus ongoing monthly check-ins. Many schools say the teacher training alone was worth the entire package.',
  'schools',
  ARRAY['teacher','training','staff','faculty','pd','professional development','train'],
  8
),
(
  'Is the curriculum aligned to educational standards?',
  'Yes. Sariro''s school curriculum is aligned to CSTA (Computer Science Teachers Association) standards and IB (International Baccalaureate) framework. We provide full alignment documentation for your administration. We can also map to state-specific standards (e.g., California CS K-12) on request.',
  'schools',
  ARRAY['csta','ib','standards','aligned','curriculum','accreditation','state standards'],
  7
),

-- ===== AUTH (3) =====
(
  'How do I sign up?',
  'You can sign up three ways: (1) Google One Tap — click "Continue with Google" on any sign-in button and you''re in instantly. (2) GitHub — click "Continue with GitHub" if you have a GitHub account. (3) Email + password — enter your email and choose a password, then verify via the confirmation email we send. After signup, we''ll ask for your name and phone number to complete your profile.',
  'auth',
  ARRAY['sign up','register','create account','join','login','sign in','google','github'],
  10
),
(
  'Can I sign in with Google?',
  'Yes — Google One Tap is supported. Click any "Continue with Google" button and a Google popup will appear asking for your consent. After you approve, you''ll be logged in instantly and your email, name, and profile photo will be fetched automatically. We''ll still ask for your phone number to complete your profile.',
  'auth',
  ARRAY['google','sign in with google','one tap','oauth','google login'],
  9
),
(
  'How do I reset my password?',
  'On the sign-in page, click "Forgot password?" and enter your email. We''ll send you a reset link valid for 1 hour. Click the link, choose a new password, and you''re back in. If you signed up with Google or GitHub, you don''t need a password — just sign in with the same provider again.',
  'auth',
  ARRAY['reset','forgot','password','lost password','recover','locked out'],
  8
),

-- ===== CONTACT (3) =====
(
  'How do I contact Sariro?',
  'Five ways: (1) contact@sariro.com — general questions. (2) support@sariro.com — already enrolled, need help. (3) dev@sariro.com — technical, integrations, OSS. (4) hr@sariro.com — careers, joining the team. (5) founder@sariro.com — partnerships, press, investor conversations. We reply to every message within 24 hours, Monday through Friday.',
  'contact',
  ARRAY['contact','email','reach','talk','support','help','phone','message'],
  10
),
(
  'What are your response times?',
  'We reply to every message within 24 hours, Monday through Friday. Office hours are 9am-6pm Pacific Time, but we''re async-friendly across timezones. Weekend messages get a Monday reply. For urgent enrollment issues (cohort starting tomorrow, etc.), mark your email subject with [URGENT] and we''ll prioritize.',
  'contact',
  ARRAY['response','time','reply','how long','wait','hours','office hours'],
  7
),
(
  'Can I book a call instead of emailing?',
  'Yes. Visit /contact and click "Book a slot" — you''ll get a free 30-minute discovery call with our team. No pitch, just answers. Bring your questions about courses, school partnerships, or which track is right for you. Calls are scheduled in PT but we accommodate any timezone on request.',
  'contact',
  ARRAY['call','book','phone call','discovery','talk to human','meeting','schedule'],
  6
),

-- ===== GENERAL (2) =====
(
  'Is Sariro free?',
  'Sariro is not free — cohort enrollments range from $99 to $399. However, we offer many free resources: the Sariro blog at /resources is 100% free, we run free Prompt Jam webinars regularly, the AI for Good Hackathon is free to enter, and we reserve 15% of every cohort for needs-based scholarships. If you genuinely cannot afford a cohort, email contact@sariro.com — we will work something out.',
  'general',
  ARRAY['free','cost','pay','money','afford','free resources','budget'],
  8
),
(
  'Do you offer certificates and are they recognized?',
  'Yes — every cohort awards a Certificate of Completion. Our certificates are recognized by employers who value project portfolios over credentials (which is most modern AI companies). The certificate alone won''t get you a job, but the 3 portfolio projects you ship in a Builder-tier cohort will. We''ve had students land ML engineer roles at startups and FAANG companies based on their Sariro projects.',
  'general',
  ARRAY['certificate','recognized','accredited','job','employment','value','certificate worth'],
  7
);

-- ============================================================
-- DONE — verify with:
-- SELECT category, COUNT(*) FROM faq_knowledge_base GROUP BY category ORDER BY category;
-- Should return: about=6, auth=3, contact=3, courses=6, general=2, pricing=5, schools=3 (total 28)
-- ============================================================
