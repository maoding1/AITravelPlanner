import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serviceRoleClient: SupabaseClient | null = null;

export const createSupabaseServiceRoleClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  if (!serviceRoleClient) {
    serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return serviceRoleClient;
};
