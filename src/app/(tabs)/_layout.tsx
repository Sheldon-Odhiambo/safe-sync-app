
import React, { useEffect, useRef } from "react";

  import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";

import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,

  Alert,
  Platform,
  Animated,
  Easing,
} from "react-native";

import { Tabs, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ShieldCheck,
  LogOut,
  Home,
  History,
  Wallet,
  User,
  Siren,
} from "lucide-react-native";

const PRIMARY = "#E11D48";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const BACKGROUND = "#F8FAFC";

  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();


  // Alertify animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.18)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.035,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.32,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),

        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.18,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [pulseAnim, glowAnim]);

  const handleAlertifyPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handleAlertifyPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 5,
    }).start();
  };

  // Sign out
  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of SafeSync?",
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

  const handleSignUp = () => router.push("/signup");


  // Alertify
  const handleAlertify = () => {
    Alert.alert(
      "Alertify",
      "Do you need emergency assistance?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate Alertify",
          style: "destructive",

          onPress: () => {
            router.replace("/emergency");
          },

          onPress: () => router.push("/emergency"),

        },
      ]
    );
  };

  return (

    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>

        {/* ================================
            TOP NAVIGATION
        ================================= */}

        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <ShieldCheck
                size={21}
                color="#FFFFFF"
                strokeWidth={2.5}
              />
            </View>

            <View>
              <Text style={styles.brandTitle}>
                SafeSync
              </Text>

              <Text style={styles.brandSubtitle}>
                Emergency Response
              </Text>
            </View>
          </View>

          {/* SIGN OUT */}

          <TouchableOpacity
            style={styles.signOutButton}
            activeOpacity={0.7}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <LogOut
              size={20}
              color={TEXT}
              strokeWidth={2.2}
            />
          </TouchableOpacity>
        </View>

        {/* ================================
            TABS
        ================================= */}

        <View style={styles.tabsContainer}>
          <Tabs
            screenOptions={{
              headerShown: false,

              tabBarActiveTintColor: PRIMARY,
              tabBarInactiveTintColor: MUTED,

              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
              tabBarItemStyle: styles.tabItem,

              tabBarHideOnKeyboard: true,

              sceneStyle: {
                backgroundColor: BACKGROUND,
              },
            }}

    <View style={styles.container}>
      {/* TOP HEADER WITH SAFE AREA INSETS */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>SafeSync</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.signUpButton}
            activeOpacity={0.8}
            onPress={handleSignUp}

          >
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>


            {/* HOME */}

            <Tabs.Screen
              name="home"
              options={{
                title: "Home",

                tabBarIcon: ({
                  color,
                  focused,
                }) => (
                  <Home
                    size={23}
                    color={color}
                    strokeWidth={
                      focused ? 2.6 : 2.1
                    }
                  />
                ),
              }}
            />

            {/* HISTORY */}

            <Tabs.Screen
              name="history"
              options={{
                title: "History",

                tabBarIcon: ({
                  color,
                  focused,
                }) => (
                  <History
                    size={23}
                    color={color}
                    strokeWidth={
                      focused ? 2.6 : 2.1
                    }
                  />
                ),
              }}
            />

            {/* WALLET */}

            <Tabs.Screen
              name="wallet"
              options={{
                title: "Wallet",

                tabBarIcon: ({
                  color,
                  focused,
                }) => (
                  <Wallet
                    size={23}
                    color={color}
                    strokeWidth={
                      focused ? 2.6 : 2.1
                    }
                  />
                ),
              }}
            />

            {/* PROFILE */}

            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",

                tabBarIcon: ({
                  color,
                  focused,
                }) => (
                  <User
                    size={23}
                    color={color}
                    strokeWidth={
                      focused ? 2.6 : 2.1
                    }
                  />
                ),
              }}
            />
          </Tabs>

          {/* ================================
              ALERTIFY
          ================================= */}

          <View style={styles.alertifyWrapper}>

            {/* Animated glow */}

            <Animated.View
              pointerEvents="none"
              style={[
                styles.alertifyGlow,
                {
                  opacity: glowAnim,
                  transform: [
                    {
                      scale: pulseAnim,
                    },
                  ],
                },
              ]}
            />

            {/* Animated button */}

            <Animated.View
              style={{
                transform: [
                  {
                    scale: Animated.multiply(
                      pulseAnim,
                      pressAnim
                    ),
                  },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleAlertify}
                onPressIn={handleAlertifyPressIn}
                onPressOut={handleAlertifyPressOut}
                style={styles.alertifyButton}
                accessibilityRole="button"
                accessibilityLabel="Alertify emergency button"
              >

                {/* ICON */}

                <View style={styles.alertifyIcon}>
                  <Siren
                    size={28}
                    color="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </View>

                {/* TEXT */}

                <View style={styles.alertifyTextContainer}>
                  <Text style={styles.alertifyTitle}>
                    Alertify
                  </Text>

                  <Text style={styles.alertifySubtitle}>
                    Request immediate assistance
                  </Text>
                </View>

              </TouchableOpacity>
            </Animated.View>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.8}
            onPress={() => console.log("Settings pressed")}
          >
            <Ionicons name="settings-outline" size={20} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS CONTAINER */}
      <View style={styles.tabsWrapper}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#DC2626",
            tabBarInactiveTintColor: "#64748B",
            tabBarStyle: {
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom + 4,
              paddingTop: 6,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#E2E8F0",
              elevation: 8,
            },
            tabBarLabelStyle: styles.tabLabel,
            tabBarItemStyle: styles.tabItem,
            tabBarHideOnKeyboard: true,
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "home" : "home-outline"}
                  size={22}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: "History",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "time" : "time-outline"}
                  size={22}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="wallet"
            options={{
              title: "Wallet",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "wallet" : "wallet-outline"}
                  size={22}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={22}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen name="admin" options={{ href: null }} />
          <Tabs.Screen name="track" options={{ href: null }} />
          <Tabs.Screen name="responder" options={{ href: null }} />
        </Tabs>

        {/* FLOATING EMERGENCY BUTTON FIXED CLEAR OF TABS */}
        <View
          style={[
            styles.emergencyWrapper,
            { bottom: 70 + insets.bottom },
          ]}
        >
          <TouchableOpacity
            style={styles.emergencyButton}
            activeOpacity={0.85}
            onPress={handleEmergency}
          >
            <View style={styles.emergencyIcon}>
              <MaterialCommunityIcons
                name="alarm-light"
                size={20}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.emergencyText}>REQUEST EMERGENCY HELP</Text>
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

// ==========================================================
// STYLES
// ==========================================================

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },



  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },


  // ========================================================
  // TOP HEADER
  // ========================================================

  header: {
    height: 64,
    backgroundColor: "#FFFFFF",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 17,

    borderBottomWidth: 1,
    borderBottomColor: BORDER,

    zIndex: 20,

    elevation: 3,

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    zIndex: 50,

  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBadge: {

    width: 40,
    height: 40,

    borderRadius: 12,

    backgroundColor: PRIMARY,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,

    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,

  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.3,
  },


  brandSubtitle: {
    fontSize: 10,
    color: MUTED,
    marginTop: 1,
  },

  // ========================================================
  // SIGN OUT
  // ========================================================

  signOutButton: {
    width: 42,
    height: 42,

    borderRadius: 13,

    backgroundColor: "#F8FAFC",

    borderWidth: 1,
    borderColor: BORDER,

    alignItems: "center",
    justifyContent: "center",
  },

  // ========================================================
  // TABS
  // ========================================================

  tabsContainer: {
    flex: 1,
  },

  tabBar: {
    position: "absolute",

    left: 12,
    right: 12,

    bottom:
      Platform.OS === "ios"
        ? 7
        : 8,

    height: 66,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: BORDER,

    borderRadius: 19,

    paddingTop: 6,

    paddingBottom:
      Platform.OS === "ios"
        ? 7
        : 5,

    paddingHorizontal: 4,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.08,

    shadowRadius: 12,

    elevation: 8,

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signUpButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",

  },
  tabsWrapper: {
    flex: 1,
  },
  tabItem: {

    height: 55,

    alignItems: "center",
    justifyContent: "center",

    paddingVertical: 2,

    alignItems: "center",
    justifyContent: "center",

  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },


  // ========================================================
  // ALERTIFY
  // ========================================================

  alertifyWrapper: {
    position: "absolute",

    left: 14,
    right: 14,

    bottom:
      Platform.OS === "ios"
        ? 83
        : 84,

    zIndex: 50,
  },

  // Outer glow

  alertifyGlow: {
    position: "absolute",

    top: -6,
    bottom: -6,
    left: -5,
    right: -5,

    borderRadius: 22,

    backgroundColor: PRIMARY,
  },

  // Main Alertify button

  alertifyButton: {
    height: 68,

    backgroundColor: PRIMARY,

    borderRadius: 19,


  emergencyWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 30,
  },
  emergencyButton: {
    height: 50,
    backgroundColor: "#DC2626",
    borderRadius: 14,

    flexDirection: "row",

    alignItems: "center",


    paddingHorizontal: 17,

    shadowColor: PRIMARY,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.30,

    shadowRadius: 13,

    elevation: 10,
  },

  // Larger icon

  alertifyIcon: {
    width: 48,
    height: 48,

    borderRadius: 15,

    backgroundColor:
      "rgba(255,255,255,0.18)",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 13,
  },

  alertifyTextContainer: {
    flex: 1,
  },

  alertifyTitle: {
    color: "#FFFFFF",

    fontSize: 18,

    fontWeight: "900",

    letterSpacing: 0.1,

    marginBottom: 3,
  },

  alertifySubtitle: {
    color: "#FFE4E6",

    fontSize: 10.5,

    fontWeight: "500",

    justifyContent: "center",
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  emergencyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  emergencyText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,

  },
});