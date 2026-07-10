/**
 * SARIRO — App Settings data layer
 *
 * Reads/writes the `app_settings` table (key-value store).
 * Super-admins can edit Razorpay links and prices from the dashboard
 * instead of editing code.
 *
 * The app still falls back to the hardcoded values in sariro-data.ts
 * if the database is unreachable or a key is missing.
 */

import { createClient } from '@/lib/supabase/client';
import { RAZORPAY_LINKS, RAZORPAY_LINKS_PREMIUM } from '@/lib/sariro-data';

export interface AppSettingRow {
  key: string;
  value: string;
  updated_at: string;
}

/* ───── Fetch all settings (super-admin only) ───── */
export async function fetchAllSettings(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) throw error;
    if (!data || data.length === 0) return {};

    const map: Record<string, string> = {};
    (data as AppSettingRow[]).forEach(row => {
      map[row.key] = row.value;
    });
    return map;
  } catch (err) {
    console.warn('[settings] fetchAllSettings error:', err);
    return {};
  }
}

/* ───── Get a single setting (with fallback) ───── */
export async function getSetting(key: string, fallback?: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    return data?.value ?? fallback ?? null;
  } catch (err) {
    console.warn('[settings] getSetting error:', err);
    return fallback ?? null;
  }
}

/* ───── Update a setting (upsert) ───── */
export async function updateSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Bulk update multiple settings ───── */
export async function updateSettings(updates: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const rows = Object.entries(updates).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('app_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Get all Razorpay links (DB first, fall back to code) ───── */
export async function fetchRazorpayLinks(): Promise<{
  standard: Record<string, string>;
  premium: Record<string, string>;
}> {
  const settings = await fetchAllSettings();

  const standard: Record<string, string> = {};
  const premium: Record<string, string> = {};

  // For each tier, prefer DB value, fall back to code
  for (const tier of ['Beginner', 'Intermediate', 'Advanced']) {
    standard[tier] = settings[`razorpay.${tier.toLowerCase()}.1:4`] ?? RAZORPAY_LINKS[tier];
    premium[tier] = settings[`razorpay.${tier.toLowerCase()}.1:1`] ?? RAZORPAY_LINKS_PREMIUM[tier];
  }

  return { standard, premium };
}

/* ───── Get all prices (DB first, fall back to code) ───── */
export async function fetchPrices(): Promise<{
  beginner: number;
  intermediate: number;
  advanced: number;
  premiumAddon: number;
}> {
  const settings = await fetchAllSettings();

  return {
    beginner: parseInt(settings['price.beginner'] ?? '199', 10),
    intermediate: parseInt(settings['price.intermediate'] ?? '299', 10),
    advanced: parseInt(settings['price.advanced'] ?? '699', 10),
    premiumAddon: parseInt(settings['price.1:1_premium_addon'] ?? '100', 10),
  };
}
