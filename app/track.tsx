import { useRouter } from "expo-router";
import { Ambulance, ArrowLeft, Navigation, PhoneCall } from "lucide-react-native";
import { Linking, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

export default function TrackScreen() {
  const router = useRouter();

  // Nairobi Kilimani coordinates
  const userCoords = { latitude: -1.2921, longitude: 36.8219 };
  const ambulanceCoords = { latitude: -1.2985, longitude: 36.815 };

  const handleCallParamedic = () => {
    Linking.openURL("tel:+254712345678");
  };

  return (
    <View className="flex-1 bg-slate-900">
      {/* Native Map */}
      <MapView
        provider={PROVIDER_DEFAULT}
        className="flex-1 w-full"
        initialRegion={{
          latitude: -1.295,
          longitude: 36.818,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker coordinate={userCoords} title="Your Location" pinColor="#E11D48" />
        <Marker coordinate={ambulanceCoords} title="Ambulance KDA 241X" pinColor="#059669" />
      </MapView>

      {/* Top Header Controls */}
      <SafeAreaView className="absolute top-4 left-4 right-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="size-10 bg-white/95 rounded-full items-center justify-center shadow-md"
        >
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
        </TouchableOpacity>
        <View className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
          <Navigation size={12} color="#38BDF8" />
          <Text className="text-white text-xs font-bold">Speed: 58 km/h · ETA: 3m</Text>
        </View>
      </SafeAreaView>

      {/* Bottom Dispatch Sheet */}
      <View className="bg-white rounded-t-3xl p-5 border-t border-slate-200 gap-4 shadow-xl">
        <View className="flex-row items-center gap-3">
          <View className="size-11 bg-emerald-50 rounded-xl items-center justify-center border border-emerald-100">
            <Ambulance size={22} color="#059669" strokeWidth={1.75} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-black text-slate-900">Unit KDA 241X (ALS Squad)</Text>
            <Text className="text-xs text-slate-500">Lead Paramedic: A. Mwangi · Sirens Active</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCallParamedic}
          className="h-12 bg-emerald-600 rounded-xl flex-row items-center justify-center gap-2 active:bg-emerald-700"
        >
          <PhoneCall size={16} color="#ffffff" strokeWidth={1.75} />
          <Text className="text-white font-bold text-sm">Call Paramedic Directly</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}