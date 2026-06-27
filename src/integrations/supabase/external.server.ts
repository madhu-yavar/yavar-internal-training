// Server-only admin client for the external Supabase project. Service role bypasses RLS.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { EXTERNAL_SUPABASE_URL } from './external';

function create() {
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(EXTERNAL_SUPABASE_URL, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _admin: ReturnType<typeof create> | undefined;
export const supabaseAdmin = new Proxy({} as ReturnType<typeof create>, {
  get(_t, prop, recv) {
    if (!_admin) _admin = create();
    return Reflect.get(_admin, prop, recv);
  },
});
