import "./global.css";
import { Stack } from "expo-router";


export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/signin" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(responder)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="emergency" options={{ presentation: "modal" }} />
      <Stack.Screen name="track" />
    </Stack>
  );
}