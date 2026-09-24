import React, { useState } from "react";
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
import { useRouter } from "expo-router";

import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  LockKeyhole,
  ArrowRight,
  CircleCheck,
  KeyRound,
} from "lucide-react-native";

/* =========================================================
   COLORS
========================================================= */

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
  slate800: "#1E293B",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate300: "#CBD5E1",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",

  success: "#059669",
  successLight: "#ECFDF5",

  dangerLight: "#FEF2F2",
};

/* =========================================================
   SCREEN
========================================================= */

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const emailIsValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  /* =======================================================
     SEND CODE
  ======================================================= */

  const handleSendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        "Email required",
        "Please enter the email address associated with your SafeSync account."
      );
      return;
    }

    if (!emailIsValid) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid email address."
      );
      return;
    }

    try {
      setSending(true);

      /*
       * -----------------------------------------------------
       * TODO: CONNECT YOUR SUPABASE OTP IMPLEMENTATION HERE
       * -----------------------------------------------------
       *
       * This screen is prepared for a 6-digit email
       * verification code.
       *
       * Example future flow:
       *
       * await supabase.auth.signInWithOtp({
       *   email: cleanEmail,
       * });
       *
       * However, for a password-reset OTP flow you should
       * use the appropriate Supabase Auth / Edge Function
       * implementation rather than treating a normal
       * sign-in OTP as a password-reset code.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      /*
       * Move to the verification screen.
       *
       * The email is passed so the next screen knows
       * which account is being verified.
       */

    //   router.push({
    //     pathname: "/verify-code",
    //     params: {
    //       email: cleanEmail,
    //     },
    //   });
    } catch (error) {
      console.error("Forgot password error:", error);

      Alert.alert(
        "Unable to send code",
        "Something went wrong while trying to send your verification code. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <ArrowLeft
                size={21}
                color={COLORS.text}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          {/* =================================================
              ICON
          ================================================= */}

          <View style={styles.heroContainer}>
            <View style={styles.heroIconOuter}>
              <View style={styles.heroIcon}>
                <LockKeyhole
                  size={31}
                  color={COLORS.primary}
                  strokeWidth={2}
                />
              </View>
            </View>
          </View>

          {/* =================================================
              TITLE
          ================================================= */}

          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              Forgot your password?
            </Text>

            <Text style={styles.subtitle}>
              No worries. Enter the email address linked
              to your SafeSync account and we'll send you
              a 6-digit verification code.
            </Text>
          </View>

          {/* =================================================
              SECURITY CARD
          ================================================= */}

          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <ShieldCheck
                size={19}
                color={COLORS.success}
                strokeWidth={2.2}
              />
            </View>

            <View style={styles.securityText}>
              <Text style={styles.securityTitle}>
                Secure password recovery
              </Text>

              <Text style={styles.securitySubtitle}>
                Your verification code helps us confirm
                that it's really you.
              </Text>
            </View>
          </View>

          {/* =================================================
              FORM
          ================================================= */}

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>
              EMAIL ADDRESS
            </Text>

            <View
              style={[
                styles.inputContainer,
                email.length > 0 &&
                  !emailIsValid &&
                  styles.inputContainerError,
                emailIsValid &&
                  styles.inputContainerValid,
              ]}
            >
              <Mail
                size={19}
                color={
                  emailIsValid
                    ? COLORS.success
                    : COLORS.muted
                }
                strokeWidth={2}
              />

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.slate400}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="done"
                style={styles.input}
                editable={!sending}
                onSubmitEditing={() => {
                  if (emailIsValid) {
                    handleSendCode();
                  }
                }}
              />

              {emailIsValid && (
                <CircleCheck
                  size={19}
                  color={COLORS.success}
                  strokeWidth={2.2}
                />
              )}
            </View>

            {email.length > 0 && !emailIsValid && (
              <Text style={styles.errorText}>
                Please enter a valid email address.
              </Text>
            )}

            {/* =================================================
                SEND BUTTON
            ================================================= */}

            <Pressable
              onPress={handleSendCode}
              disabled={sending}
              style={({ pressed }) => [
                styles.sendButton,
                !emailIsValid &&
                  styles.sendButtonDisabled,
                pressed &&
                  emailIsValid &&
                  !sending &&
                  styles.sendButtonPressed,
              ]}
            >
              {sending ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.white}
                  />

                  <Text style={styles.sendButtonText}>
                    SENDING CODE...
                  </Text>
                </>
              ) : (
                <>
                  <KeyRound
                    size={19}
                    color={COLORS.white}
                    strokeWidth={2.2}
                  />

                  <Text style={styles.sendButtonText}>
                    SEND 6-DIGIT CODE
                  </Text>

                  <ArrowRight
                    size={18}
                    color={COLORS.white}
                    strokeWidth={2.4}
                  />
                </>
              )}
            </Pressable>
          </View>

          {/* =================================================
              INFORMATION
          ================================================= */}

          <View style={styles.infoContainer}>
            <View style={styles.infoIcon}>
              <Mail
                size={16}
                color={COLORS.primary}
                strokeWidth={2}
              />
            </View>

            <Text style={styles.infoText}>
              The verification code will be sent to the
              email address you provide. Check your inbox
              and spam folder if you don't see it.
            </Text>
          </View>

          {/* =================================================
              BACK TO LOGIN
          ================================================= */}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backToLogin,
              pressed && styles.backToLoginPressed,
            ]}
          >
            <ArrowLeft
              size={15}
              color={COLORS.primary}
              strokeWidth={2.2}
            />

            <Text style={styles.backToLoginText}>
              Back to Sign In
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     SCREEN
  ======================================================= */

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    height: 48,
    justifyContent: "center",
  },

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

  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  /* =======================================================
     HERO
  ======================================================= */

  heroContainer: {
    alignItems: "center",
    marginTop: 24,
  },

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

  /* =======================================================
     TITLE
  ======================================================= */

  titleContainer: {
    alignItems: "center",

    marginTop: 20,

    paddingHorizontal: 8,
  },

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

  /* =======================================================
     SECURITY CARD
  ======================================================= */

  securityCard: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 20,

    padding: 12,

    borderRadius: 14,

    backgroundColor: COLORS.successLight,

    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  securityIcon: {
    width: 37,
    height: 37,

    borderRadius: 11,

    backgroundColor: COLORS.white,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  securityText: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 11.5,
    fontWeight: "900",

    color: COLORS.slate900,
  },

  securitySubtitle: {
    marginTop: 2,

    fontSize: 9.5,
    lineHeight: 14,

    color: COLORS.slate600,
  },

  /* =======================================================
     FORM
  ======================================================= */

  formCard: {
    marginTop: 18,

    padding: 16,

    borderRadius: 18,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    shadowColor: COLORS.slate900,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  inputLabel: {
    fontSize: 9,

    fontWeight: "900",

    color: COLORS.slate600,

    letterSpacing: 0.7,

    marginBottom: 7,
  },

  inputContainer: {
    minHeight: 52,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 13,

    borderRadius: 13,

    backgroundColor: COLORS.background,

    borderWidth: 1.5,
    borderColor: COLORS.slate200,
  },

  inputContainerValid: {
    borderColor: "#A7F3D0",
    backgroundColor: "#F8FFFC",
  },

  inputContainerError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF8F8",
  },

  input: {
    flex: 1,

    marginLeft: 9,

    color: COLORS.text,

    fontSize: 13,

    fontWeight: "600",

    paddingVertical: 0,
  },

  errorText: {
    marginTop: 5,

    fontSize: 9.5,

    color: COLORS.primary,

    fontWeight: "600",
  },

  /* =======================================================
     SEND BUTTON
  ======================================================= */

  sendButton: {
    minHeight: 54,

    marginTop: 13,

    borderRadius: 14,

    backgroundColor: COLORS.primary,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 14,

    gap: 9,

    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },

  sendButtonDisabled: {
    backgroundColor: COLORS.slate300,

    shadowOpacity: 0,
    elevation: 0,
  },

  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },

  sendButtonText: {
    flex: 1,

    color: COLORS.white,

    fontSize: 11.5,

    fontWeight: "900",

    letterSpacing: 0.3,

    textAlign: "center",
  },

  /* =======================================================
     INFORMATION
  ======================================================= */

  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",

    marginTop: 18,

    paddingHorizontal: 4,
  },

  infoIcon: {
    width: 29,
    height: 29,

    borderRadius: 9,

    backgroundColor: COLORS.primaryLight,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 8,
  },

  infoText: {
    flex: 1,

    fontSize: 9.5,
    lineHeight: 15,

    color: COLORS.muted,
  },

  /* =======================================================
     BACK TO LOGIN
  ======================================================= */

  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    marginTop: 25,

    paddingVertical: 10,
  },

  backToLoginPressed: {
    opacity: 0.65,
  },

  backToLoginText: {
    marginLeft: 6,

    fontSize: 11.5,

    fontWeight: "800",

    color: COLORS.primary,
  },
});
