<script lang="ts">
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import { create_viewing_now } from '$lib/state/analytics.svelte';

	let path = $derived(page.url.pathname);
	let viewing = $derived(create_viewing_now(path));

	$effect(() => {
		viewing.refresh();
		const interval = setInterval(() => viewing.refresh(), 3000);
		return () => clearInterval(interval);
	});
</script>

<Badge variant="secondary" class="gap-1.5">
	<span class="relative flex h-2 w-2">
		<span
			class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
		></span>
		<span
			class="relative inline-flex h-2 w-2 rounded-full bg-green-500"
		></span>
	</span>
	{viewing.count} viewing now
</Badge>
