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
  inputBackground: "#FFFFFF",
  background: "#F8FAFC",
};

const DEMO_ACCOUNTS = [
  {
    role: "Client",
    email: "wanjiru@example.com",
  },
  {
    role: "Driver",
    email: "amwangi@safesync.co.ke",
  },
  {
    role: "Super admin",
    email: "admin@safesync.co.ke",
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; // Screen breakpoint for side-by-side view

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    router.replace("/home");
  };

  const handleDemoAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword("password");
    setError("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.page, isDesktop && styles.pageDesktop]}>
          {/* BRAND PANEL: Render only on Desktop / Wide screens */}
          {isDesktop && <BrandPanel />}

          {/* LOGIN PANEL */}
          <View style={styles.loginPanel}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.loginContainer}>
                <View style={styles.heading}>
                  <Text style={styles.welcomeTitle}>Welcome back</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Clients, drivers and administrators sign in here.
                  </Text>
                </View>

                {/* EMAIL */}
                <InputField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* PASSWORD */}
                <View style={styles.passwordWrapper}>
                  <InputField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                  />

                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword((value) => !value)}
                  >
                    <Text style={styles.passwordToggleText}>
                      {showPassword ? "Hide" : "Show"}
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
                <Divider />

                {/* DEMO ACCOUNTS */}
                <View style={styles.demoSection}>
                  <View style={styles.demoList}>
                    {DEMO_ACCOUNTS.map((account) => (
                      <DemoAccount
                        key={account.email}
                        role={account.role}
                        email={account.email}
                        onPress={() => handleDemoAccount(account.email)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* BRAND PANEL */
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
          <Text style={styles.logoText}>SafeSync</Text>
        </View>

        {/* MESSAGE */}
        <View style={styles.brandMessage}>
          <Text style={styles.brandTitle}>
            Every second you{"\n"}
            save is a life you{"\n"}
            might keep.
          </Text>

          <Text style={styles.brandDescription}>
            12,480 verified responders across 184 cities, coordinated in real
            time.
          </Text>
        </View>

        {/* FOOTER */}
        <Text style={styles.copyright}>© 2026 SafeSync</Text>
      </View>
    </View>
  );
}

/* INPUT FIELD */
type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: InputFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

/* DEMO ACCOUNT */
type DemoAccountProps = {
  role: string;
  email: string;
  onPress: () => void;
};

function DemoAccount({ role, email, onPress }: DemoAccountProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.demoAccount,
        pressed && styles.demoAccountPressed,
      ]}
    >
      <Text style={styles.demoRole}>{role}</Text>
      <Text style={styles.demoEmail}>{email}</Text>
    </Pressable>
  );
}

/* DIVIDER */
function Divider() {
  return (
    <View style={styles.dividerContainer}>
      <View style={styles.divider} />
      <Text style={styles.dividerText}>demo accounts</Text>
      <View style={styles.divider} />
    </View>
  );
}

/* STYLES */
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

  /* BRAND PANEL */
  brandPanel: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 48,
    justifyContent: "space-between",
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  logoShield: {
    width: 20,
    height: 22,
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
    fontSize: 20,
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
    paddingHorizontal: 32,
    paddingVertical: 40,
  },

  loginContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },

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
  },

  /* INPUTS */
  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    marginBottom: 8,
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "600",
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: COLORS.black,
    backgroundColor: COLORS.inputBackground,
    fontSize: 14,
  },

  passwordWrapper: {
    position: "relative",
  },

  passwordToggle: {
    position: "absolute",
    right: 14,
    top: 38,
  },

  passwordToggleText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  /* ERROR */
  errorBox: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },

  /* LOGIN BUTTON */
  loginButton: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginTop: 8,
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
    marginVertical: 24,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 12,
    color: COLORS.placeholder,
    fontSize: 12,
  },

  /* DEMO SECTION */
  demoSection: {
    marginTop: 0,
  },

  demoList: {
    gap: 10,
  },

  demoAccount: {
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  demoAccountPressed: {
    backgroundColor: "#F8FAFC",
  },

  demoRole: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
  },

  demoEmail: {
    color: COLORS.muted,
    fontSize: 13,
  },
});