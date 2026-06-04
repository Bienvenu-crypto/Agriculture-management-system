// lib/db.ts — Supabase-backed database client
// Replaces better-sqlite3 with @supabase/supabase-js for Vercel compatibility.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use service role key on the server so RLS doesn't block server-side operations.
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export default db;