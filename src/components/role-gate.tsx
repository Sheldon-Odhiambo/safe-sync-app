import React, { useEffect } from "react";
import { Redirect } from "expo-router";
import type { Href } from "expo-router";
import { useAuth } from "../contexts/auth-context";
import { log } from "../lib/debug-log";
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
   * Whole-screen protection.
   * When the gate fails, navigate here instead of rendering fallback.
   */
  redirectTo?: Href;
};

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
  const {
    profile,
    initializing,
    loadingProfile,
    hasRole,
    hasPermission,
  } = useAuth();

  const stillLoading = initializing || (loadingProfile && !profile);

  // ---------------------------------------------------------
  // Role / permission check
  // ---------------------------------------------------------
  const kindAllowed = !profile || !kinds || kinds.includes(profile.userKind);
  const roleAllowed = !profile || !role || hasRole(role);
  const anyRoleAllowed =
    !profile || !anyRole || anyRole.some((name) => hasRole(name));
  const permissionAllowed =
    !profile || !permission || hasPermission(permission);

  const allowed =
    !!profile &&
    kindAllowed &&
    roleAllowed &&
    anyRoleAllowed &&
    permissionAllowed;

  // One readable line per decision (only once loading has finished).
  useEffect(() => {
    if (stillLoading) return;

    log.info("rolegate", allowed ? "ACCESS GRANTED" : "ACCESS DENIED", {
      userKind: profile?.userKind,
      hasProfile: !!profile,
      kinds,
      role,
      anyRole,
      permission,
      checks: { kindAllowed, roleAllowed, anyRoleAllowed, permissionAllowed },
      redirectTo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, stillLoading, profile?.userKind]);

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------
  if (stillLoading) {
    return <>{loadingFallback}</>;
  }

  // ---------------------------------------------------------
  // Access granted
  // ---------------------------------------------------------
  if (allowed) {
    return <>{children}</>;
  }

  // ---------------------------------------------------------
  // Access denied
  // ---------------------------------------------------------
  if (redirectTo && profile) {
    return <Redirect href={redirectTo} />;
  }

  return <>{fallback}</>;
}