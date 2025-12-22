import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = process.env.DATABASE_PATH || join(DATA_DIR, 'analytics.db');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
	mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
	CREATE TABLE IF NOT EXISTS analytics_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id TEXT NOT NULL,
		event_type TEXT NOT NULL,
		event_name TEXT,
		path TEXT NOT NULL,
		referrer TEXT,
		user_agent TEXT,
		ip TEXT,
		props TEXT,
		created_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
	CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
	CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);
	CREATE INDEX IF NOT EXISTS idx_events_path ON analytics_events(path);
`);

export const insert_event = db.prepare(`
	INSERT INTO analytics_events (session_id, event_type, event_name, path, referrer, user_agent, ip, props, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
