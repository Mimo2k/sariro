# SARIRO 3D — Website State Summary
> **Last Updated:** June 28, 2026
> **READ THIS FILE BEFORE MAKING ANY CHANGES**

---

## 📂 Routes (10 total)
| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Home — Neural hero + all 3D flow sections + Oryzo |
| `/courses` | `src/app/courses/page.tsx` | Course catalog with flip cards + discount pricing |
| `/schools` | `src/app/schools/page.tsx` | School packages + 4-step process |
| `/events` | `src/app/events/page.tsx` | Event grid with type filters |
| `/pricing` | `src/app/pricing/page.tsx` | 3 tiers with strikethrough + discount badges |
| `/about` | `src/app/about/page.tsx` | Brand story + Founder & CEO + Team + Principles |
| `/story` | `src/app/story/page.tsx` | 5-chapter brand story (dark cosmic) |
| `/faq` | `src/app/faq/page.tsx` | 12 FAQ items, 4 categories, searchable accordion |
| `/resources` | `src/app/resources/page.tsx` | Resource library grid |
| `/contact` | `src/app/contact/page.tsx` | Form with 5 email channels + info cards |
| 404 | `src/app/not-found.tsx` | "This page flew away" branded 404 |

---

## 🧩 Key Components

### Brand Layout (`src/components/brand/`)
- `brand-layout.tsx` — Navbar (10 items), footer (5 emails), CinematicIntro, MobileScrollTop, CompanionOrb (desktop only), BackgroundParticles3D, ScrollHueShift, ChapterNav, CustomCursor, SmoothScrollProvider
- `page-hero.tsx` — Reusable hero with 3D scene (right side desktop, below text mobile)
- `page-hero-3d.tsx` — 8 thematic 3D variants: courses (laptop+notebook+pen), schools (cap+fish), events (rooster+calendar+papers), pricing (piggy bank+coins), about (AI orb), resources (books), contact (cat chasing paper plane), faq (question bubbles)
- `oryzo-section.tsx` — Arrow + swipe navigation (NOT scroll-pin). 4 chapters, auto-play, 3D camera orbit
- `effects-kit.tsx` — Reveal, StaggerGroup/Item, TiltCard (with touch), MagneticButton, SplitText, CountUp, ParallaxOrb
- `cinematic-intro.tsx` — 2.8s particle → logo intro (skips on repeat via sessionStorage)
- `mobile-scroll-top.tsx` — Bottom-right scroll-to-top with progress ring (mobile only)
- `floating-stats-cluster.tsx` — Radial stat cards with mouse parallax

### Sariro 3D (`src/components/sariro-3d/`)
- `scroll-effects.tsx` — CustomCursor (with `instanceof Element` guard), ScrollReveal3D, MagneticButton, TiltCard3D, SplitText3D, VelocitySkew
- `persistent-3d.tsx` — CompanionOrb (desktop only `hidden lg:block`) + BackgroundParticles3D
- `smooth-scroll-provider.tsx` — Lenis smooth scroll + ScrollProgressBar
- `chapter-nav.tsx` — Right-side dot navigation + ScrollHueShift
- `kit-3d.tsx` — WaveDivider3D, FlipCard3D, Coverflow3D, NumberFlip3D, RotatingCube3D, FloatingIcon3D, DepthPopOut3D
- Home page sections: `tracks-3d.tsx`, `stats-3d.tsx`, `courses-3d.tsx`, `philosophy-3d.tsx`, `events-3d.tsx`, `testimonials-3d.tsx`, `pricing-3d.tsx`, `cta-3d.tsx`, `footer-3d.tsx`

---

## 📊 Data (`src/lib/sariro-data.ts`)
- `BRAND` — name, founder, tagline, mission, emails (contact/support/hr/founder/dev), timezone (UTC)
- `TRUSTED_BY` — IIT Bombay, Microsoft, Google, Stanford, MIT, Amazon, Meta, IIT Delhi
- `COURSES` — 6 courses, each with `price` + `originalPrice` (2x rounded for discount display)
- `PRICING_TIERS` — 3 tiers (Starter $149/~~$299~~, Builder $349/~~$699~~, School Pro custom)
- `EVENTS` — 3 events (cohort, hackathon, webinar)
- `TESTIMONIALS` — 6 testimonials
- `MIMO` — Bio, principles, numbers
- `HERO_STATS` — 5,000+ students, 65+ nationalities, 36 papers, 7 patents

---

## 🎨 Design System
- **Colors:** #2563EB (blue), #16A34A (green), #7C3AED (violet), #F59E0B (amber), #06B6D4 (cyan)
- **Fonts:** Plus Jakarta Sans (headings), Inter (body), Space Grotesk (buttons/badges)
- **Buttons:** `.btn-tactile` with primary/green/light/deep variants (3D push-down effect)
- **Cards:** `.card-3d` with shadow + glass-panel for glassmorphism
- **Animations:** Framer Motion (reveals, staggers, parallax), Lenis (smooth scroll), Three.js (3D scenes)

---

## 📱 Mobile Fixes Applied
- Hamburger: 44×44px touch target, `flex-shrink-0`, wrapped "Start Learning" in `hidden lg:block` div
- Mobile CTA: Compact "Start" pill (`lg:hidden`)
- CompanionOrb: `hidden lg:block` (desktop only, prevents double scroll-to-top)
- CustomCursor: `instanceof Element` guard (fixes `target.closest is not a function`)
- Events section: Vertical grid on mobile (no scroll-pin), horizontal carousel on desktop
- Oryzo section: Arrow buttons + swipe (no scroll-pin)
- Hero: 3D scene below stats on mobile (no `order-first`)
- Marquee: `hidden sm:block` (saves space on mobile)
- Tracks header: No rotate transform (was tilting text)

---

## 🔧 Package.json Scripts (Windows-safe)
```json
"dev": "next dev -p 3000",
"build": "next build",
"start": "next start -p 3000",
"lint": "eslint ."
```

---

## ⚠️ Known Issues (None)
- Lint: clean (0 errors)
- All 10 routes return 200
- 404 page works

---

## 📦 Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Three.js + @react-three/fiber + @react-three/drei
- Framer Motion
- Lenis (smooth scroll)
