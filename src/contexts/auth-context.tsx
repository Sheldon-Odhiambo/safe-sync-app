import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { log, loadPersistedLogs } from "../lib/debug-log";
import {
  fetchUserProfileBundle,
  PROFILE_SCHEMA_VERSION,
  OrganizationSummary,
  UserKind,
  UserProfileBundle,
} from "../lib/user-profile";

const PROFILE_CACHE_PREFIX = "safesync:profile:";

type AuthContextType = {
  session: Session | null;
  profile: UserProfileBundle | null;

  // Shortcuts for deciding what the UI shows.
  userKind: UserKind | null;
  organization: OrganizationSummary | null;
  isOrgMember: boolean;

  // True until the stored session (and cached profile) has been checked.
  initializing: boolean;
  // True while the profile is loading and nothing cached is available yet.
  // Route guards should wait on this instead of treating the user as "public".
  loadingProfile: boolean;
  // True while a background refresh runs on top of a cached profile.
  refreshingProfile: boolean;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  hasPermission: (code: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (...roleNames: string[]) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  userKind: null,
  organization: null,
  isOrgMember: false,
  initializing: true,
  loadingProfile: false,
  refreshingProfile: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
  hasAnyRole: () => false,
});

// ------------------------------------------------------------------
// Local cache (includes the organization the user belongs to)
// ------------------------------------------------------------------

function cacheKeyFor(userId: string) {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

async function loadCachedProfile(
  userId: string
): Promise<UserProfileBundle | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKeyFor(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UserProfileBundle;

    // Discard caches written by an older version of the app.
    if (parsed.schemaVersion !== PROFILE_SCHEMA_VERSION) {
      log.info("auth", "discarding outdated cached profile", {
        cached: parsed.schemaVersion,
        current: PROFILE_SCHEMA_VERSION,
      });
      await AsyncStorage.removeItem(cacheKeyFor(userId));
      return null;
    }

    return parsed;
  } catch (error) {
    log.warn("auth", "failed to load cached profile", error);
    return null;
  }
}

async function saveCachedProfile(bundle: UserProfileBundle) {
  try {
    await AsyncStorage.setItem(cacheKeyFor(bundle.id), JSON.stringify(bundle));
  } catch (error) {
    // Non-fatal. The next launch will just fetch again.
    log.warn("auth", "failed to cache user profile", error);
  }
}

async function clearCachedProfile(userId: string) {
  try {
    await AsyncStorage.removeItem(cacheKeyFor(userId));
  } catch (error) {
    log.warn("auth", "failed to clear cached profile", error);
  }
}

function isProfileNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const e = error as { name?: string; message?: unknown };
  if (e.name === "PROFILE_NOT_FOUND") return true;

  const message = String(e.message ?? "").toLowerCase();
  return (
    message.includes("no user_profiles row found") ||
    message.includes("profile not found")
  );
}

// ------------------------------------------------------------------
// Clock-skew handling
//
// PGRST303 "JWT issued at future" means the token's `iat` is later than
// the clock of the server checking it. Right after the OTP sign-in the
// fresh token is used immediately, so a server clock that is a second or
// two behind rejects it. The token becomes valid moments later, so a
// short retry fixes it. If it still fails after the retries, the clocks
// are further apart and the clock itself has to be fixed.
// ------------------------------------------------------------------

function isClockSkewError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return (
    e?.code === "PGRST303" ||
    String(e?.message ?? "").toLowerCase().includes("jwt issued at future")
  );
}

async function fetchProfileWithRetry(
  userId: string
): Promise<UserProfileBundle> {
  const delaysMs = [1000, 2000, 3000];

  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchUserProfileBundle(userId);
    } catch (err) {
      if (!isClockSkewError(err) || attempt >= delaysMs.length) throw err;

      log.warn(
        "auth",
        `JWT issued in the future (clock skew), retrying in ${delaysMs[attempt]}ms`,
        { attempt: attempt + 1 }
      );
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }
}

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileBundle | null>(null);

  const [initializing, setInitializing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const lastLoadedUserId = useRef<string | null>(null);

  /**
   * The Auth account exists but core.user_profiles has no row for it.
   * Sign out and send the user back to signup.
   */
  const handleMissingProfile = async (userId: string) => {
    log.warn("auth", "profile missing → signing out", { userId });

    await clearCachedProfile(userId);

    setProfile(null);
    setSession(null);
    lastLoadedUserId.current = null;

    await supabase.auth.signOut();

    try {
      router.replace("/signup");
    } catch (navigationError) {
      log.error("auth", "failed to redirect to signup", navigationError);
    }
  };

  const loadProfileForUser = async (
    userId: string,
    opts: { background?: boolean } = {}
  ) => {
    if (opts.background) {
      setRefreshingProfile(true);
    } else {
      setLoadingProfile(true);
    }

    try {
      const fresh = await fetchProfileWithRetry(userId);
      setProfile(fresh);
      await saveCachedProfile(fresh);
    } catch (err) {
      log.error("auth", "profile bundle load failed", err);

      // Only a confirmed missing profile sends the user back to signup.
      // Network, clock-skew or database errors keep whatever is already
      // in state.
      if (isProfileNotFoundError(err)) {
        await handleMissingProfile(userId);
      }
    } finally {
      if (opts.background) {
        setRefreshingProfile(false);
      } else {
        setLoadingProfile(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthEvent = async (
      event: AuthChangeEvent,
      newSession: Session | null
    ) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        const previousUserId = lastLoadedUserId.current;
        if (previousUserId) await clearCachedProfile(previousUserId);

        lastLoadedUserId.current = null;
        if (mounted) setProfile(null);
        return;
      }

      if (!newSession?.user) {
        lastLoadedUserId.current = null;
        if (mounted) setProfile(null);
        return;
      }

      const userId = newSession.user.id;

      // Token refreshes and repeat events for the same user need no reload.
      if (userId === lastLoadedUserId.current) return;

      lastLoadedUserId.current = userId;

      const cached = await loadCachedProfile(userId);
      if (!mounted) return;

      setProfile(cached ?? null);

      await loadProfileForUser(userId, { background: !!cached });
    };

    const initializeAuth = async () => {
      void loadPersistedLogs();
      log.info("auth", "initializing");

      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          log.error("auth", "failed to restore Supabase session", sessionError);
          if (mounted) {
            setSession(null);
            setProfile(null);
          }
          return;
        }

        if (!mounted) return;

        setSession(initialSession);

        if (!initialSession?.user) {
          log.info("auth", "no stored session");
          lastLoadedUserId.current = null;
          setProfile(null);
          return;
        }

        const userId = initialSession.user.id;
        log.info("auth", "restored session", { userId });
        lastLoadedUserId.current = userId;

        // Show the cached profile immediately, then confirm it.
        const cached = await loadCachedProfile(userId);
        if (!mounted) return;

        if (cached) setProfile(cached);

        await loadProfileForUser(userId, { background: !!cached });
      } catch (error) {
        log.error("auth", "failed to initialize authentication", error);
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      log.info("auth", `auth event: ${event}`, {
        userId: newSession?.user?.id,
      });

      setSession(newSession);

      // Do NOT await Supabase calls inside this callback. supabase-js holds
      // an internal lock while it runs, so a query made here can deadlock,
      // which shows up as the app hanging after the OTP is verified.
      // Deferring with setTimeout runs the work after the lock is released.
      setTimeout(() => {
        void handleAuthEvent(event, newSession);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    log.info("auth", "sign out requested");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        log.warn("auth", "server sign-out failed, clearing local session", error);
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch (error) {
      log.error("auth", "failed to sign out", error);
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    } finally {
      try {
        const keys = await AsyncStorage.getAllKeys();
        await AsyncStorage.multiRemove(
          keys.filter((k) => k.startsWith(PROFILE_CACHE_PREFIX))
        );
      } catch (error) {
        log.warn("auth", "failed to clear cached profiles", error);
      }

      lastLoadedUserId.current = null;
      setProfile(null);
      setSession(null);
    }
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    await loadProfileForUser(session.user.id, { background: true });
  };

  const hasPermission = (code: string) =>
    !!profile?.permissionCodes?.includes(code);

  const hasRole = (roleName: string) =>
    !!profile?.roles?.some(
      (role) => role.name.toLowerCase() === roleName.toLowerCase()
    );

  const hasAnyRole = (...roleNames: string[]) =>
    roleNames.some((name) => hasRole(name));

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        userKind: profile?.userKind ?? null,
        organization: profile?.organization ?? null,
        isOrgMember: profile?.isOrgMember ?? false,
        initializing,
        loadingProfile,
        refreshingProfile,
        signOut,
        refreshProfile,
        hasPermission,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);