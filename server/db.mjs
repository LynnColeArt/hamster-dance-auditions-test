import { DatabaseSync } from 'node:sqlite'

export const AUDITION_STATUSES = Object.freeze(['draft', 'scheduled', 'posted'])
export const DEFAULT_AUDITIONS_DATABASE_PATH = 'auditions.sqlite3'

export function initializeAuditionsDatabase(path = DEFAULT_AUDITIONS_DATABASE_PATH) {
  const database = new DatabaseSync(path)
  database.exec(`
    CREATE TABLE IF NOT EXISTS auditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hamster_name TEXT NOT NULL,
      dance_style TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL
        CHECK (status IN ('draft', 'scheduled', 'posted'))
        DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  return database
}
