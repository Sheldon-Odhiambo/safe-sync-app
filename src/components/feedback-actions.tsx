// components/feedback-actions.tsx
//
// "Rate" and "Report" for the other person on a finished emergency.
// Used by the client's track screen and the responder console.
//
//   <FeedbackActions
//     incidentId={id}
//     role="client"              // who is looking at it
//     otherName="Jane"
//     canRate canReport
//     myRating={null} hasReported={false}
//     onDone={refresh}
//   />
//
// Ratings are only saved for now (1-5 stars + optional comment); reports are
// saved as "open" for staff to review.

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetchLogged as apiFetch } from "@/lib/logged-api";

const RED = "#ED111C";
const INK = "#102443";
const MUTED = "#64748B";
const BORDER = "#DCE4EF";

type Role = "client" | "responder";

const REPORT_REASONS: Record<Role, { id: string; label: string }[]> = {
  // the client reporting the responder
  client: [
    { id: "rude_or_abusive", label: "Rude or abusive" },
    { id: "unsafe_driving", label: "Unsafe driving" },
    { id: "unprofessional", label: "Unprofessional" },
    { id: "asked_for_extra_payment", label: "Asked for extra payment" },
    { id: "no_show_or_delay", label: "Did not show up / long delay" },
    { id: "other", label: "Other" },
  ],
  // the responder reporting the client
  responder: [
    { id: "false_alarm", label: "False alarm" },
    { id: "wrong_location", label: "Wrong location given" },
    { id: "harassment", label: "Harassment" },
    { id: "unsafe_scene", label: "Unsafe scene" },
    { id: "rude_or_abusive", label: "Rude or abusive" },
    { id: "other", label: "Other" },
  ],
};

type Props = {
  incidentId: string;
  role: Role;
  otherName?: string | null;
  canRate: boolean;
  canReport: boolean;
  myRating?: number | null;
  hasReported?: boolean;
  /** Called after a rating or report was saved, so the screen can refresh. */
  onDone?: () => void;
};

export function FeedbackActions({
  incidentId,
  role,
  otherName,
  canRate,
  canReport,
  myRating,
  hasReported,
  onDone,
}: Props) {
  const [mode, setMode] = useState<"rate" | "report" | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const who = otherName?.trim() || (role === "client" ? "your responder" : "the client");
  const base = `/api/v1/feedback/${encodeURIComponent(incidentId)}`;

  if (!canRate && !canReport && !myRating && !hasReported) return null;

  const close = () => {
    if (busy) return;
    setMode(null);
    setStars(0);
    setComment("");
    setReason("");
  };

  const submit = async () => {
    if (busy) return;

    if (mode === "rate" && stars < 1) {
      Alert.alert("Choose a rating", "Tap the stars to rate.");
      return;
    }
    if (mode === "report" && !reason) {
      Alert.alert("Choose a reason", "Select what went wrong.");
      return;
    }
    if (mode === "report" && reason === "other" && !comment.trim()) {
      Alert.alert("Add details", 'Please describe the problem for "Other".');
      return;
    }

    setBusy(true);
    try {
      if (mode === "rate") {
        await apiFetch(`${base}/rating`, {
          method: "POST",
          body: JSON.stringify({ rating: stars, comment: comment.trim() || null }),
        });
      } else {
        await apiFetch(`${base}/report`, {
          method: "POST",
          body: JSON.stringify({ reason, details: comment.trim() || null }),
        });
      }
      const wasRate = mode === "rate";
      setBusy(false);
      close();
      Alert.alert(
        wasRate ? "Thanks for your feedback" : "Report sent",
        wasRate
          ? "Your rating has been saved."
          : "Our team will review your report."
      );
      onDone?.();
    } catch (err) {
      setBusy(false);
      Alert.alert(
        "Couldn't save",
        err instanceof Error ? err.message : "Please try again."
      );
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {role === "client" ? "How was your responder?" : "How was the client?"}
      </Text>

      {myRating ? (
        <View style={styles.doneRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= myRating ? "star" : "star-outline"}
              size={18}
              color="#F59E0B"
            />
          ))}
          <Text style={styles.doneText}>You rated {who}</Text>
        </View>
      ) : null}

      <View style={styles.buttons}>
        {canRate ? (
          <Pressable style={styles.primary} onPress={() => setMode("rate")}>
            <Ionicons name="star" size={16} color="#FFFFFF" />
            <Text style={styles.primaryText}>Rate {who}</Text>
          </Pressable>
        ) : null}

        {canReport ? (
          <Pressable style={styles.secondary} onPress={() => setMode("report")}>
            <Ionicons name="flag-outline" size={16} color={RED} />
            <Text style={styles.secondaryText}>Report</Text>
          </Pressable>
        ) : hasReported ? (
          <Text style={styles.doneText}>Report sent</Text>
        ) : null}
      </View>

      <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {mode === "rate" ? `Rate ${who}` : `Report ${who}`}
              </Text>

              {mode === "rate" ? (
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                      <Ionicons
                        name={n <= stars ? "star" : "star-outline"}
                        size={38}
                        color="#F59E0B"
                      />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.reasons}>
                  {REPORT_REASONS[role].map((r) => {
                    const on = reason === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => setReason(r.id)}
                        style={[styles.reason, on && styles.reasonOn]}
                      >
                        <Ionicons
                          name={on ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={on ? RED : MUTED}
                        />
                        <Text style={styles.reasonText}>{r.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <TextInput
                style={styles.input}
                value={comment}
                onChangeText={setComment}
                placeholder={
                  mode === "rate" ? "Add a comment (optional)" : "Tell us more (optional)"
                }
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={mode === "rate" ? 500 : 1000}
                textAlignVertical="top"
                editable={!busy}
              />

              <Pressable
                style={[styles.submit, busy && { opacity: 0.6 }]}
                onPress={submit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === "rate" ? "Submit rating" : "Send report"}
                  </Text>
                )}
              </Pressable>

              <Pressable style={styles.skip} onPress={close} disabled={busy}>
                <Text style={styles.skipText}>Not now</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  title: { color: INK, fontSize: 16, fontWeight: "800" },
  buttons: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: RED,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: RED,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryText: { color: RED, fontWeight: "800", fontSize: 14 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  doneText: { color: MUTED, fontSize: 13, marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: "88%",
  },
  sheetTitle: { color: INK, fontSize: 20, fontWeight: "800", marginBottom: 14 },
  starRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 16 },
  reasons: { gap: 8, marginBottom: 14 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
  },
  reasonOn: { borderColor: RED, backgroundColor: "#FFF8F8" },
  reasonText: { color: INK, fontSize: 14, fontWeight: "600" },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    color: INK,
    fontSize: 14,
  },
  submit: {
    marginTop: 14,
    backgroundColor: RED,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  skip: { alignItems: "center", paddingVertical: 14 },
  skipText: { color: MUTED, fontWeight: "700" },
});
