import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const contacts = [
  {
    name: "Ama Mensah",
    relation: "Spouse",
    phone: "+254 712 345 678",
  },
  {
    name: "Dr. J. Osei",
    relation: "Family doctor",
    phone: "+254 722 221 908",
  },
  {
    name: "Kofi Mensah",
    relation: "Brother",
    phone: "+254 733 664 112",
  },
];

export default function Profile() {
  const [panicMode, setPanicMode] = useState(true);
  const [shareMedical, setShareMedical] = useState(true);
  const [recording, setRecording] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState(true);

  const [firstName, setFirstName] = useState("Kevin");
  const [lastName, setLastName] = useState("Mensah");
  const [dob, setDob] = useState("14 Mar 1992");
  const [language, setLanguage] = useState("English");

  const [bloodGroup, setBloodGroup] = useState("O+");
  const [insurance, setInsurance] = useState("NHIF / AAR Health");
  const [hospital, setHospital] = useState("Lakeview Hospital");
  const [medications, setMedications] = useState("Metformin 500mg");
  const [allergies, setAllergies] = useState(
    "Penicillin, shellfish"
  );

  const handleSaveProfile = () => {
    Alert.alert(
      "Profile saved",
      "Your profile information has been updated successfully."
    );
  };

  const handleAddContact = () => {
    Alert.alert(
      "Add emergency contact",
      "The emergency contact form will be added here."
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* PAGE TITLE */}

      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>Profile</Text>

        <Text style={styles.pageDescription}>
          Shared with the assigned crew only, for the duration of an
          active incident.
        </Text>
      </View>

      {/* ========================================= */}
      {/* PERSONAL DETAILS                          */}
      {/* ========================================= */}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="person-outline"
              size={19}
              color="#DC2626"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Personal details
            </Text>

            <Text style={styles.sectionSubtitle}>
              Your basic personal information
            </Text>
          </View>
        </View>

        <View style={styles.formGrid}>
          <InputField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
          />

          <InputField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
          />

          <InputField
            label="Date of birth"
            value={dob}
            onChangeText={setDob}
          />

          <InputField
            label="Language preference"
            value={language}
            onChangeText={setLanguage}
          />
        </View>
      </View>

      {/* ========================================= */}
      {/* MEDICAL INFORMATION                       */}
      {/* ========================================= */}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="medical-outline"
              size={19}
              color="#DC2626"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Medical information
            </Text>

            <Text style={styles.sectionSubtitle}>
              Important information for emergency responders
            </Text>
          </View>
        </View>

        <View style={styles.formGrid}>
          <InputField
            label="Blood group"
            value={bloodGroup}
            onChangeText={setBloodGroup}
          />

          <InputField
            label="Insurance provider"
            value={insurance}
            onChangeText={setInsurance}
          />

          <InputField
            label="Preferred hospital"
            value={hospital}
            onChangeText={setHospital}
          />

          <InputField
            label="Current medications"
            value={medications}
            onChangeText={setMedications}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Allergies</Text>

          <TextInput
            value={allergies}
            onChangeText={setAllergies}
            multiline
            textAlignVertical="top"
            style={styles.textArea}
            placeholder="Enter known allergies"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.medicalNotice}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#DC2626"
          />

          <Text style={styles.medicalNoticeText}>
            This information may be shared with your assigned
            emergency responder during an active incident.
          </Text>
        </View>
      </View>

      {/* ========================================= */}
      {/* EMERGENCY CONTACTS                        */}
      {/* ========================================= */}

      <View style={styles.card}>
        <View style={styles.contactHeader}>
          <View style={styles.sectionHeaderSmall}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="people-outline"
                size={19}
                color="#DC2626"
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Emergency contacts
              </Text>

              <Text style={styles.sectionSubtitle}>
                People who can be alerted during emergencies
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddContact}
          >
            <Ionicons
              name="add"
              size={18}
              color="#DC2626"
            />

            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactsList}>
          {contacts.map((contact) => (
            <View
              key={contact.name}
              style={styles.contactCard}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {contact.name.charAt(0)}
                </Text>
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>
                  {contact.name}
                </Text>

                <Text style={styles.contactDetails}>
                  {contact.relation} · {contact.phone}
                </Text>
              </View>

              <View style={styles.autoAlertBadge}>
                <Text style={styles.autoAlertText}>
                  Auto-alert
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ========================================= */}
      {/* SAFETY SETTINGS                            */}
      {/* ========================================= */}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color="#DC2626"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Safety settings
            </Text>

            <Text style={styles.sectionSubtitle}>
              Configure how SafeSync responds during emergencies
            </Text>
          </View>
        </View>

        <SettingRow
          title="Panic mode"
          description="Triple-press power to dispatch silently"
          value={panicMode}
          onValueChange={setPanicMode}
        />

        <SettingRow
          title="Share medical profile"
          description="Send details to the assigned crew"
          value={shareMedical}
          onValueChange={setShareMedical}
        />

        <SettingRow
          title="Incident recording"
          description="Record audio during an active incident"
          value={recording}
          onValueChange={setRecording}
        />

        <SettingRow
          title="Offline request queue"
          description="Queue requests without connectivity"
          value={offlineQueue}
          onValueChange={setOfflineQueue}
        />

        {/* SAVE */}

        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.85}
          onPress={handleSaveProfile}
        >
          <Ionicons
            name="shield-checkmark"
            size={19}
            color="#FFFFFF"
          />

          <Text style={styles.saveButtonText}>
            Save profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom spacing because emergency button/tab bar
          are provided globally by _layout.tsx */}

      <View style={{ height: 160 }} />
    </ScrollView>
  );
}

/* ============================================= */
/* INPUT FIELD                                   */
/* ============================================= */

function InputField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

/* ============================================= */
/* SETTINGS ROW                                  */
/* ============================================= */

function SettingRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: "#CBD5E1",
          true: "#FCA5A5",
        }}
        thumbColor={
          value ? "#DC2626" : "#F8FAFC"
        }
      />
    </View>
  );
}

/* ============================================= */
/* STYLES                                        */
/* ============================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
  },

  titleSection: {
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },

  pageDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 5,
  },

  /* CARD */

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,

    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  sectionHeaderSmall: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  /* FORM */

  formGrid: {
    gap: 14,
  },

  inputGroup: {
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontSize: 14,
  },

  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontSize: 14,
  },

  /* MEDICAL NOTICE */

  medicalNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 13,
    padding: 12,
    marginTop: 2,
  },

  medicalNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#991B1B",
    marginLeft: 8,
  },

  /* CONTACTS */

  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
  },

  addButtonText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 3,
  },

  contactsList: {
    gap: 10,
  },

  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    padding: 12,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
  },

  contactInfo: {
    flex: 1,
    marginLeft: 11,
  },

  contactName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  contactDetails: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  autoAlertBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },

  autoAlertText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#475569",
  },

  /* SAFETY SETTINGS */

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 9,
  },

  settingText: {
    flex: 1,
    paddingRight: 10,
  },

  settingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  settingDescription: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 16,
  },

  /* SAVE */

  saveButton: {
    height: 52,
    backgroundColor: "#DC2626",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
});