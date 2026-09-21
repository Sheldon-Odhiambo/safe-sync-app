import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react-native";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, "");

    const updatedCode = [...code];
    updatedCode[index] = numericValue.slice(-1);

    setCode(updatedCode);
    setError("");

    // Move to next input
    if (numericValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Automatically verify when all 6 digits are entered
    if (
      numericValue &&
      index === 5 &&
      updatedCode.every((digit) => digit !== "")
    ) {
      handleVerify(updatedCode.join(""));
    }
  };

  const handleKeyPress = (
    event: any,
    index: number
  ) => {
    if (
      event.nativeEvent.key === "Backspace" &&
      !code[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const finalCode = verificationCode || code.join("");

    if (finalCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    if (!email) {
      setError("Email address is missing. Please return to sign up.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * BACKEND INTEGRATION
       *
       * Replace this temporary simulation with:
       *
       * POST /auth/verify-email
       *
       * {
       *   email,
       *   code: finalCode
       * }
       */

      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Temporary success simulation
      setSuccess(true);
    } catch (err) {
      setError(
        "The verification code is invalid or has expired. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || countdown > 0 || resending) return;

    setResending(true);
    setError("");

    try {
      /*
       * BACKEND INTEGRATION
       *
       * POST /auth/resend-verification-code
       *
       * {
       *   email
       * }
       */

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCode(["", "", "", "", "", ""]);
      setCountdown(60);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError("Unable to resend the verification code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <CheckCircle2 size={48} color="#E11D48" />
          </View>

          <Text className="text-center text-3xl font-bold text-slate-900">
            Email Verified
          </Text>

          <Text className="mt-3 text-center text-base leading-6 text-slate-500">
            Your email address has been successfully verified. You can now
            sign in to your SafeSync account.
          </Text>

          <Pressable
            onPress={() => router.replace("/")}
            className="mt-8 w-full rounded-2xl bg-[#E11D48] py-4"
          >
            <Text className="text-center text-base font-bold text-white">
              Continue to Sign In
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="flex-row items-center pt-4">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <ArrowLeft size={21} color="#0F172A" />
            </Pressable>
          </View>

          {/* Icon */}
          <View className="mt-10 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <Mail size={40} color="#E11D48" />
            </View>

            <Text className="mt-6 text-center text-3xl font-bold text-slate-900">
              Verify Your Email
            </Text>

            <Text className="mt-3 text-center text-base leading-6 text-slate-500">
              We've sent a 6-digit verification code to
            </Text>

            <Text className="mt-1 text-center text-base font-semibold text-slate-900">
              {email || "your email address"}
            </Text>
          </View>

          {/* Code Inputs */}
          <View className="mt-10 flex-row justify-between">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                className={`h-14 w-12 rounded-xl border-2 bg-slate-50 text-center text-xl font-bold text-slate-900 ${
                  error ? "border-red-400" : "border-slate-200"
                }`}
              />
            ))}
          </View>

          {/* Error */}
          {error ? (
            <Text className="mt-4 text-center text-sm font-medium text-red-600">
              {error}
            </Text>
          ) : null}

          {/* Verify Button */}
          <Pressable
            onPress={() => handleVerify()}
            disabled={loading}
            className={`mt-8 rounded-2xl py-4 ${
              loading ? "bg-red-300" : "bg-[#E11D48]"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-center text-base font-bold text-white">
                Verify Email
              </Text>
            )}
          </Pressable>

          {/* Resend */}
          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-sm text-slate-500">
              Didn't receive the code?{" "}
            </Text>

            <Pressable
              onPress={handleResend}
              disabled={countdown > 0 || resending}
            >
              <View className="flex-row items-center">
                {resending ? (
                  <ActivityIndicator size="small" color="#E11D48" />
                ) : (
                  <RefreshCw
                    size={15}
                    color={countdown > 0 ? "#94A3B8" : "#E11D48"}
                  />
                )}

                <Text
                  className={`ml-1 text-sm font-semibold ${
                    countdown > 0 ? "text-slate-400" : "text-[#E11D48]"
                  }`}
                >
                  {countdown > 0
                    ? `Resend in ${countdown}s`
                    : "Resend Code"}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Security Info */}
          <View className="mt-10 flex-row rounded-2xl bg-slate-50 p-4">
            <ShieldCheck size={22} color="#E11D48" />

            <View className="ml-3 flex-1">
              <Text className="font-semibold text-slate-800">
                Secure verification
              </Text>

              <Text className="mt-1 text-xs leading-5 text-slate-500">
                Your verification code expires after a short period for your
                account's security.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

