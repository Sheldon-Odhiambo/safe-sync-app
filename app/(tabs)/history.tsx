import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Heart,
  Flame,
  Car,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Download,
  X,
  FileText,
  Ambulance,
  PhoneCall,
} from "lucide-react-native";

// Import your persistent header
import { SafeSyncHeader } from "../../components/SafeSyncHeader";

interface IncidentRecord {
  id: string;
  type: "medical" | "fire" | "collision" | "security";
  title: string;
  date: string;
  time: string;
  location: string;
  unitAssigned: string;
  leadResponder: string;
  destination: string;
  responseDuration: string;
  status: "Resolved" | "Completed" | "Dispatched";
  escrowFee: string;
  escrowId: string;
  clinicalNotes: string;
}

const INCIDENT_HISTORY: IncidentRecord[] = [
  {
    id: "INC-9042",
    type: "medical",
    title: "Acute Asthma & Respiratory Distress",
    date: "28 Aug 2026",
    time: "14:22 EAT",
    location: "Wood Ave, Kilimani, Nairobi",
    unitAssigned: "ALS Unit KDA 241X",
    leadResponder: "Paramedic A. Mwangi",
    destination: "Nairobi Hospital A&E",
    responseDuration: "5 mins 40 sec",
    status: "Completed",
    escrowFee: "KES 4,200",
    escrowId: "MPESA-QC78219",
    clinicalNotes: "Nebulizer administered en route. Patient vitals stabilized. Direct handoff to emergency triage team.",
  },
  {
    id: "INC-8830",
    type: "collision",
    title: "Two-Vehicle Intersection Impact",
    date: "12 Aug 2026",
    time: "19:05 EAT",
    location: "Ring Rd / Argwings Kodhek Junction",
    unitAssigned: "Rescue Squad KCB 109E",
    leadResponder: "Capt. D. Kiprop",
    destination: "Kenyatta National Hospital",
    responseDuration: "7 mins 15 sec",
    status: "Resolved",
    escrowFee: "KES 6,500",
    escrowId: "MPESA-QA99412",
    clinicalNotes: "Minor lacerations treated on scene. Cervical spine cleared. Scene handed over to Traffic Police.",
  },
  {
    id: "INC-7412",
    type: "fire",
    title: "Electrical Meter Box Fire",
    date: "19 Jul 2026",
    time: "08:40 EAT",
    location: "Dennis Pritt Rd, Kilimani",
    unitAssigned: "Kilimani Tender KBA 772M",
    leadResponder: "Lt. S. Omondi",
    destination: "On-site Extinguishment",
    responseDuration: "6 mins 10 sec",
    status: "Resolved",
    escrowFee: "KES 5,000",
    escrowId: "MPESA-PX66104",
    clinicalNotes: "CO2 dry powder suppression deployed. Power mains disconnected. Zero casualty exposure.",
  },
  {
    id: "INC-6920",
    type: "medical",
    title: "Suspected Cardiac Event (Pre-infarct)",
    date: "02 Jun 2026",
    time: "21:15 EAT",
    location: "Rose Avenue, Kilimani",
    unitAssigned: "Red Cross ALS 04",
    leadResponder: "Paramedic J. Mutua",
    destination: "Aga Khan University Hospital",
    responseDuration: "4 mins 50 sec",
    status: "Completed",
    escrowFee: "KES 4,800",
    escrowId: "MPESA-PB12948",
    clinicalNotes: "12-lead ECG completed. Aspirin & telemetry transmitted ahead to catheterization lab.",
  },
];

export default function HistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);

  const filteredIncidents = INCIDENT_HISTORY.filter((item) => {
    if (activeFilter === "all") return true;
    return item.type === activeFilter;
  });

  const handleRequestEmergency = () => {
    router.push("/emergency");
  };

  const getIncidentIcon = (type: IncidentRecord["type"]) => {
    switch (type) {
      case "medical":
        return <Heart size={18} color="#E11D48" strokeWidth={1.75} />;
      case "fire":
        return <Flame size={18} color="#EA580C" strokeWidth={1.75} />;
      case "collision":
        return <Car size={18} color="#D97706" strokeWidth={1.75} />;
      case "security":
        return <ShieldAlert size={18} color="#2563EB" strokeWidth={1.75} />;
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      <StatusBar barStyle="dark-content" />

      {/* 1. Persistent Top Header */}
      <SafeSyncHeader title="SafeSync" />

      {/* 2. Scrollable Body */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        className="gap-4"
      >
        {/* Screen Title & Subtitle */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs gap-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-black text-slate-900">Incident Logs</Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Audited Emergency Dispatches & Hospital Handoffs
              </Text>
            </View>
            <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Text className="text-[11px] font-bold text-emerald-700">All Clear</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <View className="flex-row gap-1.5 pt-2 border-t border-slate-100">
            {[
              { id: "all", label: "All Logs" },
              { id: "medical", label: "Medical" },
              { id: "fire", label: "Fire" },
              { id: "collision", label: "Collision" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl border ${
                  activeFilter === tab.id
                    ? "bg-rose-600 border-rose-600"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeFilter === tab.id ? "text-white" : "text-slate-700"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Incident List */}
        <View className="gap-3">
          {filteredIncidents.map((incident) => (
            <TouchableOpacity
              key={incident.id}
              activeOpacity={0.85}
              onPress={() => setSelectedIncident(incident)}
              className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5 shadow-xs"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 items-center justify-center">
                    {getIncidentIcon(incident.type)}
                  </View>
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-black text-slate-900 leading-snug">
                      {incident.title}
                    </Text>
                    <Text className="text-[11px] text-slate-400 mt-0.5">
                      {incident.id} · {incident.date} at {incident.time}
                    </Text>
                  </View>
                </View>

                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <CheckCircle2 size={10} color="#059669" />
                  <Text className="text-[10px] font-bold text-emerald-700">
                    {incident.status}
                  </Text>
                </View>
              </View>

              {/* Responder & Location Snippet */}
              <View className="bg-slate-50 p-3 rounded-2xl border border-slate-100 gap-1.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5 flex-1">
                    <Ambulance size={13} color="#E11D48" />
                    <Text className="text-xs font-bold text-slate-800">
                      {incident.unitAssigned}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Clock size={11} color="#64748B" />
                    <Text className="text-[11px] font-semibold text-slate-500">
                      ETA {incident.responseDuration}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-1.5">
                  <MapPin size={12} color="#94A3B8" />
                  <Text className="text-[11px] text-slate-500 flex-1" numberOfLines={1}>
                    {incident.location} → {incident.destination}
                  </Text>
                </View>
              </View>

              {/* Card Footer Action */}
              <View className="flex-row items-center justify-between pt-1">
                <Text className="text-xs font-bold text-slate-900">
                  Escrow: <Text className="font-black text-emerald-600">{incident.escrowFee}</Text>
                </Text>

                <View className="flex-row items-center gap-1">
                  <Text className="text-xs font-bold text-rose-600">View Audit Report</Text>
                  <ChevronRight size={14} color="#E11D48" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 3. Incident Audit Details Modal */}
      <Modal visible={!!selectedIncident} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-slate-200 gap-4 max-h-[85%]">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center gap-2.5">
                <View className="w-9 h-9 rounded-xl bg-rose-50 items-center justify-center">
                  <FileText size={18} color="#E11D48" strokeWidth={1.75} />
                </View>
                <View>
                  <Text className="text-base font-black text-slate-900">
                    Emergency Dispatch Report
                  </Text>
                  <Text className="text-[11px] text-slate-400">{selectedIncident?.id}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedIncident(null)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView showsVerticalScrollIndicator={false} className="gap-3.5">
              <View className="gap-1">
                <Text className="text-base font-black text-slate-900">
                  {selectedIncident?.title}
                </Text>
                <Text className="text-xs text-slate-500">
                  {selectedIncident?.date} at {selectedIncident?.time} · {selectedIncident?.location}
                </Text>
              </View>

              {/* Telemetry Block */}
              <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-2.5">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500">Unit Dispatched</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {selectedIncident?.unitAssigned}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500">Lead Paramedic / Captain</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {selectedIncident?.leadResponder}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500">Arrival Duration</Text>
                  <Text className="text-xs font-black text-emerald-600">
                    {selectedIncident?.responseDuration}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500">Destination Handoff</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {selectedIncident?.destination}
                  </Text>
                </View>

                <View className="flex-row justify-between pt-2 border-t border-slate-200">
                  <Text className="text-xs text-slate-500">M-PESA Escrow Ref</Text>
                  <Text className="text-xs font-mono font-bold text-slate-700">
                    {selectedIncident?.escrowId} ({selectedIncident?.escrowFee})
                  </Text>
                </View>
              </View>

              {/* Clinical Handoff Notes */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold text-slate-700 uppercase">
                  Paramedic Field Observations
                </Text>
                <View className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200">
                  <Text className="text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedIncident?.clinicalNotes}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View className="flex-row gap-2 mt-2">
                <TouchableOpacity
                  onPress={() => setSelectedIncident(null)}
                  className="flex-1 h-11 bg-slate-100 rounded-xl items-center justify-center border border-slate-200"
                >
                  <Text className="text-xs font-bold text-slate-700">Close Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedIncident(null)}
                  className="flex-1 h-11 bg-slate-900 rounded-xl flex-row items-center justify-center gap-1.5"
                >
                  <Download size={14} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">Save PDF Audit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Persistent Floating "Request Emergency Help" Button */}
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