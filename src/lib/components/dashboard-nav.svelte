<script lang="ts">
	import { page } from '$app/state';
	import { track } from '$lib/analytics.remote';
	import { Button } from '$lib/components/ui/button';

	const nav_items = [
		{ href: '/', label: 'Overview' },
		{ href: '/pages', label: 'Pages' },
		{ href: '/referrers', label: 'Referrers' },
		{ href: '/events', label: 'Events' },
		{ href: '/visitors', label: 'Visitors' },
	];

	let current_path = $derived(page.url.pathname);

	function handle_nav_click(item: { href: string; label: string }) {
		if (current_path !== item.href) {
			track({
				name: 'nav_click',
				props: { destination: item.label },
			});
		}
	}
</script>

<nav class="flex gap-2 border-b pb-4">
	{#each nav_items as item}
		<Button
			variant={current_path === item.href ? 'default' : 'ghost'}
			href={item.href}
			size="sm"
			onclick={() => handle_nav_click(item)}
		>
			{item.label}
		</Button>
	{/each}
</nav>
