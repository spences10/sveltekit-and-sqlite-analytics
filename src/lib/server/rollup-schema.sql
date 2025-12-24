-- Analytics rollup tables for long-term storage
-- Run daily to aggregate analytics_events into summary tables

CREATE TABLE IF NOT EXISTS analytics_monthly (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	year INTEGER NOT NULL,
	month INTEGER NOT NULL,
	path TEXT NOT NULL,
	page_views INTEGER NOT NULL DEFAULT 0,
	unique_visitors INTEGER NOT NULL DEFAULT 0,
	UNIQUE(year, month, path)
);

CREATE TABLE IF NOT EXISTS analytics_yearly (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	year INTEGER NOT NULL,
	path TEXT NOT NULL,
	page_views INTEGER NOT NULL DEFAULT 0,
	unique_visitors INTEGER NOT NULL DEFAULT 0,
	UNIQUE(year, path)
);

CREATE TABLE IF NOT EXISTS analytics_all_time (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	path TEXT NOT NULL UNIQUE,
	page_views INTEGER NOT NULL DEFAULT 0,
	unique_visitors INTEGER NOT NULL DEFAULT 0,
	first_view INTEGER,
	last_view INTEGER
);

CREATE INDEX IF NOT EXISTS idx_monthly_date ON analytics_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_yearly_year ON analytics_yearly(year);
