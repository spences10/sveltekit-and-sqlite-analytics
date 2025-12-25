import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import rollup_schema from '$lib/server/rollup-schema.sql?raw';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Initialize rollup tables
db.exec(rollup_schema);

/**
 * Analytics rollup job
 * Aggregates raw analytics_events into monthly, yearly, and all-time summaries
 *
 * LEARNING: Run as a cron job (e.g., daily) to keep summary tables up to date.
 * This reduces query load for historical data while keeping raw events for debugging.
 *
 * Usage:
 *   curl -X POST https://yoursite.com/api/rollup \
 *     -H "Content-Type: application/json" \
 *     -d '{"token": "your-rollup-token"}'
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Simple token auth (skip in dev if no token configured)
		if (env.ROLLUP_TOKEN && body.token !== env.ROLLUP_TOKEN) {
			return json({ error: 'Unauthorised' }, { status: 401 });
		}

		const results = {
			monthly: 0,
			yearly: 0,
			all_time: 0,
		};

		// Monthly rollup (exclude bots)
		const monthly = db.prepare(`
			INSERT OR REPLACE INTO analytics_monthly (year, month, path, page_views, unique_visitors)
			SELECT
				CAST(strftime('%Y', created_at / 1000, 'unixepoch') AS INTEGER) as year,
				CAST(strftime('%m', created_at / 1000, 'unixepoch') AS INTEGER) as month,
				path,
				COUNT(*) as page_views,
				COUNT(DISTINCT visitor_hash) as unique_visitors
			FROM analytics_events
			WHERE event_type = 'page_view' AND (is_bot = 0 OR is_bot IS NULL)
			GROUP BY year, month, path
		`);
		const monthly_result = monthly.run();
		results.monthly = monthly_result.changes;

		// Yearly rollup (exclude bots)
		const yearly = db.prepare(`
			INSERT OR REPLACE INTO analytics_yearly (year, path, page_views, unique_visitors)
			SELECT
				CAST(strftime('%Y', created_at / 1000, 'unixepoch') AS INTEGER) as year,
				path,
				COUNT(*) as page_views,
				COUNT(DISTINCT visitor_hash) as unique_visitors
			FROM analytics_events
			WHERE event_type = 'page_view' AND (is_bot = 0 OR is_bot IS NULL)
			GROUP BY year, path
		`);
		const yearly_result = yearly.run();
		results.yearly = yearly_result.changes;

		// All-time rollup (exclude bots)
		const all_time = db.prepare(`
			INSERT OR REPLACE INTO analytics_all_time (path, page_views, unique_visitors, first_view, last_view)
			SELECT
				path,
				COUNT(*) as page_views,
				COUNT(DISTINCT visitor_hash) as unique_visitors,
				MIN(created_at) as first_view,
				MAX(created_at) as last_view
			FROM analytics_events
			WHERE event_type = 'page_view' AND (is_bot = 0 OR is_bot IS NULL)
			GROUP BY path
		`);
		const all_time_result = all_time.run();
		results.all_time = all_time_result.changes;

		return json({
			success: true,
			results,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Rollup error:', error);
		return json(
			{ error: 'Rollup failed', details: String(error) },
			{ status: 500 },
		);
	}
};
