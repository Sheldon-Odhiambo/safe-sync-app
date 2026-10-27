import { apiFetch } from "./api-client";

export type MedicalProfile = {
  date_of_birth: string | null;
  blood_group: string | null;
  insurance_provider: string | null;
  pre_existing_conditions: string | null;
  allergies: string | null;
  share_with_responders: boolean;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
};

export type NewEmergencyContact = Omit<EmergencyContact, "id">;

export type DeletionStatus = {
  status: "none" | "pending";
  requested_at?: string | null;
  scheduled_for?: string | null;
};

export type DeletionBlocker = {
  code: string;
  message: string;
};

const jsonBody = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
});

export function getMedicalProfile() {
  return apiFetch<MedicalProfile>("/account/medical-profile");
}

export function saveMedicalProfile(profile: MedicalProfile) {
  return apiFetch<MedicalProfile>("/account/medical-profile", {
    method: "PUT",
    ...jsonBody(profile),
  });
}

export function listEmergencyContacts() {
  return apiFetch<EmergencyContact[]>("/account/emergency-contacts");
}

export function addEmergencyContact(contact: NewEmergencyContact) {
  return apiFetch<EmergencyContact>("/account/emergency-contacts", {
    method: "POST",
    ...jsonBody(contact),
  });
}

export function updateEmergencyContact(
  id: string,
  changes: Partial<NewEmergencyContact>
) {
  return apiFetch<EmergencyContact>(`/account/emergency-contacts/${id}`, {
    method: "PATCH",
    ...jsonBody(changes),
  });
}

export function deleteEmergencyContact(id: string) {
  return apiFetch<void>(`/account/emergency-contacts/${id}`, {
    method: "DELETE",
  });
}

export function getDeletionStatus() {
  return apiFetch<DeletionStatus>("/account/deletion");
}

export function requestAccountDeletion(reason?: string) {
  return apiFetch<DeletionStatus>("/account/deletion", {
    method: "POST",
    ...jsonBody({ confirm: "DELETE", reason }),
  });
}

export function cancelAccountDeletion() {
  return apiFetch<DeletionStatus>("/account/deletion", { method: "DELETE" });
}

export function getDeletionBlockers(error: unknown): DeletionBlocker[] {
  const detail = (error as { detail?: { blockers?: DeletionBlocker[] } })
    ?.detail;
  return detail?.blockers ?? [];
}