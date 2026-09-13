  import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSignUp = () => router.push("/signup");

  const handleEmergency = () => {
    Alert.alert(
      "Emergency assistance",
      "Do you need emergency assistance?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => router.push("/emergency"),
        },
      ]
    );
  };

  return (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
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
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
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