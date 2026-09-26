import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Public anon key and URL are safe to ship in the client; row-level security
// on the server is what actually protects each user's notes. Read from the
// build environment so no secret is hardcoded.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When keys are absent the app still runs fully offline on localStorage.
export const cloudEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // localStorage session survives WebView restarts on iOS.
        storageKey: 'pocket-notes:auth',
      },
    })
  : null;
