import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
);

export interface Box {
  id: string;
  side: string;
  level: string;
  items: string[];
  updated_at: number;
  deleted_at?: string | null;
  owner_id?: string;
  group_id?: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

export function signInWithGoogle() {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
