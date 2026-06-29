import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  !!SUPABASE_URL &&
  !!SUPABASE_ANON_KEY &&
  SUPABASE_URL !== 'PUT_YOUR_SUPABASE_URL_HERE' &&
  SUPABASE_ANON_KEY !== 'PUT_YOUR_SUPABASE_ANON_KEY_HERE' &&
  SUPABASE_URL.startsWith('http');

/**
 * Supabase server client.
 * Uses the anon key + reads/writes auth cookies for SSR sessions.
 * Safe to use in Server Components, Route Handlers, and Server Actions.
 */
export async function createServerClientHelper() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env'
    );
  }
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // Safe to ignore if you have middleware refreshing sessions.
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS.
 * SERVER ONLY. Never import this in client code.
 *
 * Use for admin operations like:
 *   - Creating profiles on signup
 *   - Fetching all FAQs (public read but with admin power)
 *   - Inserting into unanswered_questions
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !isSupabaseConfigured ||
    !serviceKey ||
    serviceKey === 'PUT_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE'
  ) {
    throw new Error(
      'Supabase service role not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(SUPABASE_URL!, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
