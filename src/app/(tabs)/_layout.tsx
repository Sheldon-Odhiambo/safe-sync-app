import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  Alert,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

export default function TabsLayout() {
  const router = useRouter();

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
    Alert.alert(
      "Emergency assistance",
      "Do you need emergency assistance?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            // Later replace this with:
            // router.push("/emergency");
            console.log("Emergency request started");
          },
        },
      ]
    );
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

            <Text style={styles.brandTitle}>
              SafeSync
            </Text>

          </View>

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

        {/* ================================================= */}
        {/* PAGE CONTENT + TAB NAVIGATION                     */}
        {/* ================================================= */}

        <View style={styles.tabsContainer}>

          <Tabs
            screenOptions={{
              headerShown: false,

              tabBarActiveTintColor: "#DC2626",
              tabBarInactiveTintColor: "#94A3B8",

              tabBarStyle: styles.tabBar,

              tabBarLabelStyle: styles.tabLabel,

              tabBarItemStyle: styles.tabItem,

              tabBarHideOnKeyboard: true,
            }}
          >

            {/* HOME */}

            <Tabs.Screen
              name="home"
              options={{
                title: "Home",

                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={
                      focused
                        ? "grid"
                        : "grid-outline"
                    }
                    size={22}
                    color={color}
                  />
                ),
              }}
            />

            {/* HISTORY */}

            <Tabs.Screen
              name="history"
              options={{
                title: "History",

                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={
                      focused
                        ? "time"
                        : "time-outline"
                    }
                    size={22}
                    color={color}
                  />
                ),
              }}
            />

            {/* WALLET */}

            <Tabs.Screen
              name="wallet"
              options={{
                title: "Wallet",

                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={
                      focused
                        ? "wallet"
                        : "wallet-outline"
                    }
                    size={22}
                    color={color}
                  />
                ),
              }}
            />

            {/* PROFILE */}

            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",

                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={
                      focused
                        ? "person"
                        : "person-outline"
                    }
                    size={22}
                    color={color}
                  />
                ),
              }}
            />

          </Tabs>

          {/* ================================================= */}
          {/* GLOBAL EMERGENCY BUTTON                           */}
          {/* ================================================= */}

          <View style={styles.emergencyWrapper}>
            <TouchableOpacity
              style={styles.emergencyButton}
              activeOpacity={0.85}
              onPress={handleEmergency}
            >
              <View style={styles.emergencyIcon}>
                <MaterialCommunityIcons
                  name="alarm-light"
                  size={21}
                  color="#FFFFFF"
                />
              </View>

              <Text style={styles.emergencyText}>
                REQUEST EMERGENCY HELP
              </Text>
            </TouchableOpacity>
          </View>

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

  /* ============================================= */
  /* HEADER                                        */
  /* ============================================= */

  header: {
    height: 64,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 20,

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

  /* ============================================= */
  /* TABS CONTAINER                                */
  /* ============================================= */

  tabsContainer: {
    flex: 1,
  },

  /* ============================================= */
  /* BOTTOM NAVIGATION                             */
  /* ============================================= */

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
    paddingBottom:
      Platform.OS === "ios" ? 8 : 6,

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

  /* ============================================= */
  /* GLOBAL EMERGENCY BUTTON                       */
  /* ============================================= */

  emergencyWrapper: {
    position: "absolute",

    left: 20,
    right: 20,

    bottom:
      Platform.OS === "ios"
        ? 88
        : 88,

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