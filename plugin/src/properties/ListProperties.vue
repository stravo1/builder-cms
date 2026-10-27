<template>
	<!-- the gap of Builder's CollapsibleSection, so the rows space like its own -->
	<div class="flex flex-col gap-3">
		<PropertyRow label="Collection">
			<div class="flex gap-1">
				<Select
					class="w-full"
					size="sm"
					:model-value="source?.doctype ?? ''"
					:options="collectionOptions"
					:disabled="isRunning"
					@update:model-value="chooseCollection"
				/>
				<Button
					v-if="collection"
					variant="subtle"
					size="sm"
					icon="lucide-maximize-2"
					tooltip="Open entries"
					aria-label="Open entries"
					@click="openCollectionInDrawer(collection)"
				/>
			</div>
		</PropertyRow>
		<template v-if="source">
			<!-- Builder also puts the toggle in a labelled row, not its own label, so it lines up with the selects -->
			<PropertyRow label="Layout">
				<OptionToggle
					:model-value="layout"
					:options="LAYOUT_OPTIONS"
					@update:model-value="changeLayout"
				/>
			</PropertyRow>
			<PropertyRow label="Fields">
				<MultiSelect
					class="w-full"
					size="sm"
					placeholder="Choose fields"
					:model-value="pickedFields"
					:options="fieldOptions"
					@update:model-value="changeFields"
				/>
			</PropertyRow>
			<!-- after the fields load: a read without them would drop every filter -->
			<ListFilters
				v-if="fields.length"
				:source="source"
				:fields="filterFields"
				:is-collection-page="isCollectionPage"
				@update="change"
			/>
			<PropertyRow label="Sort">
				<Select
					class="w-full"
					size="sm"
					:model-value="source.orderBy"
					:options="SORT_OPTIONS"
					@update:model-value="(orderBy) => change({ orderBy })"
				/>
			</PropertyRow>
			<PropertyRow label="Limit">
				<TextInput
					type="number"
					size="sm"
					:model-value="source.limit"
					:debounce="500"
					@update:model-value="(limit) => change({ limit: Number(limit) })"
				/>
			</PropertyRow>
		</template>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import { OptionToggle } from "builder";
import { Button, MultiSelect, Select, TextInput } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { Collection } from "../cms/collection.js";
import {
	ENTRY_SOURCE,
	getListFields,
	getListLayout,
	getListRepeater,
	getListSource,
	LAYOUT_OPTIONS,
	rebuildList,
	setListCollection,
	SORT_OPTIONS,
	updateList,
} from "../cms/pageActions.js";
import { getBlock } from "../editor/canvas.js";
import { getOpenPageSources } from "../editor/context.js";
import { openCollectionInDrawer } from "../panel/navigation.js";
import { useTask } from "../panel/useTask.js";
import ListFilters from "./ListFilters.vue";
import PropertyRow from "./PropertyRow.vue";

const props = defineProps({ blockId: { type: String, required: true } });
const { isRunning, error, run } = useTask();
const collections = shallowRef([]);
/** The fields of the list's collection. */
const fields = shallowRef([]);
/** The ticked fields. They show at once, before the list is built again from them. */
const pickedFields = ref([]);

// the selected list: a repeater of cards, or a table that holds its repeater
const list = computed(() => getBlock(props.blockId));
const repeater = computed(() => getListRepeater(list.value));
const source = computed(() => getListSource(getOpenPageSources(), repeater.value));
const layout = computed(() => getListLayout(list.value));
const collection = computed(() =>
	collections.value.find((each) => each.doctype === source.value?.doctype)
);
const fieldOptions = computed(() =>
	fields.value
		.filter((field) => field.fieldtype !== "Check")
		.map((field) => ({ label: field.label, value: field.fieldname }))
);
// a filter on rich text or an image would compare markup or a URL
const filterFields = computed(() =>
	fields.value.filter((field) => !["Text Editor", "Attach Image"].includes(field.fieldtype))
);
const isCollectionPage = computed(() =>
	getOpenPageSources().some(
		(each) => each.name === ENTRY_SOURCE && each.doctype === source.value?.doctype
	)
);
const chosenFields = computed(() =>
	getListFields(repeater.value, fields.value).map((field) => field.fieldname)
);
const collectionOptions = computed(() => [
	{ label: "None", value: "" },
	...collections.value.map((collection) => ({
		label: collection.label,
		value: collection.doctype,
	})),
]);

run(async () => (collections.value = await Collection.all()));
watch(collection, (current) =>
	run(async () => (fields.value = current ? await current.getFields() : []))
);

const chooseCollection = (doctype) => {
	const collection = collections.value.find((each) => each.doctype === doctype) ?? null;
	return run(() => setListCollection(repeater.value.blockId, collection));
};

// the toggle has no disabled state, so a switch waits for the last change and for the collections
const change = (patch) => run(() => updateList(repeater.value.blockId, patch));

const changeLayout = (value) => {
	if (value === layout.value || isRunning.value || !collection.value) return;
	run(() => rebuildList(props.blockId, collection.value, { layout: value }));
};

watch(chosenFields, (fieldnames) => (pickedFields.value = fieldnames), { immediate: true });

const changeFields = (fieldnames) => {
	pickedFields.value = fieldnames;
	return run(() => rebuildList(props.blockId, collection.value, { fieldnames }));
};
</script>
