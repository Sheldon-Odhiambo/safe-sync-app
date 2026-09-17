import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { ShieldAlert } from "lucide-react-native";

interface EmergencyHelpButtonProps {
  floating?: boolean;
}

export function EmergencyHelpButton({
  floating = false,
}: EmergencyHelpButtonProps) {
  const router = useRouter();

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [floatAnim]);

  const buttonContent = (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push("/emergency")}
      className="h-14 bg-rose-600 rounded-2xl flex-row items-center justify-center px-5 shadow-md border border-rose-500 active:bg-rose-700"
    >
      <Animated.View
        style={{
          transform: [{ translateY: floatAnim }],
        }}
        className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-3"
      >
        <ShieldAlert size={21} color="#ffffff" strokeWidth={2.2} />
      </Animated.View>

      <Text className="text-white font-black text-sm tracking-wide">
        REQUEST EMERGENCY HELP
      </Text>
    </TouchableOpacity>
  );

  if (floating) {
    return (
      <View className="absolute bottom-20 left-4 right-4 z-50">
        {buttonContent}
      </View>
    );
  }

  return buttonContent;
}