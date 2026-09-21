import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Building2,
  Ambulance,
  Flame,
  ShieldCheck,
  Radio,
  Gauge,
  MapPin,
  Clock,
  LogOut,
  Users,
} from "lucide-react-native";

interface FleetUnit {
  id: string;
  callsign: string;
  type: "Ambulance" | "Fire";
  station: string;
  status: "Available" | "Dispatched" | "Refueling";
  driver: string;
  speed: string;
  fuel: string;
}

const FLEET_ROSTER: FleetUnit[] = [
  {
    id: "U-1",
    callsign: "ALS Unit KDA 241X",
    type: "Ambulance",
    station: "Nairobi Hospital Post",
    status: "Dispatched",
    driver: "A. Mwangi",
    speed: "58 km/h",
    fuel: "82%",
  },
  {
    id: "U-2",
    callsign: "Fire Tender KCB 109E",
    type: "Fire",
    station: "Kilimani Central",
    status: "Available",
    driver: "D. Kiprop",
    speed: "0 km/h",
    fuel: "95%",
  },
  {
    id: "U-3",
    callsign: "Red Cross ALS 04",
    type: "Ambulance",
    station: "Kenyatta National Station",
    status: "Available",
    driver: "J. Mutua",
    speed: "0 km/h",
    fuel: "74%",
  },
  {
    id: "U-4",
    callsign: "Heavy Rescue KBA 772M",
    type: "Fire",
    station: "Dennis Pritt Yard",
    status: "Refueling",
    driver: "S. Omondi",
    speed: "0 km/h",
    fuel: "28%",
  },
];

export default function AdminScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <StatusBar barStyle="dark-content" />

      {/* Admin Top Header */}
      <View className="px-5 py-3.5 bg-white border-b border-slate-200 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="w-10 h-10 rounded-2xl bg-slate-900 items-center justify-center">
            <Building2 size={20} color="#ffffff" strokeWidth={1.8} />
          </View>
          <View>
            <Text className="text-base font-black text-slate-900">SafeSync Dispatch CAD</Text>
            <Text className="text-xs text-slate-500">Nairobi Metro Emergency Operations</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/signin")}
          className="w-10 h-10 rounded-xl border border-slate-200 bg-white items-center justify-center active:bg-slate-50"
        >
          <LogOut size={16} color="#334155" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        className="gap-4"
      >
        {/* CAD KPI Overview */}
        <View className="flex-row gap-2.5">
          <View className="flex-1 bg-white p-4 rounded-3xl border border-slate-200 gap-1 shadow-xs">
            <Text className="text-[10px] font-bold text-slate-400 uppercase">Active Units</Text>
            <Text className="text-2xl font-black text-slate-900">4 / 4</Text>
            <Text className="text-[10px] text-emerald-600 font-bold">100% Online</Text>
          </View>

          <View className="flex-1 bg-white p-4 rounded-3xl border border-slate-200 gap-1 shadow-xs">
            <Text className="text-[10px] font-bold text-slate-400 uppercase">Avg Response</Text>
            <Text className="text-2xl font-black text-rose-600">4.8 m</Text>
            <Text className="text-[10px] text-slate-500 font-semibold">Sub-6m Target</Text>
          </View>

          <View className="flex-1 bg-white p-4 rounded-3xl border border-slate-200 gap-1 shadow-xs">
            <Text className="text-[10px] font-bold text-slate-400 uppercase">Escrow Held</Text>
            <Text className="text-lg font-black text-slate-900">KES 45k</Text>
            <Text className="text-[10px] text-emerald-600 font-bold">Audited</Text>
          </View>
        </View>

        {/* Live Fleet Roster */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5 shadow-xs">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Radio size={14} color="#059669" />
              <Text className="text-sm font-black text-slate-900">Active Fleet Telemetry</Text>
            </View>
            <Text className="text-xs text-slate-400 font-bold">Live GPS</Text>
          </View>

          <View className="gap-2.5">
            {FLEET_ROSTER.map((unit) => (
              <View
                key={unit.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 gap-2.5"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={`w-9 h-9 rounded-xl items-center justify-center ${
                        unit.type === "Ambulance" ? "bg-rose-100" : "bg-amber-100"
                      }`}
                    >
                      {unit.type === "Ambulance" ? (
                        <Ambulance size={18} color="#E11D48" />
                      ) : (
                        <Flame size={18} color="#D97706" />
                      )}
                    </View>
                    <View>
                      <Text className="text-xs font-black text-slate-900">{unit.callsign}</Text>
                      <Text className="text-[10px] text-slate-500">{unit.station}</Text>
                    </View>
                  </View>

                  <View
                    className={`px-2.5 py-0.5 rounded-full border ${
                      unit.status === "Dispatched"
                        ? "bg-rose-50 border-rose-200"
                        : unit.status === "Available"
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-slate-100 border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        unit.status === "Dispatched"
                          ? "text-rose-700"
                          : unit.status === "Available"
                          ? "text-emerald-700"
                          : "text-slate-600"
                      }`}
                    >
                      {unit.status}
                    </Text>
                  </View>
                </View>

                {/* Telemetry Stats Bar */}
                <View className="flex-row items-center justify-between pt-2 border-t border-slate-200/80">
                  <View className="flex-row items-center gap-1">
                    <Users size={11} color="#64748B" />
                    <Text className="text-[11px] text-slate-600 font-semibold">{unit.driver}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Gauge size={11} color="#64748B" />
                    <Text className="text-[11px] text-slate-600 font-semibold">{unit.speed}</Text>
                  </View>
                  <Text className="text-[11px] font-bold text-slate-700">Fuel {unit.fuel}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}