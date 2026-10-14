import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Redirect,
  Tabs,
  usePathname,
  useRouter,
} from "expo-router";
import type { Href } from "expo-router";

import {
  EmergencyBarProvider,
  useEmergencyBar,
} from "../../components/emergency-bar-context";
import { useAuth } from "../../contexts/auth-context";
import type { UserKind, UserProfileBundle } from "../../lib/user-profile";

const TAG = "[SafeSync Tabs]";
const ACTIVE_COLOR = "#DC2626";
const INACTIVE_COLOR = "#94A3B8";
const PROFILE_TIMEOUT_MS = 8000;

type LandingRoute = "/home" | "/responder" | "/admin" | "/super-admin";

type RouteRule = {
  prefix: string;
  kinds: UserKind[];
};

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/home", kinds: ["public", "admin", "super_admin"] },
  { prefix: "/history", kinds: ["public", "responder"] },
  { prefix: "/wallet", kinds: ["public", "super_admin"] },
  { prefix: "/admin", kinds: ["admin"] },
  { prefix: "/super-admin", kinds: ["super_admin"] },
  { prefix: "/responder", kinds: ["responder"] },
  

];

const PRIMARY_ROUTES: string[] = [
  "/home",
  "/responder",
  "/admin",
  "/super-admin",
];

function getOrganizationType(
  profile: UserProfileBundle | null
): string | undefined {
  return profile?.organization?.organization_type;
}

function homeRouteFor(
  kind: UserKind,
  profile: UserProfileBundle | null
): LandingRoute {
  switch (kind) {
    case "responder":
      return "/responder";

    case "super_admin":
      return "/super-admin";

    case "admin":
      return getOrganizationType(profile) === "service_provider"
        ? "/admin"
        : "/home";

    case "public":
    default:
      return "/home";
  }
}

function findRule(pathname: string): RouteRule | undefined {
  return ROUTE_RULES.find(
    ({ prefix }) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function LoadingScreen({
  message = "Loading your SafeSync account...",
}: {
  message?: string;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACTIVE_COLOR} />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  return (
    <EmergencyBarProvider>
      <TabsLayoutContent />
    </EmergencyBarProvider>
  );
}

function TabsLayoutContent() {
  const {
    session,
    profile,
    initializing,
    loadingProfile,
    refreshingProfile,
    refreshProfile,
    signOut,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const { config } = useEmergencyBar();

  const [signingOut, setSigningOut] = useState(false);
  const [stalled, setStalled] = useState(false);

  // Tracks which user's initial route has been resolved.
  const initialRouteResolvedFor = useRef<string | null>(null);

  // Prevents the same redirect from firing on every render.
  const lastRedirect = useRef<string | null>(null);

  const userId = session?.user?.id ?? null;
  const hasSession = Boolean(session);
  const hasProfile = Boolean(profile);
  const kind = profile?.userKind ?? null;

  const isResponder = kind === "responder";
  const isAdmin = kind === "admin";
  const isSuperAdmin = kind === "super_admin";

  const organizationType = getOrganizationType(profile);
  const canUseAdmin =
    isAdmin && organizationType === "service_provider";

  const isEmergencyScreen =
    pathname === "/emergency" || pathname.endsWith("/emergency");
  const isTrackScreen =
    pathname === "/track" || pathname.endsWith("/track");

  const rule = findRule(pathname);

  const blockedByRole = Boolean(
    kind && rule && !rule.kinds.includes(kind)
  );

  const blockedByOrganization =
    isAdminRoute(pathname) && isAdmin && !canUseAdmin;

  const routeBlocked = blockedByRole || blockedByOrganization;

  // Diagnostic snapshot. Do not log session tokens or OTPs.
  useEffect(() => {
    console.info(`${TAG} route state`, {
      pathname,
      userId,
      hasSession,
      hasProfile,
      userKind: kind,
      organizationType: organizationType ?? null,
      initializing,
      loadingProfile,
      refreshingProfile,
      routeBlocked,
      blockedByRole,
      blockedByOrganization,
    });
  }, [
    pathname,
    userId,
    hasSession,
    hasProfile,
    kind,
    organizationType,
    initializing,
    loadingProfile,
    refreshingProfile,
    routeBlocked,
    blockedByRole,
    blockedByOrganization,
  ]);

  // Reset per-user navigation state on sign-out or account switch.
  useEffect(() => {
    if (!userId) {
      initialRouteResolvedFor.current = null;
      lastRedirect.current = null;
      setStalled(false);
      console.info(`${TAG} no authenticated user; route state reset`);
      return;
    }

    if (
      initialRouteResolvedFor.current &&
      initialRouteResolvedFor.current !== userId
    ) {
      console.info(`${TAG} authenticated user changed`, {
        previousUserId: initialRouteResolvedFor.current,
        currentUserId: userId,
      });

      initialRouteResolvedFor.current = null;
      lastRedirect.current = null;
    }
  }, [userId]);

  // Resolve the initial landing route once the profile is ready.
  useEffect(() => {
    if (initializing || !userId || !profile || !kind) {
      console.info(`${TAG} initial route resolution deferred`, {
        initializing,
        hasUserId: Boolean(userId),
        hasProfile: Boolean(profile),
        userKind: kind,
      });
      return;
    }

    if (initialRouteResolvedFor.current === userId) {
      return;
    }

    // Do not override a deliberate secondary-screen navigation.
    // Only resolve the initial landing route when on a primary screen.
    if (!PRIMARY_ROUTES.includes(pathname)) {
      console.info(`${TAG} preserving current non-primary route`, {
        pathname,
        userKind: kind,
      });

      initialRouteResolvedFor.current = userId;
      return;
    }

    const destination = homeRouteFor(kind, profile);

    initialRouteResolvedFor.current = userId;

    if (pathname === destination) {
      console.info(`${TAG} initial route already correct`, {
        pathname,
        userKind: kind,
      });
      return;
    }

    const redirectKey = `${userId}:${pathname}->${destination}`;
    lastRedirect.current = redirectKey;

    console.info(`${TAG} resolving initial landing route`, {
      userId,
      userKind: kind,
      organizationType: organizationType ?? null,
      from: pathname,
      to: destination,
    });

    try {
      router.replace(destination as Href);
    } catch (error) {
      initialRouteResolvedFor.current = null;
      lastRedirect.current = null;

      console.error(`${TAG} initial route navigation failed`, {
        from: pathname,
        to: destination,
        error,
      });
    }
  }, [
    initializing,
    userId,
    profile,
    kind,
    pathname,
    organizationType,
    router,
  ]);

  // Guard against direct navigation and deep links to forbidden screens.
  useEffect(() => {
    if (
      initializing ||
      !userId ||
      !profile ||
      !kind ||
      !routeBlocked
    ) {
      return;
    }

    const destination = homeRouteFor(kind, profile);

    if (pathname === destination) {
      return;
    }

    const redirectKey = `${userId}:${pathname}->${destination}`;

    if (lastRedirect.current === redirectKey) {
      return;
    }

    lastRedirect.current = redirectKey;

    console.warn(`${TAG} blocked route; redirecting`, {
      userId,
      userKind: kind,
      organizationType: organizationType ?? null,
      from: pathname,
      to: destination,
      blockedByRole,
      blockedByOrganization,
    });

    try {
      router.replace(destination as Href);
    } catch (error) {
      lastRedirect.current = null;

      console.error(`${TAG} protected-route redirect failed`, {
        from: pathname,
        to: destination,
        error,
      });
    }
  }, [
    initializing,
    userId,
    profile,
    kind,
    pathname,
    organizationType,
    routeBlocked,
    blockedByRole,
    blockedByOrganization,
    router,
  ]);

  // Display a retry screen if the session exists but profile resolution stalls.
  useEffect(() => {
    if (
      initializing ||
      !hasSession ||
      hasProfile ||
      loadingProfile ||
      refreshingProfile
    ) {
      setStalled(false);
      return;
    }

    console.warn(`${TAG} profile is unavailable; starting timeout`, {
      userId,
      pathname,
      timeoutMs: PROFILE_TIMEOUT_MS,
    });

    const timer = setTimeout(() => {
      console.error(`${TAG} profile loading timed out`, {
        userId,
        pathname,
      });

      setStalled(true);
    }, PROFILE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [
    initializing,
    hasSession,
    hasProfile,
    loadingProfile,
    refreshingProfile,
    userId,
    pathname,
  ]);

  const performSignOut = useCallback(async () => {
    if (signingOut) {
      return;
    }

    console.info(`${TAG} sign-out requested`, { userId });
    setSigningOut(true);

    try {
      await signOut();

      initialRouteResolvedFor.current = null;
      lastRedirect.current = null;

      console.info(`${TAG} sign-out completed; returning to login`);

      router.replace("/");
    } catch (error) {
      console.error(`${TAG} sign-out failed`, error);

      if (Platform.OS === "web") {
        window.alert(
          "Sign-out could not be completed. Please try again."
        );
      } else {
        Alert.alert(
          "Sign-out failed",
          "Sign-out could not be completed. Please try again."
        );
      }
    } finally {
      setSigningOut(false);
    }
  }, [signingOut, signOut, router, userId]);

  const confirmSignOut = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        void performSignOut();
      }
      return;
    }

    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => void performSignOut(),
      },
    ]);
  }, [performSignOut]);

  const handleEmergency = useCallback(() => {
    console.info(`${TAG} emergency action pressed`, {
      userId,
      pathname,
    });

    router.push("/emergency" as Href);
  }, [router, userId, pathname]);

  const handleRetryProfile = useCallback(async () => {
    console.info(`${TAG} profile retry requested`, { userId });

    setStalled(false);

    try {
      await refreshProfile();

      console.info(`${TAG} profile retry finished`, {
        hasProfile: Boolean(profile),
      });
    } catch (error) {
      console.error(`${TAG} profile retry failed`, error);
      setStalled(true);
    }
  }, [refreshProfile, userId, profile]);

  // Authentication gates.
  if (initializing) {
    return <LoadingScreen message="Restoring your session..." />;
  }

  if (!hasSession) {
    console.warn(`${TAG} no session inside tabs; redirecting to login`);
    return <Redirect href="/" />;
  }

  if (!hasProfile || !kind) {
    if (!stalled || loadingProfile || refreshingProfile) {
      return (
        <LoadingScreen message="Loading your account and permissions..." />
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="account-alert-outline"
            size={42}
            color={ACTIVE_COLOR}
          />

          <Text style={styles.errorTitle}>
            Couldn't load your account
          </Text>

          <Text style={styles.errorText}>
            Your session exists, but SafeSync could not load your profile
            and role. Check your internet connection and retry.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.85}
            onPress={() => void handleRetryProfile()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            activeOpacity={0.7}
            onPress={() => void performSignOut()}
          >
            <Text style={styles.linkText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const expectedLanding = homeRouteFor(kind, profile);

  const wrongInitialRoute =
    initialRouteResolvedFor.current !== userId &&
    PRIMARY_ROUTES.includes(pathname) &&
    pathname !== expectedLanding;

  // Keep forbidden or incorrect initial screens hidden during redirects.
  if (routeBlocked || wrongInitialRoute) {
    return <LoadingScreen message="Opening the correct SafeSync screen..." />;
  }

  // Global emergency button visibility and behavior.
  const barConfig =
    isResponder || isTrackScreen
      ? null
      : isEmergencyScreen
        ? {
            label: config?.label ?? "SELECT AN EMERGENCY",
            disabled: config?.disabled ?? true,
            loading: config?.loading ?? false,
            onPress: config?.onPress ?? (() => {}),
          }
        : {
            label: "REQUEST EMERGENCY HELP",
            disabled: false,
            loading: false,
            onPress: handleEmergency,
          };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons
                name="shield-checkmark"
                size={18}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.brandTextContainer}>
              <Text style={styles.brandTitle}>SafeSync</Text>

              {profile.organization?.name ? (
                <Text style={styles.orgName} numberOfLines={1}>
                  {profile.organization.name}
                </Text>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.signOutButton,
              signingOut && styles.signOutButtonBusy,
            ]}
            activeOpacity={0.7}
            onPress={confirmSignOut}
            disabled={signingOut}
            accessibilityLabel="Sign out"
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#0F172A"
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: ACTIVE_COLOR,
              tabBarInactiveTintColor: INACTIVE_COLOR,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
              tabBarItemStyle: styles.tabItem,
              tabBarHideOnKeyboard: true,
            }}
          >
            <Tabs.Screen
              name="home"
              options={{
                title: "Home",
                href: isResponder ? null : undefined,
                tabBarIcon: ({ color, focused, size }) => (
                  <Ionicons
                    name={focused ? "grid" : "grid-outline"}
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="history"
              options={{
                title: "History",
                href: isAdmin || isSuperAdmin ? null : undefined,
                tabBarIcon: ({ color, focused, size }) => (
                  <Ionicons
                    name={focused ? "time" : "time-outline"}
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="wallet"
              options={{
                title: "Wallet",
                href: isAdmin || isResponder ? null : undefined,
                tabBarIcon: ({ color, focused, size }) => (
                  <Ionicons
                    name={focused ? "wallet" : "wallet-outline"}
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="admin/index"
              options={{
                title: "Admin",
                href: canUseAdmin ? undefined : null,
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="briefcase-outline"
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="super-admin/index"
              options={{
                title: "Super Admin",
                href: isSuperAdmin ? undefined : null,
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons
                    name="shield-crown-outline"
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="responder/index"
              options={{
                title: "Responder",
                href: isResponder ? undefined : null,
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons
                    name="ambulance"
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",
                tabBarIcon: ({ color, focused, size }) => (
                  <Ionicons
                    name={focused ? "person" : "person-outline"}
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen name="emergency" options={{ href: null }} />
            <Tabs.Screen name="track" options={{ href: null }} />

            <Tabs.Screen
              name="super-admin/branch/[branchId]"
              options={{ href: null }}
            />
          </Tabs>

          {barConfig ? (
            <View style={styles.emergencyWrapper}>
              <TouchableOpacity
                style={[
                  styles.emergencyButton,
                  barConfig.disabled && styles.emergencyButtonDisabled,
                ]}
                activeOpacity={0.85}
                disabled={barConfig.disabled || barConfig.loading}
                onPress={barConfig.onPress}
                accessibilityRole="button"
                accessibilityLabel={barConfig.label}
              >
                <View style={styles.emergencyIcon}>
                  {barConfig.loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <MaterialCommunityIcons
                      name={isEmergencyScreen ? "siren" : "alarm-light"}
                      size={21}
                      color="#FFFFFF"
                    />
                  )}
                </View>

                <Text style={styles.emergencyText}>
                  {barConfig.label}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 21,
  },
  retryButton: {
    minHeight: 48,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: ACTIVE_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  linkButton: {
    marginTop: 14,
    padding: 8,
  },
  linkText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  brandTextContainer: {
    flexShrink: 1,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  orgName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    maxWidth: 200,
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  signOutButtonBusy: {
    opacity: 0.6,
  },
  tabsContainer: {
    flex: 1,
  },
  tabBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: Platform.OS === "ios" ? 10 : 12,
    height: 68,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingTop: 7,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  emergencyWrapper: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 88,
    zIndex: 20,
  },
  emergencyButton: {
    minHeight: 54,
    backgroundColor: ACTIVE_COLOR,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: ACTIVE_COLOR,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  emergencyButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  emergencyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  emergencyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
    flexShrink: 1,
  },
});
