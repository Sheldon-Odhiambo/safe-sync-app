import { useRouter } from "expo-router";
import { Ambulance, ArrowRight, Building2, ShieldPlus, User } from "lucide-react-native";
import { useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GoogleButton } from "../../components/Googlebutton";

export default function SignInScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = (role: "user" | "admin" | "driver" = "user") => {
    // Navigate to citizen tabs or admin
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName= "flexGrow 1 p-5 justify-center">
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 gap-5">
          {/* Header */}
          <View className="items-center gap-2">
            <View className="size-11 rounded-xl bg-rose-600 items-center justify-center shadow-sm">
              <ShieldPlus size={22} color="#ffffff" strokeWidth={1.75} />
            </View>
            <Text className="text-2xl font-black text-slate-900">SafeSync</Text>
            <Text className="text-xs text-slate-500 text-center">
              Rapid Emergency Response & Autonomous Fleet Telemetry
            </Text>
          </View>

          {/* Google Sign In */}
          <View className="gap-3">
            <GoogleButton onPress={() => handleSignIn("user")} />
            <View className="flex-row items-center justify-center gap-2">
              <View className="flex-1 h-px bg-slate-200" />
              <Text className="text-[11px] font-bold text-slate-400 uppercase">
                Or sign in with password
              </Text>
              <View className="flex-1 h-px bg-slate-200" />
            </View>
          </View>

          {/* Instant Persona Switcher */}
          <View className="rounded-2xl bg-slate-50 p-3 border border-slate-200 gap-2">
            <Text className="text-[10px] font-bold text-slate-500 uppercase text-center">
              One-Click Instant Access (Demo)
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => handleSignIn("user")}
                className="flex-1 items-center bg-white p-2.5 rounded-xl border border-slate-200 gap-1"
              >
                <User size={15} color="#E11D48" strokeWidth={1.75} />
                <Text className="text-xs font-bold text-slate-700">Citizen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSignIn("admin")}
                className="flex-1 items-center bg-white p-2.5 rounded-xl border border-slate-200 gap-1"
              >
                <Building2 size={15} color="#D97706" strokeWidth={1.75} />
                <Text className="text-xs font-bold text-slate-700">Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSignIn("driver")}
                className="flex-1 items-center bg-white p-2.5 rounded-xl border border-slate-200 gap-1"
              >
                <Ambulance size={15} color="#059669" strokeWidth={1.75} />
                <Text className="text-xs font-bold text-slate-700">Responder</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Credentials Input */}
          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-700">Account Identifier</Text>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Phone or username"
                placeholderTextColor="#94A3B8"
                className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 text-sm"
              />
            </View>

            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-700">Password</Text>
              <TextInput
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 text-sm"
              />
            </View>

            <TouchableOpacity
              onPress={() => handleSignIn("user")}
              className="h-11 bg-rose-600 rounded-xl flex-row items-center justify-center gap-2 mt-1 active:bg-rose-700 shadow-sm"
            >
              <Text className="text-white font-bold text-sm">Sign In with Password</Text>
              <ArrowRight size={14} color="#ffffff" strokeWidth={1.75} />
            </TouchableOpacity>
          </View>

          {/* Link to Register */}
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text className="text-center text-xs text-slate-500">
              Don't have an account yet?{" "}
              <Text className="font-bold text-rose-600">Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

