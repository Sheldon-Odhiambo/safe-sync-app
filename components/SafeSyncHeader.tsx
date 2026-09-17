import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ShieldPlus, LogOut } from "lucide-react-native";

interface SafeSyncHeaderProps {
  onSignOut?: () => void;
  title?: string;
}

export function SafeSyncHeader({ onSignOut, title = "SafeSync" }: SafeSyncHeaderProps) {
  const router = useRouter();

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      // Default: navigate back to sign-in
      router.replace("/(auth)/signin");
    }
  };

  return (
    <SafeAreaView className="bg-white border-b border-slate-200/80">
      <View className="h-16 px-4 flex-row items-center justify-between">
        {/* Left: Brand Emblem + Title */}
        <View className="flex-row items-center gap-3">
          {/* Rounded Squircle Red Emblem */}
          <View className="size-10 rounded-2xl bg-rose-600 items-center justify-center shadow-xs">
            <ShieldPlus size={20} color="#ffffff" strokeWidth={1.8} />
          </View>

          {/* Title */}
          <Text className="text-lg font-black tracking-tight text-slate-900">
            {title}
          </Text>
        </View>

        {/* Right: Outlined Sign Out Action Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSignOut}
          className="size-10 rounded-xl border border-slate-200 bg-white items-center justify-center active:bg-slate-50 shadow-2xs"
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <LogOut size={17} color="#334155" strokeWidth={1.75} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}