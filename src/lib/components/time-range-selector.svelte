<script lang="ts">
	import { track } from '$lib/analytics.remote';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { TimeRange } from '$lib/state/analytics.svelte';

	type Props = {
		value: TimeRange;
		onchange: (value: TimeRange) => void;
	};

	let { value, onchange }: Props = $props();

	function handle_change(new_value: string) {
		track({ name: 'time_range_change', props: { range: new_value } });
		onchange(new_value as TimeRange);
	}
</script>

<Tabs.Root {value} onValueChange={handle_change}>
	<Tabs.List>
		<Tabs.Trigger value="today">Today</Tabs.Trigger>
		<Tabs.Trigger value="7d">7 days</Tabs.Trigger>
		<Tabs.Trigger value="30d">30 days</Tabs.Trigger>
		<Tabs.Trigger value="all">All time</Tabs.Trigger>
	</Tabs.List>
</Tabs.Root>
