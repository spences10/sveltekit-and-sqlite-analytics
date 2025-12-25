/**
 * Analytics helper functions - testable pure logic
 * Separated from remote functions for better testability
 */

import type Database from 'better-sqlite3';

// ============================================
// Flag Emoji Utilities
// ============================================

/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji
 * e.g., "GB" -> "🇬🇧", "US" -> "🇺🇸"
 */
export function country_to_flag(country_code: string | null): string {
	if (!country_code || country_code.length !== 2) return '🌍';
	const code = country_code.toUpperCase();
	// Regional indicator symbols: A=🇦 (U+1F1E6), B=🇧 (U+1F1E7), etc.
	const offset = 0x1f1e6 - 65; // 65 is 'A'
	return String.fromCodePoint(
		code.charCodeAt(0) + offset,
		code.charCodeAt(1) + offset,
	);
}

/**
 * Format countries as "3 🇬🇧 2 🇺🇸 1 🇩🇪"
 */
export function format_countries(countries: CountryCount[]): string {
	if (!countries.length) return '';
	return countries
		.map((c) => `${c.count} ${country_to_flag(c.country)}`)
		.join(' ');
}

// ============================================
// Type Definitions
// ============================================

export interface CountryCount {
	country: string;
	count: number;
}

export interface NameCount {
	name: string;
	count: number;
}

export interface ActiveVisitorsResult {
	pages: { path: string; count: number }[];
	total: number;
	bots: number;
	countries: CountryCount[];
	browsers: NameCount[];
	devices: NameCount[];
	referrers: NameCount[];
}

export interface ActiveOnPathResult {
	count: number;
	bots: number;
	countries: CountryCount[];
}

export type DatabaseClient = Database.Database;

// ============================================
// Query Functions
// ============================================

/**
 * Query active visitors across the site
 * Filters out bots, returns breakdown by page/country/browser/device
 */
export function query_active_visitors(
	db: DatabaseClient,
	options: { limit?: number; window_ms?: number } = {},
): ActiveVisitorsResult {
	const { limit = 10, window_ms = 5 * 60 * 1000 } = options;
	const cutoff = Date.now() - window_ms;

	try {
		// Pages (humans only)
		const pages = db
			.prepare(
				`SELECT path, COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL)
				GROUP BY path
				ORDER BY count DESC
				LIMIT ?`,
			)
			.all(cutoff, limit) as { path: string; count: number }[];

		// Total humans
		const total_result = db
			.prepare(
				`SELECT COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL)`,
			)
			.get(cutoff) as { count: number } | undefined;

		// Total bots
		const bots_result = db
			.prepare(
				`SELECT COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE created_at > ? AND is_bot = 1`,
			)
			.get(cutoff) as { count: number } | undefined;

		// Countries (humans only, top 5)
		const countries = db
			.prepare(
				`SELECT country, COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL) AND country IS NOT NULL
				GROUP BY country
				ORDER BY count DESC
				LIMIT 5`,
			)
			.all(cutoff) as CountryCount[];

		// Browsers (humans only, top 5)
		const browsers = db
			.prepare(
				`SELECT browser as name, COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL) AND browser IS NOT NULL
				GROUP BY browser
				ORDER BY count DESC
				LIMIT 5`,
			)
			.all(cutoff) as NameCount[];

		// Device types (humans only)
		const devices = db
			.prepare(
				`SELECT device_type as name, COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL) AND device_type IS NOT NULL
				GROUP BY device_type
				ORDER BY count DESC`,
			)
			.all(cutoff) as NameCount[];

		// Referrers (humans only, top 5, extract domain)
		const referrers = db
			.prepare(
				`SELECT
					CASE
						WHEN referrer IS NULL OR referrer = '' THEN '(direct)'
						ELSE SUBSTR(referrer, INSTR(referrer, '://') + 3,
							CASE
								WHEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') > 0
								THEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') - 1
								ELSE LENGTH(referrer)
							END
						)
					END as name,
					COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL)
				GROUP BY name
				ORDER BY count DESC
				LIMIT 5`,
			)
			.all(cutoff) as NameCount[];

		return {
			pages,
			total: total_result?.count ?? 0,
			bots: bots_result?.count ?? 0,
			countries,
			browsers,
			devices,
			referrers,
		};
	} catch (error) {
		console.error('Error querying active visitors:', error);
		return {
			pages: [],
			total: 0,
			bots: 0,
			countries: [],
			browsers: [],
			devices: [],
			referrers: [],
		};
	}
}

/**
 * Query active visitors on a specific path
 */
export function query_active_on_path(
	db: DatabaseClient,
	path: string,
	options: { window_ms?: number } = {},
): ActiveOnPathResult {
	const { window_ms = 5 * 60 * 1000 } = options;
	const cutoff = Date.now() - window_ms;

	try {
		// Humans
		const result = db
			.prepare(
				`SELECT COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE path = ? AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL)`,
			)
			.get(path, cutoff) as { count: number } | undefined;

		// Bots
		const bots_result = db
			.prepare(
				`SELECT COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE path = ? AND created_at > ? AND is_bot = 1`,
			)
			.get(path, cutoff) as { count: number } | undefined;

		// Countries (humans only)
		const countries = db
			.prepare(
				`SELECT country, COUNT(DISTINCT visitor_hash) as count
				FROM analytics_events
				WHERE path = ? AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL) AND country IS NOT NULL
				GROUP BY country
				ORDER BY count DESC
				LIMIT 5`,
			)
			.all(path, cutoff) as CountryCount[];

		return {
			count: result?.count ?? 0,
			bots: bots_result?.count ?? 0,
			countries,
		};
	} catch (error) {
		console.error('Error querying active on path:', error);
		return { count: 0, bots: 0, countries: [] };
	}
}
