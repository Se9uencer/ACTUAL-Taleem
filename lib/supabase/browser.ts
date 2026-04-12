'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  interface Window { __sbClient?: SupabaseClient }
}

export function getBrowserSupabase(): SupabaseClient | undefined {
  if (typeof window === 'undefined') {
    console.warn('[SB] getBrowserSupabase called on server; returning stub')
    // @ts-expect-error - returning undefined server-side; callers must guard
    return undefined
  }
  if (!window.__sbClient) {
    window.__sbClient = createClient(url, key, {
      auth: { persistSession: true, storage: window.localStorage },
    });
    console.log('[SB] created singleton client');
  }
  return window.__sbClient;
}


