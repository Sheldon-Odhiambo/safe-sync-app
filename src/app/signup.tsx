import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanName) {
      Alert.alert("Missing information", "Please enter your full name.");
      return;
    }

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      Alert.alert("Missing information", "Please enter a valid email address.");
      return;
    }

    if (!cleanPhone) {
      Alert.alert("Missing information", "Please enter your phone number.");
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        "Terms required",
        "Please agree to the Terms of Service and Privacy Policy."
      );
      return;
    }

    setLoading(true);

    try {
      // #2: if this email already has an account, send them to login instead
      // of creating a duplicate / silently re-sending a signup OTP.
      const { data: exists, error: checkError } = await supabase.rpc(
        "email_exists",
        { check_email: cleanEmail }
      );

      if (checkError) throw checkError;

      if (exists) {
        setLoading(false);
        Alert.alert(
          "Account already exists",
          "An account with this email already exists. Please sign in instead.",
          [
            {
              text: "Go to Sign In",
              onPress: () => router.replace("/"),
            },
          ]
        );
        return;
      }

      // #1: create the (passwordless) account and send the OTP. Full name
      // and phone ride along as user metadata; a DB trigger/function on
      // your side can copy them into core.user_profiles on first
      // verification, same as the org-registration flow.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (otpError) throw otpError;

      router.push({
        pathname: "/verify-code",
        params: { email: cleanEmail, mode: "signup" },
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert(
        "Something went wrong",
        error?.message || "Could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={21} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoBadge}>
                <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
              </View>

              <Text style={styles.logoText}>SafeSync</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* INTRODUCTION */}

          <View style={styles.introSection}>
            <Text style={styles.title}>Create your account</Text>

            <Text style={styles.subtitle}>
              Join SafeSync and get access to fast and reliable emergency
              assistance when you need it.
            </Text>
          </View>

          {/* FORM */}

          <View style={styles.formContainer}>
            {/* FULL NAME */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* EMAIL */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* PHONE */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone number</Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="+254 7XX XXX XXX"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* TERMS */}

            <TouchableOpacity
              style={styles.termsRow}
              activeOpacity={0.7}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxActive,
                ]}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                )}
              </View>

              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>

            {/* SIGN UP BUTTON */}

            <TouchableOpacity
              style={[
                styles.signupButton,
                loading && styles.signupButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.signupButtonText}>Sending code...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.signupButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* DIVIDER */}

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* SIGN IN */}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>

              <TouchableOpacity
                onPress={() => router.replace("/")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECURITY MESSAGE */}

          <View style={styles.securityBox}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color="#DC2626"
              />
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Your safety matters</Text>

              <Text style={styles.securityText}>
                Your information is securely handled and used to provide
                emergency assistance.
              </Text>
            </View>
          </View>

          {/* FOOTER */}

          <Text style={styles.footer}>© 2026 SafeSync. All rights reserved.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 35 },

  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  logoContainer: { flexDirection: "row", alignItems: "center" },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  logoText: { fontSize: 21, fontWeight: "800", color: "#0F172A" },
  headerSpacer: { width: 42 },

  introSection: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 22 },
  title: { fontSize: 30, fontWeight: "800", color: "#0F172A", marginBottom: 10 },
  subtitle: { fontSize: 15, lineHeight: 23, color: "#64748B" },

  formContainer: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  inputWrapper: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: "100%", fontSize: 15, color: "#0F172A", paddingVertical: 0 },

  termsRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 2, marginBottom: 22 },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  termsText: { flex: 1, fontSize: 12, lineHeight: 19, color: "#64748B" },
  termsLink: { color: "#DC2626", fontWeight: "700" },

  signupButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 10,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  signupButtonDisabled: { opacity: 0.65 },
  signupButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 25 },
  divider: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { fontSize: 11, fontWeight: "700", color: "#94A3B8", marginHorizontal: 14 },

  loginContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  loginText: { fontSize: 14, color: "#64748B", marginRight: 5 },
  loginLink: { fontSize: 14, fontWeight: "800", color: "#DC2626" },

  securityBox: {
    marginHorizontal: 24,
    marginTop: 28,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  securityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  securityContent: { flex: 1 },
  securityTitle: { fontSize: 13, fontWeight: "800", color: "#9F1239", marginBottom: 3 },
  securityText: { fontSize: 11, lineHeight: 17, color: "#881337" },

  footer: { textAlign: "center", fontSize: 10, color: "#94A3B8", marginTop: 25 },
});