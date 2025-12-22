import { insert_event } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import crypto from 'crypto';

const SESSION_COOKIE = 'analytics_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

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

const session: Handle = async ({ event, resolve }) => {
	let session_id = event.cookies.get(SESSION_COOKIE);
	if (!session_id) {
		session_id = crypto.randomUUID();
		event.cookies.set(SESSION_COOKIE, session_id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE,
		});
	}

	event.locals.sessionId = session_id;

	return resolve(event);
};

const analytics: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const accept = event.request.headers.get('accept') || '';
	const is_page_request = accept.includes('text/html');
	const is_internal_path =
		path.startsWith('/_') || path.startsWith('/__');
	const is_asset = path.includes('.');

	if (is_page_request && !is_internal_path && !is_asset) {
		const ip = anonymize_ip(get_client_ip(event.request));

		insert_event.run(
			event.locals.sessionId,
			'page_view',
			null,
			path,
			event.request.headers.get('referer') || null,
			event.request.headers.get('user-agent') || null,
			ip,
			null,
			Date.now(),
		);
	}

	return resolve(event);
};

export const handle = sequence(session, analytics);
