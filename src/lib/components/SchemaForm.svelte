<!-- SchemaForm.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';

	import { Trash2, Plus, ChevronDown, ChevronRight, Info, File } from '@lucide/svelte';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { getNestedValue, updateNestedValue } from '../services/nestedValueUtils';
	import {getSchemaDefaultValue} from "../services/schema/defaultValue"
	import type { JsonSchema } from '../services/schema/types';


	let { schema, value = $bindable({}) }: { schema: JsonSchema; value: any } = $props();

	// State for collapsible sections
	let collapsedSections = $state(new Set<string>());

	function toggleSection(path: string) {
		if (collapsedSections.has(path)) {
			collapsedSections.delete(path);
		} else {
			collapsedSections.add(path);
		}
		collapsedSections = new Set(collapsedSections);
	}

	// Initialize value if empty
	$effect(() => {
		if (schema) {
			value = getSchemaDefaultValue(schema);
		}
	});

</script>

<!-- Schema Field Component -->
{#snippet schemaField(fieldSchema: JsonSchema, path: string, parentPath: string = '', depth: number = 0)}
	{@const fullPath = parentPath ? `${parentPath}.${path}` : path}
	{@const fieldValue = getNestedValue(value, fullPath)}
	{@const isCollapsed = collapsedSections.has(fullPath)}

	{#if fieldSchema.anyOf}
		<!-- Handle nullable fields or struct unions -->
		{@const isNullable = fieldSchema.anyOf.some((alt) => alt.type === 'null')}
		{#if isNullable}
			{@const nonNullSchema = fieldSchema.anyOf.find((alt) => alt.type !== 'null')}
			<div class="space-y-3">
				<div class="flex items-start space-x-3 rounded-lg border border-border/50 bg-muted/20 p-3">
					<Checkbox
						id={`nullable-${fullPath}`}
						checked={fieldValue !== null && fieldValue !== undefined}
						onCheckedChange={(checked) => {
							value = updateNestedValue(
								value,
								fullPath,
								(checked && nonNullSchema) ? getSchemaDefaultValue(nonNullSchema) : null
							);
						}}
						class="mt-0.5"
					/>
					<div class="flex-1 space-y-1">
						<Label for={`nullable-${fullPath}`} class="text-sm font-medium leading-none">
							{fieldSchema.title || path}
						</Label>
						{#if fieldSchema.description}
							<p class="text-xs text-muted-foreground leading-relaxed">
								{fieldSchema.description}
							</p>
						{/if}
					</div>
					{#if fieldSchema.description}
						<Info class="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
					{/if}
				</div>
				{#if fieldValue !== null && fieldValue !== undefined && nonNullSchema}
					<div class="ml-6 border-l-2 border-primary/20 pl-4">
						{@render schemaField(nonNullSchema, path, parentPath, depth + 1)}
					</div>
				{/if}
			</div>
		{:else}
			<!-- Struct union -->
			<Collapsible.Root open={!isCollapsed}>
				<Card class="w-full">
					<Collapsible.Trigger 
						class="w-full cursor-pointer pb-3 hover:bg-muted/30 transition-colors"
						onclick={() => toggleSection(fullPath)}
						asChild
					>
						<CardHeader>
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2">
									{#if isCollapsed}
										<ChevronRight class="h-4 w-4 text-muted-foreground" />
									{:else}
										<ChevronDown class="h-4 w-4 text-muted-foreground" />
									{/if}
									<CardTitle class="text-sm">{fieldSchema.title || path}</CardTitle>
									<Badge variant="outline" class="text-xs">Union</Badge>
								</div>
								{#if fieldValue?.['@type']}
									<Badge variant="secondary" class="text-xs">
										{fieldValue['@type']}
									</Badge>
								{/if}
							</div>
							{#if fieldSchema.description}
								<CardDescription class="text-xs leading-relaxed ml-6">
									{fieldSchema.description}
								</CardDescription>
							{/if}
						</CardHeader>
					</Collapsible.Trigger>
					<Collapsible.Content>
						<CardContent class="space-y-4 pt-0">
							<Select
								selected={{
									value: fieldValue['@type'] || '',
									label: fieldValue['@type'] || 'Select type...'
								}}
								onSelectedChange={(selected) => {
									const selectedType = selected?.value;
									if (selectedType) {
										const selectedSchema = fieldSchema.anyOf.find(
											(alt) => alt.properties['@type']?.const === selectedType
										);
										const newValue = { '@type': selectedType, ...getSchemaDefaultValue(selectedSchema) };
										value = updateNestedValue(value, fullPath, newValue);
									}
								}}
							>
								<SelectTrigger>
									<span>{fieldValue?.['@type'] || 'Select type...'}</span>
								</SelectTrigger>
								<SelectContent>
									{#each fieldSchema.anyOf as alt}
										{#if alt.properties?.['@type']?.const}
											<SelectItem value={alt.properties['@type'].const}>
												{alt.properties['@type'].const}
											</SelectItem>
										{/if}
									{/each}
								</SelectContent>
							</Select>

							{#if fieldValue?.['@type']}
								{@const selectedSchema = fieldSchema.anyOf.find(
									(alt) => alt.properties?.['@type']?.const === fieldValue['@type']
								)}
								{#if selectedSchema}
									<Separator />
									<div class="pl-4 border-l-2 border-primary/20">
										{@render schemaField(selectedSchema, path, parentPath, depth + 1)}
									</div>
								{/if}
							{/if}
						</CardContent>
					</Collapsible.Content>
				</Card>
			</Collapsible.Root>
		{/if}
	{:else if fieldSchema.type === 'array'}
		{@const items = fieldValue || []}
		<Collapsible.Root open={!isCollapsed}>
			<Card class="w-full">
				<Collapsible.Trigger 
					class="w-full cursor-pointer pb-3 hover:bg-muted/30 transition-colors"
					onclick={() => toggleSection(fullPath)}
					asChild
				>
					<CardHeader>
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-2">
								{#if isCollapsed}
									<ChevronRight class="h-4 w-4 text-muted-foreground" />
								{:else}
									<ChevronDown class="h-4 w-4 text-muted-foreground" />
								{/if}
								<CardTitle class="text-sm">{fieldSchema.title || path}</CardTitle>
								<Badge variant="outline" class="text-xs">Array</Badge>
							</div>
							<Badge variant="secondary" class="text-xs">
								{items.length} {items.length === 1 ? 'item' : 'items'}
							</Badge>
						</div>
						{#if fieldSchema.description}
							<CardDescription class="text-xs leading-relaxed ml-6">
								{fieldSchema.description}
							</CardDescription>
						{/if}
					</CardHeader>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<CardContent class="space-y-4 pt-0">
						{#if items.length === 0}
							<div class="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
								<div class="mb-3 rounded-full bg-muted p-2">
									<Plus class="h-4 w-4 text-muted-foreground" />
								</div>
								<p class="text-sm text-muted-foreground mb-3">No items added yet</p>
								<Button
									variant="outline"
									size="sm"
									onclick={() => {
										const newItems = [getSchemaDefaultValue(fieldSchema.items!)];
										value = updateNestedValue(value, fullPath, newItems);
									}}
								>
									<Plus class="mr-2 h-4 w-4" />
									Add First Item
								</Button>
							</div>
						{:else}
							<div class="space-y-3">
								{#each items as item, index}
									<Card class="relative border-l-4 border-l-primary/20">
										<CardHeader class="pb-2">
											<div class="flex items-center justify-between">
												<div class="flex items-center space-x-2">
													<Badge variant="outline" class="text-xs">#{index + 1}</Badge>
													<CardTitle class="text-xs">Item {index + 1}</CardTitle>
												</div>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
													onclick={() => {
														const newItems = [...items];
														newItems.splice(index, 1);
														value = updateNestedValue(value, fullPath, newItems);
													}}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</CardHeader>
										<CardContent class="pt-0">
											{@render schemaField(fieldSchema.items!, index.toString(), fullPath, depth + 1)}
										</CardContent>
									</Card>
								{/each}
							</div>
							<Button
								variant="outline"
								size="sm"
								class="w-full"
								onclick={() => {
									const newItems = [...items, getSchemaDefaultValue(fieldSchema.items!)];
									value = updateNestedValue(value, fullPath, newItems);
								}}
							>
								<Plus class="mr-2 h-4 w-4" />
								Add Another Item
							</Button>
						{/if}
					</CardContent>
				</Collapsible.Content>
			</Card>
		</Collapsible.Root>
	{:else if fieldSchema.type === 'object'}
		<Collapsible.Root open={!isCollapsed}>
			<Card class="w-full">
				<Collapsible.Trigger 
					class="w-full cursor-pointer pb-3 hover:bg-muted/30 transition-colors"
					onclick={() => toggleSection(fullPath)}
					asChild
				>
					<CardHeader>
						<div class="flex items-center space-x-2">
							{#if !isCollapsed}
								<ChevronDown class="h-4 w-4 text-muted-foreground" />
							{:else}
								<ChevronRight class="h-4 w-4 text-muted-foreground" />
							{/if}
							<CardTitle class="text-sm">{fieldSchema.title || path || "Title"}</CardTitle>
							<Badge variant="outline" class="text-xs">Command</Badge>
						</div>
						{#if fieldSchema.description}
							<CardDescription class="text-xs leading-relaxed ml-6">
								{fieldSchema.description}
							</CardDescription>
						{/if}
					</CardHeader>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<CardContent class="space-y-4 pt-0">
						{#if fieldSchema.properties}
							<div class="grid gap-4">
								{#each Object.entries(fieldSchema.properties) as [key, propSchema]}
									{#if key !== '@type'}
										{@render schemaField(propSchema, key, fullPath, depth + 1)}
									{/if}
								{/each}
							</div>
						{/if}
					</CardContent>
				</Collapsible.Content>
			</Card>
		</Collapsible.Root>
	{:else if fieldSchema.type === 'string'}
		{@const isFilePath = fieldSchema['x-styx-type'] === 'file'}
		<div class="space-y-2">
			<div class="flex items-center space-x-2">
				<Label for={`string-${fullPath}`} class="text-sm font-medium flex-1">
					{fieldSchema.title || path}
				</Label>
				<div class="flex items-center space-x-1">
					{#if isFilePath}
						<File class="h-3 w-3 text-muted-foreground" />
						<Badge variant="outline" class="text-xs">File</Badge>
					{:else}
						<Badge variant="outline" class="text-xs">String</Badge>
					{/if}
				</div>
			</div>
			{#if fieldSchema.description}
				<p class="text-xs leading-relaxed text-muted-foreground">{fieldSchema.description}</p>
			{/if}
			
			{#if isFilePath}
				<!-- File path input with icon -->
				<div class="relative">
					<File class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={`string-${fullPath}`}
						type="text"
						value={fieldValue || ''}
						oninput={(e) => {
							value = updateNestedValue(value, fullPath, e.target.value);
						}}
						placeholder="/path/to/your/file"
						class="w-full pl-10 font-mono text-sm"
					/>
				</div>
			{:else}
				<!-- Regular string input -->
				<Input
					id={`string-${fullPath}`}
					type="text"
					value={fieldValue || ''}
					oninput={(e) => {
						value = updateNestedValue(value, fullPath, e.target.value);
					}}
					placeholder={`Enter ${fieldSchema.title || path}`}
					class="w-full"
				/>
			{/if}
		</div>
	{:else if fieldSchema.type === 'integer'}
		<div class="space-y-2">
			<div class="flex items-center space-x-2">
				<Label for={`integer-${fullPath}`} class="text-sm font-medium flex-1">
					{fieldSchema.title || path}
				</Label>
				<Badge variant="outline" class="text-xs">Integer</Badge>
			</div>
			{#if fieldSchema.description}
				<p class="text-xs leading-relaxed text-muted-foreground">{fieldSchema.description}</p>
			{/if}
			<div class="flex space-x-2">
				<Input
					id={`integer-${fullPath}`}
					type="number"
					step="1"
					value={fieldValue ?? 0}
					min={fieldSchema.minimum}
					max={fieldSchema.maximum}
					oninput={(e) => {
						value = updateNestedValue(value, fullPath, parseInt(e.target.value) || 0);
					}}
					placeholder={`Enter ${fieldSchema.title || path}`}
					class="flex-1"
				/>
				{#if fieldSchema.minimum !== undefined || fieldSchema.maximum !== undefined}
					<div class="flex items-center text-xs text-muted-foreground whitespace-nowrap">
						{#if fieldSchema.minimum !== undefined}
							Min: {fieldSchema.minimum}
						{/if}
						{#if fieldSchema.minimum !== undefined && fieldSchema.maximum !== undefined}
							•
						{/if}
						{#if fieldSchema.maximum !== undefined}
							Max: {fieldSchema.maximum}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{:else if fieldSchema.type === 'number'}
		<div class="space-y-2">
			<div class="flex items-center space-x-2">
				<Label for={`number-${fullPath}`} class="text-sm font-medium flex-1">
					{fieldSchema.title || path}
				</Label>
				<Badge variant="outline" class="text-xs">Number</Badge>
			</div>
			{#if fieldSchema.description}
				<p class="text-xs leading-relaxed text-muted-foreground">{fieldSchema.description}</p>
			{/if}
			<div class="flex space-x-2">
				<Input
					id={`number-${fullPath}`}
					type="number"
					step="any"
					value={fieldValue ?? 0}
					min={fieldSchema.minimum}
					max={fieldSchema.maximum}
					oninput={(e) => {
						value = updateNestedValue(value, fullPath, parseFloat(e.target.value) || 0);
					}}
					placeholder={`Enter ${fieldSchema.title || path}`}
					class="flex-1"
				/>
				{#if fieldSchema.minimum !== undefined || fieldSchema.maximum !== undefined}
					<div class="flex items-center text-xs text-muted-foreground whitespace-nowrap">
						{#if fieldSchema.minimum !== undefined}
							Min: {fieldSchema.minimum}
						{/if}
						{#if fieldSchema.minimum !== undefined && fieldSchema.maximum !== undefined}
							•
						{/if}
						{#if fieldSchema.maximum !== undefined}
							Max: {fieldSchema.maximum}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{:else if fieldSchema.type === 'boolean'}
		<div class="space-y-2">
			<div class="flex items-start space-x-3 rounded-lg border border-border/50 bg-muted/20 p-3">
				<Checkbox
					id={`boolean-${fullPath}`}
					checked={fieldValue || false}
					onCheckedChange={(checked) => {
						value = updateNestedValue(value, fullPath, checked);
					}}
					class="mt-0.5"
				/>
				<div class="flex-1 space-y-1">
					<div class="flex items-center space-x-2">
						<Label for={`boolean-${fullPath}`} class="text-sm font-medium leading-none">
							{fieldSchema.title || path}
						</Label>
						<Badge variant="outline" class="text-xs">Boolean</Badge>
					</div>
					{#if fieldSchema.description}
						<p class="text-xs text-muted-foreground leading-relaxed">
							{fieldSchema.description}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<Card class="border-destructive/50 bg-destructive/5">
			<CardContent class="pt-6">
				<div class="flex items-center space-x-2">
					<Badge variant="destructive">Unsupported</Badge>
					<span class="text-sm">Type: {fieldSchema.type}</span>
				</div>
			</CardContent>
		</Card>
	{/if}
{/snippet}

{#if schema}
	<div class="space-y-6 max-w-none">
		<!-- Main form content -->
		<div class="space-y-6">
			{@render schemaField(schema, '')}
		</div>
	</div>
{/if}