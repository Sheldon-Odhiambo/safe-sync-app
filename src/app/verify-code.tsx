import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  RotateCcw,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";

const COLORS = {
  primary: "#E11D48",
  primaryDark: "#BE123C",
  primaryLight: "#FFF1F2",
  background: "#F8FAFC",
  card: "#FFFFFF",
  white: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  slate900: "#0F172A",
  slate600: "#475569",
  slate300: "#CBD5E1",
  slate200: "#E2E8F0",
};

export default function VerifyCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";
  // "signup" or "login" — controls the resend call and copy shown.
  const mode = (params.mode as string) === "signup" ? "signup" : "login";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const hasAutoSubmitted = useRef(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      const code = text.replace(/[^0-9]/g, "").slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = code[i] || "";
      }
      setOtp(newOtp);
      const nextIndex = Math.min(code.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const codeComplete = otp.every((digit) => digit !== "");

  const handleVerifyCode = async () => {
    const fullCode = otp.join("");

    if (fullCode.length < 6) {
      Alert.alert(
        "Incomplete Code",
        "Please enter the complete 6-digit verification code."
      );
      return;
    }

    try {
      setVerifying(true);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: fullCode,
        type: "email",
      });

      if (error) throw error;

      // A session now exists and is persisted by the Supabase client.
      // The root layout's auth guard will pick this up, but we replace
      // explicitly here too so the transition feels immediate. #3/#4.
      router.replace("./(tabs)");
    } catch (error: any) {
      console.error("Verification error:", error);
      // Let them try again on a fresh code.
      hasAutoSubmitted.current = false;
      Alert.alert(
        "Invalid Code",
        error?.message ||
          "The code you entered is incorrect or has expired. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  // #3: on the login flow (and just as usefully on signup), submit
  // automatically the instant all 6 digits are present instead of making
  // the person tap a button.
  useEffect(() => {
    if (codeComplete && !verifying && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleVerifyCode();
    }
  }, [codeComplete]);

  const handleResendCode = async () => {
    try {
      setResending(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: mode === "signup" },
      });

      if (error) throw error;

      Alert.alert("Code Resent", `A new 6-digit code has been sent to ${email}.`);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Could not resend code. Please try again later."
      );
    } finally {
      setResending(false);
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
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <ArrowLeft size={21} color={COLORS.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.heroContainer}>
            <View style={styles.heroIconOuter}>
              <View style={styles.heroIcon}>
                <KeyRound size={31} color={COLORS.primary} strokeWidth={2} />
              </View>
            </View>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to{" "}
              <Text style={styles.emailText}>{email}</Text>. It'll verify
              automatically once you've entered it.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>6-DIGIT CODE</Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  editable={!verifying}
                />
              ))}
            </View>

            <Pressable
              onPress={handleVerifyCode}
              disabled={!codeComplete || verifying}
              style={({ pressed }) => [
                styles.sendButton,
                !codeComplete && styles.sendButtonDisabled,
                pressed && codeComplete && !verifying && styles.sendButtonPressed,
              ]}
            >
              {verifying ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.sendButtonText}>VERIFYING...</Text>
                </>
              ) : (
                <>
                  <ShieldCheck size={19} color={COLORS.white} strokeWidth={2.2} />
                  <Text style={styles.sendButtonText}>VERIFY & SIGN IN</Text>
                  <ArrowRight size={18} color={COLORS.white} strokeWidth={2.4} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.resendContainer}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <Pressable
              onPress={handleResendCode}
              disabled={resending}
              style={styles.resendButton}
            >
              <RotateCcw size={14} color={COLORS.primary} strokeWidth={2.2} />
              <Text style={styles.resendText}>
                {resending ? "Resending..." : "Resend Code"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  header: { height: 48, justifyContent: "center" },
  backButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.slate200, alignItems: "center", justifyContent: "center",
  },
  backButtonPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  heroContainer: { alignItems: "center", marginTop: 24 },
  heroIconOuter: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.white,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FECDD3",
  },
  titleContainer: { alignItems: "center", marginTop: 20, paddingHorizontal: 8 },
  title: {
    fontSize: 26, lineHeight: 32, fontWeight: "900", color: COLORS.text,
    textAlign: "center", letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 9, fontSize: 12.5, lineHeight: 19, color: COLORS.muted,
    textAlign: "center", maxWidth: 350,
  },
  emailText: { fontWeight: "bold", color: COLORS.text },
  formCard: {
    marginTop: 24, padding: 16, borderRadius: 18, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.slate200,
    shadowColor: COLORS.slate900, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  inputLabel: { fontSize: 9, fontWeight: "900", color: COLORS.slate600, letterSpacing: 0.7, marginBottom: 12 },
  otpContainer: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 20 },
  otpBox: {
    flex: 1, height: 56, borderRadius: 12, backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.slate200, fontSize: 20, fontWeight: "bold",
    textAlign: "center", color: COLORS.text,
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  sendButton: {
    minHeight: 54, borderRadius: 14, backgroundColor: COLORS.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 14, gap: 9,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 7, elevation: 4,
  },
  sendButtonDisabled: { backgroundColor: COLORS.slate300, shadowOpacity: 0, elevation: 0 },
  sendButtonPressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  sendButtonText: {
    flex: 1, color: COLORS.white, fontSize: 11.5, fontWeight: "900",
    letterSpacing: 0.3, textAlign: "center",
  },
  resendContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 25, gap: 6 },
  resendLabel: { fontSize: 12, color: COLORS.muted },
  resendButton: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  resendText: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
});