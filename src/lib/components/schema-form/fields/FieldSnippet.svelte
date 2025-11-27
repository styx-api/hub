<!-- Basic field component snippet -->

<script>
	import { Label } from '$lib/components/ui/label';

	let { title, description = null, required = false, labelFor = null, children } = $props();
</script>

<div class="space-y-2">
	<Label for={labelFor}>
		{title}
		{#if required}<span class="ml-1 text-destructive">*</span>{/if}
	</Label>
	{#if description}
		<p class="text-xs text-muted-foreground">{description}</p>
	{/if}
	{@render children()}
</div>
