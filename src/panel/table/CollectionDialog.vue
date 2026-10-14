<template>
	<div class="cms-dialog relative flex h-full min-h-0 overflow-hidden text-ink-gray-8">
		<template v-if="collection">
			<div class="flex min-h-0 min-w-0 flex-1 flex-col">
				<CollectionEntries
					ref="entries"
					:collection="collection"
					:selected-entry-name="selection?.name || ''"
					@edit="selectEntry"
					@create="selectEntry({ name: '' })"
				/>
			</div>
			<aside
				v-if="selection"
				aria-label="Entry details"
				class="entry-drawer absolute inset-y-0 right-0 z-40 flex min-h-0 w-3/5 max-w-2xl flex-col border-l border-outline-gray-2"
			>
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
		</template>
		<div v-else class="cms-empty">
			<p role="status">{{ error || "Loading collection…" }}</p>
			<Button v-if="error" label="Try again" @click="load" />
		</div>
	</div>
</template>

<script setup>
import { Button } from "frappe-ui";
import { onMounted, ref, shallowRef } from "vue";
import { Collection } from "../../cms/collection.js";
import { forget } from "../../data/cache.js";
import { useTask } from "../useTask.js";
import EntryEditor from "../entries/EntryEditor.vue";
import CollectionEntries from "./CollectionEntries.vue";

const props = defineProps({
	doctype: { type: String, required: true },
	view: { type: String, default: "table" },
	entryName: { type: String, default: "" },
	fieldName: { type: String, default: "" },
});
const collection = shallowRef(null);
const selection = shallowRef(props.view === "entry" ? { name: props.entryName, fieldName: props.fieldName } : null);
const entries = ref(null);
const editor = ref(null);
const hasUnsavedWarning = ref(false);
const { error, run } = useTask();
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
const load = () =>
	run(async () => {
		collection.value = (await Collection.all()).find((each) => each.doctype === props.doctype);
		if (!collection.value) throw new Error("This collection no longer exists.");
	});
// the panel can change a schema while this frame is hidden, and a schema write sends no event
forget();
onMounted(load);
</script>

<style scoped>
.cms-dialog,
.cms-dialog :deep(.bg-surface-base),
.entry-drawer {
	background-color: var(--surface-base);
}
</style>
