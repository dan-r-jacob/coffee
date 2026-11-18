import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** True when the build was made without the Supabase environment variables. */
export const missingConfig = !url || !key;

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/** Where Supabase email links (confirmation, password reset) should return to. */
export const appUrl = () => new URL('.', window.location.href).toString();
