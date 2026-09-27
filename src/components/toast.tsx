import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ToastTone = "error" | "success" | "info";

export type ToastState = {
  title: string;
  message?: string;
  tone?: ToastTone;
} | null;

const TONE_STYLES: Record<
  ToastTone,
  { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }
> = {
  error: {
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "cloud-offline-outline",
    iconColor: "#DC2626",
  },
  success: {
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "checkmark-circle-outline",
    iconColor: "#059669",
  },
  info: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: "information-circle-outline",
    iconColor: "#2563EB",
  },
};

/**
 * Drop this once near the root of a screen (absolute-positioned, so it
 * overlays whatever's already there):
 *
 *   const { toast, showToast } = useToast();
 *   ...
 *   <View style={{ flex: 1 }}>
 *     ...screen content...
 *     <ToastBanner toast={toast} />
 *   </View>
 *
 * Then anywhere you'd have called Alert.alert(title, message):
 *
 *   showToast("You're offline", "Check your connection and try again.", "error");
 */
export function ToastBanner({ toast }: { toast: ToastState }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: toast ? 1 : 0,
      duration: toast ? 200 : 150,
      useNativeDriver: true,
    }).start();
  }, [toast, opacity]);

  if (!toast) return null;

  const tone = TONE_STYLES[toast.tone ?? "info"];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { backgroundColor: tone.bg, borderColor: tone.border, opacity },
      ]}
    >
      <Ionicons
        name={tone.icon}
        size={20}
        color={tone.iconColor}
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{toast.title}</Text>
        {toast.message ? (
          <Text style={styles.message}>{toast.message}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  icon: { marginRight: 10, marginTop: 1 },
  textContainer: { flex: 1 },
  title: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  message: { fontSize: 12, color: "#475569", marginTop: 2, lineHeight: 16 },
});