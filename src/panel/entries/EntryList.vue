<template>
	<div class="flex min-h-0 flex-1 flex-col">
		<div class="flex flex-col gap-2 p-3">
			<div class="flex items-center justify-between">
				<span class="cms-section-label">Entries</span>
				<Button icon-left="lucide-plus" label="New entry" size="sm" variant="solid" @click="openEditor()" />
			</div>
			<FormControl v-model="query" placeholder="Search entries…" aria-label="Search entries" />
			<div class="flex items-center justify-between">
				<span class="text-xs text-ink-gray-5">{{ entries.length }} loaded</span>
				<Button
					variant="ghost"
					size="sm"
					icon-left="lucide-table-2"
					label="Table view"
					@click="openEditor(null, true)"
				/>
			</div>
		</div>
		<p v-if="error" class="cms-error px-3" role="alert">{{ error }}</p>
		<p v-else-if="isRunning && !entries.length" class="cms-hint p-3">Loading entries…</p>
		<div v-else-if="!entries.length" class="cms-empty">
			<span class="text-sm font-medium text-ink-gray-8">No entries yet</span>
			<p>Add your first entry, then connect it to a page.</p>
			<Button label="Create first entry" variant="subtle" @click="openEditor()" />
		</div>
		<div v-else class="min-h-0 overflow-y-auto px-2 pb-3">
			<ItemListRow
				v-for="entry in shown"
				:key="entry.name"
				as="button"
				class="cms-list-row"
				@click="openEditor(entry)"
			>
				<span class="block truncate text-sm text-ink-gray-8">{{ entry.title }}</span>
				<span class="block truncate text-xs text-ink-gray-5">/{{ entry.slug || entry.name }}</span>
				<template #suffix>
					<Badge :theme="entry.published ? 'green' : 'gray'" :label="entry.published ? 'Published' : 'Draft'" />
				</template>
			</ItemListRow>
			<p v-if="!shown.length" class="cms-hint p-2">No entries match your search.</p>
			<Button
				v-if="hasMore"
				class="mt-2 w-full"
				variant="ghost"
				label="Load more"
				:loading="isRunning"
				@click="loadMore"
			/>
		</div>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Badge, Button, FormControl, ItemListRow } from "frappe-ui";
import { computed, onMounted, ref, shallowRef } from "vue";
import { useTask } from "../useTask.js";

const props = defineProps({ collection: { type: Object, required: true } });
const entries = shallowRef([]);
const query = ref("");
const hasMore = ref(false);
const { run, isRunning, error } = useTask();
const shown = computed(() =>
	entries.value.filter((entry) => `${entry.title} ${entry.slug}`.toLowerCase().includes(query.value.toLowerCase())),
);
const load = (start = 0) =>
	run(async () => {
		const rows = await props.collection.getEntries({ start });
		entries.value = start ? [...entries.value, ...rows] : rows;
		hasMore.value = rows.length === 100;
	});
const loadMore = () => load(entries.value.length);
const openEditor = async (entry = null, table = false) => {
	await builder.ui.openDialog({
		title: props.collection.label,
		size: "5xl",
		height: 600,
		props: { doctype: props.collection.doctype, view: table ? "table" : "entry", entryName: entry?.name || "" },
	});
	await load();
};
onMounted(() => load());
</script>
