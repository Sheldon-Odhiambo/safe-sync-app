import React, { useState } from "react";
import { useRouter } from "expo-router";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";

import {
  ActivityIndicator,
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
  primary: "#ED111C",
  primaryDark: "#C90D16",
  background: "#F8FAFC",
  white: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#334155",
  muted: "#64748B",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  inputBorder: "#CBD5E1",
  softRed: "#FFF1F2",
  softRedBorder: "#FECDD3",
  error: "#B91C1C",
  errorBackground: "#FEF2F2",
  success: "#15803D",
  successBackground: "#F0FDF4",
};

type AccountType = "individual" | "organization";

export default function SignupScreen() {
  const router = useRouter();

  const [accountType, setAccountType] =
    useState<AccountType>("individual");

  const [showAccountDropdown, setShowAccountDropdown] =
    useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim()
    );
  };

  const isValidPhone = (value: string) => {
    const cleaned = value.replace(/[\s-]/g, "");

    return /^\+?[0-9]{9,15}$/.test(cleaned);
  };

  const validateForm = () => {
    setError("");

    if (!fullName.trim()) {
      setError(
        accountType === "organization"
          ? "Please enter your organization name."
          : "Please enter your full name."
      );
      return false;
    }

    if (!email.trim()) {
      setError(
        accountType === "organization"
          ? "Please enter your organization email address."
          : "Please enter your email address."
      );
      return false;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (!phone.trim()) {
      setError(
        accountType === "organization"
          ? "Please enter your organization phone number."
          : "Please enter your phone number."
      );
      return false;
    }

    if (!isValidPhone(phone)) {
      setError(
        "Please enter a valid phone number, for example +254 712 345 678."
      );
      return false;
    }

    if (!password) {
      setError("Please create a password.");
      return false;
    }

    if (password.length < 8) {
      setError(
        "Your password must contain at least 8 characters."
      );
      return false;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return false;
    }

    if (!acceptedTerms) {
      setError(
        "Please agree to the Terms of Service and Privacy Policy."
      );
      return false;
    }

    return true;
  };

  // --------------------------------------------------
  // SIGN UP
  // --------------------------------------------------

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * BACKEND INTEGRATION
       *
       * The backend should receive:
       *
       * {
       *   accountType: "individual" | "organization",
       *   name: fullName,
       *   email,
       *   phone,
       *   password
       * }
       *
       * Example:
       *
       * const response = await fetch(
       *   `${API_URL}/auth/register`,
       *   {
       *     method: "POST",
       *     headers: {
       *       "Content-Type": "application/json",
       *     },
       *     body: JSON.stringify({
       *       accountType,
       *       name: fullName.trim(),
       *       email: email.trim().toLowerCase(),
       *       phone: phone.trim(),
       *       password,
       *     }),
       *   }
       * );
       *
       * if (!response.ok) {
       *   const data = await response.json();
       *   throw new Error(
       *     data.message || "Unable to create account."
       *   );
       * }
       */

      // Temporary frontend simulation
      await new Promise((resolve) =>
        setTimeout(resolve, 1200)
      );

      /*
       * After the backend creates the account and
       * sends the 6-digit verification code,
       * go to the email verification screen.
       */

      router.push({
        pathname: "/verify-email",
        params: {
          email: email.trim().toLowerCase(),
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // ACCOUNT TYPE
  // --------------------------------------------------

  const handleAccountTypeChange = (
    type: AccountType
  ) => {
    setAccountType(type);
    setShowAccountDropdown(false);
    setError("");
  };

  // --------------------------------------------------
  // INPUT COMPONENT
  // --------------------------------------------------

  const renderInput = ({
    icon,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    secureTextEntry,
    rightElement,
    autoCapitalize = "none",
  }: {
    icon: React.ReactNode;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    keyboardType?: "default" | "email-address" | "phone-pad";
    secureTextEntry?: boolean;
    rightElement?: React.ReactNode;
    autoCapitalize?: "none" | "words";
  }) => {
    return (
      <View style={styles.inputWrapper}>
        <View style={styles.inputIcon}>
          {icon}
        </View>

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={!loading}
        />

        {rightElement}
      </View>
    );
  };

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

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
          {/* HEADER */}

          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <ArrowLeft
                size={20}
                color={COLORS.text}
                strokeWidth={2}
              />
            </Pressable>

            <View style={styles.logoContainer}>
              <View style={styles.logoBadge}>
                <ShieldCheck
                  size={22}
                  color={COLORS.white}
                  strokeWidth={2}
                />
              </View>

              <Text style={styles.logoText}>
                SafeSync
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* INTRO */}

          <View style={styles.introSection}>
            <Text style={styles.title}>
              Create your account
            </Text>

            <Text style={styles.subtitle}>
              Join SafeSync for fast, reliable emergency
              assistance and response coordination.
            </Text>
          </View>

          {/* FORM */}

          <View style={styles.formContainer}>
            {/* ACCOUNT TYPE */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Account type
              </Text>

              <Text style={styles.accountHelperText}>
                Select how you will use SafeSync.
              </Text>

              <Pressable
                style={[
                  styles.dropdown,
                  showAccountDropdown &&
                    styles.dropdownActive,
                ]}
                onPress={() =>
                  setShowAccountDropdown(
                    !showAccountDropdown
                  )
                }
                disabled={loading}
              >
                <View style={styles.dropdownLeft}>
                  <View style={styles.dropdownIcon}>
                    {accountType === "individual" ? (
                      <UserRound
                        size={18}
                        color={COLORS.muted}
                      />
                    ) : (
                      <Building2
                        size={18}
                        color={COLORS.muted}
                      />
                    )}
                  </View>

                  <View>
                    <Text style={styles.dropdownText}>
                      {accountType === "individual"
                        ? "Individual"
                        : "Organization"}
                    </Text>

                    <Text
                      style={styles.dropdownSubtext}
                    >
                      {accountType === "individual"
                        ? "Personal SafeSync account"
                        : "Company or organization account"}
                    </Text>
                  </View>
                </View>

                {showAccountDropdown ? (
                  <ChevronUp
                    size={20}
                    color={COLORS.muted}
                  />
                ) : (
                  <ChevronDown
                    size={20}
                    color={COLORS.muted}
                  />
                )}
              </Pressable>

              {showAccountDropdown && (
                <View style={styles.dropdownMenu}>
                  {/* INDIVIDUAL */}

                  <Pressable
                    style={[
                      styles.dropdownOption,
                      accountType === "individual" &&
                        styles.dropdownOptionActive,
                    ]}
                    onPress={() =>
                      handleAccountTypeChange(
                        "individual"
                      )
                    }
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        accountType === "individual" &&
                          styles.optionIconActive,
                      ]}
                    >
                      <UserRound
                        size={19}
                        color={
                          accountType === "individual"
                            ? COLORS.white
                            : COLORS.muted
                        }
                      />
                    </View>

                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionTitle,
                          accountType === "individual" &&
                            styles.optionTitleActive,
                        ]}
                      >
                        Individual
                      </Text>

                      <Text
                        style={styles.optionDescription}
                      >
                        Personal SafeSync account
                      </Text>
                    </View>

                    {accountType === "individual" && (
                      <CheckCircle
                        size={21}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>

                  {/* ORGANIZATION */}

                  <Pressable
                    style={[
                      styles.dropdownOption,
                      accountType === "organization" &&
                        styles.dropdownOptionActive,
                    ]}
                    onPress={() =>
                      handleAccountTypeChange(
                        "organization"
                      )
                    }
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        accountType === "organization" &&
                          styles.optionIconActive,
                      ]}
                    >
                      <Building2
                        size={19}
                        color={
                          accountType === "organization"
                            ? COLORS.white
                            : COLORS.muted
                        }
                      />
                    </View>

                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionTitle,
                          accountType === "organization" &&
                            styles.optionTitleActive,
                        ]}
                      >
                        Organization
                      </Text>

                      <Text
                        style={styles.optionDescription}
                      >
                        Register a company or organization
                      </Text>
                    </View>

                    {accountType === "organization" && (
                      <CheckCircle
                        size={21}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {/* NAME */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {accountType === "organization"
                  ? "Organization name"
                  : "Full name"}
              </Text>

              {renderInput({
                icon:
                  accountType === "organization" ? (
                    <Building2
                      size={19}
                      color={COLORS.muted}
                    />
                  ) : (
                    <UserRound
                      size={19}
                      color={COLORS.muted}
                    />
                  ),
                value: fullName,
                onChangeText: setFullName,
                placeholder:
                  accountType === "organization"
                    ? "Enter organization name"
                    : "Enter your full name",
                autoCapitalize: "words",
              })}
            </View>

            {/* EMAIL */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {accountType === "organization"
                  ? "Organization email"
                  : "Email address"}
              </Text>

              {renderInput({
                icon: (
                  <Mail
                    size={19}
                    color={COLORS.muted}
                  />
                ),
                value: email,
                onChangeText: setEmail,
                placeholder:
                  accountType === "organization"
                    ? "organization@example.com"
                    : "you@example.com",
                keyboardType: "email-address",
              })}
            </View>

            {/* PHONE */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {accountType === "organization"
                  ? "Organization phone"
                  : "Phone number"}
              </Text>

              {renderInput({
                icon: (
                  <Phone
                    size={19}
                    color={COLORS.muted}
                  />
                ),
                value: phone,
                onChangeText: setPhone,
                placeholder:"+254 712 345 678",
                keyboardType: "phone-pad",
              })}
            </View>

            {/* PASSWORD */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password
              </Text>

              {renderInput({
                icon: (
                  <LockKeyhole
                    size={19}
                    color={COLORS.muted}
                  />
                ),
                value: password,
                onChangeText: setPassword,
                placeholder: "Create a password",
                secureTextEntry: !showPassword,
                rightElement: (
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={20}
                        color={COLORS.muted}
                      />
                    ) : (
                      <Eye
                        size={20}
                        color={COLORS.muted}
                      />
                    )}
                  </Pressable>
                ),
              })}

              <View
                style={styles.passwordRequirements}
              >
                <CheckCircle
                  size={14}
                  color={
                    password.length >= 8
                      ? COLORS.success
                      : COLORS.placeholder
                  }
                />

                <Text
                  style={[
                    styles.requirementText,
                    password.length >= 8 &&
                      styles.requirementTextActive,
                  ]}
                >
                  At least 8 characters
                </Text>
              </View>
            </View>

            {/* CONFIRM PASSWORD */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Confirm password
              </Text>

              {renderInput({
                icon: (
                  <LockKeyhole
                    size={19}
                    color={COLORS.muted}
                  />
                ),
                value: confirmPassword,
                onChangeText: setConfirmPassword,
                placeholder: "Confirm your password",
                secureTextEntry:
                  !showConfirmPassword,
                rightElement: (
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={20}
                        color={COLORS.muted}
                      />
                    ) : (
                      <Eye
                        size={20}
                        color={COLORS.muted}
                      />
                    )}
                  </Pressable>
                ),
              })}

              {confirmPassword.length > 0 && (
                <View
                  style={styles.passwordRequirements}
                >
                  <CheckCircle
                    size={14}
                    color={
                      password === confirmPassword
                        ? COLORS.success
                        : COLORS.error
                    }
                  />

                  <Text
                    style={[
                      styles.requirementText,
                      password === confirmPassword &&
                        styles.requirementTextActive,
                      password !== confirmPassword &&
                        styles.requirementTextError,
                    ]}
                  >
                    {password === confirmPassword
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </Text>
                </View>
              )}
            </View>

            {/* TERMS */}

            <Pressable
              style={styles.termsRow}
              onPress={() =>
                setAcceptedTerms(!acceptedTerms)
              }
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms &&
                    styles.checkboxActive,
                ]}
              >
                {acceptedTerms && (
                  <Check
                    size={15}
                    color={COLORS.white}
                    strokeWidth={3}
                  />
                )}
              </View>

              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text style={styles.termsLink}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </Pressable>

            {/* ERROR */}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* CREATE ACCOUNT */}

            <Pressable
              style={[
                styles.signupButton,
                loading &&
                  styles.signupButtonDisabled,
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color={COLORS.white}
                  />

                  <Text
                    style={styles.signupButtonText}
                  >
                    Creating account...
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={styles.signupButtonText}
                  >
                    Create Account
                  </Text>

                  <ArrowRight
                    size={19}
                    color={COLORS.white}
                    strokeWidth={2.2}
                  />
                </>
              )}
            </Pressable>

            {/* DIVIDER */}

            <View
              style={styles.dividerContainer}
            >
              <View style={styles.divider} />

              <Text style={styles.dividerText}>
                OR
              </Text>

              <View style={styles.divider} />
            </View>

            {/* LOGIN */}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>
                Already have an account?
              </Text>

              <Pressable
                onPress={() => router.replace("/")}
                disabled={loading}
              >
                <Text style={styles.loginLink}>
                  Sign In
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SECURITY */}

          <View style={styles.securityBox}>
            <View style={styles.securityIcon}>
              <ShieldCheck
                size={19}
                color={COLORS.primary}
                strokeWidth={2}
              />
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Your safety matters
              </Text>

              <Text style={styles.securityText}>
                Your account information is securely
                handled and used to provide emergency
                assistance when you need it.
              </Text>
            </View>
          </View>

          {/* FOOTER */}

          <Text style={styles.footer}>
            © 2026 SafeSync. All rights reserved.
          </Text>
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

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 35,
  },

  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  logoText: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
  },

  headerSpacer: {
    width: 42,
  },

  introSection: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 22,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
  },

  formContainer: {
    paddingHorizontal: 24,
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  accountHelperText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    marginTop: -3,
    marginBottom: 9,
  },

  dropdown: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  dropdownActive: {
    borderColor: COLORS.primary,
  },

  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  dropdownText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  dropdownSubtext: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },

  dropdownMenu: {
    marginTop: 7,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 4,
  },

  dropdownOption: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  dropdownOptionActive: {
    backgroundColor: "#FFF7F7",
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  optionIconActive: {
    backgroundColor: COLORS.primary,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textSecondary,
    marginBottom: 3,
  },

  optionTitleActive: {
    color: "#991B1B",
  },

  optionDescription: {
    fontSize: 11,
    color: COLORS.muted,
  },

  inputWrapper: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    minHeight: 52,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },

  eyeButton: {
    padding: 5,
  },

  passwordRequirements: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },

  requirementText: {
    fontSize: 11,
    color: COLORS.muted,
  },

  requirementTextActive: {
    color: COLORS.success,
  },

  requirementTextError: {
    color: COLORS.error,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
    marginBottom: 15,
  },

  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },

  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.muted,
  },

  termsLink: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  errorBox: {
    backgroundColor: COLORS.errorBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.error,
  },

  signupButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 10,
    elevation: 5,
  },

  signupButtonDisabled: {
    opacity: 0.65,
  },

  signupButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.placeholder,
    marginHorizontal: 14,
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  loginText: {
    fontSize: 14,
    color: COLORS.muted,
    marginRight: 5,
  },

  loginLink: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },

  securityBox: {
    marginHorizontal: 24,
    marginTop: 28,
    padding: 15,
    borderRadius: 15,
    backgroundColor: COLORS.softRed,
    borderWidth: 1,
    borderColor: COLORS.softRedBorder,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  securityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9F1239",
    marginBottom: 3,
  },

  securityText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#881337",
  },

  footer: {
    textAlign: "center",
    fontSize: 10,
    color: COLORS.placeholder,
    marginTop: 25,
  },
});