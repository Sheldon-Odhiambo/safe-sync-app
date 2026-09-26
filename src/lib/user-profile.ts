import { supabase } from "./supabase";

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
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  account_type: string; // e.g. 'public' | 'organization'
  organization: OrganizationSummary | null;
  roles: RoleSummary[];
  permissionCodes: string[];
  responder: ResponderSummary | null;
  // A coarse, ready-to-switch-on bucket for UI branching. Adjust the
  // "admin" name-matching below to whatever your `core.roles.name`
  // values actually are.
  userKind: "public" | "responder" | "super_admin" | "admin" | "system_user";
  fetchedAt: number;
};

export async function fetchUserProfileBundle(
  userId: string
): Promise<UserProfileBundle> {
  const core = supabase.schema("core");

  const [
    { data: profile, error: profileError },
    { data: orgMembership },
    { data: userRoles },
    { data: responder },
  ] = await Promise.all([
    core
      .from("user_profiles")
      .select(
        "id, first_name, last_name, phone, avatar_url, status, account_type"
      )
      .eq("id", userId)
      .maybeSingle(),
    core
      .from("organisation_members")
      .select("organisation_id, status, organizations(id, name, organization_type)")
      .eq("user_id", userId)
      .maybeSingle(),
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

  if (profileError) throw profileError;
  if (!profile) {
    throw new Error("No user_profiles row found for this user.");
  }

  const roles: RoleSummary[] = (userRoles || [])
    .filter((r: any) => r.roles)
    .map((r: any) => ({
      id: r.roles.id,
      name: r.roles.name,
      organization_id: r.organization_id,
      branch_id: r.branch_id,
    }));

  const roleIds = roles.map((r) => r.id);

  let permissionCodes: string[] = [];
  if (roleIds.length > 0) {
    const { data: rolePermissions } = await core
      .from("role_permissions")
      .select("permission_id, permissions(code)")
      .in("role_id", roleIds);

    permissionCodes = Array.from(
      new Set(
        (rolePermissions || [])
          .map((rp: any) => rp.permissions?.code)
          .filter(Boolean)
      )
    );
  }

  const organization: OrganizationSummary | null = orgMembership?.organizations
    ? {
        id: orgMembership.organizations.id,
        name: orgMembership.organizations.name,
        organization_type: orgMembership.organizations.organization_type,
      }
    : null;

  const roleNames = roles.map((r) => r.name.toLowerCase());
  const isAdmin = roleNames.some((n) => n.includes("admin"));

  let userKind: UserProfileBundle["userKind"] = "public";
  if (responder) {
    userKind = "responder";
  } else if (organization && isAdmin) {
    userKind = "org_admin";
  } else if (organization) {
    userKind = "org_member";
  }

  return {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    status: profile.status,
    account_type: profile.account_type,
    organization,
    roles,
    permissionCodes,
    responder: responder || null,
    userKind,
    fetchedAt: Date.now(),
  };
}