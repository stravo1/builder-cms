<template>
	<div class="flex min-h-0 flex-1 overflow-hidden text-ink-gray-8">
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<CollectionEntries
				ref="entries"
				:collection="collection"
				:selected-entry-name="selection?.name ?? ''"
				@edit="selectEntry"
				@create="selectEntry({ name: '' })"
			/>
		</div>
		<aside
			v-if="selection"
			aria-label="Entry details"
			class="relative flex min-h-0 shrink-0 flex-col border-l border-outline-gray-2"
			:style="{ width: `${paneWidths.entry}px` }"
		>
			<PanelResizer
				side="left"
				:dimension="paneWidths.entry"
				:min-dimension="320"
				:max-dimension="800"
				@resize="(width) => (paneWidths.entry = width)" />
			<p v-if="hasUnsavedWarning" role="status" class="cms-hint px-3 py-2">
				Save or cancel your changes before opening another entry.
			</p>
			<EntryEditor
				:key="selection.name"
				ref="editor"
				:collection="collection"
				:entry-name="selection.name"
				:field-name="selection.fieldName"
				is-drawer
				@back="closeEntry"
				@saved="entrySaved"
			/>
		</aside>
	</div>
</template>

<script setup>
import PanelResizer from "builder/internal/components/PanelResizer.vue";
import { ref, shallowRef } from "vue";
import { paneWidths } from "../paneWidths.js";
import EntryEditor from "../entries/EntryEditor.vue";
import CollectionEntries from "./CollectionEntries.vue";

defineProps({ collection: { type: Object, required: true } });
const selection = shallowRef(null);
const entries = ref(null);
const editor = ref(null);
const hasUnsavedWarning = ref(false);
const selectEntry = (row, fieldName = "") => {
	if (selection.value?.name === row.name) {
		if (fieldName) selection.value = { ...selection.value, fieldName };
		return;
	}
	if (editor.value?.isDirty || editor.value?.isRunning) {
		hasUnsavedWarning.value = true;
		return;
	}
	selection.value = { name: row.name, fieldName };
	hasUnsavedWarning.value = false;
};
const closeEntry = () => {
	selection.value = null;
	hasUnsavedWarning.value = false;
};
const entrySaved = async () => {
	closeEntry();
	await entries.value.reload();
};
</script>
