import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../contexts/auth-context";
import { ReferenceDataProvider } from "../contexts/reference-data-context";

function RootNavigation() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (session && !inTabsGroup) {
      // Tabs layout redirects each role to its own landing screen.
      router.replace("/home");
    } else if (!session && inTabsGroup) {
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
      <ReferenceDataProvider>
        <RootNavigation />
      </ReferenceDataProvider>
    </AuthProvider>
  );
}