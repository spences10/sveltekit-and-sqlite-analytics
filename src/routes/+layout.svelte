<script lang="ts">
	import { page } from '$app/state';
	import { track } from '$lib/analytics.remote';
	import favicon from '$lib/assets/favicon.svg';
	import './layout.css';

	let { children } = $props();

	let prev_path = $state('');

	$effect(() => {
		const path = page.url.pathname;
		if (path !== prev_path) {
			track({ name: 'page_view', props: { path } });
			prev_path = path;
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
