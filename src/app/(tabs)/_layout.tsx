import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useEffect, useState } from "react";
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

import {
  EmergencyBarProvider,
  useEmergencyBar,
} from "../../components/emergency-bar-context";
import { useAuth } from "../../contexts/auth-context";
import type { UserKind } from "../../lib/user-profile";

const ACTIVE_COLOR = "#DC2626";
const INACTIVE_COLOR = "#94A3B8";

// How long to wait for the profile before offering "Try again".
const PROFILE_TIMEOUT_MS = 8000;

const ADMIN_PREFIX = "/admin";

const ROUTE_ACCESS: { prefix: string; kinds: UserKind[] }[] = [
  { prefix: "/home", kinds: ["super_admin", "admin", "public"] },
  { prefix: "/history", kinds: ["responder", "public"] },
  { prefix: "/wallet", kinds: ["super_admin", "public"] },
  { prefix: ADMIN_PREFIX, kinds: ["admin"] },
  { prefix: "/super-admin", kinds: ["super_admin"] },
  { prefix: "/responder", kinds: ["responder"] },
];

function findRule(pathname: string) {
  return ROUTE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
}

function homeRouteFor(kind: UserKind): Href {
  return (kind === "responder" ? "/responder" : "/home") as Href;
}

/**
 * The organisation type ('client' | 'service_provider') of the signed-in
 * user's organisation, if the profile carries it.
 *
 * ADAPT: make sure lib/user-profile loads `organization_type` onto
 * profile.organization (core.organizations.organization_type). Until it does,
 * this returns undefined and the backend (which returns 403 for client
 * organisations) is the only thing enforcing the rule.
 */
function getOrganizationType(profile: unknown): string | undefined {
  const org = (
    profile as
      | { organization?: { organization_type?: string; type?: string } | null }
      | null
      | undefined
  )?.organization;

  return org?.organization_type ?? org?.type;
}

export default function TabsLayout() {
  return (
    <EmergencyBarProvider>
      <TabsLayoutContent />
    </EmergencyBarProvider>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACTIVE_COLOR} />
      </View>
    </SafeAreaView>
  );
}

function TabsLayoutContent() {
  const { session, profile, initializing, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { config } = useEmergencyBar();

  const [signingOut, setSigningOut] = useState(false);
  const [stalled, setStalled] = useState(false);

  const hasSession = !!session;
  const hasProfile = !!profile;
  const kind = profile?.userKind;

  const isSuperAdmin = kind === "super_admin";
  const isAdmin = kind === "admin";
  const isResponder = kind === "responder";

  // Only SERVICE PROVIDER organisations have the admin (fleet) page.
  // Client organisations never see it. Fail open only when the type is
  // unknown; the backend still answers 403 for client organisations.
  const isClientOrg = getOrganizationType(profile) === "client";
  const canUseAdmin = isAdmin && !isClientOrg;

  const isEmergencyScreen = pathname?.includes("/emergency");
  const isTrackScreen = pathname?.includes("/track");

  // Is the user standing on a route their role (or organisation) doesn't allow?
  const rule = pathname ? findRule(pathname) : undefined;
  const blockedByRole = !!(kind && rule && !rule.kinds.includes(kind));
  const blockedByOrg = !!(rule && rule.prefix === ADMIN_PREFIX && isAdmin && !canUseAdmin);
  const routeBlocked = blockedByRole || blockedByOrg;

  // ---------------------------------------------------------
  // Route guard: send users away from screens their role
  // doesn't allow (deep links, or the default first tab, e.g. a
  // responder landing on Home right after login).
  // ---------------------------------------------------------
  useEffect(() => {
    if (routeBlocked && kind) {
      router.replace(homeRouteFor(kind));
    }
  }, [routeBlocked, kind]);

  // ---------------------------------------------------------
  // Profile timeout. Right after login there is a short gap where
  // a session exists but the profile hasn't loaded yet. That is
  // normal, so we show a spinner. Only if it takes too long do we
  // offer a retry.
  // ---------------------------------------------------------
  useEffect(() => {
    if (hasProfile || !hasSession) {
      if (stalled) setStalled(false);
      return;
    }

    if (stalled) return;

    const timer = setTimeout(() => setStalled(true), PROFILE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hasProfile, hasSession, stalled]);

  // ---------------------------------------------------------
  // Sign out
  // ---------------------------------------------------------
  const performSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      router.replace("/");
    }
  };

  const confirmSignOut = () => {
    // Alert.alert with buttons does nothing on web.
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
        onPress: () => {
          void performSignOut();
        },
      },
    ]);
  };

  const handleEmergency = () => {
    router.push("/emergency");
  };

  // =========================================================
  // Gates. Everything below runs only for a signed-in user whose
  // profile is loaded and who is allowed on this route.
  // =========================================================

  // Still restoring the stored session.
  if (initializing) return <LoadingScreen />;

  // Not signed in (or just signed out): back to the login screen.
  if (!hasSession) return <Redirect href="/" />;

  // Signed in, profile not here yet.
  if (!hasProfile) {
    if (!stalled) return <LoadingScreen />;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn't load your account</Text>
          <Text style={styles.errorText}>
            Check your connection and try again.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.85}
            onPress={() => {
              setStalled(false);
              void refreshProfile();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            activeOpacity={0.7}
            onPress={() => {
              void performSignOut();
            }}
          >
            <Text style={styles.linkText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Wrong route for this role/organisation: the effect above is redirecting.
  // Show a spinner instead of flashing the wrong screen.
  if (routeBlocked) return <LoadingScreen />;

  // ---------------------------------------------------------
  // Resolve what the single global bottom button should show.
  // - Track screen: no button at all.
  // - Emergency screen: driven entirely by the screen itself
  //   (via EmergencyBarProvider).
  // - Everywhere else: the default "request help" button.
  // ---------------------------------------------------------
  const barConfig = isTrackScreen
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
        {/* ================================================= */}
        {/* GLOBAL SAFESYNC HEADER                            */}
        {/* ================================================= */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>SafeSync</Text>
              {profile.organization ? (
                <Text style={styles.orgName} numberOfLines={1}>
                  {profile.organization.name}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.signOutButton,
                signingOut && styles.signOutButtonBusy,
              ]}
              activeOpacity={0.7}
              onPress={confirmSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Ionicons name="log-out-outline" size={20} color="#0F172A" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================================= */}
        {/* PAGE CONTENT + TAB NAVIGATION                     */}
        {/* ================================================= */}
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
            {/* HOME: super admin, admin, public. Not responder. */}
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

            {/* HISTORY: responder, public. Not super admin / admin. */}
            <Tabs.Screen
              name="history"
              options={{
                title: "History",
                href: isSuperAdmin || isAdmin ? null : undefined,
                tabBarIcon: ({ color, focused, size }) => (
                  <Ionicons
                    name={focused ? "time" : "time-outline"}
                    size={size || 22}
                    color={color}
                  />
                ),
              }}
            />

            {/* WALLET: super admin, public. Not admin / responder. */}
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

            {/* ADMIN: admins of SERVICE PROVIDER organisations only.
                Client organisations don't get this tab at all. */}
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

            {/* SUPER ADMIN: super admin only. */}
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

            {/* RESPONDER: responder only. */}
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

            {/* PROFILE: everyone. */}
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

            {/* HIDDEN SCREENS */}
            <Tabs.Screen name="emergency" options={{ href: null }} />
            <Tabs.Screen name="track" options={{ href: null }} />
            <Tabs.Screen
              name="super-admin/branch/[branchId]"
              options={{
                href: null,
              }}
            />
          </Tabs>

          {barConfig && (
            <View style={styles.emergencyWrapper}>
              <TouchableOpacity
                style={[
                  styles.emergencyButton,
                  barConfig.disabled && styles.emergencyButtonDisabled,
                ]}
                activeOpacity={0.85}
                disabled={barConfig.disabled}
                onPress={barConfig.onPress}
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
                <Text style={styles.emergencyText}>{barConfig.label}</Text>
              </TouchableOpacity>
            </View>
          )}
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

  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },

  errorText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },

  retryButton: {
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: "#DC2626",
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

  /* HEADER */
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 35,
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

  /* HEADER ACTIONS */
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  /* TABS CONTAINER */
  tabsContainer: {
    flex: 1,
  },

  /* BOTTOM NAVIGATION */
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

  /* GLOBAL BOTTOM BUTTON */
  emergencyWrapper: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 88,
    zIndex: 20,
  },

  emergencyButton: {
    height: 54,
    backgroundColor: "#DC2626",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,

    shadowColor: "#DC2626",
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
  },
});