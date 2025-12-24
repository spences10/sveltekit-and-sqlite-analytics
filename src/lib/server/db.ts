import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import schema from './schema.sql?raw';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH =
	process.env.DATABASE_PATH || join(DATA_DIR, 'analytics.db');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
	mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(schema);

/**
 * Get insert statement - creates fresh each time
 * LEARNING: In dev mode, HMR can cause database reconnects that invalidate
 * cached prepared statements. Creating fresh statements avoids stale connection issues.
 */
export const get_insert_statement = () => {
	return db.prepare(`
		INSERT INTO analytics_events (visitor_hash, event_type, event_name, path, referrer, user_agent, ip, country, browser, device_type, os, is_bot, props, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);
};
