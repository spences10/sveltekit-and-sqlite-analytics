import { command, getRequestEvent } from '$app/server';
import { ANALYTICS_SALT } from '$env/static/private';
import { get_insert_statement } from '$lib/server/db';
import crypto from 'crypto';
import * as v from 'valibot';

// ============================================
// Validation Schema
// ============================================

const track_schema = v.object({
	name: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, 'Event name is required'),
		v.maxLength(100, 'Event name too long'),
	),
	props: v.optional(v.record(v.string(), v.unknown())),
});

// ============================================
// Helper Functions
// ============================================

function get_client_ip(request: Request): string | null {
	const forwarded_for = request.headers.get('x-forwarded-for');
	if (forwarded_for) {
		return forwarded_for.split(',')[0].trim();
	}
	return request.headers.get('x-real-ip');
}

/**
 * Anonymise IP address for privacy
 * IPv4: zeros last octet (192.168.1.100 -> 192.168.1.0)
 * IPv6: zeros last two segments
 */
function anonymise_ip(ip: string | null): string | null {
	if (!ip) return null;

	// IPv4
	if (ip.includes('.')) {
		const parts = ip.split('.');
		if (parts.length === 4) {
			parts[3] = '0';
			return parts.join('.');
		}
	}

	// IPv6
	if (ip.includes(':')) {
		const parts = ip.split(':');
		if (parts.length >= 2) {
			parts[parts.length - 1] = '0';
			parts[parts.length - 2] = '0';
			return parts.join(':');
		}
	}

	return ip;
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

// ============================================
// User Agent Parsing
// ============================================

interface ParsedUserAgent {
	browser: string | null;
	os: string | null;
	device_type: 'desktop' | 'mobile' | 'tablet' | null;
	is_bot: boolean;
}

/**
 * LEARNING: Comprehensive bot detection is essential for accurate analytics.
 * These patterns cover search engines, social media crawlers, monitoring tools,
 * headless browsers, HTTP libraries, and SEO tools.
 */
const BOT_PATTERNS = [
	/bot/i,
	/crawl/i,
	/spider/i,
	/slurp/i,
	/mediapartners/i,
	/googlebot/i,
	/bingbot/i,
	/yandex/i,
	/baidu/i,
	/duckduckbot/i,
	/facebookexternalhit/i,
	/twitterbot/i,
	/linkedinbot/i,
	/whatsapp/i,
	/telegram/i,
	/discord/i,
	/slack/i,
	/pingdom/i,
	/uptimerobot/i,
	/gtmetrix/i,
	/lighthouse/i,
	/headlesschrome/i,
	/phantomjs/i,
	/selenium/i,
	/puppeteer/i,
	/python-requests/i,
	/curl/i,
	/wget/i,
	/httpx/i,
	/axios/i,
	/go-http-client/i,
	/java/i,
	/ruby/i,
	/perl/i,
	/semrush/i,
	/ahrefs/i,
	/mj12bot/i,
	/dotbot/i,
	/applebot/i,
	/bytespider/i,
	/petalbot/i,
	/gptbot/i,
];

function parse_user_agent(ua: string | null): ParsedUserAgent {
	if (!ua)
		return {
			browser: null,
			os: null,
			device_type: null,
			is_bot: false,
		};

	// Bot detection
	const is_bot = BOT_PATTERNS.some((pattern) => pattern.test(ua));

	// Browser detection (order matters - check specific before generic)
	let browser: string | null = null;
	if (/edg/i.test(ua)) browser = 'Edge';
	else if (/opr|opera/i.test(ua)) browser = 'Opera';
	else if (/chrome|chromium|crios/i.test(ua)) browser = 'Chrome';
	else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
	else if (/safari/i.test(ua) && !/chrome/i.test(ua))
		browser = 'Safari';
	else if (/msie|trident/i.test(ua)) browser = 'IE';
	else if (/samsung/i.test(ua)) browser = 'Samsung';
	else if (/ucbrowser/i.test(ua)) browser = 'UC Browser';

	// OS detection
	let os: string | null = null;
	if (/windows/i.test(ua)) os = 'Windows';
	else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
	else if (/android/i.test(ua)) os = 'Android';
	else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
	else if (/linux/i.test(ua)) os = 'Linux';
	else if (/chromeos/i.test(ua)) os = 'ChromeOS';

	// Device type detection
	let device_type: 'desktop' | 'mobile' | 'tablet' | null = null;
	if (/ipad|tablet|playbook|silk/i.test(ua)) device_type = 'tablet';
	else if (
		/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)
	)
		device_type = 'mobile';
	else if (os) device_type = 'desktop';

	return { browser, os, device_type, is_bot };
}

// ============================================
// Track Command
// ============================================

export const track = command(
	track_schema,
	async ({ name, props }) => {
		const event = getRequestEvent();
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
			'custom',
			name,
			event.url.pathname,
			event.request.headers.get('referer') || null,
			user_agent,
			anonymise_ip(ip),
			country,
			browser,
			device_type,
			os,
			is_bot ? 1 : 0,
			props ? JSON.stringify(props) : null,
			Date.now(),
		);

		return { success: true };
	},
);

// ============================================
// Exports for hooks.server.ts
// ============================================

export {
	anonymise_ip,
	get_client_ip,
	get_visitor_hash,
	parse_user_agent,
};
export type { ParsedUserAgent };
