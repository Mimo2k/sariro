'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Rocket,
  CreditCard,
  GraduationCap,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import BrandLayout from '@/components/brand/brand-layout';
import PageHero from '@/components/brand/page-hero';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { WaveDivider3D } from '@/components/sariro-3d/kit-3d';
import {
  Reveal,
  TiltCard,
  SplitText,
  ParallaxOrb,
  StaggerGroup,
  StaggerItem,
  MagneticButton,
} from '@/components/brand/effects-kit';
import { BRAND } from '@/lib/sariro-data';

/* ---------------------------------------------------------------
   FAQ data — 12 items across 4 categories
--------------------------------------------------------------- */

type FaqCategory = 'Getting Started' | 'Pricing' | 'Learning' | 'Technical';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
};

const FAQ_ITEMS: FaqItem[] = [
  // Getting Started
  {
    id: 'faq-1',
    category: 'Getting Started',
    question: 'Do I need to know how to code before I start?',
    answer:
      'No. Our AI Foundations: Thinking in Systems course assumes zero coding background. We start with mental models, plain-English explanations, and small guided projects. By week 4 you\u2019ll be writing real Python \u2014 and understanding why each line matters.',
  },
  {
    id: 'faq-2',
    category: 'Getting Started',
    question: 'Which course should I take first?',
    answer:
      'If you\u2019re new to AI (or new to thinking about it systematically), start with AI Foundations. If you already code and want depth, jump into Building LLM Applications or Prompt Engineering Mastery. Still unsure? Email us \u2014 we reply within 24 hours with a personal recommendation.',
  },
  {
    id: 'faq-3',
    category: 'Getting Started',
    question: 'How much time per week should I expect to commit?',
    answer:
      'Plan for 6\u20138 hours per week: 2 hours of live sessions, 1 hour of mentorship, and 3\u20135 hours of project work. Cohorts are designed to fit alongside a full-time job or school load. We\u2019ve had parents, founders, and full-time students all finish strong.',
  },
  // Pricing
  {
    id: 'faq-4',
    category: 'Pricing',
    question: 'What\u2019s included in the course price?',
    answer:
      'Every paid cohort includes all live sessions, lifetime recordings, lifetime community access, personalized project feedback, a certificate of completion, and \u2014 importantly \u2014 a real, working AI artifact you can show employers. No upsells, no hidden fees.',
  },
  {
    id: 'faq-5',
    category: 'Pricing',
    question: 'Do you offer scholarships or financial aid?',
    answer:
      'Yes. We set aside 10% of every cohort for full or partial scholarships, prioritized for students in underrepresented regions and career switchers in financial transition. Apply via our contact page \u2014 mention \u201cscholarship\u201d in the subject line.',
  },
  {
    id: 'faq-6',
    category: 'Pricing',
    question: 'Can my school or employer pay for a cohort?',
    answer:
      'Absolutely. We invoice schools, districts, and employers directly and can align to CSTA / IB / procurement requirements. For school packages, look at our Schools page; for employer sponsorships, email us and we\u2019ll handle the paperwork.',
  },
  // Learning
  {
    id: 'faq-7',
    category: 'Learning',
    question: 'Are cohorts live, or pre-recorded?',
    answer:
      'Live. Every Sariro cohort is taught in real time by Mimo or a senior mentor \u2014 you ask questions, get unstuck, and learn alongside 30\u201340 peers. Sessions are recorded and posted within 24 hours for those in other timezones (or who just want to rewatch).',
  },
  {
    id: 'faq-8',
    category: 'Learning',
    question: 'Will I actually build something I can show employers?',
    answer:
      'Yes \u2014 this is non-negotiable. Every cohort ends with at least one portfolio-ready AI artifact: a production RAG app, a fine-tuned CV model, a prompt library with evals, or an agent system. Many of our students ship these directly into their jobs or internships.',
  },
  {
    id: 'faq-9',
    category: 'Learning',
    question: 'What if I fall behind during a cohort?',
    answer:
      'You won\u2019t be alone. Every student gets mentor sessions, asynchronous help in the community, and \u2014 if life happens \u2014 the option to defer to a future cohort at no extra cost. We\u2019d rather you finish strong than finish fast.',
  },
  // Technical
  {
    id: 'faq-10',
    category: 'Technical',
    question: 'What hardware and software do I need?',
    answer:
      'A laptop made in the last 5 years (any OS), a stable internet connection, and a modern browser. We use free, cloud-based notebooks for everything compute-heavy \u2014 no GPU required. We\u2019ll send a setup checklist the week before your cohort starts.',
  },
  {
    id: 'faq-11',
    category: 'Technical',
    question: 'Do I need to pay for OpenAI, Anthropic, or other API keys?',
    answer:
      'No. Sariro covers all API costs during your cohort through a shared, rate-limited key. For your capstone project, we provide a small credit stipend. If you want to build beyond that, we\u2019ll show you how to use free or local alternatives.',
  },
  {
    id: 'faq-12',
    category: 'Technical',
    question: 'Will I get a certificate, and does it mean anything?',
    answer:
      'You\u2019ll get a certificate of completion, but the real credential is the project you ship. Employers don\u2019t hire certificates \u2014 they hire builders. Our alumni report that their Sariro portfolio projects are what got them interviews, not the PDF.',
  },
];

/* Category metadata */
const CATEGORIES: { key: FaqCategory | 'All'; label: string; icon: typeof HelpCircle; accent: string }[] = [
  { key: 'All', label: 'All', icon: Sparkles, accent: '#06B6D4' },
  { key: 'Getting Started', label: 'Getting Started', icon: Rocket, accent: '#16A34A' },
  { key: 'Pricing', label: 'Pricing', icon: CreditCard, accent: '#F59E0B' },
  { key: 'Learning', label: 'Learning', icon: GraduationCap, accent: '#7C3AED' },
  { key: 'Technical', label: 'Technical', icon: Cpu, accent: '#2563EB' },
];

const CATEGORY_ACCENT: Record<FaqCategory, string> = {
  'Getting Started': '#16A34A',
  Pricing: '#F59E0B',
  Learning: '#7C3AED',
  Technical: '#2563EB',
};

export default function FaqPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaqCategory | 'All'>('All');

  useEffect(() => {
    document.title = 'FAQ \u2014 Sariro | Frequently Asked Questions';
  }, []);

  // Filtered items based on search + category
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  // Category counts (for the filter pills)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: FAQ_ITEMS.length };
    for (const cat of CATEGORIES) {
      if (cat.key === 'All') continue;
      counts[cat.key] = FAQ_ITEMS.filter((i) => i.category === cat.key).length;
    }
    return counts;
  }, []);

  // Group filtered items by category for display
  const groupedFiltered = useMemo(() => {
    if (activeCategory !== 'All') {
      return [{ category: activeCategory as FaqCategory, items: filteredItems }];
    }
    return (['Getting Started', 'Pricing', 'Learning', 'Technical'] as FaqCategory[])
      .map((c) => ({
        category: c,
        items: filteredItems.filter((i) => i.category === c),
      }))
      .filter((g) => g.items.length > 0);
  }, [filteredItems, activeCategory]);

  return (
    <BrandLayout>
      <PageHero
        eyebrow="Frequently asked"
        accentColor="#06B6D4"
        breadcrumb="FAQ"
        variant="faq"
        title={
          <>
            Questions, <span className="gradient-text">answered.</span>
          </>
        }
        subtitle="Everything you wanted to know about Sariro \u2014 courses, pricing, learning experience, and the technical setup. Can\u2019t find your question? We reply to every email within 24 hours."
      >
        <a href="#faq-list" className="btn-tactile btn-tactile-primary px-5 py-3 text-sm">
          <Search className="w-4 h-4" />
          Browse questions
        </a>
        <Link href="/contact" className="btn-tactile btn-tactile-light px-5 py-3 text-sm">
          <MessageCircle className="w-4 h-4" />
          Ask us directly
        </Link>
      </PageHero>

      {/* ====== Search + filters ====== */}
      <section id="faq-list" className="relative py-12 sm:py-16 overflow-hidden scroll-mt-24">
        <ParallaxOrb color="rgba(6, 182, 212, 0.10)" size={420} speed={110} position="top-10 -left-20" />
        <ParallaxOrb color="rgba(124, 58, 237, 0.08)" size={320} speed={-80} position="bottom-10 -right-20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search input */}
          <Reveal>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions... (try 'scholarship' or 'API')"
                className="h-14 pl-12 pr-4 text-base rounded-2xl"
                aria-label="Search FAQ"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  Clear
                </button>
              )}
            </div>
          </Reveal>

          {/* Category filter pills */}
          <Reveal delay={0.1}>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key;
                const count = categoryCounts[cat.key] ?? 0;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                      isActive
                        ? 'text-white border-transparent shadow-lg'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    style={
                      isActive
                        ? { background: cat.accent, fontFamily: 'var(--font-grotesk)', boxShadow: `0 10px 24px -10px ${cat.accent}` }
                        : { fontFamily: 'var(--font-grotesk)' }
                    }
                    aria-pressed={isActive}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.label}
                    <span
                      className={`ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ====== FAQ accordion list ====== */}
      <section className="relative pb-16 sm:pb-20 overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredItems.length === 0 ? (
            <Reveal>
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-slate-400" />
                </div>
                <h3
                  className="text-xl font-extrabold text-slate-900 mb-2"
                  style={{ fontFamily: 'var(--font-jakarta)' }}
                >
                  No questions match your search.
                </h3>
                <p className="text-slate-600 mb-6">
                  Try a different keyword, or just email us — we read every message.
                </p>
                <MagneticButton
                  as="a"
                  href="/contact"
                  strength={0.2}
                  className="btn-tactile btn-tactile-primary px-6 py-3 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Ask us directly
                </MagneticButton>
              </div>
            </Reveal>
          ) : (
            <div className="space-y-12">
              {groupedFiltered.map((group) => (
                <div key={group.category}>
                  <Reveal>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${CATEGORY_ACCENT[group.category]}15`, color: CATEGORY_ACCENT[group.category] }}
                      >
                        {(() => {
                          const meta = CATEGORIES.find((c) => c.key === group.category);
                          const Icon = meta?.icon ?? HelpCircle;
                          return <Icon className="w-5 h-5" strokeWidth={2.2} />;
                        })()}
                      </div>
                      <h2
                        className="text-lg font-extrabold text-slate-900"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                      >
                        {group.category}
                      </h2>
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white"
                        style={{ background: CATEGORY_ACCENT[group.category], fontFamily: 'var(--font-grotesk)' }}
                      >
                        {group.items.length} {group.items.length === 1 ? 'question' : 'questions'}
                      </span>
                    </div>
                  </Reveal>

                  <TiltCard className="card-3d p-2 sm:p-4" maxTilt={2}>
                    <Accordion type="single" collapsible className="w-full">
                      {group.items.map((item) => (
                        <AccordionItem key={item.id} value={item.id} className="border-slate-100">
                          <AccordionTrigger
                            className="text-left text-base sm:text-lg font-bold text-slate-900 hover:no-underline px-4 py-5 rounded-xl hover:bg-slate-50 transition-colors"
                            style={{ fontFamily: 'var(--font-jakarta)' }}
                          >
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="px-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TiltCard>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <WaveDivider3D fromColor="#FFFFFF" toColor="#F8FAFC" />

      {/* ====== Quick stats ====== */}
      <section className="relative py-12 sm:py-16 bg-slate-50 overflow-hidden">
        <ParallaxOrb color="rgba(6, 182, 212, 0.10)" size={360} speed={90} position="top-10 right-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-4" stagger={0.1}>
            {[
              { label: 'Questions answered', value: '12', accent: '#06B6D4', icon: HelpCircle },
              { label: 'Average reply time', value: '< 24h', accent: '#16A34A', icon: MessageCircle },
              { label: 'Live cohorts / year', value: '8+', accent: '#7C3AED', icon: Rocket },
              { label: 'Emails read by humans', value: '100%', accent: '#F59E0B', icon: Sparkles },
            ].map((s) => (
              <StaggerItem key={s.label}>
                <TiltCard className="glass-panel rounded-2xl p-5 text-center h-full" maxTilt={5}>
                  <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.accent }} />
                  <div
                    className="text-2xl font-extrabold text-slate-900"
                    style={{ fontFamily: 'var(--font-jakarta)' }}
                  >
                    {s.value}
                  </div>
                  <div
                    className="text-xs text-slate-500 mt-1"
                    style={{ fontFamily: 'var(--font-grotesk)' }}
                  >
                    {s.label}
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <WaveDivider3D fromColor="#F8FAFC" toColor="#FFFFFF" />

      {/* ====== Bottom CTA ====== */}
      <section className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-60" />
        <ParallaxOrb color="rgba(6, 182, 212, 0.12)" size={420} speed={100} position="top-10 left-1/4" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <span
              className="inline-block text-xs font-bold uppercase tracking-[0.18em] text-cyan-600 mb-3"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              Still have questions?
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2
              className="text-3xl sm:text-5xl font-extrabold text-slate-900"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              <SplitText
                text="We answer every email. From a real human. Within 24 hours."
                highlight="real human."
                highlightClassName="gradient-text"
              />
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              No bots, no tickets, no “5–7 business days.” Just us — reading what
              you wrote and writing back. Try us.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <MagneticButton
                as="a"
                href="/contact"
                strength={0.25}
                className="btn-tactile btn-tactile-primary px-6 py-3.5"
              >
                <MessageCircle className="w-4 h-4" />
                Contact us
                <ArrowRight className="w-4 h-4" />
              </MagneticButton>
              <MagneticButton
                as="a"
                href={`mailto:${BRAND.emails.support}`}
                strength={0.25}
                className="btn-tactile btn-tactile-light px-6 py-3.5"
              >
                Email support directly
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    </BrandLayout>
  );
}
