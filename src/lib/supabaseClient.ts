import {
  createClientComponentClient,
  createRouteHandlerClient,
  createServerActionClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingSupabaseConfig = !supabaseUrl || !supabaseAnonKey;

type SupabaseClientOptions = {
  supabaseUrl: string;
  supabaseKey: string;
};

const supabaseClientOptions: SupabaseClientOptions | null = missingSupabaseConfig
  ? null
  : {
    supabaseUrl: supabaseUrl!,
    supabaseKey: supabaseAnonKey!,
  };

if (missingSupabaseConfig) {
  console.warn("Supabase environment variables are missing. Authentication will not work until they are set.");
}

export const createSupabaseBrowserClient = (): SupabaseClient | null => {
  if (missingSupabaseConfig) {
    return null;
  }

  return createClientComponentClient(supabaseClientOptions!);
};

export const createSupabaseServerClient = (): SupabaseClient | null => {
  if (missingSupabaseConfig) {
    return null;
  }

  return createServerComponentClient({ cookies }, supabaseClientOptions!);
};

export const createSupabaseServerActionClient = (): SupabaseClient | null => {
  if (missingSupabaseConfig) {
    return null;
  }

  return createServerActionClient({ cookies }, supabaseClientOptions!);
};

export const createSupabaseRouteHandlerClient = (): SupabaseClient | null => {
  if (missingSupabaseConfig) {
    return null;
  }

  return createRouteHandlerClient({ cookies }, supabaseClientOptions!);
};
