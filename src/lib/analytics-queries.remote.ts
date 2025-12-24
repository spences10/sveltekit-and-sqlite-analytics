import { query } from '$app/server';
import {
	query_active_on_path,
	query_active_visitors,
} from '$lib/analytics.helpers';
import { db } from '$lib/server/db';
import * as v from 'valibot';

const time_range_schema = v.object({
	range: v.picklist(['today', '7d', '30d', 'all']),
});

const path_schema = v.object({
	path: v.string(),
});

const limit_schema = v.object({
	range: v.picklist(['today', '7d', '30d', 'all']),
	limit: v.optional(v.number(), 10),
});

function get_time_filter(
	range: 'today' | '7d' | '30d' | 'all',
): number {
	const now = Date.now();
	switch (range) {
		case 'today':
			return now - 24 * 60 * 60 * 1000;
		case '7d':
			return now - 7 * 24 * 60 * 60 * 1000;
		case '30d':
			return now - 30 * 24 * 60 * 60 * 1000;
		case 'all':
			return 0;
	}
}

export const get_overview = query(time_range_schema, ({ range }) => {
	const since = get_time_filter(range);

	// Total views (humans only)
	const total_views = db
		.prepare(
			`SELECT COUNT(*) as count FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL)`,
		)
		.get(since) as { count: number };

	// Unique visitors (humans only)
	const unique_visitors = db
		.prepare(
			`SELECT COUNT(DISTINCT visitor_hash) as count FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL)`,
		)
		.get(since) as { count: number };

	// Active in last 5 minutes (humans only)
	const five_min_ago = Date.now() - 5 * 60 * 1000;
	const active_now = db
		.prepare(
			`SELECT COUNT(DISTINCT visitor_hash) as count FROM analytics_events
       WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL)`,
		)
		.get(five_min_ago) as { count: number };

	// Bot count (for display)
	const bots = db
		.prepare(
			`SELECT COUNT(DISTINCT visitor_hash) as count FROM analytics_events
       WHERE created_at > ? AND is_bot = 1`,
		)
		.get(five_min_ago) as { count: number };

	return {
		total_views: total_views.count,
		unique_visitors: unique_visitors.count,
		active_now: active_now.count,
		bots: bots.count,
	};
});

export const get_top_pages = query(
	limit_schema,
	({ range, limit }) => {
		const since = get_time_filter(range);

		// Exclude bots from page views
		const pages = db
			.prepare(
				`SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as unique_visitors
       FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL)
       GROUP BY path
       ORDER BY views DESC
       LIMIT ?`,
			)
			.all(since, limit) as {
			path: string;
			views: number;
			unique_visitors: number;
		}[];

		return pages;
	},
);

export const get_referrers = query(
	limit_schema,
	({ range, limit }) => {
		const since = get_time_filter(range);

		// Extract domain from referrer, exclude bots
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
				END as source,
				COUNT(*) as visits
       FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL)
       GROUP BY source
       ORDER BY visits DESC
       LIMIT ?`,
			)
			.all(since, limit) as { source: string; visits: number }[];

		return referrers;
	},
);

/**
 * Get active visitors with full breakdown
 * Uses pure helper function for testability
 */
export const get_active_visitors = query(
	v.object({ limit: v.optional(v.number(), 10) }),
	({ limit }) => query_active_visitors(db, { limit }),
);

/**
 * Get active visitors on a specific path
 * Uses pure helper function for testability
 */
export const get_active_on_path = query(path_schema, ({ path }) =>
	query_active_on_path(db, path),
);

export const get_custom_events = query(
	limit_schema,
	({ range, limit }) => {
		const since = get_time_filter(range);

		// Exclude bots from custom events too
		const events = db
			.prepare(
				`SELECT event_name, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'custom' AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL)
       GROUP BY event_name
       ORDER BY count DESC
       LIMIT ?`,
			)
			.all(since, limit) as { event_name: string; count: number }[];

		return events;
	},
);

export const get_visitor_timeline = query(
	time_range_schema,
	({ range }) => {
		const since = get_time_filter(range);

		// Group by hour for today, by day for longer ranges
		const group_format =
			range === 'today' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';

		// Exclude bots from timeline
		const timeline = db
			.prepare(
				`SELECT
         strftime('${group_format}', created_at / 1000, 'unixepoch') as period,
         COUNT(DISTINCT visitor_hash) as visitors,
         COUNT(*) as page_views
       FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ? AND (is_bot = 0 OR is_bot IS NULL)
       GROUP BY period
       ORDER BY period ASC`,
			)
			.all(since) as {
			period: string;
			visitors: number;
			page_views: number;
		}[];

		return timeline;
	},
);

export const get_recent_events = query(
	v.object({ limit: v.optional(v.number(), 20) }),
	({ limit }) => {
		const events = db
			.prepare(
				`SELECT path, event_type, event_name, browser, device_type, country, is_bot, created_at
         FROM analytics_events
         ORDER BY created_at DESC
         LIMIT ?`,
			)
			.all(limit) as {
			path: string;
			event_type: string;
			event_name: string | null;
			browser: string | null;
			device_type: string | null;
			country: string | null;
			is_bot: number;
			created_at: number;
		}[];

		return events;
	},
);

/**
 * Get browser breakdown
 */
export const get_browsers = query(
	limit_schema,
	({ range, limit }) => {
		const since = get_time_filter(range);

		const browsers = db
			.prepare(
				`SELECT browser as name, COUNT(DISTINCT visitor_hash) as count
       FROM analytics_events
       WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL) AND browser IS NOT NULL
       GROUP BY browser
       ORDER BY count DESC
       LIMIT ?`,
			)
			.all(since, limit) as { name: string; count: number }[];

		return browsers;
	},
);

/**
 * Get device type breakdown
 */
export const get_devices = query(time_range_schema, ({ range }) => {
	const since = get_time_filter(range);

	const devices = db
		.prepare(
			`SELECT device_type as name, COUNT(DISTINCT visitor_hash) as count
       FROM analytics_events
       WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL) AND device_type IS NOT NULL
       GROUP BY device_type
       ORDER BY count DESC`,
		)
		.all(since) as { name: string; count: number }[];

	return devices;
});

/**
 * Get country breakdown
 */
export const get_countries = query(
	limit_schema,
	({ range, limit }) => {
		const since = get_time_filter(range);

		const countries = db
			.prepare(
				`SELECT country, COUNT(DISTINCT visitor_hash) as count
       FROM analytics_events
       WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL) AND country IS NOT NULL
       GROUP BY country
       ORDER BY count DESC
       LIMIT ?`,
			)
			.all(since, limit) as { country: string; count: number }[];

		return countries;
	},
);
