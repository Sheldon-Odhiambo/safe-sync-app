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

  // True until we've checked the current Supabase session and,
  // when applicable, loaded the cached profile.
  initializing: boolean;

  // True while a background profile refresh is running.
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

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as UserProfileBundle;
  } catch (error) {
    console.warn("Failed to load cached profile:", error);
    return null;
  }
}

async function saveCachedProfile(bundle: UserProfileBundle) {
  try {
    await AsyncStorage.setItem(
      cacheKeyFor(bundle.id),
      JSON.stringify(bundle)
    );
  } catch (error) {
    // Non-fatal. The next launch will simply fetch the profile again.
    console.warn("Failed to cache user profile:", error);
  }
}

async function clearCachedProfile(userId: string) {
  try {
    await AsyncStorage.removeItem(cacheKeyFor(userId));
  } catch (error) {
    // Ignore cache deletion errors.
    console.warn("Failed to clear cached profile:", error);
  }
}

/**
 * Loads the profile from the backend/database.
 *
 * Important:
 * A missing profile is treated differently from a temporary
 * network/database error.
 */
function isProfileNotFoundError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "PROFILE_NOT_FOUND"
  ) {
    return true;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = String(
      (error as { message?: unknown }).message ?? ""
    ).toLowerCase();

    return (
      message.includes("no user_profiles row found") ||
      message.includes("profile not found")
    );
  }

  return false;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileBundle | null>(null);

  const [initializing, setInitializing] = useState(true);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const lastLoadedUserId = useRef<string | null>(null);

  /**
   * Handles a user whose Supabase Auth account exists but whose
   * core.user_profiles row does not exist.
   *
   * This should send the user back through signup rather than
   * leaving them authenticated with an unusable account.
   */
  const handleMissingProfile = async (userId: string) => {
    console.warn(
      "No user profile found. Returning user to signup:",
      userId
    );

    // Remove any stale cached profile.
    await clearCachedProfile(userId);

    // Clear local state immediately.
    setProfile(null);
    setSession(null);
    lastLoadedUserId.current = null;

    // End the Supabase session.
    //
    // onAuthStateChange will also receive SIGNED_OUT and perform
    // its normal cleanup.
    await supabase.auth.signOut();

    // Redirect to signup.
    //
    // We use window-independent navigation through Expo Router's
    // global router so this context does not need to receive
    // navigation props.
    try {
      const { router } = await import("expo-router");
      router.replace("/signup");
    } catch (navigationError) {
      console.error(
        "Failed to redirect to signup:",
        navigationError
      );
    }
  };

  /**
   * Fetch the current user's profile bundle.
   */
  const loadProfileForUser = async (
    userId: string,
    opts: { background?: boolean } = {}
  ) => {
    if (opts.background) {
      setRefreshingProfile(true);
    }

    try {
      const fresh = await fetchUserProfileBundle(userId);

      // Profile exists.
      setProfile(fresh);

      // Keep a local copy for fast startup.
      await saveCachedProfile(fresh);
    } catch (err) {
      console.error(
        "Failed to load user profile bundle:",
        err
      );

      /**
       * IMPORTANT:
       *
       * Do not sign the user out for every error.
       *
       * For example:
       * - network unavailable
       * - Supabase temporarily unavailable
       * - expired request
       * - JWT timing issue
       *
       * These are not proof that the profile doesn't exist.
       *
       * Only a confirmed missing-profile error should send the
       * user back to signup.
       */
      if (isProfileNotFoundError(err)) {
        await handleMissingProfile(userId);
        return;
      }

      /**
       * For transient errors, preserve whatever is already in
       * state (cached or previously loaded profile).
       */
    } finally {
      if (opts.background) {
        setRefreshingProfile(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    /**
     * Initial authentication/session restoration.
     */
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Failed to restore Supabase session:",
            sessionError
          );

          if (mounted) {
            setSession(null);
            setProfile(null);
          }

          return;
        }

        if (!mounted) {
          return;
        }

        setSession(initialSession);

        /**
         * There is no authenticated user.
         */
        if (!initialSession?.user) {
          lastLoadedUserId.current = null;
          setProfile(null);
          return;
        }

        const userId = initialSession.user.id;

        lastLoadedUserId.current = userId;

        /**
         * First load the cached profile so the application can
         * render immediately.
         */
        const cached = await loadCachedProfile(userId);

        if (!mounted) {
          return;
        }

        if (cached) {
          setProfile(cached);
        }

        /**
         * Confirm the cached profile against the database.
         *
         * If there is no cache, this is a normal foreground load.
         * If there is a cache, it happens in the background.
         */
        await loadProfileForUser(userId, {
          background: !!cached,
        });
      } catch (error) {
        console.error(
          "Failed to initialize authentication:",
          error
        );
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    initializeAuth();

    /**
     * Listen for Supabase authentication changes.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) {
          return;
        }

        setSession(newSession);

        /**
         * User signed out.
         */
        if (event === "SIGNED_OUT") {
          const previousUserId = lastLoadedUserId.current;

          if (previousUserId) {
            await clearCachedProfile(previousUserId);
          }

          lastLoadedUserId.current = null;

          if (mounted) {
            setProfile(null);
          }

          return;
        }

        /**
         * No authenticated user.
         */
        if (!newSession?.user) {
          lastLoadedUserId.current = null;

          if (mounted) {
            setProfile(null);
          }

          return;
        }

        const userId = newSession.user.id;

        /**
         * Only reload the profile when this is a different user.
         */
        if (userId !== lastLoadedUserId.current) {
          lastLoadedUserId.current = userId;

          const cached = await loadCachedProfile(userId);

          if (!mounted) {
            return;
          }

          if (cached) {
            setProfile(cached);
          } else {
            setProfile(null);
          }

          await loadProfileForUser(userId, {
            background: !!cached,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Explicit sign-out.
   *
   * Supabase's SIGNED_OUT event handles:
   * - clearing profile state
   * - clearing the cached profile
   * - resetting lastLoadedUserId
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  /**
   * Manually refresh the current user's profile.
   */
  const refreshProfile = async () => {
    if (!session?.user) {
      return;
    }

    await loadProfileForUser(session.user.id, {
      background: true,
    });
  };

  /**
   * Permission helper.
   */
  const hasPermission = (code: string) => {
    return !!profile?.permissionCodes?.includes(code);
  };

  /**
   * Role helper.
   */
  const hasRole = (roleName: string) => {
    return !!profile?.roles?.some(
      (role) =>
        role.name.toLowerCase() === roleName.toLowerCase()
    );
  };

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