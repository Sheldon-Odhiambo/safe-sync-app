import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "safesync.db";

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Get the SafeSync SQLite database.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  return database;
}

/**
 * Initialize the SafeSync local database.
 */
export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT,
      full_name TEXT,
      phone TEXT,
      role TEXT,
      account_type TEXT,
      organization_id TEXT,
      branch_id TEXT,
      avatar_url TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      logo_url TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY NOT NULL,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responders (
      id TEXT PRIMARY KEY NOT NULL,
      organization_id TEXT,
      name TEXT,
      phone TEXT,
      service_type TEXT,
      status TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY NOT NULL,
      responder_id TEXT,
      registration_number TEXT,
      vehicle_type TEXT,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (responder_id)
        REFERENCES responders(id)
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS active_emergency (
      id TEXT PRIMARY KEY NOT NULL,
      requester_id TEXT NOT NULL,
      service_type TEXT NOT NULL,
      status TEXT NOT NULL,

      responder_id TEXT,

      origin_latitude REAL NOT NULL,
      origin_longitude REAL NOT NULL,
      origin_address TEXT,

      estimated_distance_meters REAL,
      estimated_duration_seconds REAL,
      estimated_price REAL,

      created_at TEXT NOT NULL,
      accepted_at TEXT,
      arrived_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT,

      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_events (
      id TEXT PRIMARY KEY NOT NULL,
      emergency_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      data TEXT,
      created_at TEXT NOT NULL,

      FOREIGN KEY (emergency_id)
        REFERENCES active_emergency(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_emergency_events_emergency
      ON emergency_events(emergency_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      received_at TEXT NOT NULL,
      expires_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_read
      ON notifications(is_read);

    CREATE TABLE IF NOT EXISTS location_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      latitude REAL NOT NULL,
      longitude REAL NOT NULL,

      accuracy REAL,
      speed REAL,
      heading REAL,

      recorded_at TEXT NOT NULL,

      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_location_queue_synced
      ON location_queue(synced);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      operation TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,

      payload TEXT NOT NULL,

      idempotency_key TEXT NOT NULL UNIQUE,

      status TEXT NOT NULL DEFAULT 'pending',

      retry_count INTEGER NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL,
      last_attempt_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_status
      ON sync_queue(status);

    CREATE TABLE IF NOT EXISTS responder_cache (
      id TEXT PRIMARY KEY NOT NULL,

      name TEXT,
      service_type TEXT,
      status TEXT,

      latitude REAL,
      longitude REAL,

      updated_at TEXT NOT NULL
    );
  `);

  await setMetadata("database_version", "1");
}

/**
 * Store application metadata.
 */
export async function setMetadata(
  key: string,
  value: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO app_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key)
      DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    key,
    value,
    new Date().toISOString()
  );
}

/**
 * Retrieve application metadata.
 */
export async function getMetadata(
  key: string
): Promise<string | null> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ value: string }>(
    `
      SELECT value
      FROM app_metadata
      WHERE key = ?
    `,
    key
  );

  return result?.value ?? null;
}