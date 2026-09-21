import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  ShieldPlus,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const COLORS = {
  primary: "#ED111C",
  primaryDark: "#C90D16",
  background: "#F8FAFC",
  white: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  placeholder: "#94A3B8",
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = () => {
    if (!identifier.trim()) {
      setMessage("Please enter your phone number or email.");
      return;
    }

    setMessage(
      "If an account exists with these details, password reset instructions will be sent."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={COLORS.text} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <ShieldPlus
                  size={25}
                  color={COLORS.white}
                  strokeWidth={1.8}
                />
              </View>

              <Text style={styles.title}>Reset Password</Text>

              <Text style={styles.subtitle}>
                Enter your phone number or email and we'll help you regain
                access to your SafeSync account.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Account Identifier</Text>

              <View style={styles.inputContainer}>
                <Mail
                  size={19}
                  color={COLORS.muted}
                  strokeWidth={1.8}
                />

                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Phone or email"
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>

              {message ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{message}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleReset}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>
                  Send Reset Instructions
                </Text>

                <ArrowRight
                  size={17}
                  color={COLORS.white}
                  strokeWidth={2}
                />
              </Pressable>

              <Pressable
                onPress={() => router.push("./signin")}
                style={styles.signInButton}
              >
                <Text style={styles.signInText}>
                  Back to Sign In
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 25,
  },

  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
    textAlign: "center",
    maxWidth: 320,
  },

  form: {
    gap: 12,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  inputContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },

  messageBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
  },

  messageText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#991B1B",
  },

  resetButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 5,
  },

  resetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },

  signInButton: {
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  signInText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
});