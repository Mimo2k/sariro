import type { MetadataRoute } from 'next';

/**
 * SARIRO — robots.txt
 *
 * Allows all crawlers on public paths. Disallows auth-gated + dashboard
 * + checkout + payment + API routes (those shouldn't be indexed).
 *
 * Points to /sitemap.xml.
 */

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/auth/',
          '/checkout',
          '/payment-success',
          '/payment-failure',
          '/certificate/',
          '/settings',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
