<template>
	<section class="flex flex-col gap-3 border-t border-outline-gray-1 p-3">
		<span class="cms-section-label">{{ copy.title }}</span>
		<p class="cms-hint">{{ copy.hint }}</p>
		<div v-if="kind === 'index'" class="flex flex-col gap-1.5">
			<FormLabel label="Layout" />
			<TabButtons
				v-model="layout"
				:options="[
					{ label: 'Cards', value: 'cards' },
					{ label: 'Table', value: 'table' },
				]"
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<FormLabel label="Fields" />
			<MultiSelect v-model="chosen" class="w-full" :options="fieldOptions" placeholder="Choose fields…" />
		</div>
		<Button
			variant="subtle"
			icon-left="lucide-plus"
			:label="copy.insert"
			:loading="isRunning"
			:disabled="!chosen.length"
			@click="insert"
		/>
		<Button
			v-if="kind === 'index' && canConnect"
			variant="ghost"
			label="Use selected container as list"
			:loading="isRunning"
			@click="connect"
		/>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</section>
</template>
<script setup>
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { Button, FormLabel, MultiSelect, TabButtons } from "frappe-ui";
import { computed, onMounted, ref, shallowRef } from "vue";
import { addCollectionList, addEntryContent, connectCollectionList } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";
const COPY = {
	index: {
		title: "Collection list",
		hint: "Insert a list, or repeat the children of a container you designed. Select a block inside it to connect fields.",
		insert: "Insert collection list",
		inserted: "Collection list inserted",
	},
	detail: {
		title: "Entry content",
		hint: "Insert blocks that show the fields of the entry.",
		insert: "Insert entry content",
		inserted: "Entry content inserted",
	},
};
const props = defineProps({
	collection: { type: Object, required: true },
	kind: { type: String, required: true },
});
const emit = defineEmits(["changed"]);
const context = useBuilderContext(["page", "selection"]);
const layout = ref("cards");
const fields = shallowRef([]);
const chosen = ref([]);
const { isRunning, run, error } = useTask();
const copy = computed(() => COPY[props.kind]);
const fieldOptions = computed(() => fields.value.map((field) => ({ label: field.label || field.fieldname, value: field.fieldname })));
const canConnect = computed(
	() => context.selection.count === 1 && context.selection.isContainer && !context.selection.isRoot,
);
onMounted(() =>
	run(async () => {
		const all = await props.collection.getFields();
		fields.value = all.filter((field) => field.fieldtype !== "Check");
		chosen.value = props.collection.getDisplayFields(all).map((field) => field.fieldname);
	}),
);
const insert = async () => {
	// the order of the collection, not the order of the clicks
	const picked = fields.value.filter((field) => chosen.value.includes(field.fieldname));
	const inserted = await run(
		() =>
			props.kind === "index"
				? addCollectionList(props.collection, { layout: layout.value, fields: picked })
				: addEntryContent(props.collection, picked),
		copy.value.inserted,
	);
	if (inserted) emit("changed");
};
const connect = async () => {
	const source = await run(
		() => connectCollectionList(props.collection, context.selection.blockId),
		"Container connected. Connect its child blocks to fields.",
	);
	if (source) emit("changed");
};
</script>
