import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import {
  ShieldAlert,
  Ambulance,
  Flame,
  Car,
  ChevronRight,
  MapPin,
  Clock,
  Radio,
  Crosshair,
  Navigation,
} from "lucide-react-native";

// Import your header
import { SafeSyncHeader } from "../../components/SafeSyncHeader";

// Nairobi / Kilimani Coordinates
const USER_LOCATION = {
  latitude: -1.2921,
  longitude: 36.8219,
  title: "Your Location (Wood Ave)",
};

const NEARBY_UNITS = [
  {
    id: "unit-1",
    name: "ALS Ambulance KDA 241X",
    facility: "Nairobi Hospital Standby",
    distance: "1.2 km",
    eta: "4 mins",
    type: "ambulance",
    coordinate: { latitude: -1.2975, longitude: 36.816 },
  },
  {
    id: "unit-2",
    name: "Fire Engine KCB 109E",
    facility: "Kilimani Fire Sub-Station",
    distance: "2.1 km",
    eta: "7 mins",
    type: "fire",
    coordinate: { latitude: -1.286, longitude: 36.812 },
  },
  {
    id: "unit-3",
    name: "Red Cross Rescue Unit 04",
    facility: "Kenyatta National Station",
    distance: "3.4 km",
    eta: "11 mins",
    type: "rescue",
    coordinate: { latitude: -1.3005, longitude: 36.828 },
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [mapRef, setMapRef] = useState<MapView | null>(null);

  const handleRequestEmergency = () => {
    router.push("/emergency");
  };

  const handleRecenter = () => {
    mapRef?.animateToRegion(
      {
        latitude: USER_LOCATION.latitude,
        longitude: USER_LOCATION.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      600
    );
  };

  return (
    <View className="flex-1 bg-slate-100">
      <StatusBar barStyle="dark-content" />

      {/* 1. Persistent Top Header */}
      <SafeSyncHeader title="SafeSync" />

      {/* 2. Scrollable Dashboard */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        className="gap-4"
      >
        {/* User Status Card */}
        <View className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-black text-slate-900">Kevin Mensah</Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <MapPin size={12} color="#E11D48" />
              <Text className="text-xs text-slate-500">Wood Ave, Kilimani · GPS ±4m</Text>
            </View>
          </View>

          <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <Text className="text-emerald-700 text-[11px] font-bold">Protected</Text>
          </View>
        </View>

        {/* 3. Live Interactive Map on Top */}
        <View className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
          {/* Map Top Bar */}
          <View className="p-3.5 flex-row items-center justify-between border-b border-slate-100">
            <View className="flex-row items-center gap-2">
              <Radio size={14} color="#059669" />
              <Text className="text-xs font-bold text-slate-800">Live Telemetry Radar</Text>
            </View>
            <View className="bg-slate-100 px-2.5 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-slate-600">3 Responders in Range</Text>
            </View>
          </View>

          {/* Native Map Component */}
          <View className="h-56 w-full relative">
            <MapView
              ref={(ref) => setMapRef(ref)}
              provider={PROVIDER_DEFAULT}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: -1.294,
                longitude: 36.819,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              {/* Citizen Marker (Red) */}
              <Marker
                coordinate={{
                  latitude: USER_LOCATION.latitude,
                  longitude: USER_LOCATION.longitude,
                }}
                title={USER_LOCATION.title}
                pinColor="#E11D48"
              />

              {/* Nearby Ambulance & Rescue Units */}
              {NEARBY_UNITS.map((unit) => (
                <Marker
                  key={unit.id}
                  coordinate={unit.coordinate}
                  title={unit.name}
                  description={`ETA: ${unit.eta}`}
                  pinColor={
                    unit.type === "ambulance"
                      ? "#059669"
                      : unit.type === "fire"
                      ? "#D97706"
                      : "#2563EB"
                  }
                />
              ))}
            </MapView>

            {/* Floating Map Re-center Button */}
            <TouchableOpacity
              onPress={handleRecenter}
              activeOpacity={0.8}
              className="absolute bottom-3 right-3 w-9 h-9 rounded-xl bg-white/95 items-center justify-center shadow-md border border-slate-200"
            >
              <Crosshair size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Nearby Responders Header */}
        <View className="flex-row items-center justify-between mt-1 px-1">
          <Text className="text-sm font-black text-slate-900">Nearby Emergency Units</Text>
          <Text className="text-[11px] text-slate-500 font-medium">Automatic Dispatch Queue</Text>
        </View>

        {/* Responder Cards */}
        <View className="gap-2.5">
          {NEARBY_UNITS.map((unit) => (
            <View
              key={unit.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 gap-3 shadow-xs"
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center ${
                    unit.type === "ambulance"
                      ? "bg-rose-50"
                      : unit.type === "fire"
                      ? "bg-amber-50"
                      : "bg-blue-50"
                  }`}
                >
                  {unit.type === "ambulance" && (
                    <Ambulance size={20} color="#E11D48" strokeWidth={1.75} />
                  )}
                  {unit.type === "fire" && (
                    <Flame size={20} color="#D97706" strokeWidth={1.75} />
                  )}
                  {unit.type === "rescue" && (
                    <Car size={20} color="#2563EB" strokeWidth={1.75} />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-black text-slate-900">{unit.name}</Text>
                  <Text className="text-[11px] text-slate-500">{unit.facility}</Text>
                </View>

                <View className="items-end">
                  <View className="flex-row items-center gap-1">
                    <Clock size={11} color="#E11D48" />
                    <Text className="text-xs font-black text-rose-600">{unit.eta}</Text>
                  </View>
                  <Text className="text-[10px] text-slate-400 font-medium">{unit.distance}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRequestEmergency}
                activeOpacity={0.8}
                className="h-9 bg-slate-50 rounded-xl border border-slate-200 flex-row items-center justify-center gap-1 active:bg-slate-100"
              >
                <Text className="text-xs font-bold text-slate-700">Dispatch This Squad</Text>
                <ChevronRight size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 5. Persistent Floating "Request Emergency Help" Button */}
      <View className="absolute bottom-4 left-4 right-4 z-50">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleRequestEmergency}
          className="h-14 bg-rose-600 rounded-2xl flex-row items-center justify-between px-4 shadow-lg border border-rose-500 active:bg-rose-700"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center">
              <ShieldAlert size={20} color="#ffffff" strokeWidth={2} />
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
            <Text className="text-white text-[11px] font-black">SOS</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}