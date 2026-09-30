import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import { useAuth } from "../contexts/auth-context";

const OTP_LENGTH = 6;
// Supabase rate-limits OTP emails to one per minute per address.
const RESEND_COOLDOWN_SECONDS = 60;

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
  green: "#059669",
  greenLight: "#ECFDF5",
  redLight: "#FEF2F2",
  redText: "#B91C1C",
};

const emptyOtp = () => Array<string>(OTP_LENGTH).fill("");

export default function VerifyCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const email = typeof params.email === "string" ? params.email : "";
  // "signup" or "login": controls the resend call.
  const mode = params.mode === "signup" ? "signup" : "login";

  const { session } = useAuth();

  const [otp, setOtp] = useState<string[]>(emptyOtp);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const hasAutoSubmitted = useRef(false);
  const hasNavigated = useRef(false);

  const codeComplete = otp.every((digit) => digit !== "");

  /* ---------------------------------------------------------
     NAVIGATION AFTER SIGN IN
     "/home" is the real path of the first tab. "(tabs)" is a route
     group with no index screen, so "./(tabs)" matched nothing and
     left the user on an unmatched-route page. Responders don't have
     a Home tab; the tabs layout redirects them to their own screen.

     Navigation is driven by the session appearing, and also called
     directly after verifyOtp succeeds. The ref makes sure it only
     happens once.
  --------------------------------------------------------- */

  const goHome = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    Keyboard.dismiss();
    router.replace("/home");
  }, [router]);

  useEffect(() => {
    if (session) goHome();
  }, [session, goHome]);

  // Opened without an email (e.g. a stray deep link): nothing to verify.
  useEffect(() => {
    if (!email && !session) router.replace("/");
  }, []);

  /* ---------------------------------------------------------
     RESEND COOLDOWN
  --------------------------------------------------------- */

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  /* ---------------------------------------------------------
     OTP INPUT
  --------------------------------------------------------- */

  const resetCode = () => {
    setOtp(emptyOtp());
    hasAutoSubmitted.current = false;
    inputRefs.current[0]?.focus();
  };

  const setDigit = (index: number, digit: string) => {
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
  };

  const handleOtpChange = (text: string, index: number) => {
    setError("");
    const digits = text.replace(/\D/g, "");

    // Deleted the digit.
    if (digits.length === 0) {
      setDigit(index, "");
      return;
    }

    // Typed over a box that already had a digit: keep only the new one.
    if (digits.length === 2 && otp[index]) {
      const typed = digits[0] === otp[index] ? digits[1] : digits[0];
      setDigit(index, typed);
      if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
      return;
    }

    // Pasted or autofilled code (SMS / email suggestion).
    if (digits.length > 1) {
      const code = digits.slice(0, OTP_LENGTH);
      setOtp(Array.from({ length: OTP_LENGTH }, (_, i) => code[i] ?? ""));
      inputRefs.current[Math.min(code.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    // Single digit.
    setDigit(index, digits);
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigit(index - 1, "");
    }
  };

  /* ---------------------------------------------------------
     VERIFY
  --------------------------------------------------------- */

  const handleVerifyCode = async () => {
    if (verifying) return;

    const fullCode = otp.join("");

    if (fullCode.length < OTP_LENGTH) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError("");
    setNotice("");

    try {
      setVerifying(true);

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: fullCode,
        type: "email",
      });

      if (verifyError) throw verifyError;

      // The session is now stored by the Supabase client and the auth
      // context will pick it up; navigate right away.
      goHome();
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(
        err?.message ||
          "The code you entered is incorrect or has expired. Please try again."
      );
      resetCode();
    } finally {
      setVerifying(false);
    }
  };

  // Submit automatically as soon as all 6 digits are present.
  useEffect(() => {
    if (codeComplete && !verifying && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleVerifyCode();
    }
  }, [codeComplete]);

  /* ---------------------------------------------------------
     RESEND
  --------------------------------------------------------- */

  const handleResendCode = async () => {
    if (resending || cooldown > 0) return;

    setError("");
    setNotice("");

    try {
      setResending(true);

      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: mode === "signup" },
      });

      if (resendError) throw resendError;

      setNotice(`A new 6-digit code has been sent to ${email}.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      resetCode();
    } catch (err: any) {
      setError(
        err?.message || "Could not resend the code. Please try again later."
      );
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const resendDisabled = resending || cooldown > 0;

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
              onPress={handleBack}
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
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete={index === 0 ? "sms-otp" : "off"}
                  maxLength={OTP_LENGTH}
                  selectTextOnFocus
                  autoFocus={index === 0}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  editable={!verifying}
                />
              ))}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {notice ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleVerifyCode}
              disabled={!codeComplete || verifying}
              style={({ pressed }) => [
                styles.sendButton,
                !codeComplete && styles.sendButtonDisabled,
                pressed &&
                  codeComplete &&
                  !verifying &&
                  styles.sendButtonPressed,
              ]}
            >
              {verifying ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.sendButtonText}>VERIFYING...</Text>
                </>
              ) : (
                <>
                  <ShieldCheck
                    size={19}
                    color={COLORS.white}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.sendButtonText}>VERIFY & SIGN IN</Text>
                  <ArrowRight
                    size={18}
                    color={COLORS.white}
                    strokeWidth={2.4}
                  />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.resendContainer}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <Pressable
              onPress={handleResendCode}
              disabled={resendDisabled}
              style={[styles.resendButton, resendDisabled && styles.resendDim]}
            >
              <RotateCcw size={14} color={COLORS.primary} strokeWidth={2.2} />
              <Text style={styles.resendText}>
                {resending
                  ? "Resending..."
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend Code"}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: { height: 48, justifyContent: "center" },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  heroContainer: { alignItems: "center", marginTop: 24 },
  heroIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  titleContainer: { alignItems: "center", marginTop: 20, paddingHorizontal: 8 },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 9,
    fontSize: 12.5,
    lineHeight: 19,
    color: COLORS.muted,
    textAlign: "center",
    maxWidth: 350,
  },
  emailText: { fontWeight: "bold", color: COLORS.text },
  formCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    shadowColor: COLORS.slate900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.slate600,
    letterSpacing: 0.7,
    marginBottom: 12,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: COLORS.text,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  errorBox: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: COLORS.redLight,
  },
  errorText: { color: COLORS.redText, fontSize: 12, fontWeight: "600" },
  noticeBox: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: COLORS.greenLight,
  },
  noticeText: { color: COLORS.green, fontSize: 12, fontWeight: "600" },

  sendButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 9,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.slate300,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonPressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  sendButtonText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    gap: 6,
  },
  resendLabel: { fontSize: 12, color: COLORS.muted },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  resendDim: { opacity: 0.55 },
  resendText: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
});