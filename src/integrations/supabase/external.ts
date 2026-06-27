// External Supabase project (publishable values — safe in client bundles).
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const EXTERNAL_SUPABASE_URL = 'https://ybxmrtrogmuwzmjjmnpc.supabase.co';
export const EXTERNAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieG1ydHJvZ211d3ptamptbnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDk4NDYsImV4cCI6MjA5Nzc4NTg0Nn0.LGMv7sIsA_tLUGm_DkM-mg2aJpnlDOnUMHnk0f860P0';

function create() {
  return createClient<Database>(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'sb-ybxmrtrogmuwzmjjmnpc-auth-token',
    },
  });
}

let _client: ReturnType<typeof create> | undefined;
export const supabase = new Proxy({} as ReturnType<typeof create>, {
  get(_t, prop, recv) {
    if (!_client) _client = create();
    return Reflect.get(_client, prop, recv);
  },
});
