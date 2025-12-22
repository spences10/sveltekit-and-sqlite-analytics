# SvelteKit Analytics with SQLite

Server-side analytics using SvelteKit hooks + SQLite. No cookies,
GDPR-friendly.

## Features

- Auto page view tracking via `hooks.server.ts`
- Client event tracking via remote functions
- SQLite with WAL mode
- Anonymized IP addresses
- Privacy-first: no cookies, daily rotating visitor hash (IP+UA+date)

## Setup

```bash
pnpm install
cp .env.example .env
```

Generate a salt for visitor hashing:

```bash
# Linux/macOS
echo "ANALYTICS_SALT=$(openssl rand -hex 16)" > .env

# Or manually set any random string
echo "ANALYTICS_SALT=your-random-secret-here" > .env
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
  props TEXT,                  -- JSON
  created_at INTEGER NOT NULL  -- unix ms
);
```

## Files

```
src/
├── hooks.server.ts           # auto page view tracking
├── lib/
│   ├── analytics.remote.ts   # track() command
│   └── server/
│       ├── db.ts             # database connection
│       └── schema.sql        # table schema
```

## Query examples

```sql
-- page views by path
SELECT path, COUNT(*) as views
FROM analytics_events
WHERE event_type = 'page_view'
GROUP BY path
ORDER BY views DESC;

-- unique visitors per day
SELECT DATE(created_at/1000, 'unixepoch') as day,
       COUNT(DISTINCT visitor_hash) as visitors
FROM analytics_events
GROUP BY day;

-- visitors on page right now (last 5 min)
SELECT COUNT(DISTINCT visitor_hash) as active
FROM analytics_events
WHERE path = '/'
AND created_at > (strftime('%s', 'now') * 1000 - 300000);

-- custom events
SELECT event_name, COUNT(*) as count
FROM analytics_events
WHERE event_type = 'custom'
GROUP BY event_name;
```
