import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Entry point */}
      <Stack.Screen name="index" /> 
      {/* Main app with tab bar */}
      <Stack.Screen name="(tabs)" /> 
    </Stack>
  );
}