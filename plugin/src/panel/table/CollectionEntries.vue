<template>
	<div class="flex min-h-0 flex-1 flex-col">
		<header class="flex shrink-0 items-center gap-3 border-b border-outline-gray-1 px-4 py-2">
			<FormControl
				v-model="query"
				class="w-64"
				placeholder="Search entries…"
				aria-label="Search entries" />
			<!-- invisible, not removed, so the toolbar keeps its place while the rows load -->
			<span class="shrink-0 text-p-sm text-ink-gray-5" :class="{ invisible: !fields.length }">
				{{ query ? `${shownRows.length} of ${rows.length}` : rows.length }} entries
			</span>
			<span v-if="!collection.isOwned" class="cms-hint truncate">
				Edit the simple fields here. Open a row in Desk for the rest.
			</span>
			<Button
				class="ml-auto shrink-0"
				size="sm"
				icon-left="lucide-plus"
				label="New entry"
				:disabled="isRunning"
				@click="emit('create')" />
		</header>
		<p v-if="error" role="alert" class="cms-error p-3">{{ error }}</p>
		<SectionLoader v-if="isRunning && !fields.length" label="Loading entries" />
		<template v-else>
			<CollectionTable
				:collection="collection"
				:fields="fields"
				:rows="shownRows"
				:selected-entry-name="selectedEntryName"
				:empty-message="emptyMessage"
				@save="saveCell"
				@open-field="(row, field) => emit('edit', row, field.fieldname)"
				@edit="(row) => emit('edit', row)"
				@preview="preview"
				@delete="deleteRow" />
			<Button
				v-if="hasMore"
				class="m-2 shrink-0"
				variant="ghost"
				label="Load more"
				:loading="isRunning"
				@click="loadMore" />
		</template>
	</div>
</template>

<script setup>
import { subscribeDocuments } from "../../data/documents.js";

import { Button, FormControl } from "frappe-ui";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import CollectionTable from "./CollectionTable.vue";
import { useCollectionRows } from "./useCollectionRows.js";
import SectionLoader from "../SectionLoader.vue";

const props = defineProps({
	collection: { type: Object, required: true },
	selectedEntryName: { type: String, default: "" },
});
const emit = defineEmits(["create", "edit"]);
const { fields, rows, hasMore, isRunning, error, run, reload, loadMore, saveCell, deleteRow } =
	useCollectionRows(props.collection);
const emptyMessage = computed(() => (query.value ? "No entries match your search." : "No entries yet."));
defineExpose({ reload });
const query = ref("");
const shownRows = computed(() => {
	const search = query.value.trim().toLowerCase();
	return rows.value.filter((row) =>
		[row.name, ...fields.value.map((field) => row[field.fieldname])].some((value) =>
			String(value ?? "")
				.toLowerCase()
				.includes(search),
		),
	);
});
const preview = (row) => run(() => props.collection.openEntry(row[props.collection.slugField]));
let unsubscribe;
onMounted(() => {
	unsubscribe = subscribeDocuments(props.collection.doctype, reload);
	reload();
});
onBeforeUnmount(() => unsubscribe?.());
</script>
