<script lang="ts">
	import { BarChart } from 'layerchart';

	interface Props {
		data: { label: string; value: number }[];
		color?: string;
	}

	let { data, color = 'var(--chart-1)' }: Props = $props();
</script>

<div class="h-50">
	{#if data.length > 0}
		<BarChart
			{data}
			x="value"
			y="label"
			orientation="horizontal"
			padding={{ left: 100, right: 16, top: 8, bottom: 24 }}
			props={{
				bars: { fill: color, radius: 4 },
			}}
		/>
	{:else}
		<div
			class="text-muted-foreground flex h-full items-center justify-center"
		>
			No data available
		</div>
	{/if}
</div>
