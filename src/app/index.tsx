import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  Ambulance,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldPlus,
  User,
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
  primary: "#E11D48",
  primaryDark: "#BE123C",
  white: "#FFFFFF",
  black: "#0F172A",
  text: "#1E293B",
  muted: "#64748B",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  background: "#F8FAFC",
  lightRed: "#FFF1F2",
  green: "#059669",
  amber: "#D97706",
};

type Role = "user" | "admin" | "driver";

export default function SignInScreen() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------
  // DEMO LOGIN / NAVIGATION
  // ----------------------------------------
  const handleSignIn = (role: Role = "user") => {
    setError("");

    switch (role) {
      case "admin":
        router.replace("/admin");
        break;

      case "driver":
        router.replace("/responder");
        break;

      case "user":
      default:
        router.replace("/(tabs)/home");
        break;
    }
  };

  // ----------------------------------------
  // PASSWORD LOGIN
  // ----------------------------------------
  const handlePasswordSignIn = () => {
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your phone number or username.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    // Demo login for now.
    // Real authentication can be connected later.
    handleSignIn("user");
  };

  // ----------------------------------------
  // FORGOT PASSWORD
  // ----------------------------------------
  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  // ----------------------------------------
  // SIGN UP
  // ----------------------------------------
  const handleSignUp = () => {
    router.push("/signup");
  };

  // ----------------------------------------
  // GOOGLE LOGIN
  // ----------------------------------------
  const handleGoogleSignIn = () => {
    // Temporary demo action.
    // Real Google authentication can be connected later.
    handleSignIn("user");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            {/* ================================
                HEADER
            ================================= */}

            <View style={styles.header}>
              <View style={styles.logoBox}>
                <ShieldPlus
                  size={25}
                  color={COLORS.white}
                  strokeWidth={1.8}
                />
              </View>

              <Text style={styles.logoText}>
                SafeSync
              </Text>

              <Text style={styles.subtitle}>
                Rapid Emergency Response & Autonomous Fleet Telemetry
              </Text>
            </View>

            {/* ================================
                GOOGLE SIGN IN
            ================================= */}

            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.googleButtonPressed,
              ]}
              onPress={handleGoogleSignIn}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>
                  G
                </Text>
              </View>

              <Text style={styles.googleText}>
                Continue with Google
              </Text>
            </Pressable>

            {/* ================================
                DIVIDER
            ================================= */}

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />

              <Text style={styles.dividerText}>
                OR SIGN IN WITH PASSWORD
              </Text>

              <View style={styles.dividerLine} />
            </View>

            {/* ================================
                DEMO PERSONA SWITCHER
            ================================= */}

            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>
                ONE-CLICK INSTANT ACCESS (DEMO)
              </Text>

              <View style={styles.roleRow}>

                {/* CLIENT */}

                <Pressable
                  style={({ pressed }) => [
                    styles.roleButton,
                    pressed && styles.roleButtonPressed,
                  ]}
                  onPress={() => handleSignIn("user")}
                >
                  <User
                    size={18}
                    color={COLORS.primary}
                    strokeWidth={1.8}
                  />

                  <Text style={styles.roleText}>
                    Client
                  </Text>
                </Pressable>

                {/* ADMIN */}

                <Pressable
                  style={({ pressed }) => [
                    styles.roleButton,
                    pressed && styles.roleButtonPressed,
                  ]}
                  onPress={() => handleSignIn("admin")}
                >
                  <Building2
                    size={18}
                    color={COLORS.amber}
                    strokeWidth={1.8}
                  />

                  <Text style={styles.roleText}>
                    Admin
                  </Text>
                </Pressable>

                {/* RESPONDER */}

                <Pressable
                  style={({ pressed }) => [
                    styles.roleButton,
                    pressed && styles.roleButtonPressed,
                  ]}
                  onPress={() => handleSignIn("driver")}
                >
                  <Ambulance
                    size={18}
                    color={COLORS.green}
                    strokeWidth={1.8}
                  />

                  <Text style={styles.roleText}>
                    Responder
                  </Text>
                </Pressable>

              </View>
            </View>

            {/* ================================
                ACCOUNT IDENTIFIER
            ================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Account Identifier
              </Text>

              <View style={styles.inputWrapper}>
                <Mail
                  size={19}
                  color={COLORS.muted}
                  strokeWidth={1.8}
                />

                <TextInput
                  value={identifier}
                  onChangeText={(value) => {
                    setIdentifier(value);
                    setError("");
                  }}
                  placeholder="Phone or username"
                  placeholderTextColor={COLORS.placeholder}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                />
              </View>
            </View>

            {/* ================================
                PASSWORD
            ================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Password
              </Text>

              <View style={styles.inputWrapper}>
                <LockKeyhole
                  size={19}
                  color={COLORS.muted}
                  strokeWidth={1.8}
                />

                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.placeholder}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handlePasswordSignIn}
                  returnKeyType="done"
                />

                <Pressable
                  onPress={() =>
                    setShowPassword((current) => !current)
                  }
                  hitSlop={10}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff
                      size={19}
                      color={COLORS.muted}
                    />
                  ) : (
                    <Eye
                      size={19}
                      color={COLORS.muted}
                    />
                  )}
                </Pressable>
              </View>
            </View>

            {/* ================================
                FORGOT PASSWORD
            ================================= */}

            <View style={styles.forgotRow}>
              <Pressable
                onPress={handleForgotPassword}
                hitSlop={10}
              >
                <Text style={styles.forgotText}>
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            {/* ================================
                ERROR MESSAGE
            ================================= */}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* ================================
                MAIN SIGN IN BUTTON
            ================================= */}

            <Pressable
              onPress={handlePasswordSignIn}
              style={({ pressed }) => ({
                width: "100%",
                height: 54,
                borderRadius: 13,
                backgroundColor: pressed
                  ? COLORS.primaryDark
                  : COLORS.primary,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginTop: 5,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={styles.mainSignInText}>
                SIGN IN
              </Text>

              <ArrowRight
                size={20}
                color={COLORS.white}
                strokeWidth={2.5}
              />
            </Pressable>

            {/* ================================
                SIGN UP
            ================================= */}

            <Pressable
              onPress={handleSignUp}
              style={styles.signUpButton}
            >
              <Text style={styles.signUpText}>
                Don't have an account yet?{" "}
                <Text style={styles.signUpLink}>
                  Sign Up
                </Text>
              </Text>
            </Pressable>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ========================================
  // SCREEN
  // ========================================

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboard: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ========================================
  // HEADER
  // ========================================

  header: {
    alignItems: "center",
    marginBottom: 22,
  },

  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  logoText: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.black,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    textAlign: "center",
    maxWidth: 310,
  },

  // ========================================
  // GOOGLE
  // ========================================

  googleButton: {
    height: 48,
    borderRadius: 13,
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

  googleIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  googleG: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  googleText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  // ========================================
  // DIVIDER
  // ========================================

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 19,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 9,
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
  },

  // ========================================
  // DEMO ROLES
  // ========================================

  demoBox: {
    padding: 12,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  demoTitle: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 9,
  },

  roleRow: {
    flexDirection: "row",
    gap: 8,
  },

  roleButton: {
    flex: 1,
    minHeight: 65,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  roleButtonPressed: {
    backgroundColor: "#F8FAFC",
    transform: [{ scale: 0.98 }],
  },

  roleText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  // ========================================
  // INPUTS
  // ========================================

  inputGroup: {
    marginBottom: 15,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 7,
  },

  inputWrapper: {
    minHeight: 49,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    minHeight: 47,
    marginLeft: 9,
    color: COLORS.black,
    fontSize: 13,
  },

  eyeButton: {
    padding: 5,
  },

  // ========================================
  // FORGOT PASSWORD
  // ========================================

  forgotRow: {
    alignItems: "flex-end",
    marginTop: -4,
    marginBottom: 14,
  },

  forgotText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  // ========================================
  // ERROR
  // ========================================

  errorBox: {
    backgroundColor: COLORS.lightRed,
    borderRadius: 11,
    padding: 10,
    marginBottom: 13,
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "700",
  },

  // ========================================
  // MAIN SIGN IN BUTTON
  // ========================================

  mainSignInText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // ========================================
  // SIGN UP
  // ========================================

  signUpButton: {
    alignItems: "center",
    marginTop: 20,
  },

  signUpText: {
    color: COLORS.muted,
    fontSize: 11,
  },

  signUpLink: {
    color: COLORS.primary,
    fontWeight: "900",
  },
});