import React, { useEffect } from "react";
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

  /**
   * ---------------------------------------------------------
   * DEBUG: AUTH STATE
   * ---------------------------------------------------------
   */
  useEffect(() => {
    console.log("========================================");
    console.log("[RoleGate] AUTH STATE CHANGED");
    console.log("[RoleGate] initializing:", initializing);
    console.log("[RoleGate] loadingProfile:", loadingProfile);
    console.log("[RoleGate] hasProfile:", !!profile);
    console.log("[RoleGate] userKind:", profile?.userKind);
    console.log("[RoleGate] profile user id:", profile?.userId);
    console.log("[RoleGate] organization id:", profile?.organization?.id);
    console.log("[RoleGate] organization name:", profile?.organization?.name);
    console.log("[RoleGate] requested kinds:", kinds);
    console.log("[RoleGate] requested role:", role);
    console.log("[RoleGate] requested anyRole:", anyRole);
    console.log("[RoleGate] requested permission:", permission);
    console.log("========================================");
  }, [
    initializing,
    loadingProfile,
    profile,
    kinds,
    role,
    anyRole,
    permission,
  ]);

  /**
   * ---------------------------------------------------------
   * DEBUG: LOADING STATE
   * ---------------------------------------------------------
   */
  if (initializing) {
    console.log("[RoleGate] BLOCKED: auth is still initializing.");

    return <>{loadingFallback}</>;
  }

  if (loadingProfile && !profile) {
    console.log(
      "[RoleGate] BLOCKED: profile is loading and no profile exists yet."
    );

    return <>{loadingFallback}</>;
  }

  /**
   * ---------------------------------------------------------
   * ROLE / PERMISSION CHECK
   * ---------------------------------------------------------
   */

  let kindAllowed = true;
  let roleAllowed = true;
  let anyRoleAllowed = true;
  let permissionAllowed = true;

  if (profile && kinds) {
    kindAllowed = kinds.includes(profile.userKind);

    console.log("[RoleGate] KIND CHECK:", {
      actual: profile.userKind,
      allowed: kinds,
      result: kindAllowed,
    });
  }

  if (profile && role) {
    roleAllowed = hasRole(role);

    console.log("[RoleGate] ROLE CHECK:", {
      requested: role,
      result: roleAllowed,
    });
  }

  if (profile && anyRole) {
    anyRoleAllowed = anyRole.some((name) => hasRole(name));

    console.log("[RoleGate] ANY ROLE CHECK:", {
      requested: anyRole,
      result: anyRoleAllowed,
    });
  }

  if (profile && permission) {
    permissionAllowed = hasPermission(permission);

    console.log("[RoleGate] PERMISSION CHECK:", {
      requested: permission,
      result: permissionAllowed,
    });
  }

  const allowed =
    !!profile &&
    kindAllowed &&
    roleAllowed &&
    anyRoleAllowed &&
    permissionAllowed;

  console.log("[RoleGate] FINAL RESULT:", {
    allowed,
    hasProfile: !!profile,
    initializing,
    loadingProfile,
  });

  /**
   * ---------------------------------------------------------
   * ACCESS GRANTED
   * ---------------------------------------------------------
   */
  if (allowed) {
    console.log("[RoleGate] ACCESS GRANTED.");

    return <>{children}</>;
  }

  /**
   * ---------------------------------------------------------
   * ACCESS DENIED + REDIRECT
   * ---------------------------------------------------------
   */
  if (redirectTo && profile) {
    console.log("[RoleGate] ACCESS DENIED.");
    console.log("[RoleGate] Redirecting to:", redirectTo);

    return <Redirect href={redirectTo} />;
  }

  /**
   * ---------------------------------------------------------
   * ACCESS DENIED + FALLBACK
   * ---------------------------------------------------------
   */
  console.log("[RoleGate] ACCESS DENIED. Rendering fallback.");

  return <>{fallback}</>;
}
