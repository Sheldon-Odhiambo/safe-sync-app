import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  AlertTriangle,
  Check,
  BellRing,
  MapPin,
  FileText,
  X,
  ChevronRight,
} from "lucide-react-native";

const COLORS = {
  primary: "#ED111C",
  primaryDark: "#C90D16",
  background: "#FFFFFF",
  surface: "#F8FAFC",
  text: "#102443",
  secondaryText: "#64748B",
  border: "#DCE4EF",
  dangerLight: "#FFF0F1",
  dangerBorder: "#FFC7CC",
  muted: "#94A3B8",
};

const MAX_COMMENT_LENGTH = 200;

const CANCELLATION_REASONS = [
  {
    id: "resolved",
    title: "Request resolved",
    description: "The situation is under control",
    Icon: Check,
  },
  {
    id: "false_alarm",
    title: "False alarm",
    description: "There is no emergency",
    Icon: BellRing,
  },
  {
    id: "wrong_location",
    title: "Wrong location",
    description: "The request was sent accidentally",
    Icon: MapPin,
  },
  {
    id: "other",
    title: "Other",
    description: "Another reason",
    Icon: FileText,
  },
];

export default function CancelRequestScreen() {
  const router = useRouter();

  const [selectedReason, setSelectedReason] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedReasonDetails = CANCELLATION_REASONS.find(
    (reason) => reason.id === selectedReason
  );

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("");
    }
  };

  const handleCancelRequest = () => {
    if (!selectedReason) {
      Alert.alert(
        "Reason required",
        "Please select a reason for cancelling your emergency request."
      );
      return;
    }

    if (selectedReason === "other" && !comment.trim()) {
      Alert.alert(
        "Additional details required",
        'Please explain your reason in the "Other" comments field.'
      );
      return;
    }

    Alert.alert(
      "Cancel emergency request?",
      "This action may notify the relevant responders. Only continue if you no longer need emergency assistance.",
      [
        {
          text: "Keep Request Active",
          style: "cancel",
        },
        {
          text: "Confirm Cancellation",
          style: "destructive",
          onPress: confirmCancellation,
        },
      ]
    );
  };

  const confirmCancellation = async () => {
    setLoading(true);

    try {
      /*
       * BACKEND INTEGRATION REQUIRED
       *
       * This screen is not yet connected to the cancellation API.
       *
       * The backend should:
       * 1. Receive the emergency request ID.
       * 2. Verify the authenticated user's ownership.
       * 3. Check the current request status.
       * 4. Update the cancellation status.
       * 5. Notify the relevant responders.
       *
       * Send selectedReason and comment.trim() as well.
       *
       * Do not report success until the backend confirms.
       */

      Alert.alert(
        "Backend connection required",
        "The cancellation service is not connected yet. Your emergency request has not been cancelled."
      );
    } catch {
      Alert.alert(
        "Cancellation failed",
        "We could not process your request. Please check your connection. Your request should remain active until cancellation is confirmed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* White navbar with SafeSync logo and brand name */}
        <View style={styles.header}>
          <Pressable
            onPress={handleGoBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <ArrowLeft
              size={25}
              color={COLORS.primary}
              strokeWidth={2.5}
            />
          </Pressable>

          <View style={styles.brand}>
            <Image
              source={{
                uri: "https://res.cloudinary.com/di15s67o/image/upload/v1791894683/ss_icon_dabuq7.jpg",
              }}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="SafeSync logo"
            />

           
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Page introduction */}
          <View style={styles.introRow}>
            <View style={styles.cancelIconContainer}>
              <X
                size={35}
                color={COLORS.primary}
                strokeWidth={2.7}
              />
            </View>

            <View style={styles.introTextContainer}>
              <Text style={styles.pageTitle}>
                Cancel Request
              </Text>

              <Text style={styles.pageDescription}>
                Are you sure you want to cancel this emergency
                request? This may notify responders and close
                your request.
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningCard}>
            <AlertTriangle
              size={30}
              color={COLORS.primary}
              strokeWidth={2.3}
            />

            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>
                Important
              </Text>

              <Text style={styles.warningDescription}>
                Only cancel if the situation has been resolved
                or you no longer need assistance. If you are
                still in danger, keep your request active.
              </Text>
            </View>
          </View>

          {/* Cancellation reasons */}
          <Text style={styles.sectionTitle}>
            Select a reason
          </Text>

          <View style={styles.reasonList}>
            {CANCELLATION_REASONS.map((reason) => {
              const isSelected =
                selectedReason === reason.id;

              const ReasonIcon = reason.Icon;

              return (
                <Pressable
                  key={reason.id}
                  onPress={() => setSelectedReason(reason.id)}
                  style={[
                    styles.reasonCard,
                    isSelected && styles.reasonCardSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: isSelected,
                  }}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && (
                      <View style={styles.radioInner} />
                    )}
                  </View>

                  <View style={styles.reasonIconContainer}>
                    <ReasonIcon
                      size={24}
                      color={
                        isSelected
                          ? COLORS.primary
                          : COLORS.text
                      }
                      strokeWidth={1.9}
                    />
                  </View>

                  <View style={styles.reasonTextContainer}>
                    <Text style={styles.reasonTitle}>
                      {reason.title}
                    </Text>

                    <Text style={styles.reasonDescription}>
                      {reason.description}
                    </Text>
                  </View>

                  {isSelected && (
                    <Check
                      size={19}
                      color={COLORS.primary}
                      strokeWidth={2.5}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Additional comments */}
          <View style={styles.commentHeader}>
            <Text style={styles.sectionTitle}>
              Additional comments
            </Text>

            <Text style={styles.optionalLabel}>
              {selectedReason === "other"
                ? "Required"
                : "Optional"}
            </Text>
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="Tell us more about why you're cancelling..."
            placeholderTextColor={COLORS.muted}
            multiline
            textAlignVertical="top"
            maxLength={MAX_COMMENT_LENGTH}
            value={comment}
            onChangeText={setComment}
            editable={!loading}
            accessibilityLabel="Additional cancellation comments"
          />

          <Text style={styles.characterCount}>
            {comment.length}/{MAX_COMMENT_LENGTH}
          </Text>

          {/* Selected reason summary */}
          {selectedReasonDetails && (
            <View style={styles.selectedSummary}>
              <Check size={17} color="#15803D" />

              <Text style={styles.selectedSummaryText}>
                Selected: {selectedReasonDetails.title}
              </Text>
            </View>
          )}

          {/* Cancel request */}
          <Pressable
            onPress={handleCancelRequest}
            disabled={loading}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cancel emergency request"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <X
                  size={20}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />

                <Text style={styles.cancelButtonText}>
                  Cancel Request
                </Text>
              </>
            )}
          </Pressable>

          {/* Go back without cancelling */}
          <Pressable
            onPress={handleGoBack}
            disabled={loading}
            style={({ pressed }) => [
              styles.backActionButton,
              pressed && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back without cancelling"
          >
            <Text style={styles.backActionText}>
              Go Back
            </Text>

            <ChevronRight
              size={19}
              color={COLORS.primary}
              strokeWidth={2}
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 10,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  brand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logo: {
    width: 55,
    height: 45,
  },

  brandText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  headerSpacer: {
    width: 42,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 35,
  },

  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 14,
  },

  cancelIconContainer: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: "#FDE7E9",
    alignItems: "center",
    justifyContent: "center",
  },

  introTextContainer: {
    flex: 1,
  },

  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 7,
    letterSpacing: -0.5,
  },

  pageDescription: {
    color: COLORS.secondaryText,
    fontSize: 14,
    lineHeight: 21,
  },

  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 13,
    padding: 16,
    marginBottom: 28,
  },

  warningTextContainer: {
    flex: 1,
  },

  warningTitle: {
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },

  warningDescription: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  reasonList: {
    gap: 10,
    marginTop: 14,
    marginBottom: 26,
  },

  reasonCard: {
    minHeight: 77,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    gap: 11,
  },

  reasonCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#FFF8F8",
  },

  radioOuter: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: "#A7B3C5",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },

  reasonIconContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  reasonTextContainer: {
    flex: 1,
  },

  reasonTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  reasonDescription: {
    color: COLORS.secondaryText,
    fontSize: 12,
    lineHeight: 17,
  },

  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  optionalLabel: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },

  commentInput: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 15,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
  },

  characterCount: {
    textAlign: "right",
    color: COLORS.secondaryText,
    fontSize: 12,
    marginTop: 7,
    marginBottom: 12,
  },

  selectedSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 16,
  },

  selectedSummaryText: {
    color: "#15803D",
    fontSize: 13,
    fontWeight: "600",
  },

  cancelButton: {
    minHeight: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 8,
    paddingHorizontal: 15,
  },

  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.9,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  backActionButton: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
  },

  backButtonPressed: {
    backgroundColor: "#FFF0F1",
  },

  backActionText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },
});