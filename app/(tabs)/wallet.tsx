import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  X,
} from "lucide-react-native";

// Persistent Top Header
import {SafeSyncHeader} from "../../components/SafeSyncHeader";

interface Transaction {
  id: string;
  label: string;
  date: string;
  amount: number;
  kind: "credit" | "debit";
  status: "Completed" | "Reserved";
}

export default function WalletScreen() {
  const router = useRouter();

  const [balance, setBalance] = useState(15000);
  const [reservedFunds, setReservedFunds] = useState(3500);
  const [mpesaPhone, setMpesaPhone] = useState("+254 712 345 678");

  // Top Up Modal State
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("5000");
  const [isProcessing, setIsProcessing] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TXN-8941",
      label: "M-PESA Wallet Top-Up",
      date: "Today, 10:14 AM",
      amount: 5000,
      kind: "credit",
      status: "Completed",
    },
    {
      id: "TXN-8812",
      label: "ALS Ambulance Service Reserve",
      date: "Yesterday, 3:30 PM",
      amount: 3500,
      kind: "debit",
      status: "Reserved",
    },
    {
      id: "TXN-7620",
      label: "Emergency Triage Fee · Unit KDA 241X",
      date: "24 Aug 2026",
      amount: 4200,
      kind: "debit",
      status: "Completed",
    },
    {
      id: "TXN-7510",
      label: "M-PESA Wallet Top-Up",
      date: "20 Aug 2026",
      amount: 10000,
      kind: "credit",
      status: "Completed",
    },
  ]);

  const handleTopUpSubmit = () => {
    const num = parseFloat(topUpAmount);

    if (isNaN(num) || num < 500) {
      Alert.alert(
        "Invalid Amount",
        "Minimum emergency wallet top-up is KES 500."
      );
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);

      setBalance((prev) => prev + num);

      setTransactions((prev) => [
        {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          label: "M-PESA Express Wallet Top-Up",
          date: "Just now",
          amount: num,
          kind: "credit",
          status: "Completed",
        },
        ...prev,
      ]);

      setShowTopUp(false);

      Alert.alert(
        "STK Push Sent",
        `KES ${num.toLocaleString()} has been loaded into your SafeSync wallet.`
      );
    }, 1200);
  };

  const handleRequestEmergency = () => {
    router.push("/emergency");
  };

  return (
    <View className="flex-1 bg-slate-100">
      <StatusBar barStyle="dark-content" />

      {/* Persistent Top Header */}
      <SafeSyncHeader />

      {/* Scrollable Body */}
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title + Top Up */}
        <View className="flex-row items-center justify-between px-1 mb-4">
          <View>
            <Text className="text-xl font-black text-slate-900">
              Emergency Wallet
            </Text>

            <Text className="text-xs text-slate-500">
              Fast & secure M-PESA emergency payments
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowTopUp(true)}
            activeOpacity={0.85}
            className="h-9 px-3.5 bg-rose-600 rounded-xl flex-row items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} color="#ffffff" strokeWidth={1.75} />

            <Text className="text-white font-bold text-xs">
              Top Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Balance Card */}
        <View className="bg-rose-600 rounded-3xl p-5 gap-4 shadow-md">
          {/* Wallet Status */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center">
                <ShieldCheck
                  size={18}
                  color="#ffffff"
                  strokeWidth={1.75}
                />
              </View>

              <Text className="text-xs font-bold text-white">
                Wallet Protected
              </Text>
            </View>

            <View className="bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
              <Text className="text-[10px] font-bold text-white">
                Safaricom M-PESA
              </Text>
            </View>
          </View>

          {/* Balance */}
          <View>
            <Text className="text-[11px] font-bold text-rose-100 uppercase tracking-wider">
              Available Wallet Balance
            </Text>

            <Text className="text-3xl font-black text-white mt-0.5">
              KES {balance.toLocaleString()}
            </Text>
          </View>

          {/* Wallet Details */}
          <View className="flex-row items-center justify-between pt-3 border-t border-white/20">
            <View>
              <Text className="text-[10px] text-rose-100 uppercase font-semibold">
                Reserved Funds
              </Text>

              <Text className="text-xs font-bold text-white">
                KES {reservedFunds.toLocaleString()}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[10px] text-rose-100 uppercase font-semibold">
                Linked Phone
              </Text>

              <Text className="text-xs font-bold text-white">
                {mpesaPhone}
              </Text>
            </View>
          </View>
        </View>

        {/* M-PESA Information Banner */}
        <View className="bg-white rounded-3xl p-4 border border-slate-200 flex-row items-center gap-3 shadow-sm mt-4">
          <View className="w-10 h-10 bg-rose-50 rounded-xl items-center justify-center">
            <Smartphone
              size={20}
              color="#E11D48"
              strokeWidth={1.75}
            />
          </View>

          <View className="flex-1">
            <Text className="text-xs font-black text-slate-900">
              Instant Emergency Payments
            </Text>

            <Text className="text-[11px] text-slate-500 leading-snug mt-0.5">
              Your wallet allows SafeSync to process emergency service
              payments quickly when help is requested.
            </Text>
          </View>
        </View>

        {/* How Wallet Works */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mt-4">
          <Text className="text-sm font-black text-slate-900 mb-3">
            How Your Wallet Works
          </Text>

          <View className="gap-3">
            <View className="flex-row items-start gap-3">
              <View className="w-7 h-7 rounded-full bg-rose-50 items-center justify-center">
                <Text className="text-[11px] font-black text-rose-600">
                  1
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900">
                  Add Funds
                </Text>

                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Top up your SafeSync wallet securely using M-PESA.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-7 h-7 rounded-full bg-rose-50 items-center justify-center">
                <Text className="text-[11px] font-black text-rose-600">
                  2
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900">
                  Request Emergency Help
                </Text>

                <Text className="text-[11px] text-slate-500 mt-0.5">
                  SafeSync uses your wallet to facilitate eligible emergency
                  service payments.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-7 h-7 rounded-full bg-rose-50 items-center justify-center">
                <Text className="text-[11px] font-black text-rose-600">
                  3
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900">
                  Track Transactions
                </Text>

                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Every wallet activity is recorded for transparency and
                  accountability.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mt-4">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text className="text-sm font-black text-slate-900">
              Wallet & Transaction History
            </Text>

            <Text className="text-[11px] text-slate-400 font-semibold">
              Audited
            </Text>
          </View>

          <View className="gap-2.5">
            {transactions.map((tx) => (
              <View
                key={tx.id}
                className="flex-row items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View
                    className={`w-8 h-8 rounded-lg items-center justify-center ${
                      tx.kind === "credit"
                        ? "bg-emerald-50"
                        : "bg-rose-50"
                    }`}
                  >
                    {tx.kind === "credit" ? (
                      <ArrowDownRight
                        size={16}
                        color="#059669"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <ArrowUpRight
                        size={16}
                        color="#E11D48"
                        strokeWidth={1.75}
                      />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-900">
                      {tx.label}
                    </Text>

                    <Text className="text-[10px] text-slate-400">
                      {tx.date} · {tx.id}
                    </Text>
                  </View>
                </View>

                <View className="items-end ml-2">
                  <Text
                    className={`text-xs font-black ${
                      tx.kind === "credit"
                        ? "text-emerald-600"
                        : "text-slate-900"
                    }`}
                  >
                    {tx.kind === "credit" ? "+" : "-"}KES{" "}
                    {tx.amount.toLocaleString()}
                  </Text>

                  <Text
                    className={`text-[9px] font-bold ${
                      tx.status === "Completed"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {tx.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Top Up Modal */}
      <Modal
        visible={showTopUp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTopUp(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white w-full max-w-sm rounded-3xl p-5 border border-slate-200 gap-4 shadow-xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center gap-2">
                <Smartphone
                  size={18}
                  color="#E11D48"
                  strokeWidth={1.75}
                />

                <Text className="text-sm font-black text-slate-900">
                  M-PESA Wallet Top-Up
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowTopUp(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-slate-500">
              Enter the amount you want to add to your SafeSync wallet.
              An M-PESA prompt will be sent to your linked phone.
            </Text>

            {/* Amount */}
            <View className="gap-1">
              <Text className="text-[11px] font-bold text-slate-500 uppercase">
                Amount (KES)
              </Text>

              <TextInput
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="number-pad"
                className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 font-bold text-base"
              />
            </View>

            {/* Quick Presets */}
            <View className="flex-row gap-2">
              {["2000", "5000", "10000"].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setTopUpAmount(preset)}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 items-center"
                >
                  <Text className="text-xs font-bold text-slate-700">
                    +{preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleTopUpSubmit}
              disabled={isProcessing}
              activeOpacity={0.85}
              className="h-12 bg-rose-600 rounded-xl items-center justify-center active:bg-rose-700 shadow-sm mt-1"
            >
              <Text className="text-white font-bold text-sm">
                {isProcessing
                  ? "Sending STK Push..."
                  : "Send M-PESA Prompt"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Emergency Button */}
      <View className="absolute bottom-4 left-4 right-4 z-50">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleRequestEmergency}
          className="h-14 bg-rose-600 rounded-2xl flex-row items-center justify-between px-4 shadow-lg border border-rose-500 active:bg-rose-700"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center">
              <ShieldAlert
                size={20}
                color="#ffffff"
                strokeWidth={2}
              />
            </View>

            <View>
              <Text className="text-white font-black text-xs tracking-wider">
                REQUEST EMERGENCY HELP
              </Text>

              <Text className="text-rose-100 text-[10px]">
                Instant 1-Tap ALS Ambulance & Squad Dispatch
              </Text>
            </View>
          </View>

          <View className="bg-white/20 px-2.5 py-1 rounded-lg">
            <Text className="text-white text-[11px] font-black">
              SOS
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}