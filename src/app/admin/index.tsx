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
  ShieldAlert,
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
  primary: "#E11D48", // Rose 600
  primaryDark: "#BE123C",
  white: "#FFFFFF",
  slate900: "#0F172A",
  slate800: "#1E293B",
  slate700: "#334155",
  text: "#0F172A",
  muted: "#64748B",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  background: "#F8FAFC",
  lightRose: "#FFF1F2",
  green: "#059669",
  greenLight: "#ECFDF5",
  amber: "#D97706",
  amberLight: "#FFFBEB",
};

export type Role = "user" | "admin" | "driver" | "superadmin";

export default function SignInScreen() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("kevin");
  const [password, setPassword] = useState("password123");
  const [selectedRole, setSelectedRole] = useState<Role>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------
  // ROUTE DISPATCHER
  // ----------------------------------------
  const navigateByRole = (role: Role) => {
    setError("");
    switch (role) {
      case "superadmin":
        router.replace("/");
        break;
      case "admin":
        router.replace("/admin");
        break;
      case "driver":
        router.replace("/responder");
        break;
      case "user":
      default:
        router.replace("/home");
        break;
    }
  };

  // ----------------------------------------
  // ONE-CLICK INSTANT DEMO LOGIN
  // ----------------------------------------
  const handleQuickLogin = (role: Role) => {
    setSelectedRole(role);
    navigateByRole(role);
  };

  // ----------------------------------------
  // PASSWORD SIGN IN
  // ----------------------------------------
  const handlePasswordSignIn = () => {
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your account identifier.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    navigateByRole(selectedRole);
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
                <ShieldPlus size={24} color={COLORS.white} strokeWidth={2} />
              </View>

              <Text style={styles.logoTitle}>SafeSync</Text>

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
              onPress={() => navigateByRole("user")}
            >
              <View style={styles.googleIconBadge}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleText}>Sign in with Google</Text>
            </Pressable>

            {/* ================================
                DIVIDER
            ================================= */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN IN WITH PASSWORD</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ================================
                ONE-CLICK DEMO PERSONAS
            ================================= */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>
                ONE-CLICK INSTANT ACCESS (DEMO PERSONAS)
              </Text>

              <View style={styles.demoGrid}>
                {/* 1. SUPER ADMIN (HQ) */}
                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    styles.superAdminCard,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleQuickLogin("superadmin")}
                >
                  <ShieldAlert size={16} color="#FB7185" strokeWidth={2} />
                  <Text style={[styles.roleCardText, { color: COLORS.white }]}>
                    Super Admin
                  </Text>
                </Pressable>

                {/* 2. BRANCH ADMIN */}
                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleQuickLogin("admin")}
                >
                  <Building2 size={16} color={COLORS.amber} strokeWidth={2} />
                  <Text style={styles.roleCardText}>Branch Admin</Text>
                </Pressable>

                {/* 3. RESPONDER */}
                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleQuickLogin("driver")}
                >
                  <Ambulance size={16} color={COLORS.green} strokeWidth={2} />
                  <Text style={styles.roleCardText}>Responder</Text>
                </Pressable>

                {/* 4. CLIENT */}
                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleQuickLogin("user")}
                >
                  <User size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={styles.roleCardText}>Client</Text>
                </Pressable>
              </View>
            </View>

            {/* ================================
                IDENTIFIER INPUT
            ================================= */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Identifier</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={COLORS.muted} strokeWidth={1.8} />
                <TextInput
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    setError("");
                  }}
                  placeholder="Username or registered phone"
                  placeholderTextColor={COLORS.placeholder}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* ================================
                PASSWORD INPUT
            ================================= */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <Pressable onPress={() => router.push("/forgot-password")}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              <View style={styles.inputWrapper}>
                <LockKeyhole size={18} color={COLORS.muted} strokeWidth={1.8} />
                <TextInput
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
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
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={COLORS.muted} />
                  ) : (
                    <Eye size={18} color={COLORS.muted} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* ================================
                PORTAL ROLE PILL SELECTOR
            ================================= */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Portal Role</Text>
              <View style={styles.pillRow}>
                {(
                  [
                    { id: "superadmin", label: "Super Admin" },
                    { id: "admin", label: "Branch Admin" },
                    { id: "driver", label: "Responder" },
                    { id: "user", label: "Client" },
                  ] as const
                ).map((r) => {
                  const isActive = selectedRole === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedRole(r.id)}
                      style={[
                        styles.pill,
                        isActive && styles.pillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isActive && styles.pillTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ================================
                ERROR MESSAGE
            ================================= */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ================================
                SUBMIT BUTTON
            ================================= */}
            <Pressable
              onPress={handlePasswordSignIn}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
              ]}
            >
              <Text style={styles.submitButtonText}>Sign In with Password</Text>
              <ArrowRight size={18} color={COLORS.white} strokeWidth={2.5} />
            </Pressable>

            {/* ================================
                SIGN UP LINK
            ================================= */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account yet? </Text>
              <Pressable onPress={() => router.push("/signup")}>
                <Text style={styles.signUpLink}>Sign Up</Text>
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
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },

  // Google Button
  googleButton: {
    height: 46,
    borderRadius: 12,
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
  googleG: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },
  googleText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.muted,
    letterSpacing: 0.5,
  },

  // One-Click Demo Personas
  demoBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  demoTitle: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  demoGrid: {
    flexDirection: "row",
    gap: 6,
  },
  roleCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    gap: 4,
  },
  superAdminCard: {
    backgroundColor: COLORS.slate900,
    borderColor: COLORS.slate700,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  roleCardText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  // Inputs
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  inputWrapper: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 13,
  },
  eyeButton: {
    padding: 4,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  // Role Pills
  pillRow: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: COLORS.slate900,
    borderColor: COLORS.slate900,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },
  pillTextActive: {
    color: COLORS.white,
  },

  // Error
  errorBox: {
    backgroundColor: COLORS.lightRose,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  // Submit
  submitButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitButtonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  // Footer
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  signUpLink: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
  },
});