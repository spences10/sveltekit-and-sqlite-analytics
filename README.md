# SvelteKit Analytics with SQLite

Server-side analytics using SvelteKit hooks + SQLite. No cookies,
GDPR-friendly.

## Features

- Auto page view tracking via `hooks.server.ts`
- Client event tracking via remote functions
- SQLite with WAL mode
- Anonymized IP addresses
- Privacy-first: no cookies, daily rotating visitor hash (IP+UA+date)
- User agent parsing (browser, OS, device type)
- Bot detection (40+ patterns)
- Country tracking (via Cloudflare `cf-ipcountry` header)
- Flag emoji display utilities
- Analytics rollup for historical data

## Setup

```bash
pnpm install
cp .env.example .env
```

Generate a salt for visitor hashing:

```bash
# Linux/macOS
echo "ANALYTICS_SALT=$(openssl rand -hex 16)" > .env

# For rollup endpoint
echo "ROLLUP_TOKEN=$(openssl rand -hex 16)" >> .env
```

Start dev server:

```bash
pnpm dev
```

Database auto-creates at `data/analytics.db` on first request.

## Usage

### Page views

Automatic. Any HTML page request is tracked.

### Custom events

```svelte
<script>
	import { track } from '$lib/analytics.remote';
</script>

<button
	onclick={() =>
		track({ name: 'signup_click', props: { plan: 'pro' } })}
>
	Sign Up
</button>
```

### Active visitors with breakdowns

```svelte
<script>
	import { get_active_visitors } from '$lib/analytics-queries.remote';
	import { country_to_flag } from '$lib/analytics.helpers';

	let data = get_active_visitors({ limit: 10 });
</script>

<p>
	{data.current.total} visitors
	{#if data.current.bots > 0}(+{data.current.bots} 🤖){/if}
</p>

<p>
	{#each data.current.countries as c}
		{c.count}{country_to_flag(c.country)}
	{/each}
</p>
```

### Refreshing remote function data

```svelte
<script>
	import { get_active_visitors } from '$lib/analytics-queries.remote';

	let data = get_active_visitors({ limit: 10 });

	// IMPORTANT: Use data.refresh(), NOT get_active_visitors().refresh()
	// Creating a new instance resets the data structure
	setInterval(() => data.refresh(), 30000);
</script>
```

## Schema

```sql
CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,  -- daily rotating hash (IP+UA+date+salt)
  event_type TEXT NOT NULL,    -- 'page_view' | 'custom'
  event_name TEXT,             -- custom event name
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip TEXT,                     -- anonymized (last octet zeroed)
  country TEXT,                -- ISO 3166-1 alpha-2 (e.g. 'GB', 'US')
  browser TEXT,                -- parsed from user_agent
  device_type TEXT,            -- 'desktop' | 'mobile' | 'tablet'
  os TEXT,                     -- parsed from user_agent
  is_bot INTEGER,              -- 1 = bot, 0 = human
  props TEXT,                  -- JSON
  created_at INTEGER NOT NULL  -- unix ms
);
```

## Files

```
src/
├── hooks.server.ts              # auto page view tracking
├── lib/
│   ├── analytics.remote.ts      # track() command + UA parsing
│   ├── analytics.helpers.ts     # pure query functions + flag emoji
│   ├── analytics-queries.remote.ts  # query remote functions
│   └── server/
│       ├── db.ts                # database connection
│       ├── schema.sql           # table schema
│       └── rollup-schema.sql    # summary tables schema
├── routes/
│   └── api/rollup/+server.ts    # rollup job endpoint
```

## Learnings from Production Use

### 1. Remote Function Refresh Bug

**Problem**: Polling components that call
`get_active_visitors({ limit: 10 }).refresh()` create NEW remote
function instances instead of refreshing existing data.

**Fix**: Store the remote function result and call `.refresh()` on it:

```svelte
<!-- WRONG -->
<script>
	let data = get_active_visitors({ limit: 10 });
	setInterval(() => get_active_visitors({ limit: 10 }).refresh(), 30000);
</script>

<!-- CORRECT -->
<script>
	let data = get_active_visitors({ limit: 10 });
	setInterval(() => data.refresh(), 30000);
</script>
```

### 2. SSR URL Issues (example.com)

**Problem**: Using `page.url.origin` during SSR returns
`https://example.com/` instead of the actual domain.

**Fix**: Use relative paths instead of absolute URLs:

```svelte
<!-- WRONG -->
<a href="{$page.url.origin}/posts/{slug}">Read more</a>

<!-- CORRECT -->
<a href="/posts/{slug}">Read more</a>
```

### 3. SQLite Singleton Pattern

**Problem**: Closing the SQLite connection after each request breaks
the singleton pattern and causes "database closed" errors.

**Fix**: Don't close singleton database connections. The connection
stays open for the lifetime of the process:

```typescript
// db.ts - CORRECT
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
// No close() call - singleton stays open
```

### 4. HMR Statement Invalidation

**Problem**: In dev mode, HMR can cause database reconnects that
invalidate cached prepared statements.

**Fix**: Create fresh statements instead of caching at module level:

```typescript
// WRONG - cached statement may become stale
export const insert_event = db.prepare(`INSERT INTO...`);

// CORRECT - fresh statement each call
export const get_insert_statement = () => {
	return db.prepare(`INSERT INTO...`);
};
```

### 5. Bot Filtering

**Problem**: Bots inflate analytics numbers significantly.

**Fix**: Filter bots from all queries with
`(is_bot = 0 OR is_bot IS NULL)`:

```sql
SELECT COUNT(DISTINCT visitor_hash) as count
FROM analytics_events
WHERE created_at > ? AND (is_bot = 0 OR is_bot IS NULL)
```

The `OR is_bot IS NULL` handles older data before bot detection was
added.

### 6. Country Detection

**Problem**: Need geographic data without GeoIP databases.

**Fix**: Use CDN headers:

- Cloudflare: `cf-ipcountry`
- Vercel: `x-vercel-ip-country`
- Other CDNs have similar headers

### 7. Testable Query Functions

**Problem**: Query functions tightly coupled to database make testing
difficult.

**Fix**: Extract query logic to pure functions with database as
parameter:

```typescript
// analytics.helpers.ts - testable pure functions
export function query_active_visitors(
	db: DatabaseClient,  // can be mocked
	options: { limit?: number }
): ActiveVisitorsResult { ... }

// analytics-queries.remote.ts - wires up the database
export const get_active_visitors = query(
	schema,
	({ limit }) => query_active_visitors(db, { limit })
);
```

## Query examples

```sql
-- page views by path (excluding bots)
SELECT path, COUNT(*) as views
FROM analytics_events
WHERE event_type = 'page_view' AND (is_bot = 0 OR is_bot IS NULL)
GROUP BY path
ORDER BY views DESC;

-- unique visitors per day (excluding bots)
SELECT DATE(created_at/1000, 'unixepoch') as day,
       COUNT(DISTINCT visitor_hash) as visitors
FROM analytics_events
WHERE is_bot = 0 OR is_bot IS NULL
GROUP BY day;

-- visitors on page right now (last 5 min, excluding bots)
SELECT COUNT(DISTINCT visitor_hash) as active
FROM analytics_events
WHERE path = '/'
AND created_at > (strftime('%s', 'now') * 1000 - 300000)
AND (is_bot = 0 OR is_bot IS NULL);

-- country breakdown
SELECT country, COUNT(DISTINCT visitor_hash) as visitors
FROM analytics_events
WHERE country IS NOT NULL AND (is_bot = 0 OR is_bot IS NULL)
GROUP BY country
ORDER BY visitors DESC;
```

## Rollup Job

For historical data, run the rollup job daily to aggregate events into
summary tables:

```bash
curl -X POST https://yoursite.com/api/rollup \
  -H "Content-Type: application/json" \
  -d '{"token": "your-rollup-token"}'
```

This aggregates `analytics_events` into:

- `analytics_monthly` - page views by month
- `analytics_yearly` - page views by year
- `analytics_all_time` - total stats per path

## Environment Variables

| Variable         | Description                        |
| ---------------- | ---------------------------------- |
| `ANALYTICS_SALT` | Secret for visitor hash generation |
| `ROLLUP_TOKEN`   | Auth token for rollup endpoint     |
| `DATABASE_PATH`  | Custom database path (optional)    |
