import React from "react";
import { useAuth } from "../contexts/AuthContext";
import type { UserProfileBundle } from "../lib/userProfile";

type RoleGateProps = {
  children: React.ReactNode;
  /** Show children only for these userKind buckets. */
  kinds?: UserProfileBundle["userKind"][];
  /** Show children only if the user has this exact role name. */
  role?: string;
  /** Show children only if the user has this permission code. */
  permission?: string;
  /** Shown instead when the gate fails to pass. Defaults to nothing. */
  fallback?: React.ReactNode;
};

/**
 * Usage:
 *   <RoleGate kinds={["org_admin"]}>
 *     <ManageBranchesButton />
 *   </RoleGate>
 *
 *   <RoleGate permission="incidents.dispatch">
 *     <DispatchPanel />
 *   </RoleGate>
 */
export function RoleGate({
  children,
  kinds,
  role,
  permission,
  fallback = null,
}: RoleGateProps) {
  const { profile, hasRole, hasPermission } = useAuth();

  if (!profile) return <>{fallback}</>;

  if (kinds && !kinds.includes(profile.userKind)) return <>{fallback}</>;
  if (role && !hasRole(role)) return <>{fallback}</>;
  if (permission && !hasPermission(permission)) return <>{fallback}</>;

  return <>{children}</>;
}