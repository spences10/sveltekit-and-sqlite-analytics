import { query } from '$app/server';
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

	const total_views = db
		.prepare(
			`SELECT COUNT(*) as count FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ?`,
		)
		.get(since) as { count: number };

	const unique_visitors = db
		.prepare(
			`SELECT COUNT(DISTINCT visitor_hash) as count FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ?`,
		)
		.get(since) as { count: number };

	// Active in last 5 minutes
	const five_min_ago = Date.now() - 5 * 60 * 1000;
	const active_now = db
		.prepare(
			`SELECT COUNT(DISTINCT visitor_hash) as count FROM analytics_events
       WHERE created_at > ?`,
		)
		.get(five_min_ago) as { count: number };

	return {
		total_views: total_views.count,
		unique_visitors: unique_visitors.count,
		active_now: active_now.count,
	};
});

export const get_top_pages = query(
	limit_schema,
	({ range, limit }) => {
		const since = get_time_filter(range);

		const pages = db
			.prepare(
				`SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as unique_visitors
       FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ?
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

		const referrers = db
			.prepare(
				`SELECT
         CASE WHEN referrer IS NULL OR referrer = '' THEN 'Direct' ELSE referrer END as source,
         COUNT(*) as visits
       FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ?
       GROUP BY source
       ORDER BY visits DESC
       LIMIT ?`,
			)
			.all(since, limit) as { source: string; visits: number }[];

		return referrers;
	},
);

export const get_active_on_path = query(path_schema, ({ path }) => {
	const five_min_ago = Date.now() - 5 * 60 * 1000;

	const result = db
		.prepare(
			`SELECT COUNT(DISTINCT visitor_hash) as count FROM analytics_events
       WHERE path = ? AND created_at > ?`,
		)
		.get(path, five_min_ago) as { count: number };

	return { count: result.count };
});

export const get_custom_events = query(
	limit_schema,
	({ range, limit }) => {
		const since = get_time_filter(range);

		const events = db
			.prepare(
				`SELECT event_name, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'custom' AND created_at > ?
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

		const timeline = db
			.prepare(
				`SELECT
         strftime('${group_format}', created_at / 1000, 'unixepoch') as period,
         COUNT(DISTINCT visitor_hash) as visitors,
         COUNT(*) as page_views
       FROM analytics_events
       WHERE event_type = 'page_view' AND created_at > ?
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
				`SELECT path, event_type, event_name, created_at
         FROM analytics_events
         ORDER BY created_at DESC
         LIMIT ?`,
			)
			.all(limit) as {
			path: string;
			event_type: string;
			event_name: string | null;
			created_at: number;
		}[];

		return events;
	},
);
