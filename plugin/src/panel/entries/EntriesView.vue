<template>
	<div class="flex min-h-0 flex-1 overflow-hidden text-ink-gray-8">
		<!-- v-show: the table keeps its rows while an open entry takes its place -->
		<div v-show="!selection" class="flex min-h-0 min-w-0 flex-1 flex-col">
			<CollectionEntries
				ref="entries"
				:collection="collection"
				:selected-entry-name="selection?.name ?? ''"
				@edit="selectEntry"
				@create="selectEntry({ name: '' })"
			/>
		</div>
		<template v-if="selection">
			<aside
				aria-label="Entry details"
				class="relative flex min-h-0 shrink-0 flex-col border-r border-outline-gray-2"
				:style="{ width: `${paneWidths.entry}px` }"
			>
				<PanelResizer
					side="right"
					:dimension="paneWidths.entry"
					:min-dimension="320"
					:max-dimension="800"
					@resize="(width) => (paneWidths.entry = width)"
				/>
				<EntryEditor
					:key="selection.name"
					:collection="collection"
					:entry-name="selection.name"
					:field-name="selection.fieldName"
					@back="closeEntry"
					@saved="entrySaved"
				/>
			</aside>
			<EntryPreview
				:collection="collection"
				:entry-name="selection.name"
				:revision="previewRevision"
				@close="closeEntry"
			/>
		</template>
	</div>
</template>

<script setup>
import PanelResizer from "builder/internal/components/PanelResizer.vue";
import { onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { isEditingEntry } from "../navigation.js";
import { paneWidths } from "../paneWidths.js";
import EntryEditor from "./EntryEditor.vue";
import EntryPreview from "./EntryPreview.vue";
import CollectionEntries from "./CollectionEntries.vue";

defineProps({ collection: { type: Object, required: true } });
const selection = shallowRef(null);
const entries = ref(null);
const previewRevision = ref(0);

watch(selection, (entry) => (isEditingEntry.value = Boolean(entry)));
// a collection opened from elsewhere replaces this view, and shows its list again
onBeforeUnmount(() => (isEditingEntry.value = false));

const selectEntry = (row, fieldName = "") => (selection.value = { name: row.name, fieldName });
const closeEntry = () => (selection.value = null);
// the editor stays open on the saved entry, and the preview reads it again
const entrySaved = async (saved) => {
	selection.value = { name: saved.name, fieldName: "" };
	previewRevision.value++;
	await entries.value.reload();
};
</script>
