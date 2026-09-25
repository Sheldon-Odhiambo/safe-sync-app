import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  fetchUserProfileBundle,
  UserProfileBundle,
} from "../lib/user-profile";

const PROFILE_CACHE_PREFIX = "safesync:profile:";

type AuthContextType = {
  session: Session | null;
  profile: UserProfileBundle | null;
  // true only until we've checked AsyncStorage for a session AND (if one
  // exists) rehydrated a cached profile — this is what the root layout
  // waits on before deciding where to route.
  initializing: boolean;
  // true while a background refetch of the profile is in flight; the
  // cached profile is still usable during this, so UI shouldn't block on it.
  refreshingProfile: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasRole: (roleName: string) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  initializing: true,
  refreshingProfile: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
});

function cacheKeyFor(userId: string) {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

async function loadCachedProfile(
  userId: string
): Promise<UserProfileBundle | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKeyFor(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveCachedProfile(bundle: UserProfileBundle) {
  try {
    await AsyncStorage.setItem(cacheKeyFor(bundle.id), JSON.stringify(bundle));
  } catch {
    // non-fatal — just means next launch refetches over the network
  }
}

async function clearCachedProfile(userId: string) {
  try {
    await AsyncStorage.removeItem(cacheKeyFor(userId));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileBundle | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const lastLoadedUserId = useRef<string | null>(null);

  const loadProfileForUser = async (
    userId: string,
    opts: { background?: boolean } = {}
  ) => {
    if (opts.background) setRefreshingProfile(true);
    try {
      const fresh = await fetchUserProfileBundle(userId);
      setProfile(fresh);
      await saveCachedProfile(fresh);
    } catch (err) {
      console.error("Failed to load user profile bundle:", err);
      // keep whatever's already in state (cached or previous) — don't
      // wipe the UI out from under the user over a transient network error
    } finally {
      if (opts.background) setRefreshingProfile(false);
    }
  };

  useEffect(() => {
    (async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      setSession(initialSession);

      if (initialSession?.user) {
        lastLoadedUserId.current = initialSession.user.id;
        // Instant paint from cache (no network wait)...
        const cached = await loadCachedProfile(initialSession.user.id);
        if (cached) setProfile(cached);
        // ...then quietly confirm/refresh in the background.
        loadProfileForUser(initialSession.user.id, { background: !!cached });
      }

      setInitializing(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (
        newSession?.user &&
        newSession.user.id !== lastLoadedUserId.current
      ) {
        lastLoadedUserId.current = newSession.user.id;
        const cached = await loadCachedProfile(newSession.user.id);
        if (cached) setProfile(cached);
        loadProfileForUser(newSession.user.id, { background: !!cached });
      }

      if (event === "SIGNED_OUT") {
        if (lastLoadedUserId.current) {
          await clearCachedProfile(lastLoadedUserId.current);
        }
        lastLoadedUserId.current = null;
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange (SIGNED_OUT above) handles clearing the cache/state.
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfileForUser(session.user.id, { background: true });
    }
  };

  const hasPermission = (code: string) =>
    !!profile?.permissionCodes.includes(code);

  const hasRole = (roleName: string) =>
    !!profile?.roles.some(
      (r) => r.name.toLowerCase() === roleName.toLowerCase()
    );

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        initializing,
        refreshingProfile,
        signOut,
        refreshProfile,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);