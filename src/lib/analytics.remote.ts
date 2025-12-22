import { command, getRequestEvent } from '$app/server';
import { ANALYTICS_SALT } from '$env/static/private';
import { insert_event } from '$lib/server/db';
import crypto from 'crypto';
import * as v from 'valibot';

const track_schema = v.object({
	name: v.string(),
	props: v.optional(v.record(v.string(), v.unknown())),
});

function get_client_ip(request: Request): string | null {
	const forwarded_for = request.headers.get('x-forwarded-for');
	if (forwarded_for) {
		return forwarded_for.split(',')[0].trim();
	}
	return request.headers.get('x-real-ip');
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

export const track = command(
	track_schema,
	async ({ name, props }) => {
		const event = getRequestEvent();
		const ip = get_client_ip(event.request);
		const user_agent = event.request.headers.get('user-agent');
		const visitor_hash = get_visitor_hash(ip, user_agent);

		insert_event.run(
			visitor_hash,
			'custom',
			name,
			event.url.pathname,
			event.request.headers.get('referer') || null,
			user_agent,
			null,
			props ? JSON.stringify(props) : null,
			Date.now(),
		);

		return { success: true };
	},
);
