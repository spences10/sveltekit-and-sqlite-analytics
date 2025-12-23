<script lang="ts">
	import DashboardNav from '$lib/components/dashboard-nav.svelte';
	import TimeRangeSelector from '$lib/components/time-range-selector.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import ViewingNow from '$lib/components/viewing-now.svelte';
	import VisitorTimelineChart from '$lib/components/visitor-timeline-chart.svelte';
	import { analytics } from '$lib/state/analytics.svelte';

	$effect(() => {
		analytics.fetch_all();
	});
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Visitors</h1>
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
			<Card.Title>Visitor Timeline</Card.Title>
			<Card.Description>
				Visitors and page views over time
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if analytics.loading && analytics.timeline.length === 0}
				<p class="text-muted-foreground">Loading...</p>
			{:else}
				<VisitorTimelineChart data={analytics.timeline} />
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Details</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if analytics.timeline.length === 0}
				<p class="text-muted-foreground">No data yet</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Period</Table.Head>
							<Table.Head class="text-right">Visitors</Table.Head>
							<Table.Head class="text-right">Page Views</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each analytics.timeline as point}
							<Table.Row>
								<Table.Cell class="font-medium"
									>{point.period}</Table.Cell
								>
								<Table.Cell class="text-right">
									{point.visitors.toLocaleString()}
								</Table.Cell>
								<Table.Cell class="text-right">
									{point.page_views.toLocaleString()}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
