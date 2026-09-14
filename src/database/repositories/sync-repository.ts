import { getDatabase } from "../index";

export type SyncOperation = {
  operation: string;
  entity_type: string;
  entity_id: string;
  payload: unknown;
  idempotency_key: string;
};

export async function addToSyncQueue(
  item: SyncOperation
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT OR IGNORE INTO sync_queue (
        operation,
        entity_type,
        entity_id,
        payload,
        idempotency_key,
        status,
        retry_count,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)
    `,
    item.operation,
    item.entity_type,
    item.entity_id,
    JSON.stringify(item.payload),
    item.idempotency_key,
    new Date().toISOString()
  );
}

export async function getPendingSyncItems(limit = 20) {
  const db = await getDatabase();

  return await db.getAllAsync<{
    id: number;
    operation: string;
    entity_type: string;
    entity_id: string;
    payload: string;
    idempotency_key: string;
    status: string;
    retry_count: number;
    created_at: string;
  }>(
    `
      SELECT *
      FROM sync_queue
      WHERE status = 'pending'
      ORDER BY id ASC
      LIMIT ?
    `,
    limit
  );
}

export async function markSyncComplete(
  id: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM sync_queue
      WHERE id = ?
    `,
    id
  );
}

export async function markSyncFailed(
  id: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE sync_queue
      SET
        retry_count = retry_count + 1,
        last_attempt_at = ?
      WHERE id = ?
    `,
    new Date().toISOString(),
    id
  );
}