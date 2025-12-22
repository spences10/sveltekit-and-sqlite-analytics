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
