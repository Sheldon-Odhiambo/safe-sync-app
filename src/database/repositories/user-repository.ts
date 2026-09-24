import { getDatabase } from "../index";
import type { UserProfile } from "../types";

export async function saveUserProfile(
  profile: UserProfile
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO user_profile (
        id,
        email,
        full_name,
        phone,
        role,
        account_type,
        organization_id,
        branch_id,
        avatar_url,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

      ON CONFLICT(id)
      DO UPDATE SET
        email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone,
        role = excluded.role,
        account_type = excluded.account_type,
        organization_id = excluded.organization_id,
        branch_id = excluded.branch_id,
        avatar_url = excluded.avatar_url,
        updated_at = excluded.updated_at
    `,
    profile.id,
    profile.email,
    profile.full_name,
    profile.phone,
    profile.role,
    profile.account_type,
    profile.organization_id,
    profile.branch_id,
    profile.avatar_url,
    profile.updated_at
  );
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await getDatabase();

  return await db.getFirstAsync<UserProfile>(
    `
      SELECT *
      FROM user_profile
      LIMIT 1
    `
  );
}

export async function clearUserProfile(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(`
    DELETE FROM user_profile
  `);
}