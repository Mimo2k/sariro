import { buildOgImage } from '@/lib/og/brand-frame';

export const alt = 'Sariro Elementary Courses — Coding for absolute beginners';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function ElementaryOgImage() {
  return buildOgImage({
    eyebrow: 'Elementary · 6-8 weeks · 1:4 cohort',
    title: 'Start coding from zero.',
    subtitle: 'Python, Java, Web Basics, and Scratch + ML. Built for absolute beginners and kids. No experience needed.',
    accent: 'amber',
    footerRight: 'From $149 · sariro.com/courses/elementary',
  });
}
