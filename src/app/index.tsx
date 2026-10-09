import React, { useState } from "react";

import {
  ActivityIndicator,
  Image,
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

// SafeSync actual logo
const SAFE_SYNC_LOGO =
  "https://res.cloudinary.com/di15s67o/image/upload/v1790591289/safesync-logo_dlahyy.png";

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

    // Correct email validation regex
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
      // Only allows existing users to request an OTP.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        if (
          otpError.message?.toLowerCase().includes("signups not allowed") ||
          otpError.message?.toLowerCase().includes("user not found")
        ) {
          setError(
            "No account found with that email. Please sign up first."
          );
        } else {
          setError(otpError.message);
        }

        return;
      }

      router.push({
        pathname: "/verify-code",
        params: {
          email: cleanEmail,
          mode: "login",
        },
      });
    } catch (err: any) {
      setError(
        err?.message || "Something went wrong. Please try again."
      );
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
        <View
          style={[
            styles.page,
            isDesktop && styles.pageDesktop,
          ]}
        >
          {/* Desktop brand section */}
          {isDesktop && <BrandPanel />}

          {/* Login section */}
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
                {/* Mobile logo */}
                {!isDesktop && (
                  <View style={styles.mobileLogoContainer}>
                    <Image
                      source={{ uri: SAFE_SYNC_LOGO }}
                      style={styles.mobileLogoImage}
                      resizeMode="contain"
                    />

                    {/* <Text style={styles.mobileLogoText}>
                      SafeSync
                    </Text> */}
                  </View>
                )}

                {/* Heading */}
                <View style={styles.heading}>
                  <Text style={styles.welcomeTitle}>
                    Sign in
                  </Text>

                  <Text style={styles.welcomeSubtitle}>
                    Enter your email to receive a 6-digit
                    verification code.
                  </Text>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Email address
                  </Text>

                  <View
                    style={[
                      styles.inputWrapper,
                      isFocused &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Text style={styles.inputSymbol}>
                      @
                    </Text>

                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        setError("");
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      onFocus={() =>
                        setIsFocused(true)
                      }
                      onBlur={() =>
                        setIsFocused(false)
                      }
                      returnKeyType="done"
                      onSubmitEditing={handleGetOtp}
                      selectionColor={COLORS.primary}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Error */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* Login button */}
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
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Text
                      style={styles.loginButtonText}
                    >
                      Get OTP Code
                    </Text>
                  )}
                </Pressable>

                {/* Security message */}
                <View style={styles.securityMessage}>
                  <Text style={styles.securityText}>
                    Passwordless secure authentication by
                    SafeSync.
                  </Text>
                </View>

                {/* Sign up */}
                <View style={styles.signupRow}>
                  <Text style={styles.signupPrompt}>
                    Don't have an account?
                  </Text>

                  <Pressable
                    onPress={() =>
                      router.push("/signup")
                    }
                  >
                    <Text style={styles.signupLink}>
                      Sign Up
                    </Text>
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

/* =========================================================
   DESKTOP BRAND PANEL
========================================================= */

function BrandPanel() {
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brandContent}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Image
            source={{ uri: SAFE_SYNC_LOGO }}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.logoText}>
            SafeSync
          </Text>
        </View>

        {/* Brand message */}
        <View style={styles.brandMessage}>
          <Text style={styles.brandTitle}>
            Every second you{"\n"}
            save is a life you{"\n"}
            might keep.
          </Text>

          <Text style={styles.brandDescription}>
            Emergency response coordination designed to
            connect people, responders and organizations
            in real time.
          </Text>
        </View>

        {/* Copyright */}
        <Text style={styles.copyright}>
          © 2026 SafeSync Technologies Ltd.
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  keyboard: {
    flex: 1,
  },

  page: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  pageDesktop: {
    flexDirection: "row",
  },

  /* =====================================================
     DESKTOP BRAND PANEL
  ===================================================== */

  brandPanel: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 48,
  },

  brandContent: {
    flex: 1,
    justifyContent: "space-between",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoImage: {
    width: 90,
    height: 90,
    marginRight: 12,
  },

  logoText: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "800",
  },

  brandMessage: {
    marginVertical: "auto",
  },

  brandTitle: {
    color: COLORS.white,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: -1,
  },

  brandDescription: {
    maxWidth: 400,
    marginTop: 20,
    color: COLORS.white,
    opacity: 0.9,
    fontSize: 15,
    lineHeight: 22,
  },

  copyright: {
    color: COLORS.white,
    opacity: 0.8,
    fontSize: 12,
  },

  /* =====================================================
     LOGIN PANEL
  ===================================================== */

  loginPanel: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 40,
    paddingVertical: 40,
  },

  loginPanelMobile: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  loginPanelSmallPhone: {
    paddingHorizontal: 18,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  scrollContentMobile: {
    paddingVertical: 28,
  },

  loginContainer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },

  /* =====================================================
     MOBILE LOGO
  ===================================================== */

  mobileLogoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  mobileLogoImage: {
    width: 150,
    height: 150,
    marginBottom: 4,
  },

  mobileLogoText: {
    color: COLORS.black,
    fontSize: 21,
    fontWeight: "800",
  },

  /* =====================================================
     HEADING
  ===================================================== */

  heading: {
    marginBottom: 28,
  },

  welcomeTitle: {
    color: COLORS.black,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  welcomeSubtitle: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  /* =====================================================
     INPUT
  ===================================================== */

  inputGroup: {
    marginBottom: 18,
  },

  inputLabel: {
    marginBottom: 8,
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "600",
  },

  inputWrapper: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
  },

  inputWrapperFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },

  inputSymbol: {
    width: 48,
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 18,
    fontWeight: "700",
  },

  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 0,
    color: COLORS.black,
    backgroundColor: "transparent",
    fontSize: 15,
  },

  /* =====================================================
     ERROR
  ===================================================== */

  errorBox: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },

  /* =====================================================
     BUTTON
  ===================================================== */

  loginButton: {
    minHeight: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },

  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  /* =====================================================
     SECURITY MESSAGE
  ===================================================== */

  securityMessage: {
    alignItems: "center",
    marginTop: 22,
    paddingHorizontal: 10,
  },

  securityText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  /* =====================================================
     SIGN UP
  ===================================================== */

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    gap: 5,
  },

  signupPrompt: {
    fontSize: 13,
    color: COLORS.muted,
  },

  signupLink: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },
});