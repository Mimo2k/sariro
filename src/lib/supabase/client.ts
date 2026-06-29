'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase browser client.
 * Uses the anon key — safe to expose to the browser.
 *
 * Replace the env vars in .env with your real Supabase project values:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *
 * Returns null if env vars are placeholders — auth/features will gracefully
 * no-op until you fill in real values. This lets the site compile & run
 * during development before Supabase is wired up.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  !!SUPABASE_URL &&
  !!SUPABASE_ANON_KEY &&
  SUPABASE_URL !== 'PUT_YOUR_SUPABASE_URL_HERE' &&
  SUPABASE_ANON_KEY !== 'PUT_YOUR_SUPABASE_ANON_KEY_HERE' &&
  SUPABASE_URL.startsWith('http');

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    // Return a cached lazy stub that won't throw on import.
    // Auth operations will fail gracefully with a friendly warning.
    if (!client) {
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not configured. ' +
          'Auth features are disabled. Fill in real values in .env to enable.'
      );
      // Create a no-op stub that mimics the supabase interface
      // (auth.getSession, auth.onAuthStateChange, auth.signInWithOAuth, etc.)
      const stub = {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
          signInWithOAuth: async () => ({
            data: {},
            error: new Error('Supabase not configured'),
          }),
          signInWithPassword: async () => ({
            data: {},
            error: new Error('Supabase not configured'),
          }),
          signInWithIdToken: async () => ({
            data: {},
            error: new Error('Supabase not configured'),
          }),
          signUp: async () => ({
            data: { user: null, session: null },
            error: new Error('Supabase not configured'),
          }),
          signOut: async () => ({ error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('Supabase not configured') }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: new Error('Supabase not configured') }),
          }),
          insert: async () => ({ error: new Error('Supabase not configured') }),
        }),
      };
      client = stub as unknown as SupabaseClient;
    }
    return client;
  }

  if (!client) {
    client = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return client;
}
