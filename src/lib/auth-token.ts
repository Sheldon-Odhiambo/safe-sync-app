import { supabase } from "./supabase";
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.warn("Failed to resolve Supabase session:", error);
    return null;
  }

  return session?.access_token ?? null;
}