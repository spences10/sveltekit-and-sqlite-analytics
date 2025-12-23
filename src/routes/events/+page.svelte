<script lang="ts">
	import DashboardNav from '$lib/components/dashboard-nav.svelte';
	import TimeRangeSelector from '$lib/components/time-range-selector.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import ViewingNow from '$lib/components/viewing-now.svelte';
	import { analytics } from '$lib/state/analytics.svelte';

	$effect(() => {
		analytics.fetch_all();
	});
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Custom Events</h1>
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
			<Card.Title>Event Counts</Card.Title>
			<Card.Description
				>Custom events tracked on your site</Card.Description
			>
		</Card.Header>
		<Card.Content>
			{#if analytics.loading && analytics.custom_events.length === 0}
				<p class="text-muted-foreground">Loading...</p>
			{:else if analytics.custom_events.length === 0}
				<p class="text-muted-foreground">
					No custom events tracked yet
				</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">#</Table.Head>
							<Table.Head>Event Name</Table.Head>
							<Table.Head class="text-right">Count</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each analytics.custom_events as event, i}
							<Table.Row>
								<Table.Cell class="text-muted-foreground"
									>{i + 1}</Table.Cell
								>
								<Table.Cell class="font-medium"
									>{event.event_name}</Table.Cell
								>
								<Table.Cell class="text-right"
									>{event.count.toLocaleString()}</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
