<template>
	<form class="cms-card flex flex-col gap-3" @submit.prevent="insert">
		<span class="cms-section-label">{{ copy.title }}</span>
		<FormControl
			v-if="collections.length > 1"
			v-model="chosenDoctype"
			type="combobox"
			label="Collection"
			:options="collections.map((each) => ({ label: each.title, value: each.doctype }))"
			placeholder="Choose a collection…" />
		<div v-if="kind === 'index'" class="flex flex-col gap-1.5">
			<FormLabel label="Layout" />
			<TabButtons
				v-model="layout"
				:options="[
					{ label: 'Cards', value: 'cards' },
					{ label: 'Table', value: 'table' },
				]" />
		</div>
		<div v-if="collection" class="flex flex-col gap-1.5">
			<FormLabel label="Fields" />
			<MultiSelect v-model="chosen" class="w-full" :options="fieldOptions" placeholder="Choose fields…" />
		</div>
		<div class="flex gap-2">
			<Button type="submit" variant="solid" label="Insert" :loading="isRunning" :disabled="!chosen.length" />
			<Button label="Cancel" :disabled="isRunning" @click="emit('cancel')" />
		</div>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</form>
</template>
<script setup>
import { Button, FormControl, FormLabel, MultiSelect, TabButtons } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { addCollectionList, addEntryContent } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";
const COPY = {
	index: { title: "Add a list", inserted: "List inserted" },
	detail: { title: "Add entry fields", inserted: "Entry fields inserted" },
};
/** `kind` is "index" for a list of any of `collections`, or "detail" for the fields of the template's one collection. */
const props = defineProps({
	collections: { type: Array, required: true },
	kind: { type: String, required: true },
});
const emit = defineEmits(["changed", "cancel"]);
const chosenDoctype = ref(props.collections.length === 1 ? props.collections[0].doctype : "");
const layout = ref("cards");
const fields = shallowRef([]);
const chosen = ref([]);
const { isRunning, run, error } = useTask();
const copy = computed(() => COPY[props.kind]);
const collection = computed(() => props.collections.find((each) => each.doctype === chosenDoctype.value));
const fieldOptions = computed(() =>
	fields.value.map((field) => ({ label: field.label || field.fieldname, value: field.fieldname })),
);
watch(
	collection,
	(current) =>
		current &&
		run(async () => {
			const all = await current.getFields();
			fields.value = all.filter((field) => field.fieldtype !== "Check");
			chosen.value = current.getDisplayFields(all).map((field) => field.fieldname);
		}),
	{ immediate: true },
);
const insert = async () => {
	// the order of the collection, not the order of the clicks
	const picked = fields.value.filter((field) => chosen.value.includes(field.fieldname));
	const inserted = await run(
		() =>
			props.kind === "index"
				? addCollectionList(collection.value, { layout: layout.value, fields: picked })
				: addEntryContent(collection.value, picked),
		copy.value.inserted,
	);
	if (inserted) emit("changed");
};
</script>
