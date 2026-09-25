import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function RootNavigation() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (session && !inTabsGroup) {
      // Already logged in (e.g. app relaunch) — skip straight past login/signup.
      router.replace("/(tabs)");
    } else if (!session && inTabsGroup) {
      // No session (never logged in, or signed out) — bounce to login.
      router.replace("/");
    }
  }, [session, initializing, segments]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}