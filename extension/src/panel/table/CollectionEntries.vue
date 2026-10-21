<template>
	<EntryEditor
		v-if="panelEntry"
		:collection="collection"
		:entry-name="panelEntry.name"
		:field-name="panelEntry.fieldName || ''"
		@back="panelEntry = null"
		@saved="finishPanelEntry"
	/>
	<div v-else class="flex min-h-0 flex-1 flex-col">
		<header class="flex shrink-0 flex-col gap-2 border-b border-outline-gray-1" :class="isPanel ? 'p-3' : 'pb-3'">
			<div class="flex items-center justify-between gap-2">
				<!-- invisible, not removed, so the buttons keep their place while the rows load -->
				<span class="text-p-sm text-ink-gray-5" :class="{ invisible: !fields.length }"
					>{{ query ? `${shownRows.length} of ${rows.length}` : rows.length }} entries</span
				>
				<div class="flex items-center gap-1">
					<Button size="sm" icon-left="lucide-plus" label="New entry" :disabled="isRunning" @click="createEntry" />
					<Button
						v-if="isPanel"
						size="sm"
						variant="ghost"
						icon="lucide-maximize-2"
						label="View in dialog"
						@click="openDialog()"
					/>
				</div>
			</div>
			<FormControl v-model="query" placeholder="Search entries…" aria-label="Search entries" />
		</header>
		<p v-if="error" role="alert" class="cms-error p-3">{{ error }}</p>
		<SectionLoader v-if="isRunning && !fields.length" label="Loading entries" />
		<template v-else>
			<p v-if="!collection.isOwned" class="cms-hint px-3 py-2">
				Edit the simple fields here. Open a row in Desk for the rest.
			</p>
			<CollectionTable
				:collection="collection"
				:fields="fields"
				:rows="shownRows"
				:selected-entry-name="selectedEntryName"
				:empty-message="emptyMessage"
				@save="saveCell"
				@open-field="openField"
				@edit="editEntry"
				@preview="preview"
				@delete="deleteRow"
			/>
			<Button
				v-if="hasMore"
				class="m-2 shrink-0"
				variant="ghost"
				label="Load more"
				:loading="isRunning"
				@click="loadMore"
			/>
		</template>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button, FormControl } from "frappe-ui";
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import CollectionTable from "./CollectionTable.vue";
import { useCollectionRows } from "./useCollectionRows.js";
import SectionLoader from "../SectionLoader.vue";

const EntryEditor = defineAsyncComponent(() => import("../entries/EntryEditor.vue"));
const props = defineProps({
	collection: { type: Object, required: true },
	isPanel: Boolean,
	selectedEntryName: { type: String, default: "" },
});
const emit = defineEmits(["create", "edit"]);
const { fields, rows, hasMore, isRunning, error, run, reload, loadMore, saveCell, deleteRow } = useCollectionRows(
	props.collection,
);
const panelEntry = shallowRef(null);
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
const openDialog = () =>
	run(async () => {
		await builder.ui.openDialog({
			title: props.collection.label,
			size: "5xl",
			height: 600,
			props: { doctype: props.collection.doctype },
		});
		await reload();
	});
const openField = (row, field) =>
	props.isPanel
		? (panelEntry.value = { name: row.name, fieldName: field.fieldname })
		: emit("edit", row, field.fieldname);
const createEntry = () => (props.isPanel ? (panelEntry.value = { name: "" }) : emit("create"));
const editEntry = (row) => (props.isPanel ? (panelEntry.value = { name: row.name }) : emit("edit", row));
const finishPanelEntry = async () => {
	panelEntry.value = null;
	await reload();
};
const preview = (row) =>
	run(async () => {
		await props.collection.openEntry(row[props.collection.slugField]);
		if (!props.isPanel) await builder.ui.closeDialog();
	});
let unsubscribe;
onMounted(() => {
	unsubscribe = builder.data.subscribe(props.collection.doctype, reload);
	reload();
});
onBeforeUnmount(() => unsubscribe?.());
</script>
