import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
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

const ACTIVE_COLOR = "#DC2626";
const INACTIVE_COLOR = "#94A3B8";

export default function TabsLayout() {
  return (
    <EmergencyBarProvider>
      <TabsLayoutContent />
    </EmergencyBarProvider>
  );
}

function TabsLayoutContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { config } = useEmergencyBar();

  const kind = profile?.userKind;

  const isSuperAdmin = kind === "super_admin";
  const isAdmin = kind === "admin" || kind === "system_user";
  const isResponder = kind === "responder";

  const isEmergencyScreen = pathname?.includes("/emergency");
  const isTrackScreen = pathname?.includes("/track");

  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            router.replace("/");
          },
        },
      ]
    );
  };

  const handleEmergency = () => {
    router.push("/emergency");
  };

  // ---------------------------------------------------------
  // Resolve what the single global bottom button should show.
  // - Track screen: no button at all.
  // - Emergency screen: driven entirely by the screen itself
  //   (via EmergencyBarProvider) — label, disabled/loading state
  //   and the confirm action, including its own "notes required
  //   for Other Emergency" check.
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
              <Ionicons
                name="shield-checkmark"
                size={18}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.brandTitle}>SafeSync</Text>
          </View>

          {/* HEADER ACTIONS */}
          <View style={styles.headerActions}>

            {/* SIGN OUT */}
            <TouchableOpacity
              style={styles.signOutButton}
              activeOpacity={0.7}
              onPress={handleSignOut}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#0F172A"
              />
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
            {/* ---------------------------------------------------
                HOME — superadmin, admin, public. Not responder.
            --------------------------------------------------- */}
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

            {/* ---------------------------------------------------
                HISTORY — responder, public. Not superadmin/admin.
            --------------------------------------------------- */}
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

            {/* ---------------------------------------------------
                WALLET — superadmin, public. Not admin/responder.
            --------------------------------------------------- */}
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

            {/* ---------------------------------------------------
                ADMIN — admin only.
            --------------------------------------------------- */}
            <Tabs.Screen
              name="admin/index"
              options={{
                title: "Admin",
                href: isAdmin ? undefined : null,
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="briefcase-outline" size={size || 22} color={color} />
                ),
              }}
            />

            {/* ---------------------------------------------------
                SUPER ADMIN — superadmin only.
            --------------------------------------------------- */}
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

            {/* ---------------------------------------------------
                RESPONDER — responder only.
            --------------------------------------------------- */}
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

            {/* ---------------------------------------------------
                PROFILE — everyone.
            --------------------------------------------------- */}
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
                <Text style={styles.emergencyText}>
                  {barConfig.label}
                </Text>
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

  /* HEADER */
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop:35,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
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

  /* HEADER ACTIONS */
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  signUpButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  signUpText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    shadowOffset: {
      width: 0,
      height: 5,
    },
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