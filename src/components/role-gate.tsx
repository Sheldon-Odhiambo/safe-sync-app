import React from "react";
import { Redirect } from "expo-router";
import type { Href } from "expo-router";
import { useAuth } from "../contexts/auth-context";
import type { UserKind } from "../lib/user-profile";

type RoleGateProps = {
  children: React.ReactNode;

  /** Pass only for these user kinds: "public" | "responder" | "admin" | "super_admin". */
  kinds?: UserKind[];
  /** Pass only if the user has this exact role name. */
  role?: string;
  /** Pass only if the user has at least one of these role names. */
  anyRole?: string[];
  /** Pass only if the user has this permission code. */
  permission?: string;

  /** Rendered when the gate does not pass. Defaults to nothing. */
  fallback?: React.ReactNode;
  /** Rendered while the user's profile is still loading. Defaults to nothing. */
  loadingFallback?: React.ReactNode;
  /**
   * Whole-screen protection: when the gate fails, navigate here instead of
   * rendering `fallback`. Use this on role-specific screens so a deep link
   * can't open them, and use `fallback` for hiding buttons and panels.
   */
  redirectTo?: Href;
};

/**
 * Hide part of a screen:
 *   <RoleGate kinds={["admin", "super_admin"]}>
 *     <ManageBranchesButton />
 *   </RoleGate>
 *
 *   <RoleGate permission="incidents.dispatch">
 *     <DispatchPanel />
 *   </RoleGate>
 *
 * Protect a whole screen:
 *   export default function SuperAdminScreen() {
 *     return (
 *       <RoleGate kinds={["super_admin"]} redirectTo="/home">
 *         <SuperAdminContent />
 *       </RoleGate>
 *     );
 *   }
 *
 * This only controls what the app shows. The backend and database policies
 * must enforce the same rules.
 */
export function RoleGate({
  children,
  kinds,
  role,
  anyRole,
  permission,
  fallback = null,
  loadingFallback = null,
  redirectTo,
}: RoleGateProps) {
  const { profile, initializing, loadingProfile, hasRole, hasPermission } =
    useAuth();

  // Don't decide anything until we know who the user is. Redirecting or
  // hiding content now would wrongly bounce users whose profile is loading.
  if (initializing || (loadingProfile && !profile)) {
    return <>{loadingFallback}</>;
  }

  const allowed =
    !!profile &&
    (!kinds || kinds.includes(profile.userKind)) &&
    (!role || hasRole(role)) &&
    (!anyRole || anyRole.some((name) => hasRole(name))) &&
    (!permission || hasPermission(permission));

  if (allowed) return <>{children}</>;

  // Only redirect a loaded profile that fails the check. With no profile the
  // layout's own error state handles it.
  if (redirectTo && profile) return <Redirect href={redirectTo} />;

  return <>{fallback}</>;
}