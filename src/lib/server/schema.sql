CREATE TABLE IF NOT EXISTS analytics_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	visitor_hash TEXT NOT NULL,
	event_type TEXT NOT NULL,
	event_name TEXT,
	path TEXT NOT NULL,
	referrer TEXT,
	user_agent TEXT,
	ip TEXT,
	country TEXT,           -- ISO 3166-1 alpha-2 (e.g. 'GB', 'US')
	browser TEXT,           -- parsed from user_agent
	device_type TEXT,       -- 'desktop' | 'mobile' | 'tablet'
	os TEXT,                -- parsed from user_agent
	is_bot INTEGER,         -- 1 = bot, 0 = human
	props TEXT,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_visitor ON analytics_events(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_path ON analytics_events(path);
CREATE INDEX IF NOT EXISTS idx_events_country ON analytics_events(country);
CREATE INDEX IF NOT EXISTS idx_events_is_bot ON analytics_events(is_bot);
