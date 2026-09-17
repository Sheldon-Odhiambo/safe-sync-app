import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Ambulance,
  Navigation,
  PhoneCall,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Volume2,
  VolumeX,
  MapPin,
  Clock,
  LogOut,
} from "lucide-react-native";

export default function ResponderScreen() {
  const router = useRouter();
  const [dutyStatus, setDutyStatus] = useState<"standby" | "enroute" | "scene">("enroute");
  const [sirensActive, setSirensActive] = useState(true);

  // Active Emergency Callout
  const activeCall = {
    incidentId: "SOS-8419",
    type: "Critical Cardiac / Respiratory",
    citizenName: "Kevin Mensah",
    phone: "+254 712 345 678",
    location: "Wood Ave, Kilimani, Nairobi",
    destination: "Nairobi Hospital A&E",
    distance: "1.2 km",
    eta: "3 mins",
    bloodGroup: "O+",
    allergies: "Penicillin, Latex",
    conscious: true,
  };

  const handleLaunchTurnByTurn = () => {
    // Open in native Google Maps or Apple Maps
    Linking.openURL("https://maps.google.com/?q=-1.2921,36.8219");
  };

  const handleCallCitizen = () => {
    Linking.openURL(`tel:${activeCall.phone}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <StatusBar barStyle="light-content" />

      {/* Responder Tactical Header */}
      <View className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="w-10 h-10 rounded-2xl bg-rose-600 items-center justify-center">
            <Ambulance size={20} color="#ffffff" strokeWidth={1.8} />
          </View>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base font-black text-white">ALS Unit KDA 241X</Text>
              <View className="bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                <Text className="text-[9px] font-black text-emerald-400">IN-CAB</Text>
              </View>
            </View>
            <Text className="text-[10px] text-slate-400">Lead: Paramedic Mwangi · Nairobi Metro</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/signin")}
          className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 items-center justify-center"
        >
          <LogOut size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        className="gap-4"
      >
        {/* Duty Status Selector */}
        <View className="bg-slate-800/80 rounded-3xl p-4 border border-slate-700 gap-2.5">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Vehicle Dispatch State
          </Text>
          <View className="flex-row gap-2">
            {[
              { id: "standby", label: "Standby", color: "text-slate-300" },
              { id: "enroute", label: "En Route (Code 3)", color: "text-rose-400" },
              { id: "scene", label: "At Scene", color: "text-emerald-400" },
            ].map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => setDutyStatus(st.id as any)}
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  dutyStatus === st.id
                    ? "bg-slate-700 border-rose-500"
                    : "bg-slate-800 border-slate-700"
                }`}
              >
                <Text
                  className={`text-xs font-black ${
                    dutyStatus === st.id ? "text-white" : "text-slate-400"
                  }`}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Active Emergency Callout Banner */}
        <View className="bg-rose-950/40 rounded-3xl p-5 border border-rose-500/50 gap-3.5 shadow-lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <Text className="text-xs font-black text-rose-400 uppercase tracking-wider">
                ACTIVE CAD DISPATCH #{activeCall.incidentId}
              </Text>
            </View>

            {/* Siren Toggle */}
            <TouchableOpacity
              onPress={() => setSirensActive(!sirensActive)}
              className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                sirensActive
                  ? "bg-rose-600/30 border-rose-500"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              {sirensActive ? (
                <Volume2 size={12} color="#F43F5E" />
              ) : (
                <VolumeX size={12} color="#94A3B8" />
              )}
              <Text className="text-[10px] font-black text-white">
                {sirensActive ? "SIRENS ON" : "SIRENS OFF"}
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-xl font-black text-white">{activeCall.type}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              Target: {activeCall.citizenName} · {activeCall.location}
            </Text>
          </View>

          {/* Telemetry Bar */}
          <View className="flex-row items-center justify-between bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <View className="flex-row items-center gap-1.5">
              <Clock size={14} color="#F43F5E" />
              <Text className="text-sm font-black text-rose-400">ETA {activeCall.eta}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Navigation size={14} color="#38BDF8" />
              <Text className="text-sm font-bold text-slate-200">{activeCall.distance}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Radio size={14} color="#10B981" />
              <Text className="text-xs font-bold text-emerald-400">Telemetry Live</Text>
            </View>
          </View>

          {/* In-Cab Action Buttons */}
          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity
              onPress={handleLaunchTurnByTurn}
              className="flex-1 h-12 bg-rose-600 rounded-xl flex-row items-center justify-center gap-2 active:bg-rose-700"
            >
              <Navigation size={16} color="#ffffff" strokeWidth={2} />
              <Text className="text-white font-black text-xs uppercase">Turn-By-Turn GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCallCitizen}
              className="w-12 h-12 bg-slate-800 rounded-xl items-center justify-center border border-slate-700 active:bg-slate-700"
            >
              <PhoneCall size={18} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pre-Arrival Patient Medical Profile */}
        <View className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Heart size={16} color="#F43F5E" />
              <Text className="text-xs font-black text-white uppercase tracking-wider">
                Pre-Arrival Patient Triage
              </Text>
            </View>
            <View className="bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <Text className="text-[10px] font-bold text-emerald-400">Conscious</Text>
            </View>
          </View>

          <View className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-400">Blood Group</Text>
              <Text className="text-xs font-black text-white">{activeCall.bloodGroup}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-400">Known Allergies</Text>
              <Text className="text-xs font-bold text-rose-400">{activeCall.allergies}</Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-slate-800">
              <Text className="text-xs text-slate-400">Destination Hospital</Text>
              <Text className="text-xs font-bold text-slate-200">{activeCall.destination}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}