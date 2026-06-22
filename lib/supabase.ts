import { createClient } from "@supabase/supabase-js";

// Public project values — these are SAFE to ship in the browser by design.
// The anon key only allows what RLS policies permit (read-only here).
// Hardcoded as defaults so the client always works even if env vars don't resolve.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zoaqvsphijyzjlxckpda.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvYXF2c3BoaWp5empseGNrcGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDE3NjIsImV4cCI6MjA5NzY3Nzc2Mn0.wAm-nDQ8oRfhazaxy1kdGusRiRwDIQoQgkg35hrB02w";

// Browser/client component client — anon key, RLS enforced
export function createBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Server-side admin client — service role, bypasses RLS.
// NEVER import this into a client component.
export function createAdminClient() {
  return createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
