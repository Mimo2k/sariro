'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { UpsellPopup } from '@/components/dashboard/upsell-popup';
import {
  getUpsellRecommendation,
  getTrackName,
  type CompletedEnrollment,
  type UpsellRecommendation,
} from '@/lib/dashboard/upsell-engine';

interface PendingEnrollment extends CompletedEnrollment {
  db_id: string;
}

/**
 * GlobalUpsellPopup
 * 
 * Lives in root layout. Renders on EVERY page (public + dashboard).
 * 
 * Logic:
 * 1. Wait for auth to load
 * 2. If user logged in, fetch enrollments where status='completed' AND completion_shown_at IS NULL
 * 3. If any exist, show the popup for the FIRST one (oldest)
 * 4. On dismiss (either button), UPDATE enrollments SET completion_shown_at = now() WHERE id = ?
 * 5. Popup never shows again for that enrollment
 * 
 * The "Recommended next" card on the student dashboard reads the same data —
 * if completion_shown_at is set, the popup is suppressed but the card still
 * shows the recommendation until the user enrolls.
 */
export function GlobalUpsellPopup() {
  const { user, profile, loading } = useAuth();
  const supabase = createClient();
  const [pending, setPending] = useState<PendingEnrollment | null>(null);
  const [recommendation, setRecommendation] = useState<UpsellRecommendation | null>(null);

  useEffect(() => {
    if (loading || !user) {
      // Defer setState via microtask to satisfy react-hooks/set-state-in-effect
      Promise.resolve().then(() => {
        setPending(null);
        setRecommendation(null);
      });
      return;
    }

    let cancelled = false;

    const fetchPending = async () => {
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('id, track, level, completion_shown_at, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .is('completion_shown_at', null)
          .order('completed_at', { ascending: true, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.warn('[upsell] fetch error:', error.message);
          return;
        }
        if (!data) {
          setPending(null);
          setRecommendation(null);
          return;
        }

        const enrollment: PendingEnrollment = {
          db_id: data.id,
          id: data.id,
          track: data.track,
          level: data.level,
          track_name: getTrackName(data.track),
        };

        const firstName = (profile?.full_name || user.email?.split('@')[0] || 'there').split(' ')[0];
        const rec = getUpsellRecommendation(enrollment, firstName);

        setPending(enrollment);
        setRecommendation(rec);
      } catch (err) {
        console.warn('[upsell] exception:', err);
      }
    };

    fetchPending();
    return () => { cancelled = true; };
  }, [user, profile, loading, supabase]);

  const handleDismiss = async (enrollmentId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('enrollments')
        .update({ completion_shown_at: new Date().toISOString() })
        .eq('id', enrollmentId)
        .eq('user_id', user.id); // belt + suspenders — RLS will enforce this anyway
    } catch (err) {
      console.warn('[upsell] failed to mark shown:', err);
    }
    setPending(null);
    setRecommendation(null);
  };

  if (!pending || !recommendation) return null;

  return (
    <UpsellPopup
      enrollmentId={pending.db_id}
      completedTrackName={pending.track_name}
      completedLevel={pending.level}
      recommendation={recommendation}
      onDismiss={handleDismiss}
    />
  );
}
