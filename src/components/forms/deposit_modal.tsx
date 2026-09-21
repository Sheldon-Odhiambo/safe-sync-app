import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Physical device? Use your PC's LAN IP or an ngrok URL, not localhost.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.10:8000";

type Step = "form" | "waiting" | "success" | "failed";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, receipt?: string | null) => void;
  defaultPhone?: string;
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const PHONE_RE = /^(?:\+?254|0)?[17]\d{8}$/;

export default function DepositModal({
  visible,
  onClose,
  onSuccess,
  defaultPhone = "",
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => stopPolling, []);

  // Lift the sheet by the keyboard's height
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setPhone(defaultPhone);
      setAmount("");
      setError("");
      setStep("form");
      setReceipt(null);
    } else {
      stopPolling();
      setKeyboardHeight(0);
    }
  }, [visible, defaultPhone]);

  const startPolling = (reference: string, amt: number) => {
    let tries = 0;
    timer.current = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`${API_BASE}/api/payments/deposit/${reference}`);
        const s = await res.json();
        if (s.status === "SUCCESS") {
          stopPolling();
          setReceipt(s.receipt ?? null);
          setStep("success");
          onSuccess?.(amt, s.receipt);
        } else if (s.status === "FAILED") {
          stopPolling();
          setError(s.reason || "Payment was not completed.");
          setStep("failed");
        }
      } catch {
        /* transient network error, keep polling */
      }
      if (tries >= 30) {
        stopPolling();
        setError(
          "We didn't receive a confirmation. If money was deducted, it will reflect shortly."
        );
        setStep("failed");
      }
    }, 3000);
  };

  const submit = async () => {
    Keyboard.dismiss();
    setError("");
    const amt = parseInt(amount, 10);
    if (!PHONE_RE.test(phone.replace(/[\s-]/g, ""))) {
      return setError("Enter a valid M-PESA number, e.g. 0712 345 678");
    }
    if (!amt || amt < 10) return setError("Minimum deposit is KSh 10");
    if (amt > 150000) return setError("Maximum deposit is KSh 150,000");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone, amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(detail || "Something went wrong");
      }
      setStep("waiting");
      startPolling(data.reference, amt);
    } catch (e: any) {
      setError(e.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = step === "waiting";

  const handleOverlayPress = () => {
    if (keyboardHeight > 0) return Keyboard.dismiss();
    if (!busy) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={busy ? undefined : onClose}
    >
      <Pressable style={styles.overlay} onPress={handleOverlayPress}>
        <Pressable
          style={[
            styles.sheet,
            {
              marginBottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 16 : 32,
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Deposit Funds</Text>
              <Text style={styles.subtitle}>Pay securely with M-PESA</Text>
            </View>
            {!busy && (
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* FORM */}
            {step === "form" && (
              <>
                <Text style={styles.label}>M-PESA phone number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="0712 345 678"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.label}>Amount (KSh)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  placeholder="500"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.chips}>
                  {QUICK_AMOUNTS.map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.chip, amount === String(a) && styles.chipActive]}
                      onPress={() => setAmount(String(a))}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          amount === String(a) && styles.chipTextActive,
                        ]}
                      >
                        {a.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {!!error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryButton, submitting && { opacity: 0.7 }]}
                  onPress={submit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Pay with M-PESA</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* WAITING */}
            {step === "waiting" && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.stateTitle}>Check your phone</Text>
                <Text style={styles.stateText}>
                  Enter your M-PESA PIN on the prompt to complete the deposit.
                </Text>
              </View>
            )}

            {/* SUCCESS */}
            {step === "success" && (
              <View style={styles.center}>
                <View style={[styles.stateIcon, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="checkmark" size={30} color="#059669" />
                </View>
                <Text style={styles.stateTitle}>Deposit successful</Text>
                {!!receipt && (
                  <Text style={styles.stateText}>M-PESA receipt: {receipt}</Text>
                )}
                <TouchableOpacity
                  style={[styles.primaryButton, { alignSelf: "stretch" }]}
                  onPress={onClose}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FAILED */}
            {step === "failed" && (
              <View style={styles.center}>
                <View style={[styles.stateIcon, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="close" size={30} color="#DC2626" />
                </View>
                <Text style={styles.stateTitle}>Payment not completed</Text>
                <Text style={styles.stateText}>{error}</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { alignSelf: "stretch" }]}
                  onPress={() => {
                    setError("");
                    setStep("form");
                  }}
                >
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 10,
  },
  chips: { flexDirection: "row", gap: 8, marginBottom: 6 },
  chip: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  chipActive: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  chipTextActive: { color: "#DC2626" },

  error: { color: "#DC2626", fontSize: 12, marginTop: 8 },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  center: { alignItems: "center", paddingVertical: 12, gap: 8 },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  stateText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
});