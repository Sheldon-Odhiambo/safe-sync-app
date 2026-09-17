import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Heart,
  Flame,
  Car,
  ShieldAlert,
  MapPin,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from "lucide-react-native";

interface EmergencyType {
  id: string;
  label: string;
  hint: string;
  Icon: any;
  color: string;
  badge: string;
}

const EMERGENCY_TYPES: EmergencyType[] = [
  {
    id: "medical",
    label: "Medical Emergency",
    hint: "Cardiac arrest, acute trauma, seizures, stroke, or severe asthma.",
    Icon: Heart,
    color: "#E11D48",
    badge: "ALS Priority 1",
  },
  {
    id: "fire",
    label: "Fire & Explosion",
    hint: "Active structure fires, chemical/gas leaks, electrical hazards.",
    Icon: Flame,
    color: "#EA580C",
    badge: "Engine + Water Tender",
  },
  {
    id: "collision",
    label: "Traffic Collision",
    hint: "High-speed crash, rollover, trapped victims requiring extrication.",
    Icon: Car,
    color: "#D97706",
    badge: "Rescue Truck + Medic",
  },
];

export default function EmergencyScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("medical");
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [patientConscious, setPatientConscious] = useState<boolean>(true);

  const selectedCategory =
    EMERGENCY_TYPES.find((item) => item.id === selectedId) || EMERGENCY_TYPES[0];

  const handleConfirmDispatch = () => {
    setIsDispatching(true);

    // Simulate instant dispatch coordination with Nairobi Metro EMS
    setTimeout(() => {
      setIsDispatching(false);
      // Navigate to live ambulance telemetry map
      router.replace("/track");
    }, 1200);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="size-9 rounded-xl bg-slate-100 items-center justify-center border border-slate-200"
        >
          <ArrowLeft size={18} color="#0F172A" strokeWidth={1.75} />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-base font-black text-slate-900">Request Emergency Squad</Text>
          <View className="flex-row items-center gap-1">
            <View className="size-1.5 rounded-full bg-rose-600" />
            <Text className="text-[11px] text-rose-600 font-bold tracking-wide">
              SOS PRIORITY CHANNEL
            </Text>
          </View>
        </View>

        <View className="size-9" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        className="gap-4"
      >
        {/* Step 1: Category Selection */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-black text-slate-900">
              Step 1: Select Incident Category
            </Text>
            <Text className="text-[11px] font-semibold text-slate-400">Tap to choose</Text>
          </View>

          <View className="gap-2.5">
            {EMERGENCY_TYPES.map((type) => {
              const isSelected = selectedId === type.id;
              const { Icon } = type;

              return (
                <TouchableOpacity
                  key={type.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedId(type.id)}
                  className={`flex-row items-start gap-3 p-3.5 rounded-2xl border ${
                    isSelected
                      ? "bg-rose-50/70 border-rose-600 shadow-xs"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <View
                    className={`size-10 rounded-xl items-center justify-center ${
                      isSelected ? "bg-rose-600" : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      size={18}
                      color={isSelected ? "#ffffff" : type.color}
                      strokeWidth={1.75}
                    />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-slate-900">{type.label}</Text>
                      {isSelected && (
                        <CheckCircle2 size={16} color="#E11D48" strokeWidth={2} />
                      )}
                    </View>

                    <Text className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {type.hint}
                    </Text>

                    <View className="flex-row items-center gap-1.5 mt-1.5">
                      <Radio size={10} color="#94A3B8" />
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {type.badge}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Location Verification */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-black text-slate-900">Step 2: Incident Coordinates</Text>
            <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-emerald-700">GPS Locked ±4m</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <View className="size-9 bg-rose-100 rounded-xl items-center justify-center">
              <MapPin size={18} color="#E11D48" strokeWidth={1.75} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-900">
                Wood Avenue, Kilimani, Nairobi
              </Text>
              <Text className="text-[11px] text-slate-500">
                Lat: -1.2921 · Lng: 36.8219 (Roadside / Residence)
              </Text>
            </View>
          </View>
        </View>

        {/* Step 3: Triage / Patient State */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3 shadow-xs">
          <Text className="text-sm font-black text-slate-900">Step 3: Patient State</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPatientConscious(true)}
              className={`flex-1 p-3 rounded-xl border items-center ${
                patientConscious
                  ? "bg-emerald-50 border-emerald-500"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  patientConscious ? "text-emerald-700" : "text-slate-600"
                }`}
              >
                Conscious & Breathing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPatientConscious(false)}
              className={`flex-1 p-3 rounded-xl border items-center ${
                !patientConscious
                  ? "bg-rose-50 border-rose-500"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  !patientConscious ? "text-rose-700" : "text-slate-600"
                }`}
              >
                Unconscious / Critical
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dispatch Action Card */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5 shadow-sm">
          <View className="flex-row items-center gap-2.5">
            <View className="size-8 rounded-lg bg-rose-50 items-center justify-center">
              <ShieldAlert size={16} color="#E11D48" strokeWidth={1.75} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-900">Priority Automated Dispatch</Text>
              <Text className="text-[11px] text-slate-500">
                Nearest ALS Unit KDA 241X on standby at Nairobi Hospital (1.2 km away)
              </Text>
            </View>
          </View>

          <TouchableOpacity
            disabled={isDispatching}
            activeOpacity={0.9}
            onPress={handleConfirmDispatch}
            className="h-14 bg-rose-600 rounded-2xl flex-row items-center justify-center gap-2.5 active:bg-rose-700 shadow-sm"
          >
            {isDispatching ? (
              <>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-white font-black text-sm tracking-wider">
                  DISPATCHING EMERGENCY SQUAD...
                </Text>
              </>
            ) : (
              <>
                <Send size={18} color="#ffffff" strokeWidth={1.75} />
                <Text className="text-white font-black text-sm tracking-wider">
                  CONFIRM & DISPATCH 
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center justify-center gap-1.5">
            <AlertTriangle size={12} color="#94A3B8" />
            <Text className="text-[10px] text-slate-400 text-center">
              Direct telemetry link to central EMS dispatch console.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}