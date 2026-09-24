import { getDatabase } from "../index";
import type { ActiveEmergency } from "../types";

export async function saveActiveEmergency(
  emergency: ActiveEmergency
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO active_emergency (
        id,
        requester_id,
        service_type,
        status,
        responder_id,
        origin_latitude,
        origin_longitude,
        origin_address,
        estimated_distance_meters,
        estimated_duration_seconds,
        estimated_price,
        created_at,
        accepted_at,
        arrived_at,
        completed_at,
        cancelled_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )

      ON CONFLICT(id)
      DO UPDATE SET
        status = excluded.status,
        responder_id = excluded.responder_id,
        estimated_distance_meters =
          excluded.estimated_distance_meters,
        estimated_duration_seconds =
          excluded.estimated_duration_seconds,
        estimated_price =
          excluded.estimated_price,
        accepted_at = excluded.accepted_at,
        arrived_at = excluded.arrived_at,
        completed_at = excluded.completed_at,
        cancelled_at = excluded.cancelled_at,
        updated_at = excluded.updated_at
    `,
    emergency.id,
    emergency.requester_id,
    emergency.service_type,
    emergency.status,
    emergency.responder_id,
    emergency.origin_latitude,
    emergency.origin_longitude,
    emergency.origin_address,
    emergency.estimated_distance_meters,
    emergency.estimated_duration_seconds,
    emergency.estimated_price,
    emergency.created_at,
    emergency.accepted_at,
    emergency.arrived_at,
    emergency.completed_at,
    emergency.cancelled_at,
    emergency.updated_at
  );
}

export async function getActiveEmergency(): Promise<
  ActiveEmergency | null
> {
  const db = await getDatabase();

  return await db.getFirstAsync<ActiveEmergency>(
    `
      SELECT *
      FROM active_emergency
      LIMIT 1
    `
  );
}

export async function deleteActiveEmergency(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(`
    DELETE FROM active_emergency
  `);
}