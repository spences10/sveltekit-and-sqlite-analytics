import {
	get_overview,
	get_top_pages,
	get_referrers,
	get_custom_events,
	get_visitor_timeline,
	get_recent_events,
	get_active_on_path,
} from '$lib/analytics-queries.remote';

export type TimeRange = 'today' | '7d' | '30d' | 'all';

export type Overview = {
	total_views: number;
	unique_visitors: number;
	active_now: number;
};

export type TopPage = {
	path: string;
	views: number;
	unique_visitors: number;
};

export type Referrer = {
	source: string;
	visits: number;
};

export type CustomEvent = {
	event_name: string;
	count: number;
};

export type TimelinePoint = {
	period: string;
	visitors: number;
	page_views: number;
};

export type RecentEvent = {
	path: string;
	event_type: string;
	event_name: string | null;
	created_at: number;
};

function create_analytics_state() {
	let time_range = $state<TimeRange>('today');
	let overview = $state<Overview | null>(null);
	let top_pages = $state<TopPage[]>([]);
	let referrers = $state<Referrer[]>([]);
	let custom_events = $state<CustomEvent[]>([]);
	let timeline = $state<TimelinePoint[]>([]);
	let recent_events = $state<RecentEvent[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function fetch_all() {
		loading = true;
		error = null;

		try {
			const [
				overview_data,
				pages_data,
				referrers_data,
				events_data,
				timeline_data,
				recent_data,
			] = await Promise.all([
				get_overview({ range: time_range }),
				get_top_pages({ range: time_range, limit: 10 }),
				get_referrers({ range: time_range, limit: 10 }),
				get_custom_events({ range: time_range, limit: 10 }),
				get_visitor_timeline({ range: time_range }),
				get_recent_events({ limit: 20 }),
			]);

			overview = overview_data;
			top_pages = pages_data;
			referrers = referrers_data;
			custom_events = events_data;
			timeline = timeline_data;
			recent_events = recent_data;
		} catch (e) {
			error =
				e instanceof Error ? e.message : 'Failed to fetch analytics';
		} finally {
			loading = false;
		}
	}

	async function refresh_active_now() {
		try {
			const data = await get_overview({ range: time_range });
			if (overview) {
				overview = { ...overview, active_now: data.active_now };
			}
		} catch {
			// Silent fail for background refresh
		}
	}

	function set_time_range(range: TimeRange) {
		time_range = range;
		fetch_all();
	}

	return {
		get time_range() {
			return time_range;
		},
		get overview() {
			return overview;
		},
		get top_pages() {
			return top_pages;
		},
		get referrers() {
			return referrers;
		},
		get custom_events() {
			return custom_events;
		},
		get timeline() {
			return timeline;
		},
		get recent_events() {
			return recent_events;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		fetch_all,
		refresh_active_now,
		set_time_range,
	};
}

export const analytics = create_analytics_state();

// Utility for "viewing now" on specific paths
export function create_viewing_now(path: string) {
	let count = $state(0);

	async function refresh() {
		try {
			const data = await get_active_on_path({ path });
			count = data.count;
		} catch {
			// Silent fail
		}
	}

	return {
		get count() {
			return count;
		},
		refresh,
	};
}
