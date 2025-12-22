import { command, getRequestEvent } from '$app/server';
import { insert_event } from '$lib/server/db';
import * as v from 'valibot';

const track_schema = v.object({
	name: v.string(),
	props: v.optional(v.record(v.string(), v.unknown())),
});

export const track = command(
	track_schema,
	async ({ name, props }) => {
		const event = getRequestEvent();
		const session_id = event.locals.sessionId;

		insert_event.run(
			session_id,
			'custom',
			name,
			event.url.pathname,
			event.request.headers.get('referer') || null,
			event.request.headers.get('user-agent') || null,
			null,
			props ? JSON.stringify(props) : null,
			Date.now(),
		);

		return { success: true };
	},
);
