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

type UserRole = "Client" | "Admin" | "Responder";

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;
  const isSmallPhone = width < 380;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole>("Client");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

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

    switch (selectedRole) {
      case "Client":
        router.replace("/(tabs)/home");
        break;
      case "Admin":
        router.replace("/admin");
        break;
      case "Responder":
        router.replace("/responder");
        break;
    }
  };

  const handleGoogleSignIn = () => {
    // Integrate Google Auth provider here (e.g., expo-auth-session / Supabase / Firebase)
    console.log("Initiating Google Sign-In...");
  };

  const handleSignUp = () => {
    router.push("/signup");
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

                    <Text style={styles.mobileLogoText}>SafeSync</Text>
                  </View>
                )}

                {/* HEADING */}
                <View style={styles.heading}>
                  <Text style={styles.welcomeTitle}>Welcome back</Text>

                  <Text style={styles.welcomeSubtitle}>
                    Sign in to your SafeSync account to continue.
                  </Text>
                </View>

                {/* EMAIL */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email address</Text>

                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "email" &&
                        styles.inputWrapperFocused,
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
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="next"
                      selectionColor={COLORS.primary}
                    />
                  </View>
                </View>

                {/* PASSWORD */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>

                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "password" &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Text style={styles.inputSymbol}>•</Text>

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
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      selectionColor={COLORS.primary}
                    />

                    <Pressable
                      style={styles.passwordToggle}
                      onPress={() =>
                        setShowPassword((value) => !value)
                      }
                      hitSlop={10}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* ROLE DROPDOWN */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sign in as</Text>

                  <Pressable
                    style={[
                      styles.roleSelector,
                      showRoleDropdown && styles.roleSelectorFocused,
                    ]}
                    onPress={() =>
                      setShowRoleDropdown((value) => !value)
                    }
                  >
                    <View style={styles.roleSelectorContent}>
                      <View style={styles.roleIcon}>
                        <Text style={styles.roleIconText}>
                          {selectedRole === "Client"
                            ? "C"
                            : selectedRole === "Admin"
                            ? "A"
                            : "R"}
                        </Text>
                      </View>

                      <Text style={styles.selectedRoleText}>
                        {selectedRole}
                      </Text>
                    </View>

                    <Text style={styles.dropdownArrow}>
                      {showRoleDropdown ? "▲" : "▼"}
                    </Text>
                  </Pressable>

                  {showRoleDropdown && (
                    <View style={styles.dropdownMenu}>
                      {(["Client", "Admin", "Responder"] as UserRole[]).map(
                        (role) => (
                          <Pressable
                            key={role}
                            style={[
                              styles.roleOption,
                              selectedRole === role &&
                                styles.selectedRoleOption,
                            ]}
                            onPress={() => {
                              setSelectedRole(role);
                              setShowRoleDropdown(false);
                              setError("");
                            }}
                          >
                            <View style={styles.roleOptionContent}>
                              <View style={styles.optionIcon}>
                                <Text style={styles.optionIconText}>
                                  {role === "Client"
                                    ? "C"
                                    : role === "Admin"
                                    ? "A"
                                    : "R"}
                                </Text>
                              </View>

                              <View>
                                <Text
                                  style={[
                                    styles.roleOptionText,
                                    selectedRole === role &&
                                      styles.selectedRoleOptionText,
                                  ]}
                                >
                                  {role}
                                </Text>

                                <Text style={styles.roleDescription}>
                                  {role === "Client"
                                    ? "Request and track emergency assistance"
                                    : role === "Admin"
                                    ? "Manage organizations and operations"
                                    : "Respond to emergency requests"}
                                </Text>
                              </View>
                            </View>

                            {selectedRole === role && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </Pressable>
                        )
                      )}
                    </View>
                  )}
                </View>

                {/* FORGOT PASSWORD */}
                <View style={styles.forgotContainer}>
                  <Pressable onPress={() => {}} hitSlop={10}>
                    <Text style={styles.forgotPassword}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </View>

                {/* ERROR */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
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
                  <Text style={styles.loginButtonText}>Log in</Text>
                </Pressable>

                {/* DIVIDER */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* GOOGLE SIGN IN BUTTON */}
                <Pressable
                  style={({ pressed }) => [
                    styles.googleButton,
                    pressed && styles.googleButtonPressed,
                  ]}
                  onPress={handleGoogleSignIn}
                >
                  <View style={styles.googleIconBadge}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>
                    Sign in with Google
                  </Text>
                </Pressable>

                {/* SIGN UP LINK */}
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpPrompt}>
                    Don't have an account?{" "}
                  </Text>
                  <Pressable onPress={handleSignUp} hitSlop={10}>
                    <Text style={styles.signUpLink}>Sign up</Text>
                  </Pressable>
                </View>

                {/* SECURITY MESSAGE */}
                <View style={styles.securityMessage}>
                  <Text style={styles.securityText}>
                    Your account is protected by SafeSync security.
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

  /* ROLE DROPDOWN */

  roleSelector: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },

  roleSelectorFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },

  roleSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  roleIconText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },

  selectedRoleText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: "600",
  },

  dropdownArrow: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  roleOption: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  selectedRoleOption: {
    backgroundColor: "#FEF2F2",
  },

  roleOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  optionIconText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
  },

  roleOptionText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
  },

  selectedRoleOptionText: {
    color: COLORS.primary,
  },

  roleDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },

  checkmark: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
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

  /* DIVIDER */

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 12,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  /* GOOGLE BUTTON */

  googleButton: {
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  googleButtonPressed: {
    backgroundColor: COLORS.background,
  },

  googleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  googleIconText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  googleButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },

  /* SIGN UP */

  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  signUpPrompt: {
    color: COLORS.muted,
    fontSize: 14,
  },

  signUpLink: {
    color: COLORS.primary,
    fontSize: 14,
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