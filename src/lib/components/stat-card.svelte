<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	type Props = {
		title: string;
		value: number | string;
		description?: string;
	};

	let { title, value, description }: Props = $props();
</script>

<Card.Root>
	<Card.Header class="pb-2">
		<Card.Description>{title}</Card.Description>
		<Card.Title class="text-4xl tabular-nums">{value}</Card.Title>
	</Card.Header>
	{#if description}
		<Card.Content>
			<p class="text-muted-foreground text-xs">{description}</p>
		</Card.Content>
	{/if}
</Card.Root>
