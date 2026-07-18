import { buildOgImage } from '@/lib/og/brand-frame';

export const alt = 'Sariro Beginner Courses — Build your first AI project';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function BeginnerOgImage() {
  return buildOgImage({
    eyebrow: 'Beginner · 8 weeks · 1:4 cohort',
    title: 'Build your first AI project.',
    subtitle: 'Live mentor-led cohorts. No experience required — ship a real portfolio piece in 8 weeks.',
    accent: 'green',
    footerRight: 'From $199 · sariro.com/courses/beginner',
  });
}
