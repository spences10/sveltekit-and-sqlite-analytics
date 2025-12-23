<script lang="ts">
	import type { TimelinePoint } from '$lib/state/analytics.svelte';
	import { AreaChart } from 'layerchart';

	interface Props {
		data: TimelinePoint[];
	}

	let { data }: Props = $props();

	let chart_data = $derived(
		data.map((point) => ({
			date: new Date(point.period),
			visitors: point.visitors,
			page_views: point.page_views,
		})),
	);
</script>

<div class="h-75">
	{#if chart_data.length > 0}
		<AreaChart
			data={chart_data}
			x="date"
			series={[
				{
					key: 'page_views',
					label: 'Page Views',
					color: 'var(--chart-1)',
				},
				{
					key: 'visitors',
					label: 'Visitors',
					color: 'var(--chart-2)',
				},
			]}
		/>
	{:else}
		<div
			class="text-muted-foreground flex h-full items-center justify-center"
		>
			No data available
		</div>
	{/if}
</div>
