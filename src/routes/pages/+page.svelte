<script lang="ts">
	import DashboardNav from '$lib/components/dashboard-nav.svelte';
	import HorizontalBarChart from '$lib/components/horizontal-bar-chart.svelte';
	import TimeRangeSelector from '$lib/components/time-range-selector.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import ViewingNow from '$lib/components/viewing-now.svelte';
	import { analytics } from '$lib/state/analytics.svelte';

	let chart_data = $derived(
		analytics.top_pages.slice(0, 8).map((p) => ({
			label:
				p.path.length > 25 ? p.path.slice(0, 25) + '...' : p.path,
			value: p.views,
		})),
	);

	$effect(() => {
		analytics.fetch_all();
	});
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Top Pages</h1>
		<ViewingNow />
	</div>

	<DashboardNav />

	<div class="mt-6 flex items-center justify-between">
		<TimeRangeSelector
			value={analytics.time_range}
			onchange={(v) => analytics.set_time_range(v)}
		/>
	</div>

	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Page Views</Card.Title>
			<Card.Description>Top pages by views</Card.Description>
		</Card.Header>
		<Card.Content>
			<HorizontalBarChart data={chart_data} color="var(--chart-1)" />
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>All Pages</Card.Title>
			<Card.Description>Complete breakdown</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if analytics.loading && analytics.top_pages.length === 0}
				<p class="text-muted-foreground">Loading...</p>
			{:else if analytics.top_pages.length === 0}
				<p class="text-muted-foreground">No data yet</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">#</Table.Head>
							<Table.Head>Path</Table.Head>
							<Table.Head class="text-right">Views</Table.Head>
							<Table.Head class="text-right"
								>Unique Visitors</Table.Head
							>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each analytics.top_pages as page, i}
							<Table.Row>
								<Table.Cell class="text-muted-foreground"
									>{i + 1}</Table.Cell
								>
								<Table.Cell class="font-medium"
									>{page.path}</Table.Cell
								>
								<Table.Cell class="text-right"
									>{page.views.toLocaleString()}</Table.Cell
								>
								<Table.Cell class="text-right"
									>{page.unique_visitors.toLocaleString()}</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
