import React, { useEffect, useState } from "react";
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

import { useAuth } from "../../contexts/auth-context";

type EmergencyContact = {
  name: string;
  relation: string;
  phone: string;
};

export default function Profile() {
  const { profile } = useAuth();

  // SAFETY SETTINGS
  const [shareMedical, setShareMedical] = useState(true);

  // PERSONAL DETAILS — seeded from the stored user profile
  // (core.user_profiles, loaded/cached by AuthProvider).
  const [firstName, setFirstName] = useState(
    profile?.first_name ?? ""
  );
  const [lastName, setLastName] = useState(
    profile?.last_name ?? ""
  );

  // Keep in sync if the profile finishes loading (or changes)
  // after this screen has already mounted.
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
    }
  }, [profile]);

  // MEDICAL INFORMATION
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [insurance, setInsurance] = useState("");
  const [preExistingConditions, setPreExistingConditions] = useState("");
  const [allergies, setAllergies] = useState("");

  // EMERGENCY CONTACTS
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRelation, setContactRelation] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const handleSaveMedicalInfo = () => {
    setIsEditingMedical(false);

    Alert.alert(
      "Medical information saved",
      "Your medical information has been updated successfully."
    );
  };

  const handleCancelMedicalEdit = () => {
    setIsEditingMedical(false);
  };

  const resetContactForm = () => {
    setContactName("");
    setContactRelation("");
    setContactPhone("");
  };

  const handleToggleAddContactForm = () => {
    if (showAddContactForm) {
      resetContactForm();
    }

    setShowAddContactForm((prev) => !prev);
  };

  const handleSaveContact = () => {
    if (
      !contactName.trim() ||
      !contactRelation.trim() ||
      !contactPhone.trim()
    ) {
      Alert.alert(
        "Missing details",
        "Please fill in the name, relation and phone number before adding a contact."
      );
      return;
    }

    setContacts((prev) => [
      ...prev,
      {
        name: contactName.trim(),
        relation: contactRelation.trim(),
        phone: contactPhone.trim(),
      },
    ]);

    resetContactForm();
    setShowAddContactForm(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Account Deleted", "Your account has been successfully deleted.");
            // Add your account deletion logic/navigation here
          },
        },
      ]
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
            placeholder="Enter your first name"
          />

          <InputField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
          />
        </View>
      </View>

      {/* ========================================= */}
      {/* MEDICAL INFORMATION                       */}
      {/* ========================================= */}

      <View style={styles.card}>
        <View style={styles.contactHeader}>
          <View style={styles.sectionHeaderSmall}>
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

          {!isEditingMedical && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditingMedical(true)}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color="#DC2626"
              />

              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditingMedical ? (
          <>
            <View style={styles.formGrid}>
              <InputField
                label="Date of birth"
                value={dob}
                onChangeText={setDob}
                placeholder="e.g. 14 Mar 1992"
              />

              <InputField
                label="Blood group"
                value={bloodGroup}
                onChangeText={setBloodGroup}
                placeholder="e.g. O+"
              />

              <InputField
                label="Insurance provider"
                value={insurance}
                onChangeText={setInsurance}
                placeholder="e.g. AAR"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pre-existing conditions</Text>

              <TextInput
                value={preExistingConditions}
                onChangeText={setPreExistingConditions}
                multiline
                textAlignVertical="top"
                style={styles.textArea}
                placeholder="Enter pre-existing medical conditions"
                placeholderTextColor="#94A3B8"
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

            {/* SAVE / CANCEL */}

            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.85}
              onPress={handleSaveMedicalInfo}
            >
              <Ionicons
                name="shield-checkmark"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.saveButtonText}>
                Save medical information
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.85}
              onPress={handleCancelMedicalEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.readOnlyGrid}>
            <ReadOnlyField label="Date of birth" value={dob} />

            <ReadOnlyField label="Blood group" value={bloodGroup} />

            <ReadOnlyField
              label="Insurance provider"
              value={insurance}
            />

            <ReadOnlyField
              label="Pre-existing conditions"
              value={preExistingConditions}
            />

            <ReadOnlyField label="Allergies" value={allergies} />
          </View>
        )}
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
            onPress={handleToggleAddContactForm}
          >
            <Ionicons
              name={showAddContactForm ? "close" : "add"}
              size={18}
              color="#DC2626"
            />

            <Text style={styles.addButtonText}>
              {showAddContactForm ? "Close" : "Add"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ADD CONTACT FORM — only shown once "Add" is pressed */}

        {showAddContactForm && (
          <View style={styles.addContactForm}>
            <View style={styles.formGrid}>
              <InputField
                label="Name"
                value={contactName}
                onChangeText={setContactName}
                placeholder="Enter contact's full name"
              />

              <InputField
                label="Relation"
                value={contactRelation}
                onChangeText={setContactRelation}
                placeholder="e.g. Spouse, Parent, Friend"
              />

              <InputField
                label="Phone"
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="e.g. +254 712 345 678"
              />
            </View>

            <TouchableOpacity
              style={styles.addContactSubmitButton}
              activeOpacity={0.85}
              onPress={handleSaveContact}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />

              <Text style={styles.addContactSubmitButtonText}>
                Save contact
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CONTACTS LIST */}

        {contacts.length > 0 ? (
          <View style={styles.contactsList}>
            {contacts.map((contact, index) => (
              <View
                key={`${contact.name}-${index}`}
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
              </View>
            ))}
          </View>
        ) : (
          !showAddContactForm && (
            <Text style={styles.emptyContactsText}>
              No emergency contacts added yet.
            </Text>
          )
        )}
      </View>

      {/* ========================================= */}
      {/* SAFETY SETTINGS                           */}
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
          title="Share medical profile"
          description="Send details to the assigned crew"
          value={shareMedical}
          onValueChange={setShareMedical}
        />

        {/* DELETE ACCOUNT */}

        <TouchableOpacity
          style={styles.deleteButton}
          activeOpacity={0.85}
          onPress={handleDeleteAccount}
        >
          <Ionicons
            name="trash-outline"
            size={19}
            color="#DC2626"
          />

          <Text style={styles.deleteButtonText}>
            Delete account
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
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

/* ============================================= */
/* READ-ONLY FIELD (medical info, view mode)     */
/* ============================================= */

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.readOnlyRow}>
      <Text style={styles.readOnlyLabel}>{label}</Text>

      <Text
        style={[
          styles.readOnlyValue,
          !value && styles.readOnlyValueEmpty,
        ]}
      >
        {value ? value : "Not set"}
      </Text>
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
    paddingBottom: 5,
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

  /* MEDICAL — EDIT TOGGLE */

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
  },

  editButtonText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* MEDICAL — READ-ONLY VIEW */

  readOnlyGrid: {
    gap: 12,
  },

  readOnlyRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  readOnlyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },

  readOnlyValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  readOnlyValueEmpty: {
    color: "#94A3B8",
    fontWeight: "500",
    fontStyle: "italic",
  },

  /* MEDICAL NOTICE */

  medicalNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 13,
    padding: 12,
    marginTop: 2,
    marginBottom: 16,
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

  addContactForm: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 16,
  },

  addContactSubmitButton: {
    height: 48,
    backgroundColor: "#DC2626",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  addContactSubmitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
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

  emptyContactsText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 8,
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

  /* SAVE & DELETE */

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

  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  cancelButtonText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },

  deleteButton: {
    height: 52,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  deleteButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
});