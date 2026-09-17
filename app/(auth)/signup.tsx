import { useRouter } from "expo-router";
import {
  ArrowRight,
  Building2,
  Check,
  Heart,
  Radio,
  ShieldPlus,
  User,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GoogleButton } from "../../components/Googlebutton";

type AccountType = "citizen" | "organization";

export default function SignUpScreen() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("citizen");

  // Citizen Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [kinContact, setKinContact] = useState("");

  // Organization Form State
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("Private Ambulance Fleet");
  const [fleetCount, setFleetCount] = useState("4");
  const [dispatchPhone, setDispatchPhone] = useState("");

  // Terms Agreement
  const [agreedTerms, setAgreedTerms] = useState(true);

  const handleCompleteSignUp = () => {
    if (!agreedTerms) {
      Alert.alert("Notice", "Please accept the Emergency Terms of Service to proceed.");
      return;
    }
    // Success redirect
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} className="gap-5">
        {/* Brand Header */}
        <View className="items-center gap-2">
          <View className="size-11 rounded-xl bg-rose-600 items-center justify-center shadow-xs">
            <ShieldPlus size={22} color="#ffffff" strokeWidth={1.75} />
          </View>
          <Text className="text-2xl font-black text-slate-900">SafeSync</Text>
          <Text className="text-xs text-slate-500 text-center max-w-xs">
            Join Nairobi's synchronized emergency network for rapid paramedic dispatch or fleet telemetry.
          </Text>
        </View>

        <View className="bg-white rounded-3xl p-6 border border-slate-200 gap-5 shadow-sm">
          {/* Account Type Selector Tabs */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-slate-700">Select Account Type</Text>
            <View className="flex-row gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setAccountType("citizen")}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
                  accountType === "citizen" ? "bg-white shadow-xs" : ""
                }`}
              >
                <User
                  size={15}
                  color={accountType === "citizen" ? "#E11D48" : "#64748B"}
                  strokeWidth={1.75}
                />
                <Text
                  className={`text-xs font-bold ${
                    accountType === "citizen" ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  Citizen
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setAccountType("organization")}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
                  accountType === "organization" ? "bg-white shadow-xs" : ""
                }`}
              >
                <Building2
                  size={15}
                  color={accountType === "organization" ? "#059669" : "#64748B"}
                  strokeWidth={1.75}
                />
                <Text
                  className={`text-xs font-bold ${
                    accountType === "organization" ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  Organization
                </Text>
              </TouchableOpacity>
            </View>

            {/* Context Badge */}
            <View className="flex-row items-center gap-2 mt-1">
              {accountType === "citizen" ? (
                <>
                  <Heart size={14} color="#E11D48" strokeWidth={1.75} />
                  <Text className="text-[11px] text-slate-500 flex-1">
                    Includes M-PESA escrow, live GPS beacon & clinical triage records.
                  </Text>
                </>
              ) : (
                <>
                  <Radio size={14} color="#0284C7" strokeWidth={1.75} />
                  <Text className="text-[11px] text-slate-500 flex-1">
                    Includes central dispatch console, fleet tracking & paramedic shifts.
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Google Sign Up */}
          <View className="gap-3">
            <GoogleButton
              title={
                accountType === "citizen"
                  ? "Sign up with Google (Citizen)"
                  : "Register Org with Google"
              }
              onPress={() => router.replace("/(tabs)")}
            />

            <View className="flex-row items-center justify-center gap-2">
              <View className="flex-1 h-px bg-slate-200" />
              <Text className="text-[11px] font-bold text-slate-400 uppercase">
                Or fill registration details
              </Text>
              <View className="flex-1 h-px bg-slate-200" />
            </View>
          </View>

          {/* Dynamic Form: Citizen */}
          {accountType === "citizen" && (
            <View className="gap-3">
              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Full Legal Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Kevin Mensah"
                  placeholderTextColor="#94A3B8"
                  className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 text-sm"
                />
              </View>

              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Phone Number (M-PESA)</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+254 712 345 678"
                  placeholderTextColor="#94A3B8"
                  className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 text-sm"
                />
              </View>

              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Primary Residence</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Kilimani, Wood Avenue"
                  placeholderTextColor="#94A3B8"
                  className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 text-sm"
                />
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 gap-1">
                  <Text className="text-xs font-bold text-slate-700">Blood Group</Text>
                  <TextInput
                    value={bloodGroup}
                    onChangeText={setBloodGroup}
                    placeholder="e.g. O+, A-"
                    placeholderTextColor="#94A3B8"
                    className="h-11 rounded-xl border border-slate-200 px-3 bg-slate-50 text-slate-900 text-sm"
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-xs font-bold text-slate-700">Next of Kin Phone</Text>
                  <TextInput
                    value={kinContact}
                    onChangeText={setKinContact}
                    keyboardType="phone-pad"
                    placeholder="+254 7..."
                    placeholderTextColor="#94A3B8"
                    className="h-11 rounded-xl border border-slate-200 px-3 bg-slate-50 text-slate-900 text-sm"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Dynamic Form: Organization */}
          {accountType === "organization" && (
            <View className="gap-3">
              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Organization Name</Text>
                <TextInput
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder="e.g. Nairobi Metro Rescue & EMS"
                  placeholderTextColor="#94A3B8"
                  className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 text-sm"
                />
              </View>

              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Entity Type</Text>
                <TextInput
                  value={orgType}
                  onChangeText={setOrgType}
                  placeholder="Private Fleet / Hospital / Fire"
                  placeholderTextColor="#94A3B8"
                  className="h-11 rounded-xl border border-slate-200 px-3.5 bg-slate-50 text-slate-900 text-sm"
                />
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 gap-1">
                  <Text className="text-xs font-bold text-slate-700">Active Units</Text>
                  <TextInput
                    value={fleetCount}
                    onChangeText={setFleetCount}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor="#94A3B8"
                    className="h-11 rounded-xl border border-slate-200 px-3 bg-slate-50 text-slate-900 text-sm"
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-xs font-bold text-slate-700">Dispatch Hotline</Text>
                  <TextInput
                    value={dispatchPhone}
                    onChangeText={setDispatchPhone}
                    keyboardType="phone-pad"
                    placeholder="+254 20..."
                    placeholderTextColor="#94A3B8"
                    className="h-11 rounded-xl border border-slate-200 px-3 bg-slate-50 text-slate-900 text-sm"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Terms Agreement Checkbox */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setAgreedTerms(!agreedTerms)}
            className="flex-row items-center gap-2.5 mt-1"
          >
            <View
              className={`size-5 rounded-md border items-center justify-center ${
                agreedTerms ? "bg-rose-600 border-rose-600" : "bg-white border-slate-300"
              }`}
            >
              {agreedTerms && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text className="text-xs text-slate-500 flex-1 leading-snug">
              I certify provided clinical/fleet data is accurate under Kenyan Emergency Services Act 2020.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCompleteSignUp}
            className="h-12 bg-rose-600 rounded-xl flex-row items-center justify-center gap-2 active:bg-rose-700 shadow-sm mt-1"
          >
            <Text className="text-white font-bold text-sm">
              {accountType === "citizen"
                ? "Complete Citizen Registration"
                : "Register Organization & Console"}
            </Text>
            <ArrowRight size={15} color="#ffffff" strokeWidth={1.75} />
          </TouchableOpacity>

          {/* Link to Sign In */}
          <TouchableOpacity onPress={() => router.push("/(auth)/signin")}>
            <Text className="text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Text className="font-bold text-rose-600">Sign In here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}