import { ANALYTICS_SALT } from '$env/static/private';
import { insert_event } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';
import crypto from 'crypto';

function anonymize_ip(ip: string | null): string | null {
	if (!ip) return null;

	// Handle IPv6
	if (ip.includes(':')) {
		const parts = ip.split(':');
		if (parts.length >= 4) {
			parts[parts.length - 1] = '0';
			parts[parts.length - 2] = '0';
		}
		return parts.join(':');
	}

	// Handle IPv4
	const parts = ip.split('.');
	if (parts.length === 4) {
		parts[3] = '0';
		return parts.join('.');
	}

	return ip;
}

function get_client_ip(request: Request): string | null {
	const forwarded_for = request.headers.get('x-forwarded-for');
	if (forwarded_for) {
		return forwarded_for.split(',')[0].trim();
	}

	const real_ip = request.headers.get('x-real-ip');
	if (real_ip) {
		return real_ip;
	}

	return null;
}

function get_visitor_hash(
	ip: string | null,
	user_agent: string | null,
): string {
	const date = new Date().toISOString().split('T')[0];
	const data = `${ip || ''}${user_agent || ''}${date}${ANALYTICS_SALT}`;
	return crypto
		.createHash('sha256')
		.update(data)
		.digest('hex')
		.slice(0, 16);
}

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

		insert_event.run(
			visitor_hash,
			'page_view',
			null,
			path,
			event.request.headers.get('referer') || null,
			user_agent,
			anonymize_ip(ip),
			null,
			Date.now(),
		);
	}

	return resolve(event);
};
