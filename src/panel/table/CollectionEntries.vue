<template>
	<RichTextView
		v-if="editing"
		:field="editing.field"
		:entry-title="titleOf(editing.row)"
		:value="editing.row[editing.field.fieldname] || ''"
		:is-saving="isRunning"
		@back="editing = null"
		@save="saveRichText" />
	<div v-else class="flex h-full min-h-0 flex-col">
		<!-- the dialog's title names the collection, so this bar holds only the actions -->
		<header class="flex items-center justify-between gap-2 border-b border-outline-gray-1 pb-2">
			<span class="text-p-sm text-ink-gray-5">{{ rows.length }} entries</span>
			<Button size="sm" icon-left="lucide-plus" label="New" @click="addEntry" />
		</header>
		<p v-if="!collection.isOwned" class="px-3 pt-2 text-p-sm text-ink-gray-5">
			Edit the simple fields here. Open a row in Desk for the rest.
		</p>
		<CollectionTable
			:collection="collection"
			:fields="fields"
			:rows="rows"
			@save="saveCell"
			@open-rich-text="(row, field) => (editing = { row, field })"
			@preview="preview"
			@delete="deleteRow" />
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button } from "frappe-ui";
import { onMounted, ref, shallowRef } from "vue";
import CollectionTable from "./CollectionTable.vue";
import RichTextView from "./RichTextView.vue";
import { useCollectionRows } from "./useCollectionRows.js";

const props = defineProps({ collection: { type: Object, required: true } });
const { fields, rows, isRunning, reload, saveCell, addRow, deleteRow } = useCollectionRows(props.collection);
/** The rich text cell being edited in its own view, or null for the table. */
const editing = shallowRef(null);

const titleOf = (row) => row.title || row[props.collection.slugField] || row.name;

const saveRichText = async (html) => {
	await saveCell(editing.value.row, editing.value.field, html);
	editing.value = null;
};

/** The detail page, in the editor, showing this entry. The dialog closes, so the canvas is in view. */
const preview = async (row) => {
	await props.collection.openEntry(row[props.collection.slugField]);
	await builder.ui.closeDialog();
};

const addEntry = () => (props.collection.isOwned ? addRow() : builder.ui.openUrl(props.collection.getDeskUrl()));

onMounted(reload);
</script>
