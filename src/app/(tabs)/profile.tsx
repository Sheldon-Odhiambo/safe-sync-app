import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  UserRound,
  Stethoscope,
  UsersRound,
  Plus,
  ShieldCheck,
  Info,
  Trash2,
  X,
  Phone,
  UserPlus,
} from "lucide-react-native";

/* ============================================= */
/* TYPES */
/* ============================================= */

type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
};

/* ============================================= */
/* DEFAULT EMERGENCY CONTACTS */
/* ============================================= */

const initialContacts: EmergencyContact[] = [
  {
    id: "1",
    name: "Ama Mensah",
    relation: "Spouse",
    phone: "+254 712 345 678",
  },
  {
    id: "2",
    name: "Dr. J. Osei",
    relation: "Family doctor",
    phone: "+254 722 221 908",
  },
  {
    id: "3",
    name: "Kofi Mensah",
    relation: "Brother",
    phone: "+254 733 664 112",
  },
];

/* ============================================= */
/* PROFILE */
/* ============================================= */

export default function Profile() {
  /* ========================================= */
  /* SAFETY SETTINGS */
  /* ========================================= */

  const [panicMode, setPanicMode] = useState(true);
  const [shareMedical, setShareMedical] = useState(true);
  const [recording, setRecording] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState(true);

  /* ========================================= */
  /* PERSONAL DETAILS */
  /* ========================================= */

  const [firstName, setFirstName] = useState("Kevin");
  const [lastName, setLastName] = useState("Mensah");
  const [dob, setDob] = useState("14 Mar 1992");
  const [language, setLanguage] = useState("English");

  /* ========================================= */
  /* MEDICAL INFORMATION */
  /* ========================================= */

  const [bloodGroup, setBloodGroup] = useState("O+");
  const [insurance, setInsurance] = useState(
    "NHIF / AAR Health"
  );
  const [hospital, setHospital] = useState(
    "Lakeview Hospital"
  );
  const [medications, setMedications] =
    useState("Metformin 500mg");

  const [allergies, setAllergies] = useState(
    "Penicillin, shellfish"
  );

  /* ========================================= */
  /* EMERGENCY CONTACTS */
  /* ========================================= */

  const [contacts, setContacts] =
    useState<EmergencyContact[]>(initialContacts);

  const [contactModalVisible, setContactModalVisible] =
    useState(false);

  const [contactName, setContactName] = useState("");
  const [contactRelation, setContactRelation] =
    useState("");
  const [contactPhone, setContactPhone] = useState("");

  /* ========================================= */
  /* SAVE PROFILE */
  /* ========================================= */

  const handleSaveProfile = () => {
    Alert.alert(
      "Profile saved",
      "Your profile information has been updated successfully."
    );
  };

  /* ========================================= */
  /* OPEN ADD CONTACT FORM */
  /* ========================================= */

  const handleAddContact = () => {
    setContactName("");
    setContactRelation("");
    setContactPhone("");

    setContactModalVisible(true);
  };

  /* ========================================= */
  /* CLOSE CONTACT FORM */
  /* ========================================= */

  const handleCloseContactForm = () => {
    setContactModalVisible(false);
  };

  /* ========================================= */
  /* SAVE NEW CONTACT */
  /* ========================================= */

  const handleSaveContact = () => {
    if (!contactName.trim()) {
      Alert.alert(
        "Missing name",
        "Please enter the emergency contact's name."
      );
      return;
    }

    if (!contactRelation.trim()) {
      Alert.alert(
        "Missing relationship",
        "Please enter the relationship with this contact."
      );
      return;
    }

    if (!contactPhone.trim()) {
      Alert.alert(
        "Missing phone number",
        "Please enter the emergency contact's phone number."
      );
      return;
    }

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: contactName.trim(),
      relation: contactRelation.trim(),
      phone: contactPhone.trim(),
    };

    setContacts((currentContacts) => [
      ...currentContacts,
      newContact,
    ]);

    setContactModalVisible(false);

    Alert.alert(
      "Contact added",
      `${contactName.trim()} has been added to your emergency contacts.`
    );
  };

  /* ========================================= */
  /* DELETE CONTACT */
  /* ========================================= */

  const handleDeleteContact = (
    contact: EmergencyContact
  ) => {
    Alert.alert(
      "Remove contact?",
      `Are you sure you want to remove ${contact.name} from your emergency contacts?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setContacts((currentContacts) =>
              currentContacts.filter(
                (item) => item.id !== contact.id
              )
            );
          },
        },
      ]
    );
  };

  /* ========================================= */
  /* DELETE ACCOUNT */
  /* ========================================= */

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This will permanently delete your SafeSync account and associated profile information. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            /*
             * This is currently a UI placeholder.
             *
             * The real Supabase account deletion should
             * be connected to a secure backend or Supabase
             * Edge Function.
             */

            Alert.alert(
              "Account deletion",
              "Your account deletion request has been submitted."
            );
          },
        },
      ]
    );
  };

  return (
    <>
      {/* ========================================= */}
      {/* MAIN PROFILE PAGE */}
      {/* ========================================= */}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================= */}
        {/* PAGE TITLE */}
        {/* ========================================= */}

        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>
            Profile
          </Text>

          <Text style={styles.pageDescription}>
            Shared with the assigned crew only, for the
            duration of an active incident.
          </Text>
        </View>

        {/* ========================================= */}
        {/* PERSONAL DETAILS */}
        {/* ========================================= */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <UserRound
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
              />
            </View>

            <View style={styles.sectionHeaderText}>
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
        {/* MEDICAL INFORMATION */}
        {/* ========================================= */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Stethoscope
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Medical information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Important information for emergency
                responders
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

          {/* ALLERGIES */}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Allergies
            </Text>

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

          {/* MEDICAL NOTICE */}

          <View style={styles.medicalNotice}>
            <Info
              size={18}
              color="#DC2626"
              strokeWidth={2.2}
            />

            <Text style={styles.medicalNoticeText}>
              This information may be shared with your
              assigned emergency responder during an
              active incident.
            </Text>
          </View>
        </View>

        {/* ========================================= */}
        {/* EMERGENCY CONTACTS */}
        {/* ========================================= */}

        <View style={styles.card}>
          {/* CONTACT HEADER */}

          <View style={styles.contactHeader}>
            <View style={styles.sectionHeaderSmall}>
              <View style={styles.sectionIcon}>
                <UsersRound
                  size={19}
                  color="#DC2626"
                  strokeWidth={2.2}
                />
              </View>

              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>
                  Emergency contacts
                </Text>

                <Text style={styles.sectionSubtitle}>
                  People who can be alerted during
                  emergencies
                </Text>
              </View>
            </View>

            {/* ADD BUTTON */}

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddContact}
              activeOpacity={0.8}
            >
              <Plus
                size={18}
                color="#DC2626"
                strokeWidth={2.5}
              />

              <Text style={styles.addButtonText}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* CONTACT LIST */}

          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <View
                key={contact.id}
                style={styles.contactCard}
              >
                {/* AVATAR */}

                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {contact.name
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                {/* INFORMATION */}

                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>
                    {contact.name}
                  </Text>

                  <Text style={styles.contactDetails}>
                    {contact.relation} ·{" "}
                    {contact.phone}
                  </Text>
                </View>

                {/* ACTIONS */}

                <View style={styles.contactActions}>
                  <View
                    style={styles.autoAlertBadge}
                  >
                    <Text
                      style={styles.autoAlertText}
                    >
                      Auto-alert
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.deleteContactButton
                    }
                    onPress={() =>
                      handleDeleteContact(contact)
                    }
                    activeOpacity={0.8}
                  >
                    <Trash2
                      size={16}
                      color="#DC2626"
                      strokeWidth={2.2}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* EMPTY STATE */}

          {contacts.length === 0 && (
            <View style={styles.emptyContacts}>
              <UsersRound
                size={24}
                color="#94A3B8"
                strokeWidth={1.8}
              />

              <Text
                style={styles.emptyContactsTitle}
              >
                No emergency contacts
              </Text>

              <Text
                style={styles.emptyContactsText}
              >
                Add someone who should be alerted
                during an emergency.
              </Text>
            </View>
          )}
        </View>

        {/* ========================================= */}
        {/* SAFETY SETTINGS */}
        {/* ========================================= */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <ShieldCheck
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Safety settings
              </Text>

              <Text style={styles.sectionSubtitle}>
                Configure how SafeSync responds during
                emergencies
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

          {/* SAVE PROFILE */}

          <TouchableOpacity
            style={styles.saveButton}
            activeOpacity={0.85}
            onPress={handleSaveProfile}
          >
            <ShieldCheck
              size={19}
              color="#FFFFFF"
              strokeWidth={2.3}
            />

            <Text style={styles.saveButtonText}>
              Save profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================= */}
        {/* DANGER ZONE */}
        {/* ========================================= */}

        <View style={styles.dangerCard}>
          {/* DANGER HEADER */}

          <View style={styles.dangerHeader}>
            <View style={styles.dangerIcon}>
              <Trash2
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
              />
            </View>

            <View style={styles.dangerHeaderText}>
              <Text style={styles.dangerTitle}>
                Danger zone
              </Text>

              <Text style={styles.dangerSubtitle}>
                Permanently remove your SafeSync
                account
              </Text>
            </View>
          </View>

          {/* WARNING */}

          <View style={styles.dangerNotice}>
            <Info
              size={17}
              color="#991B1B"
              strokeWidth={2.2}
            />

            <Text style={styles.dangerNoticeText}>
              Deleting your account is permanent. Your
              profile, emergency contacts, wallet
              information, and other account data will
              be removed.
            </Text>
          </View>

          {/* DELETE ACCOUNT */}

          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.85}
            onPress={handleDeleteAccount}
          >
            <Trash2
              size={18}
              color="#DC2626"
              strokeWidth={2.2}
            />

            <Text style={styles.deleteButtonText}>
              Delete account
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================= */}
        {/* BOTTOM SPACING */}
        {/* ========================================= */}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ========================================= */}
      {/* ADD EMERGENCY CONTACT MODAL */}
      {/* ========================================= */}

      <Modal
        visible={contactModalVisible}
        animationType="slide"
        transparent
        onRequestClose={
          handleCloseContactForm
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleArea}>
                <View style={styles.modalIcon}>
                  <UserPlus
                    size={20}
                    color="#DC2626"
                    strokeWidth={2.2}
                  />
                </View>

                <View>
                  <Text style={styles.modalTitle}>
                    Add emergency contact
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    Add someone who can be alerted
                  </Text>
                </View>
              </View>

              {/* CLOSE */}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={
                  handleCloseContactForm
                }
                activeOpacity={0.8}
              >
                <X
                  size={20}
                  color="#475569"
                  strokeWidth={2.2}
                />
              </TouchableOpacity>
            </View>

            {/* ===================================== */}
            {/* CONTACT FORM */}
            {/* ===================================== */}

            <View style={styles.modalForm}>
              <InputField
                label="Full name"
                value={contactName}
                onChangeText={setContactName}
              />

              <InputField
                label="Relationship"
                value={contactRelation}
                onChangeText={
                  setContactRelation
                }
              />

              {/* PHONE */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Phone number
                </Text>

                <View
                  style={
                    styles.phoneInputWrapper
                  }
                >
                  <Phone
                    size={18}
                    color="#64748B"
                    strokeWidth={2}
                  />

                  <TextInput
                    value={contactPhone}
                    onChangeText={
                      setContactPhone
                    }
                    style={styles.phoneInput}
                    placeholder="+254 712 345 678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* ===================================== */}
            {/* MODAL ACTIONS */}
            {/* ===================================== */}

            <View style={styles.modalActions}>
              {/* CANCEL */}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={
                  handleCloseContactForm
                }
                activeOpacity={0.8}
              >
                <Text
                  style={styles.cancelButtonText}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* ADD CONTACT */}

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveContact}
                activeOpacity={0.85}
              >
                <Plus
                  size={18}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />

                <Text
                  style={
                    styles.modalSaveButtonText
                  }
                >
                  Add contact
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ============================================= */
/* INPUT FIELD */
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
      <Text style={styles.inputLabel}>
        {label}
      </Text>

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
/* SETTINGS ROW */
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

        <Text
          style={styles.settingDescription}
        >
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
/* STYLES */
/* ============================================= */

const styles = StyleSheet.create({
  /* ========================================= */
  /* MAIN */
  /* ========================================= */

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

  /* ========================================= */
  /* CARD */
  /* ========================================= */

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  /* ========================================= */
  /* SECTION */
  /* ========================================= */

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

  sectionHeaderText: {
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

  /* ========================================= */
  /* FORM */
  /* ========================================= */

  formGrid: {
    gap: 0,
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

  /* ========================================= */
  /* MEDICAL NOTICE */
  /* ========================================= */

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

  /* ========================================= */
  /* CONTACTS */
  /* ========================================= */

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
    paddingRight: 8,
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

  contactActions: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 7,
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

  deleteContactButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContacts: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 25,
  },

  emptyContactsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 8,
  },

  emptyContactsText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },

  /* ========================================= */
  /* SAFETY SETTINGS */
  /* ========================================= */

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

  /* ========================================= */
  /* SAVE */
  /* ========================================= */

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

  /* ========================================= */
  /* DANGER ZONE */
  /* ========================================= */

  dangerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  dangerHeaderText: {
    flex: 1,
  },

  dangerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991B1B",
  },

  dangerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  dangerNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
  },

  dangerNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#991B1B",
    marginLeft: 8,
  },

  deleteButton: {
    height: 48,
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
  },

  deleteButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },

  /* ========================================= */
  /* MODAL */
  /* ========================================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  modalTitleArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  modalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalForm: {
    marginBottom: 4,
  },

  phoneInputWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  phoneInput: {
    flex: 1,
    height: 48,
    marginLeft: 9,
    color: "#0F172A",
    fontSize: 14,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  cancelButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },

  modalSaveButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  modalSaveButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 7,
  },
});