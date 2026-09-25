import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import DepositModal from "@/components/forms/deposit_modal";
import {
  checkoutSubscription,
  getMySubscription,
  getPlans,
  payInvoice,
  type Plan,
  type SubscriptionStatus,
} from "@/lib/payments_api";

// Shown if the API can't be reached; the backend is the source of truth for prices.
const FALLBACK_PLANS: Plan[] = [
  {
    code: "semi_annual",
    name: "6 months",
    description: "Full platform access for 6 months",
    price: 6000,
    duration_months: 6,
  },
  {
    code: "annual",
    name: "12 months",
    description: "Full platform access for 12 months",
    price: 12000,
    duration_months: 12,
  },
];

const NO_SUBSCRIPTION: SubscriptionStatus = {
  state: "none",
  plan_code: null,
  plan_name: null,
  started_at: null,
  ends_at: null,
  grace_ends_at: null,
  days_left: null,
  open_invoice: null,
};

type PayTarget = { invoiceId: string; amount: number; label: string };

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

export default function SubscriptionView() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [status, setStatus] = useState<SubscriptionStatus>(NO_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [pay, setPay] = useState<PayTarget | null>(null);

  const load = useCallback(async () => {
    const [p, s] = await Promise.allSettled([getPlans(), getMySubscription()]);
    if (p.status === "fulfilled" && p.value.length) setPlans(p.value);
    if (s.status === "fulfilled") setStatus(s.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const choosePlan = async (plan: Plan) => {
    setBusyPlan(plan.code);
    try {
      const c = await checkoutSubscription(plan.code);
      setPay({ invoiceId: c.invoice_id, amount: c.amount, label: plan.name });
    } catch (e: any) {
      Alert.alert("Could not start payment", e.message || "Please try again.");
    } finally {
      setBusyPlan(null);
    }
  };

  const payOpenInvoice = () => {
    const inv = status.open_invoice;
    if (!inv) return;
    const plan = plans.find((p) => p.code === inv.plan_code);
    setPay({ invoiceId: inv.invoice_id, amount: inv.amount, label: plan?.name ?? "Plan" });
  };

  const hasPlan = status.state !== "none";

  const banner = (() => {
    switch (status.state) {
      case "active":
        return {
          label: "ACTIVE PLAN",
          title: status.plan_name ?? "Active",
          line: `${status.days_left ?? 0} days left · ends ${fmtDate(status.ends_at)}`,
        };
      case "grace":
        return {
          label: "GRACE PERIOD",
          title: "Renew now",
          line: `Your plan ended ${fmtDate(status.ends_at)}. Access stops ${fmtDate(status.grace_ends_at)}.`,
        };
      case "expired":
        return {
          label: "EXPIRED",
          title: "No active plan",
          line: "Choose a plan below to restore access.",
        };
      default:
        return {
          label: "NO PLAN",
          title: "Choose a plan",
          line: "Pick a plan below to activate your organisation.",
        };
    }
  })();

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color="#DC2626" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Subscription</Text>
          <Text style={styles.pageSubtitle}>
            Your organisation stays on SafeSync while a plan is active.
          </Text>
        </View>

        {/* STATUS CARD */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{banner.label}</Text>
          <Text style={styles.statusTitle}>{banner.title}</Text>
          <Text style={styles.statusLine}>{banner.line}</Text>

          {!!status.open_invoice && (
            <TouchableOpacity style={styles.invoiceButton} activeOpacity={0.85} onPress={payOpenInvoice}>
              <Ionicons name="receipt-outline" size={18} color="#DC2626" />
              <Text style={styles.invoiceButtonText}>
                Pay pending invoice · KSh {fmt(status.open_invoice.amount)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* PLANS */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{hasPlan ? "Renew or change plan" : "Choose a plan"}</Text>
          <Text style={styles.panelSubtitle}>
            Renewing early adds the new period after your current one ends.
          </Text>

          <View style={styles.planList}>
            {plans.map((plan) => (
              <View key={plan.code} style={styles.planCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {!!plan.description && <Text style={styles.planDescription}>{plan.description}</Text>}
                  <Text style={styles.planPrice}>KSh {fmt(plan.price)}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.planButton, busyPlan === plan.code && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                  disabled={busyPlan !== null}
                  onPress={() => choosePlan(plan)}
                >
                  {busyPlan === plan.code ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.planButtonText}>{hasPlan ? "Renew" : "Subscribe"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <DepositModal
        visible={pay !== null}
        onClose={() => setPay(null)}
        onSubmit={(phone) => payInvoice(pay!.invoiceId, phone)}
        onSuccess={() => load()}
        title="Pay for plan"
        subtitle={pay ? `${pay.label} plan` : ""}
        submitLabel={pay ? `Pay KSh ${fmt(pay.amount)}` : "Pay"}
        fixedAmount={pay?.amount ?? null}
        quickAmounts={[]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 20, paddingBottom: 30 },

  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 30, fontWeight: "900", color: "#0F172A" },
  pageSubtitle: { fontSize: 13, lineHeight: 19, color: "#64748B", marginTop: 5 },

  statusCard: {
    backgroundColor: "#DC2626",
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 7,
  },
  statusLabel: {
    color: "#FFFFFF",
    opacity: 0.75,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  statusTitle: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", marginTop: 10 },
  statusLine: { color: "#FFFFFF", opacity: 0.85, fontSize: 13, lineHeight: 19, marginTop: 5 },

  invoiceButton: {
    marginTop: 18,
    minHeight: 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  invoiceButtonText: { color: "#DC2626", fontSize: 13, fontWeight: "800" },

  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  panelTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  panelSubtitle: { fontSize: 12, color: "#64748B", lineHeight: 18, marginTop: 4 },

  planList: { marginTop: 14, gap: 12 },
  planCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planName: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  planDescription: { fontSize: 11, color: "#64748B", marginTop: 3 },
  planPrice: { fontSize: 20, fontWeight: "900", color: "#DC2626", marginTop: 8 },
  planButton: {
    minWidth: 96,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  planButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});