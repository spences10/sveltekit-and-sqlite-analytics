<script lang="ts">
	import DashboardNav from '$lib/components/dashboard-nav.svelte';
	import StatCard from '$lib/components/stat-card.svelte';
	import TimeRangeSelector from '$lib/components/time-range-selector.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import ViewingNow from '$lib/components/viewing-now.svelte';
	import { analytics } from '$lib/state/analytics.svelte';

	$effect(() => {
		analytics.fetch_all();
		const interval = setInterval(
			() => analytics.refresh_active_now(),
			3000,
		);
		return () => clearInterval(interval);
	});
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Analytics</h1>
		<ViewingNow />
	</div>

	<DashboardNav />

	<div class="mt-6 flex items-center justify-between">
		<TimeRangeSelector
			value={analytics.time_range}
			onchange={(v) => analytics.set_time_range(v)}
		/>
	</div>

	{#if analytics.loading && !analytics.overview}
		<div class="text-muted-foreground mt-8 text-center">
			Loading...
		</div>
	{:else if analytics.error}
		<div class="text-destructive mt-8 text-center">
			{analytics.error}
		</div>
	{:else if analytics.overview}
		<div class="mt-6 grid gap-4 md:grid-cols-3">
			<StatCard
				title="Page Views"
				value={analytics.overview.total_views.toLocaleString()}
			/>
			<StatCard
				title="Unique Visitors"
				value={analytics.overview.unique_visitors.toLocaleString()}
			/>
			<StatCard
				title="Active Now"
				value={analytics.overview.active_now}
				description="Visitors in the last 5 minutes"
			/>
		</div>

		<div class="mt-8 grid gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Top Pages</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if analytics.top_pages.length === 0}
						<p class="text-muted-foreground">No data yet</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Path</Table.Head>
									<Table.Head class="text-right">Views</Table.Head>
									<Table.Head class="text-right">Visitors</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each analytics.top_pages as page}
									<Table.Row>
										<Table.Cell class="font-medium"
											>{page.path}</Table.Cell
										>
										<Table.Cell class="text-right"
											>{page.views}</Table.Cell
										>
										<Table.Cell class="text-right"
											>{page.unique_visitors}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Top Referrers</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if analytics.referrers.length === 0}
						<p class="text-muted-foreground">No data yet</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Source</Table.Head>
									<Table.Head class="text-right">Visits</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each analytics.referrers as ref}
									<Table.Row>
										<Table.Cell class="font-medium"
											>{ref.source}</Table.Cell
										>
										<Table.Cell class="text-right"
											>{ref.visits}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root class="mt-6">
			<Card.Header>
				<Card.Title>Recent Activity</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if analytics.recent_events.length === 0}
					<p class="text-muted-foreground">No activity yet</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Time</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Path</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each analytics.recent_events as event}
								<Table.Row>
									<Table.Cell class="text-muted-foreground">
										{new Date(event.created_at).toLocaleTimeString()}
									</Table.Cell>
									<Table.Cell>
										{event.event_type === 'custom'
											? event.event_name
											: 'page_view'}
									</Table.Cell>
									<Table.Cell class="font-medium"
										>{event.path}</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
