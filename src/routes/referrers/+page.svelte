<script lang="ts">
	import DashboardNav from '$lib/components/dashboard-nav.svelte';
	import HorizontalBarChart from '$lib/components/horizontal-bar-chart.svelte';
	import TimeRangeSelector from '$lib/components/time-range-selector.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import ViewingNow from '$lib/components/viewing-now.svelte';
	import { analytics } from '$lib/state/analytics.svelte';

	let chart_data = $derived(
		analytics.referrers.slice(0, 8).map((r) => ({
			label:
				r.source.length > 30
					? r.source.slice(0, 30) + '...'
					: r.source,
			value: r.visits,
		})),
	);

	$effect(() => {
		analytics.fetch_all();
	});
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Referrers</h1>
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
			<Card.Title>Traffic Sources</Card.Title>
			<Card.Description
				>Where your visitors come from</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<HorizontalBarChart data={chart_data} color="var(--chart-2)" />
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>All Referrers</Card.Title>
			<Card.Description>Complete breakdown</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if analytics.loading && analytics.referrers.length === 0}
				<p class="text-muted-foreground">Loading...</p>
			{:else if analytics.referrers.length === 0}
				<p class="text-muted-foreground">No data yet</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">#</Table.Head>
							<Table.Head>Source</Table.Head>
							<Table.Head class="text-right">Visits</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each analytics.referrers as ref, i}
							<Table.Row>
								<Table.Cell class="text-muted-foreground"
									>{i + 1}</Table.Cell
								>
								<Table.Cell class="font-medium"
									>{ref.source}</Table.Cell
								>
								<Table.Cell class="text-right"
									>{ref.visits.toLocaleString()}</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
