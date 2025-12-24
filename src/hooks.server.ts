import {
	anonymise_ip,
	get_client_ip,
	get_visitor_hash,
	parse_user_agent,
} from '$lib/analytics.remote';
import { get_insert_statement } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const accept = event.request.headers.get('accept') || '';
	const is_page_request = accept.includes('text/html');
	const is_internal_path =
		path.startsWith('/_') || path.startsWith('/__');
	const is_asset = path.includes('.');

	if (is_page_request && !is_internal_path && !is_asset) {
		const ip = get_client_ip(event.request);
		const user_agent = event.request.headers.get('user-agent');
		const visitor_hash = get_visitor_hash(ip, user_agent);
		const { browser, os, device_type, is_bot } =
			parse_user_agent(user_agent);

		/**
		 * LEARNING: Country detection via Cloudflare header.
		 * If using Cloudflare, cf-ipcountry header provides ISO country code.
		 * Other providers may use different headers (e.g., x-vercel-ip-country).
		 */
		const country = event.request.headers.get('cf-ipcountry');

		get_insert_statement().run(
			visitor_hash,
			'page_view',
			null,
			path,
			event.request.headers.get('referer') || null,
			user_agent,
			anonymise_ip(ip),
			country,
			browser,
			device_type,
			os,
			is_bot ? 1 : 0,
			null,
			Date.now(),
		);
	}

	return resolve(event);
};
