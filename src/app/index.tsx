import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

const COLORS = {
  primary: "#ED111C",
  primaryDark: "#C90D16",
  white: "#FFFFFF",
  black: "#111827",
  text: "#1E293B",
  muted: "#64748B",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  background: "#F8FAFC",
};

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;
  const isSmallPhone = width < 380;

  const [email, setEmail] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetOtp = async () => {
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      // shouldCreateUser: false means this only succeeds for emails that
      // already have an account — anyone without one gets a clear error
      // instead of silently being signed up from the login screen.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        if (
          otpError.message?.toLowerCase().includes("signups not allowed") ||
          otpError.message?.toLowerCase().includes("user not found")
        ) {
          setError("No account found with that email. Please sign up first.");
        } else {
          setError(otpError.message);
        }
        return;
      }

      router.push({
        pathname: "/verify-code",
        params: { email: cleanEmail, mode: "login" },
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.page, isDesktop && styles.pageDesktop]}>
          {isDesktop && <BrandPanel />}

          <View
            style={[
              styles.loginPanel,
              !isDesktop && styles.loginPanelMobile,
              isSmallPhone && styles.loginPanelSmallPhone,
            ]}
          >
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                !isDesktop && styles.scrollContentMobile,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.loginContainer}>
                {!isDesktop && (
                  <View style={styles.mobileLogoContainer}>
                    <View style={styles.mobileLogoCircle}>
                      <View style={styles.mobileLogoShield}>
                        <Text style={styles.mobileLogoPlus}>+</Text>
                      </View>
                    </View>

                    <Text style={styles.mobileLogoText}>SafeSync</Text>
                  </View>
                )}

                <View style={styles.heading}>
                  <Text style={styles.welcomeTitle}>Sign in</Text>

                  <Text style={styles.welcomeSubtitle}>
                    Enter your email to receive a 6-digit verification code.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email address</Text>

                  <View
                    style={[
                      styles.inputWrapper,
                      isFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <Text style={styles.inputSymbol}>@</Text>

                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        setError("");
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor={COLORS.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      returnKeyType="done"
                      onSubmitEditing={handleGetOtp}
                      selectionColor={COLORS.primary}
                      editable={!loading}
                    />
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.buttonPressed,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleGetOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.loginButtonText}>Get OTP Code</Text>
                  )}
                </Pressable>

                <View style={styles.securityMessage}>
                  <Text style={styles.securityText}>
                    Passwordless secure authentication by SafeSync.
                  </Text>
                </View>

                <View style={styles.signupRow}>
                  <Text style={styles.signupPrompt}>Don't have an account?</Text>
                  <Pressable onPress={() => router.push("/signup")}>
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BrandPanel() {
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brandContent}>
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <View style={styles.logoShield}>
              <Text style={styles.logoPlus}>+</Text>
            </View>
          </View>

          <Text style={styles.logoText}>SafeSync</Text>
        </View>

        <View style={styles.brandMessage}>
          <Text style={styles.brandTitle}>
            Every second you{"\n"}
            save is a life you{"\n"}
            might keep.
          </Text>

          <Text style={styles.brandDescription}>
            Emergency response coordination designed to connect people,
            responders and organizations in real time.
          </Text>
        </View>

        <Text style={styles.copyright}>© 2026 SafeSync Technologies Ltd.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  keyboard: { flex: 1 },
  page: { flex: 1, backgroundColor: COLORS.white },
  pageDesktop: { flexDirection: "row" },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  scrollContentMobile: { paddingVertical: 28 },

  brandPanel: { flex: 1, backgroundColor: COLORS.primary, paddingHorizontal: 48, paddingVertical: 48 },
  brandContent: { flex: 1, justifyContent: "space-between" },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.white,
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  logoShield: {
    width: 21, height: 23, borderWidth: 2, borderColor: COLORS.primary,
    borderRadius: 5, alignItems: "center", justifyContent: "center",
  },
  logoPlus: { color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  logoText: { color: COLORS.white, fontSize: 21, fontWeight: "800" },
  brandMessage: { marginVertical: "auto" },
  brandTitle: { color: COLORS.white, fontSize: 40, lineHeight: 48, fontWeight: "800", letterSpacing: -1 },
  brandDescription: { maxWidth: 400, marginTop: 20, color: COLORS.white, opacity: 0.9, fontSize: 15, lineHeight: 22 },
  copyright: { color: COLORS.white, opacity: 0.8, fontSize: 12 },

  loginPanel: { flex: 1, backgroundColor: COLORS.white, paddingHorizontal: 40, paddingVertical: 40 },
  loginPanelMobile: { paddingHorizontal: 24, paddingVertical: 20 },
  loginPanelSmallPhone: { paddingHorizontal: 18 },
  loginContainer: { width: "100%", maxWidth: 420, alignSelf: "center" },

  mobileLogoContainer: { alignItems: "center", marginBottom: 32 },
  mobileLogoCircle: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  mobileLogoShield: {
    width: 28, height: 31, borderWidth: 2, borderColor: COLORS.white,
    borderRadius: 7, alignItems: "center", justifyContent: "center",
  },
  mobileLogoPlus: { color: COLORS.white, fontSize: 19, fontWeight: "900" },
  mobileLogoText: { color: COLORS.black, fontSize: 21, fontWeight: "800" },

  heading: { marginBottom: 28 },
  welcomeTitle: { color: COLORS.black, fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  welcomeSubtitle: { marginTop: 8, color: COLORS.muted, fontSize: 14, lineHeight: 21 },

  inputGroup: { marginBottom: 18 },
  inputLabel: { marginBottom: 8, color: COLORS.black, fontSize: 13, fontWeight: "600" },
  inputWrapper: {
    minHeight: 54, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center",
  },
  inputWrapperFocused: { borderColor: COLORS.primary, borderWidth: 1.5 },
  inputSymbol: { width: 48, textAlign: "center", color: COLORS.muted, fontSize: 18, fontWeight: "700" },
  input: {
    flex: 1, minHeight: 52, paddingVertical: 12, paddingHorizontal: 0,
    color: COLORS.black, backgroundColor: "transparent", fontSize: 15,
  },

  errorBox: {
    marginBottom: 14, paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 9, backgroundColor: "#FEF2F2",
  },
  errorText: { color: "#B91C1C", fontSize: 12, fontWeight: "600" },

  loginButton: {
    minHeight: 54, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, marginTop: 4,
  },
  buttonPressed: { backgroundColor: COLORS.primaryDark },
  buttonDisabled: { opacity: 0.7 },
  loginButtonText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },

  securityMessage: { alignItems: "center", marginTop: 22, paddingHorizontal: 10 },
  securityText: { color: COLORS.muted, fontSize: 12, textAlign: "center", lineHeight: 18 },

  signupRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    marginTop: 18, gap: 5,
  },
  signupPrompt: { fontSize: 13, color: COLORS.muted },
  signupLink: { fontSize: 13, fontWeight: "800", color: COLORS.primary },
});