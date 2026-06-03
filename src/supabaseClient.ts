// supabaseClient.ts — the single Supabase client for the app.
//
// The URL + anon key come from build-time env (.env / GitHub Actions secrets).
// Both are PUBLIC by design — Row-Level Security enforces access server-side.
// Never reference the service_role key here.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Surface the misconfiguration loudly in dev rather than failing cryptically
  // on the first query. Copy .env.example → .env and fill these in (see SETUP.md).
  console.error('[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — see SETUP.md');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // completes the OAuth redirect back from Discord/Google
  },
});
