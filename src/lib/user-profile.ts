import { supabase } from "./supabase";

export const PROFILE_SCHEMA_VERSION = 2;

export type UserKind = "public" | "responder" | "admin" | "super_admin";

export type OrganizationSummary = {
  id: string;
  name: string;
  organization_type: "client" | "service_provider" | string;
};

export type RoleSummary = {
  id: string;
  name: string;
  organization_id: string | null;
  branch_id: string | null;
};

export type ResponderSummary = {
  id: string;
  responder_type: string;
  verification_status: string;
  status: string;
  branch_id: string | null;
};

export type UserProfileBundle = {
  schemaVersion: number;

  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  account_type: string; // 'public' | 'organization'

  // Organization the user belongs to (null for public users).
  organization: OrganizationSummary | null;
  // All active memberships, in case a user belongs to more than one.
  organizations: OrganizationSummary[];
  isOrgMember: boolean;
  // Branches the user is attached to, from their role rows and responder record.
  branchIds: string[];

  roles: RoleSummary[];
  permissionCodes: string[];
  responder: ResponderSummary | null;

  userKind: UserKind;
  fetchedAt: number;
};

/** Thrown when Auth has a user but core.user_profiles has no row for them. */
export class ProfileNotFoundError extends Error {
  constructor(message = "No user_profiles row found for this user.") {
    super(message);
    this.name = "PROFILE_NOT_FOUND";
  }
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function fetchUserProfileBundle(
  userId: string
): Promise<UserProfileBundle> {
  const core = supabase.schema("core");

  const [profileRes, membershipRes, rolesRes, responderRes] =
    await Promise.all([
      core
        .from("user_profiles")
        .select(
          "id, first_name, last_name, phone, avatar_url, status, account_type"
        )
        .eq("id", userId)
        .maybeSingle(),

      core
        .from("organisation_members")
        .select(
          "organisation_id, status, organizations(id, name, organization_type)"
        )
        .eq("user_id", userId)
        .eq("status", "active"),

      core
        .from("user_roles")
        .select("organization_id, branch_id, roles(id, name)")
        .eq("user_id", userId),

      core
        .from("responders")
        .select("id, responder_type, verification_status, status, branch_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  // Any failure must throw. If a role or membership query silently failed,
  // an admin would be treated as a public user and that result would be cached.
  if (profileRes.error) throw profileRes.error;
  if (membershipRes.error) throw membershipRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (responderRes.error) throw responderRes.error;

  const profile = profileRes.data;
  if (!profile) throw new ProfileNotFoundError();

  // ---------- Roles ----------
  const roles: RoleSummary[] = (rolesRes.data || [])
    .map((row: any) => {
      const role = first<any>(row.roles);
      if (!role) return null;
      return {
        id: role.id,
        name: role.name,
        organization_id: row.organization_id ?? null,
        branch_id: row.branch_id ?? null,
      } as RoleSummary;
    })
    .filter((r): r is RoleSummary => r !== null);

  // ---------- Permissions ----------
  let permissionCodes: string[] = [];
  const roleIds = roles.map((r) => r.id);

  if (roleIds.length > 0) {
    const { data: rolePermissions, error: permError } = await core
      .from("role_permissions")
      .select("permission_id, permissions(code)")
      .in("role_id", roleIds);

    if (permError) throw permError;

    permissionCodes = Array.from(
      new Set(
        (rolePermissions || [])
          .map((rp: any) => first<any>(rp.permissions)?.code)
          .filter(Boolean)
      )
    );
  }

  // ---------- Organization(s) ----------
  const organizations: OrganizationSummary[] = (membershipRes.data || [])
    .map((m: any) => {
      const org = first<any>(m.organizations);
      if (!org) return null;
      return {
        id: org.id,
        name: org.name,
        organization_type: org.organization_type,
      } as OrganizationSummary;
    })
    .filter((o): o is OrganizationSummary => o !== null);

  // Primary organization: prefer the one the user holds a role in.
  const roleOrgIds = new Set(
    roles.map((r) => r.organization_id).filter(Boolean) as string[]
  );
  const organization =
    organizations.find((o) => roleOrgIds.has(o.id)) ??
    organizations[0] ??
    null;

  // ---------- Branches ----------
  const responder = (responderRes.data as ResponderSummary | null) ?? null;
  const branchIds = Array.from(
    new Set(
      [
        ...roles.map((r) => r.branch_id),
        responder?.branch_id ?? null,
      ].filter(Boolean) as string[]
    )
  );

  // ---------- User kind (drives which UI is shown) ----------
  const roleNames = new Set(roles.map((r) => r.name.toLowerCase()));

  let userKind: UserKind = "public";
  if (responder || roleNames.has("responder")) {
    // Responder status wins even if the user also holds an org role.
    userKind = "responder";
  } else if (roleNames.has("super_admin")) {
    userKind = "super_admin";
  } else if (roleNames.has("admin")) {
    userKind = "admin";
  }
  // Anything else, including an org member with no role row, is "public".

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,

    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    status: profile.status,
    account_type: profile.account_type,

    organization,
    organizations,
    isOrgMember: organization !== null,
    branchIds,

    roles,
    permissionCodes,
    responder,

    userKind,
    fetchedAt: Date.now(),
  };
}