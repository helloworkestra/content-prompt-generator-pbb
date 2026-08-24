import { createClient } from '@supabase/supabase-js';

let _client = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (Vercel → Settings → Environment Variables, or .env.local for local dev).'
    );
  }
  _client = createClient(url, anonKey);
  return _client;
}

// Proxy so `supabase.from(...)` triggers client creation only when used,
// not at module import time (avoids Vercel prerender crashes).
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient();
      const val = client[prop];
      return typeof val === 'function' ? val.bind(client) : val;
    },
  }
);
