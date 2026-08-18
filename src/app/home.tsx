import React from "react";
import { SafeAreaView, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "#111827",
          }}
        >
          SafeSync Home
        </Text>

        <Text
          style={{
            marginTop: 10,
            color: "#64748B",
          }}
        >
          Login successful
        </Text>
      </View>
    </SafeAreaView>
  );
}