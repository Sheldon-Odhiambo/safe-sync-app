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
  HeartPulse,
  Info,
  UsersRound,
  Plus,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  X,
  UserPlus,
} from "lucide-react-native";

/* ============================================= */
/* TYPES                                         */
/* ============================================= */

type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
};

/* ============================================= */
/* INITIAL CONTACTS                              */
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
/* PROFILE COMPONENT                             */
/* ============================================= */

export default function Profile() {
  /* =========================================== */
  /* SAFETY SETTINGS                             */
  /* =========================================== */

  const [panicMode, setPanicMode] = useState(true);
  const [shareMedical, setShareMedical] = useState(true);
  const [recording, setRecording] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState(true);

  /* =========================================== */
  /* PERSONAL DETAILS                            */
  /* =========================================== */

  const [firstName, setFirstName] = useState("Kevin");
  const [lastName, setLastName] = useState("Mensah");
  const [dob, setDob] = useState("14 Mar 1992");
  const [language, setLanguage] = useState("English");

  /* =========================================== */
  /* MEDICAL INFORMATION                         */
  /* =========================================== */

  const [bloodGroup, setBloodGroup] = useState("O+");
  const [insurance, setInsurance] = useState("NHIF / AAR Health");
  const [hospital, setHospital] = useState("Lakeview Hospital");
  const [medications, setMedications] = useState("Metformin 500mg");
  const [allergies, setAllergies] = useState(
    "Penicillin, shellfish"
  );

  /* =========================================== */
  /* EMERGENCY CONTACTS                          */
  /* =========================================== */

  const [contacts, setContacts] =
    useState<EmergencyContact[]>(initialContacts);

  const [showContactModal, setShowContactModal] =
    useState(false);

  const [contactName, setContactName] = useState("");
  const [contactRelation, setContactRelation] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  /* =========================================== */
  /* SAVE PROFILE                                */
  /* =========================================== */

  const handleSaveProfile = () => {
    Alert.alert(
      "Profile saved",
      "Your profile information has been updated successfully."
    );
  };

  /* =========================================== */
  /* OPEN ADD CONTACT FORM                       */
  /* =========================================== */

  const handleAddContact = () => {
    setContactName("");
    setContactRelation("");
    setContactPhone("");

    setShowContactModal(true);
  };

  /* =========================================== */
  /* CLOSE ADD CONTACT FORM                      */
  /* =========================================== */

  const handleCloseContactModal = () => {
    setShowContactModal(false);

    setContactName("");
    setContactRelation("");
    setContactPhone("");
  };

  /* =========================================== */
  /* SAVE NEW CONTACT                            */
  /* =========================================== */

  const handleSaveContact = () => {
    const trimmedName = contactName.trim();
    const trimmedRelation = contactRelation.trim();
    const trimmedPhone = contactPhone.trim();

    if (!trimmedName || !trimmedRelation || !trimmedPhone) {
      Alert.alert(
        "Missing information",
        "Please fill in the name, relationship, and phone number."
      );
      return;
    }

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: trimmedName,
      relation: trimmedRelation,
      phone: trimmedPhone,
    };

    setContacts((currentContacts) => [
      ...currentContacts,
      newContact,
    ]);

    setShowContactModal(false);

    setContactName("");
    setContactRelation("");
    setContactPhone("");

    Alert.alert(
      "Contact added",
      `${trimmedName} has been added to your emergency contacts.`
    );
  };

  /* =========================================== */
  /* DELETE ACCOUNT                              */
  /* =========================================== */

  const handleDeleteAccount = () => {
    // FIRST CONFIRMATION
    Alert.alert(
      "Delete account?",
      "Are you sure you want to delete your SafeSync account? Your account information and associated data will be permanently removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            // SECOND CONFIRMATION
            Alert.alert(
              "Confirm account deletion",
              "This is your final confirmation. Your SafeSync account, personal information, medical information, emergency contacts, and other associated data will be permanently deleted. This action cannot be undone.",
              [
                {
                  text: "Keep My Account",
                  style: "cancel",
                },
                {
                  text: "Delete Permanently",
                  style: "destructive",
                  onPress: () => {
                    /*
                     * BACKEND INTEGRATION
                     *
                     * Later, replace this section with your
                     * authenticated API request.
                     *
                     * Example:
                     *
                     * await fetch(`${API_URL}/auth/delete-account`, {
                     *   method: "DELETE",
                     *   headers: {
                     *     Authorization: `Bearer ${token}`,
                     *   },
                     * });
                     */

                    Alert.alert(
                      "Account deletion",
                      "Your account deletion request has been submitted."
                    );
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  /* =========================================== */
  /* RENDER                                      */
  /* =========================================== */

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================================== */}
        {/* PAGE TITLE                            */}
        {/* ===================================== */}

        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>
            Profile
          </Text>

          <Text style={styles.pageDescription}>
            Shared with the assigned crew only, for the
            duration of an active incident.
          </Text>
        </View>

        {/* ===================================== */}
        {/* PERSONAL DETAILS                      */}
        {/* ===================================== */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <UserRound
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
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

        {/* ===================================== */}
        {/* MEDICAL INFORMATION                   */}
        {/* ===================================== */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <HeartPulse
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
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

        {/* ===================================== */}
        {/* EMERGENCY CONTACTS                    */}
        {/* ===================================== */}

        <View style={styles.card}>
          <View style={styles.contactHeader}>
            <View style={styles.sectionHeaderSmall}>
              <View style={styles.sectionIcon}>
                <UsersRound
                  size={19}
                  color="#DC2626"
                  strokeWidth={2.2}
                />
              </View>

              <View style={styles.contactTitleContainer}>
                <Text style={styles.sectionTitle}>
                  Emergency contacts
                </Text>

                <Text style={styles.sectionSubtitle}>
                  People who can be alerted during emergencies
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
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {contact.name.charAt(0).toUpperCase()}
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

        {/* ===================================== */}
        {/* SAFETY SETTINGS                       */}
        {/* ===================================== */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <ShieldCheck
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
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

        {/* ===================================== */}
        {/* ACCOUNT                               */}
        {/* ===================================== */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.deleteSectionIcon}>
              <Trash2
                size={19}
                color="#DC2626"
                strokeWidth={2.2}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Account
              </Text>

              <Text style={styles.sectionSubtitle}>
                Manage your SafeSync account
              </Text>
            </View>
          </View>

          {/* DELETE WARNING */}

          <View style={styles.deleteWarningBox}>
            <AlertTriangle
              size={18}
              color="#DC2626"
              strokeWidth={2.2}
            />

            <Text style={styles.deleteWarningText}>
              Deleting your account permanently removes your
              account information and associated data. This
              action cannot be undone.
            </Text>
          </View>

          {/* DELETE ACCOUNT */}

          <TouchableOpacity
            style={styles.deleteAccountButton}
            activeOpacity={0.8}
            onPress={handleDeleteAccount}
          >
            <Trash2
              size={18}
              color="#DC2626"
              strokeWidth={2.3}
            />

            <Text style={styles.deleteAccountText}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM SPACING */}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ======================================= */}
      {/* ADD EMERGENCY CONTACT MODAL             */}
      {/* ======================================= */}

      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseContactModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalIcon}>
                  <UserPlus
                    size={20}
                    color="#DC2626"
                    strokeWidth={2.3}
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

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseContactModal}
                activeOpacity={0.8}
              >
                <X
                  size={21}
                  color="#475569"
                  strokeWidth={2.2}
                />
              </TouchableOpacity>
            </View>

            {/* FORM */}

            <View style={styles.modalForm}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.inputLabel}>
                  Full name
                </Text>

                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  style={styles.modalInput}
                  placeholder="e.g. Jane Doe"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.inputLabel}>
                  Relationship
                </Text>

                <TextInput
                  value={contactRelation}
                  onChangeText={setContactRelation}
                  style={styles.modalInput}
                  placeholder="e.g. Spouse, Brother, Parent"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.inputLabel}>
                  Phone number
                </Text>

                <TextInput
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  style={styles.modalInput}
                  placeholder="+254 712 345 678"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* BUTTONS */}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseContactModal}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveContactButton}
                onPress={handleSaveContact}
                activeOpacity={0.85}
              >
                <Plus
                  size={18}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />

                <Text style={styles.saveContactButtonText}>
                  Save Contact
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

  /* PAGE TITLE */

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

  contactTitleContainer: {
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

  deleteSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    borderWidth: 1,
    borderColor: "#FECDD3",
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

  /* SAVE PROFILE */

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

  /* DELETE ACCOUNT */

  deleteWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    marginBottom: 14,
  },

  deleteWarningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#991B1B",
    marginLeft: 8,
  },

  deleteAccountButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF1F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteAccountText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },

  /* ========================================= */
  /* ADD CONTACT MODAL                         */
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
    marginBottom: 22,
  },

  modalTitleContainer: {
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
    fontSize: 18,
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
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalForm: {
    marginBottom: 6,
  },

  modalInputGroup: {
    marginBottom: 15,
  },

  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontSize: 14,
  },

  /* MODAL BUTTONS */

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },

  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
  },

  saveContactButton: {
    flex: 1.4,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  saveContactButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 7,
  },
});