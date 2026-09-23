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

const COLORS = {
  primary: "#E11D48",        // Rose 600 (SafeSync Red)
  primaryDark: "#BE123C",    // Rose 700
  primaryLight: "#FFF1F2",   // Rose 50
  slate900: "#0F172A",       // Enterprise Slate
  slate800: "#1E293B",
  slate700: "#334155",
  text: "#0F172A",
  muted: "#64748B",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  background: "#F8FAFC",
  cardBg: "#FFFFFF",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  green: "#059669",
  greenBg: "#ECFDF5",
  white: "#FFFFFF",
};

export type Role = "user" | "admin" | "driver" | "superadmin";

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;
  const isSmallPhone = width < 380;

  const [identifier, setIdentifier] = useState("kevin");
  const [password, setPassword] = useState("password123");
  const [selectedRole, setSelectedRole] = useState<Role>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"identifier" | "password" | null>(null);
  const [error, setError] = useState("");

  // ----------------------------------------
  // NAVIGATION ROUTER
  // ----------------------------------------
  const routeUser = (role: Role) => {
    setError("");
    switch (role) {
      // case "superadmin":
      //   router.replace("#");
      //   break;
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

  const handleQuickLogin = (role: Role) => {
    setSelectedRole(role);
    routeUser(role);
  };

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

    routeUser(selectedRole);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.page, isDesktop && styles.pageDesktop]}>

          {/* DESKTOP HERO BRAND PANEL */}
          {isDesktop && <BrandPanel />}

          {/* MAIN LOGIN FORM PANEL */}
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

                {/* MOBILE BRAND LOGO HEADER */}
                {!isDesktop && (
                  <View style={styles.mobileHeader}>
                    <View style={styles.logoBadge}>
                      <ShieldPlus size={22} color={COLORS.white} strokeWidth={2} />
                    </View>
                    <Text style={styles.logoTitle}>SafeSync</Text>
                    <Text style={styles.logoSubtitle}>
                      Rapid Emergency Response & Autonomous Fleet Telemetry
                    </Text>
                  </View>
                )}

                {/* HEADING (DESKTOP ONLY) */}
                {isDesktop && (
                  <View style={styles.desktopHeading}>
                    <Text style={styles.welcomeTitle}>Welcome back</Text>
                    <Text style={styles.welcomeSubtitle}>
                      Sign in to your SafeSync portal to coordinate dispatch and emergency assets.
                    </Text>
                  </View>
                )}

                {/* GOOGLE SIGN IN */}
                <Pressable
                  style={({ pressed }) => [
                    styles.googleButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => routeUser("user")}
                >
                  <View style={styles.googleGContainer}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </Pressable>

                {/* DIVIDER */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR SIGN IN WITH PASSWORD</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* ONE-CLICK INSTANT DEMO PERSONAS */}
                <View style={styles.demoBox}>
                  <Text style={styles.demoTitle}>
                    ONE-CLICK INSTANT ACCESS (DEMO PERSONAS)
                  </Text>

                  <View style={styles.demoGrid}>
                    {/* SUPER ADMIN (HQ) */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.roleCard,
                        styles.superAdminCard,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => handleQuickLogin("superadmin")}
                    >
                      <ShieldAlert size={16} color="#FB7185" strokeWidth={2.2} />
                      <Text style={[styles.roleCardText, { color: COLORS.white }]}>
                        Super Admin
                      </Text>
                    </Pressable>

                    {/* BRANCH ADMIN */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.roleCard,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => handleQuickLogin("admin")}
                    >
                      <Building2 size={16} color={COLORS.amber} strokeWidth={2.2} />
                      <Text style={styles.roleCardText}>Branch Admin</Text>
                    </Pressable>

                    {/* RESPONDER */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.roleCard,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => handleQuickLogin("driver")}
                    >
                      <Ambulance size={16} color={COLORS.green} strokeWidth={2.2} />
                      <Text style={styles.roleCardText}>Responder</Text>
                    </Pressable>

                    {/* CLIENT */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.roleCard,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => handleQuickLogin("user")}
                    >
                      <User size={16} color={COLORS.primary} strokeWidth={2.2} />
                      <Text style={styles.roleCardText}>Client</Text>
                    </Pressable>
                  </View>
                </View>

                {/* ACCOUNT IDENTIFIER */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Account Identifier</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "identifier" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Mail size={18} color={COLORS.muted} strokeWidth={1.8} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={identifier}
                      onChangeText={(val) => {
                        setIdentifier(val);
                        setError("");
                      }}
                      placeholder="Username or registered phone"
                      placeholderTextColor={COLORS.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setFocusedField("identifier")}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* PASSWORD */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <Pressable onPress={() => router.push("/forgot-password")}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </Pressable>
                  </View>

                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "password" && styles.inputWrapperFocused,
                    ]}
                  >
                    <LockKeyhole size={18} color={COLORS.muted} strokeWidth={1.8} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        setError("");
                      }}
                      placeholder="••••••••"
                      placeholderTextColor={COLORS.placeholder}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={handlePasswordSignIn}
                      returnKeyType="done"
                    />
                    <Pressable
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={10}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={COLORS.muted} />
                      ) : (
                        <Eye size={18} color={COLORS.muted} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* PORTAL ROLE PILL SELECTOR */}
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
                          style={[styles.pill, isActive && styles.pillActive]}
                        >
                          <Text
                            style={[styles.pillText, isActive && styles.pillTextActive]}
                            numberOfLines={1}
                          >
                            {r.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* ERROR BOX */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* SUBMIT BUTTON */}
                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.loginButtonPressed,
                  ]}
                  onPress={handlePasswordSignIn}
                >
                  <Text style={styles.loginButtonText}>Sign In with Password</Text>
                  <ArrowRight size={18} color={COLORS.white} strokeWidth={2.5} />
                </Pressable>

                {/* SIGN UP FOOTER */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Don't have an account yet? </Text>
                  <Pressable onPress={() => router.push("/signup")}>
                    <Text style={styles.signUpLink}>Sign Up</Text>
                  </Pressable>
                </View>

                {/* SECURITY NOTICE */}
                <View style={styles.securityMessage}>
                  <Text style={styles.securityText}>
                    Protected by SafeSync End-to-End Enterprise Encryption.
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
   DESKTOP BRAND PANEL
========================================================= */
function BrandPanel() {
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brandContent}>
        {/* LOGO */}
        <View style={styles.brandLogoRow}>
          <View style={styles.brandLogoBox}>
            <ShieldPlus size={22} color={COLORS.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.brandLogoText}>SafeSync</Text>
        </View>

        {/* HERO MESSAGE */}
        <View style={styles.brandCenterMessage}>
          <Text style={styles.brandHeroTagline}>
            Every second you{"\n"}save is a life you{"\n"}can protect.
          </Text>
          <Text style={styles.brandHeroSubtitle}>
            Rapid emergency response coordination designed to connect citizens,
            paramedics, hospital trauma teams, and enterprise fleets in real time.
          </Text>
        </View>

        {/* COPYRIGHT */}
        <Text style={styles.brandCopyright}>
          © 2026 SafeSync Technologies Ltd. All rights reserved.
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
    backgroundColor: COLORS.background,
  },
  keyboard: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pageDesktop: {
    flexDirection: "row",
  },

  /* BRAND PANEL (TABLET / DESKTOP) */
  brandPanel: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 56,
  },
  brandContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  brandLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  brandLogoText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandCenterMessage: {
    marginVertical: "auto",
  },
  brandHeroTagline: {
    color: COLORS.white,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -1,
  },
  brandHeroSubtitle: {
    maxWidth: 420,
    marginTop: 18,
    color: COLORS.white,
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 22,
  },
  brandCopyright: {
    color: COLORS.white,
    opacity: 0.75,
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  loginPanelSmallPhone: {
    paddingHorizontal: 12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  scrollContentMobile: {
    paddingVertical: 12,
  },
  loginContainer: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  /* MOBILE BRAND LOGO HEADER */
  mobileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 290,
  },

  /* DESKTOP HEADING */
  desktopHeading: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
  },

  /* GOOGLE BUTTON */
  googleButton: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonPressed: {
    backgroundColor: COLORS.background,
    opacity: 0.9,
  },
  googleGContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  googleG: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  googleButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  /* DIVIDER */
  divider: {
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
    color: COLORS.placeholder,
    letterSpacing: 0.5,
  },

  /* ONE-CLICK DEMO PERSONAS */
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
    minHeight: 56,
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

  /* INPUTS */
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
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: COLORS.text,
    fontSize: 13,
  },
  passwordToggle: {
    padding: 6,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  /* ROLE PILLS */
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

  /* ERROR */
  errorBox: {
    backgroundColor: COLORS.primaryLight,
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

  /* LOGIN BUTTON */
  loginButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  /* FOOTER */
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

  /* SECURITY */
  securityMessage: {
    alignItems: "center",
    marginTop: 14,
  },
  securityText: {
    color: COLORS.placeholder,
    fontSize: 10,
    textAlign: "center",
  },
});