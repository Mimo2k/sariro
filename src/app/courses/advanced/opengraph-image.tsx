import { buildOgImage } from '@/lib/og/brand-frame';

export const alt = 'Sariro Advanced Courses — Enterprise architecture + team leadership';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function AdvancedOgImage() {
  return buildOgImage({
    eyebrow: 'Advanced · 16 weeks · 1:4 cohort',
    title: 'Architect at enterprise scale.',
    subtitle: 'Distributed systems, K8s, multi-region databases. Lead dev teams and ship at production scale.',
    accent: 'violet',
    footerRight: 'From $699 · sariro.com/courses/advanced',
  });
}
