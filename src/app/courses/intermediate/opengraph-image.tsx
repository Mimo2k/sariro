import { buildOgImage } from '@/lib/og/brand-frame';

export const alt = 'Sariro Intermediate Courses — Production-grade AI systems';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function IntermediateOgImage() {
  return buildOgImage({
    eyebrow: 'Intermediate · 12 weeks · 1:4 cohort',
    title: 'Ship production-grade AI.',
    subtitle: 'Advanced patterns, architecture, auth + payments. Build a full-stack application you can defend.',
    accent: 'blue',
    footerRight: 'From $299 · sariro.com/courses/intermediate',
  });
}
