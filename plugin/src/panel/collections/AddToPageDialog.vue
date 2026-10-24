<template>
	<Dialog v-model:open="open" size="md" :title="copy.title" :dismissible="!isRunning">
		<form class="flex flex-col gap-4" @submit.prevent="insert">
			<div v-if="kind === 'index'" class="flex flex-col gap-1.5">
				<FormLabel label="Layout" />
				<TabButtons
					v-model="layout"
					:options="[
						{ label: 'Cards', value: 'cards' },
						{ label: 'Table', value: 'table' },
					]" />
			</div>
			<div class="flex flex-col gap-1.5">
				<FormLabel label="Fields" />
				<MultiSelect v-model="chosen" class="w-full" :options="fieldOptions" placeholder="Choose fields…" />
			</div>
		</form>
		<p v-if="error" role="alert" class="cms-error mt-3">{{ error }}</p>
		<template #actions="{ close }">
			<div class="flex w-full justify-end gap-2">
				<Button label="Cancel" :disabled="isRunning" @click="close" />
				<Button
					variant="solid"
					label="Insert"
					:loading="isRunning"
					:disabled="!chosen.length"
					@click="insert" />
			</div>
		</template>
	</Dialog>
</template>
<script setup>
import { Button, Dialog, FormLabel, MultiSelect, TabButtons } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { addCollectionList, addEntryContent } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";

const COPY = {
	index: { title: "Add an index", inserted: "Index inserted" },
	detail: { title: "Insert fields", inserted: "Fields inserted" },
};
/** `kind` is "index" for a list of the collection's entries, or "detail" for the fields of one entry. */
const props = defineProps({
	collection: { type: Object, required: true },
	kind: { type: String, required: true },
});
const open = defineModel("open", { type: Boolean, default: false });
const layout = ref("cards");
const fields = shallowRef([]);
const chosen = ref([]);
const { isRunning, run, error } = useTask();
const copy = computed(() => COPY[props.kind]);
const fieldOptions = computed(() =>
	fields.value.map((field) => ({ label: field.label || field.fieldname, value: field.fieldname })),
);
watch(open, (isOpen) => {
	if (!isOpen) return;
	error.value = "";
	run(async () => {
		const all = await props.collection.getFields();
		fields.value = all.filter((field) => field.fieldtype !== "Check");
		chosen.value = props.collection.getDisplayFields(all).map((field) => field.fieldname);
	});
});
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
	if (inserted) open.value = false;
};
</script>
