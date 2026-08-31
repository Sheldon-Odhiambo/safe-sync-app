import React, { useState } from "react";
import {
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
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [focusedField, setFocusedField] = useState<
    "email" | "password" | null
  >(null);

  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    // Backend authentication will be connected later.
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.page, isDesktop && styles.pageDesktop]}>

          {/* DESKTOP BRAND PANEL */}
          {isDesktop && <BrandPanel />}

          {/* LOGIN PANEL */}
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

                {/* MOBILE LOGO */}
                {!isDesktop && (
                  <View style={styles.mobileLogoContainer}>
                    <View style={styles.mobileLogoCircle}>
                      <View style={styles.mobileLogoShield}>
                        <Text style={styles.mobileLogoPlus}>+</Text>
                      </View>
                    </View>

                    <Text style={styles.mobileLogoText}>
                      SafeSync
                    </Text>
                  </View>
                )}

                {/* HEADING */}
                <View style={styles.heading}>
                  <Text style={styles.welcomeTitle}>
                    Welcome back
                  </Text>

                  <Text style={styles.welcomeSubtitle}>
                    Sign in to your SafeSync account to continue.
                  </Text>
                </View>

                {/* EMAIL */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Email address
                  </Text>

                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "email" &&
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
                      placeholderTextColor={COLORS.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      onFocus={() =>
                        setFocusedField("email")
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                      returnKeyType="next"
                      selectionColor={COLORS.primary}
                    />
                  </View>
                </View>

                {/* PASSWORD */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Password
                  </Text>

                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "password" &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Text style={styles.inputSymbol}>
                      •
                    </Text>

                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setError("");
                      }}
                      placeholder="Enter your password"
                      placeholderTextColor={COLORS.placeholder}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      onFocus={() =>
                        setFocusedField("password")
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      selectionColor={COLORS.primary}
                    />

                    {/* SHOW / HIDE */}
                    <Pressable
                      style={styles.passwordToggle}
                      onPress={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      hitSlop={10}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* FORGOT PASSWORD */}
                <View style={styles.forgotContainer}>
                  <Pressable
                    onPress={() => {
                      // Password reset will be connected later.
                    }}
                    hitSlop={10}
                  >
                    <Text style={styles.forgotPassword}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </View>

                {/* ERROR */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* LOGIN BUTTON */}
                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleLogin}
                >
                  <Text style={styles.loginButtonText}>
                    Log in
                  </Text>
                </Pressable>

                {/* SECURITY MESSAGE */}
                <View style={styles.securityMessage}>
                  <Text style={styles.securityText}>
                    Your account is protected by SafeSync
                    security.
                  </Text>
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
   BRAND PANEL
========================================================= */

function BrandPanel() {
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brandContent}>

        {/* LOGO */}
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <View style={styles.logoShield}>
              <Text style={styles.logoPlus}>+</Text>
            </View>
          </View>

          <Text style={styles.logoText}>
            SafeSync
          </Text>
        </View>

        {/* MESSAGE */}
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

        {/* FOOTER */}
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

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  scrollContentMobile: {
    paddingVertical: 28,
  },

  /* BRAND PANEL */

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

  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  logoShield: {
    width: 21,
    height: 23,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  logoPlus: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "900",
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

  /* LOGIN PANEL */

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

  loginContainer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },

  /* MOBILE LOGO */

  mobileLogoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  mobileLogoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  mobileLogoShield: {
    width: 28,
    height: 31,
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileLogoPlus: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
  },

  mobileLogoText: {
    color: COLORS.black,
    fontSize: 21,
    fontWeight: "800",
  },

  /* HEADING */

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

  /* INPUTS */

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

  passwordToggle: {
    width: 58,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  passwordToggleText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  /* FORGOT PASSWORD */

  forgotContainer: {
    alignItems: "flex-end",
    marginTop: -4,
    marginBottom: 18,
  },

  forgotPassword: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  /* ERROR */

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

  /* LOGIN BUTTON */

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

  loginButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  /* SECURITY */

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
});