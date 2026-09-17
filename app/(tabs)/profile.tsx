import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  Heart,
  Phone,
  Plus,
  Trash2,
  Save,
  ShieldAlert,
} from "lucide-react-native";

import {SafeSyncHeader} from "../../components/SafeSyncHeader";

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export default function ProfileScreen() {
  const router = useRouter();

  // Personal information
  const [name, setName] = useState("Kevin Mensah");
  const [phone, setPhone] = useState("+254 712 345 678");
  const [nationalId, setNationalId] = useState("32984102");
  const [address, setAddress] = useState("Wood Ave, Kilimani, Nairobi");

  // Medical information
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [allergies, setAllergies] = useState<string[]>([
    "Penicillin",
    "Latex",
  ]);
  const [conditions, setConditions] = useState<string[]>([
    "Mild Asthma",
  ]);

  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");

  // Emergency contacts
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    {
      id: "1",
      name: "Grace Mensah",
      relationship: "Spouse",
      phone: "+254 723 456 789",
    },
    {
      id: "2",
      name: "Dr. Peter Otieno",
      relationship: "Family Physician",
      phone: "+254 734 567 890",
    },
  ]);

  const [newContactName, setNewContactName] = useState("");
  const [newContactRelationship, setNewContactRelationship] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const addAllergy = () => {
    const value = newAllergy.trim();

    if (!value) return;

    setAllergies((prev) => [...prev, value]);
    setNewAllergy("");
  };

  const removeAllergy = (index: number) => {
    setAllergies((prev) => prev.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    const value = newCondition.trim();

    if (!value) return;

    setConditions((prev) => [...prev, value]);
    setNewCondition("");
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const addContact = () => {
    if (
      !newContactName.trim() ||
      !newContactRelationship.trim() ||
      !newContactPhone.trim()
    ) {
      Alert.alert(
        "Incomplete Information",
        "Please enter the contact's name, relationship and phone number."
      );
      return;
    }

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      relationship: newContactRelationship.trim(),
      phone: newContactPhone.trim(),
    };

    setContacts((prev) => [...prev, newContact]);

    setNewContactName("");
    setNewContactRelationship("");
    setNewContactPhone("");
  };

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
  };

  const saveProfile = () => {
    Alert.alert(
      "Profile Saved",
      "Your emergency profile information has been saved."
    );
  };

  const requestEmergency = () => {
    router.push("/emergency");
  };

  return (
    <View className="flex-1 bg-slate-100">
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <SafeSyncHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 120,
        }}
      >
        {/* Page Header */}
        <View className="flex-row items-center justify-between mb-4 px-1">
          <View className="flex-1">
            <Text className="text-xl font-black text-slate-900">
              Emergency Profile
            </Text>

            <Text className="text-xs text-slate-500 mt-1">
              Your information for emergency response
            </Text>
          </View>

          <TouchableOpacity
            onPress={saveProfile}
            activeOpacity={0.85}
            className="bg-rose-600 rounded-xl px-3.5 py-2 flex-row items-center gap-1.5"
          >
            <Save size={15} color="#ffffff" strokeWidth={2} />

            <Text className="text-white text-xs font-bold">
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Information Notice */}
        <View className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
          <View className="flex-row items-start gap-3">
            <View className="w-8 h-8 rounded-lg bg-white items-center justify-center">
              <ShieldAlert
                size={17}
                color="#E11D48"
                strokeWidth={1.8}
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-black text-slate-900">
                Why this information matters
              </Text>

              <Text className="text-[11px] text-slate-600 leading-relaxed mt-1">
                Your profile helps SafeSync provide responders with
                important information when you request emergency help.
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-3 mb-5">
            <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
              <User size={20} color="#334155" strokeWidth={1.8} />
            </View>

            <View>
              <Text className="text-sm font-black text-slate-900">
                Personal Information
              </Text>

              <Text className="text-[11px] text-slate-500 mt-0.5">
                Basic information about you
              </Text>
            </View>
          </View>

          {/* Full Name */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-slate-500 mb-1.5">
              FULL NAME
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900"
            />
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-slate-500 mb-1.5">
              PHONE NUMBER
            </Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Enter your phone number"
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900"
            />
          </View>

          {/* National ID */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-slate-500 mb-1.5">
              NATIONAL ID
            </Text>

            <TextInput
              value={nationalId}
              onChangeText={setNationalId}
              keyboardType="number-pad"
              placeholder="Enter your national ID"
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900"
            />
          </View>

          {/* Address */}
          <View>
            <Text className="text-[11px] font-bold text-slate-500 mb-1.5">
              ADDRESS
            </Text>

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              placeholderTextColor="#94A3B8"
              className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900"
              multiline
            />
          </View>
        </View>

        {/* Medical Information */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-3 mb-5">
            <View className="w-10 h-10 rounded-xl bg-rose-50 items-center justify-center">
              <Heart size={20} color="#E11D48" strokeWidth={1.8} />
            </View>

            <View>
              <Text className="text-sm font-black text-slate-900">
                Medical Information
              </Text>

              <Text className="text-[11px] text-slate-500 mt-0.5">
                Important information for emergency care
              </Text>
            </View>
          </View>

          {/* Blood Group */}
          <View className="mb-5">
            <Text className="text-[11px] font-bold text-slate-500 mb-2">
              BLOOD GROUP
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                (group) => (
                  <TouchableOpacity
                    key={group}
                    onPress={() => setBloodGroup(group)}
                    activeOpacity={0.8}
                    className={`px-4 py-2.5 rounded-xl border ${
                      bloodGroup === group
                        ? "bg-rose-600 border-rose-600"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        bloodGroup === group
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* Allergies */}
          <View className="mb-5">
            <Text className="text-[11px] font-bold text-slate-500 mb-2">
              ALLERGIES
            </Text>

            <View className="gap-2">
              {allergies.map((allergy, index) => (
                <View
                  key={`${allergy}-${index}`}
                  className="flex-row items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5"
                >
                  <Text className="text-xs font-semibold text-slate-800">
                    {allergy}
                  </Text>

                  <TouchableOpacity
                    onPress={() => removeAllergy(index)}
                  >
                    <Trash2
                      size={15}
                      color="#E11D48"
                      strokeWidth={1.8}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View className="flex-row gap-2 mt-2">
              <TextInput
                value={newAllergy}
                onChangeText={setNewAllergy}
                placeholder="Add allergy"
                placeholderTextColor="#94A3B8"
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900"
              />

              <TouchableOpacity
                onPress={addAllergy}
                className="w-10 h-10 rounded-xl bg-slate-900 items-center justify-center"
              >
                <Plus size={17} color="#ffffff" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Medical Conditions */}
          <View>
            <Text className="text-[11px] font-bold text-slate-500 mb-2">
              MEDICAL CONDITIONS
            </Text>

            <View className="gap-2">
              {conditions.map((condition, index) => (
                <View
                  key={`${condition}-${index}`}
                  className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5"
                >
                  <Text className="text-xs font-semibold text-slate-800">
                    {condition}
                  </Text>

                  <TouchableOpacity
                    onPress={() => removeCondition(index)}
                  >
                    <Trash2
                      size={15}
                      color="#64748B"
                      strokeWidth={1.8}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View className="flex-row gap-2 mt-2">
              <TextInput
                value={newCondition}
                onChangeText={setNewCondition}
                placeholder="Add medical condition"
                placeholderTextColor="#94A3B8"
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900"
              />

              <TouchableOpacity
                onPress={addCondition}
                className="w-10 h-10 rounded-xl bg-slate-900 items-center justify-center"
              >
                <Plus size={17} color="#ffffff" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-3 mb-5">
            <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
              <Phone size={20} color="#334155" strokeWidth={1.8} />
            </View>

            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900">
                Emergency Contacts
              </Text>

              <Text className="text-[11px] text-slate-500 mt-0.5">
                People SafeSync can contact when needed
              </Text>
            </View>
          </View>

          {/* Existing Contacts */}
          <View className="gap-3">
            {contacts.map((contact) => (
              <View
                key={contact.id}
                className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-900">
                      {contact.name}
                    </Text>

                    <Text className="text-[10px] text-slate-500 mt-1">
                      {contact.relationship}
                    </Text>

                    <Text className="text-xs font-semibold text-slate-700 mt-2">
                      {contact.phone}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => removeContact(contact.id)}
                    className="w-8 h-8 rounded-lg bg-white items-center justify-center"
                  >
                    <Trash2
                      size={15}
                      color="#E11D48"
                      strokeWidth={1.8}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Add Contact */}
          <View className="border-t border-slate-100 mt-5 pt-5">
            <Text className="text-xs font-black text-slate-900 mb-3">
              Add Emergency Contact
            </Text>

            <TextInput
              value={newContactName}
              onChangeText={setNewContactName}
              placeholder="Full name"
              placeholderTextColor="#94A3B8"
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 mb-2"
            />

            <TextInput
              value={newContactRelationship}
              onChangeText={setNewContactRelationship}
              placeholder="Relationship"
              placeholderTextColor="#94A3B8"
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 mb-2"
            />

            <TextInput
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
              placeholder="Phone number"
              placeholderTextColor="#94A3B8"
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 mb-3"
            />

            <TouchableOpacity
              onPress={addContact}
              activeOpacity={0.85}
              className="h-11 rounded-xl bg-slate-900 flex-row items-center justify-center gap-2"
            >
              <Plus size={16} color="#ffffff" strokeWidth={2} />

              <Text className="text-white text-xs font-bold">
                Add Emergency Contact
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Profile */}
        <TouchableOpacity
          onPress={saveProfile}
          activeOpacity={0.85}
          className="h-12 bg-rose-600 rounded-2xl flex-row items-center justify-center gap-2 mb-4"
        >
          <Save size={17} color="#ffffff" strokeWidth={2} />

          <Text className="text-white font-black text-sm">
            Save Emergency Profile
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Persistent Emergency Button */}
      <View className="absolute bottom-4 left-4 right-4 z-50">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={requestEmergency}
          className="h-14 bg-rose-600 rounded-2xl flex-row items-center justify-between px-4 shadow-lg border border-rose-500"
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
                Instant 1-Tap Emergency Assistance
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