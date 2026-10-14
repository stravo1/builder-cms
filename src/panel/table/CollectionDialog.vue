<template>
	<div class="flex h-full min-h-0 flex-col bg-surface-base text-ink-gray-8">
		<EntryEditor
			v-if="collection && view === 'entry'"
			:collection="collection"
			:entry-name="entryName"
			@back="view = 'table'"
			@saved="view = 'table'"
		/>
		<CollectionEntries
			v-else-if="collection"
			:collection="collection"
			@create="
				entryName = '';
				view = 'entry';
			"
		/>
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
import { useTask } from "../useTask.js";
import EntryEditor from "../entries/EntryEditor.vue";
import CollectionEntries from "./CollectionEntries.vue";

const props = defineProps({
	doctype: { type: String, required: true },
	view: { type: String, default: "table" },
	entryName: { type: String, default: "" },
});
const collection = shallowRef(null);
const view = ref(props.view);
const entryName = ref(props.entryName);
const { error, run } = useTask();
const load = () =>
	run(async () => {
		collection.value = (await Collection.all()).find((each) => each.doctype === props.doctype);
		if (!collection.value) throw new Error("This collection no longer exists.");
	});
onMounted(load);
</script>
