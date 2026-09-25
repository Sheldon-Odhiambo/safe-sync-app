import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Requires: npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
//
// Set these in your .env (or app.config) as EXPO_PUBLIC_ vars so they're
// available on the client:
//   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY env vars."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    // This is what makes #4 work: the session (access + refresh token) is
    // written to AsyncStorage and silently refreshed, so the user stays
    // logged in across app restarts until they explicitly sign out.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});