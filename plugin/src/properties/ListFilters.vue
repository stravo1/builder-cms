<template>
	<PropertyRow label="Filters">
		<Button
			class="w-full"
			variant="subtle"
			icon-left="lucide-list-filter"
			:label="summary"
			@click="open"
		/>
		<Dialog v-model:open="isOpen" size="2xl" title="Filters">
			<div
				class="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-2"
			>
				<template v-for="(row, index) in rows" :key="index">
					<span v-if="index !== 1" class="text-sm text-ink-gray-5">{{
						index ? matchLabel : "Where"
					}}</span>
					<Select
						v-else
						v-model="match"
						size="sm"
						class="w-full"
						:options="MATCH_OPTIONS"
					/>
					<Select
						size="sm"
						class="w-full"
						placeholder="Field"
						:model-value="row.fieldname"
						:options="fieldOptions"
						@update:model-value="(fieldname) => setField(index, fieldname)"
					/>
					<Select
						size="sm"
						class="w-full"
						:model-value="row.operator"
						:options="getRowOperators(row)"
						@update:model-value="(operator) => setOperator(index, operator)"
					/>
					<Select
						v-if="getInput(row).options"
						size="sm"
						class="w-full"
						:model-value="row.value"
						:options="getInput(row).options"
						@update:model-value="(value) => setRow(index, { value })"
					/>
					<TextInput
						v-else
						size="sm"
						placeholder="Value"
						:type="getInput(row).type"
						:model-value="row.value"
						@update:model-value="(value) => setRow(index, { value })"
					/>
					<Button
						variant="ghost"
						size="sm"
						icon="lucide-x"
						aria-label="Remove filter"
						@click="remove(index)"
					/>
				</template>
				<Button
					class="col-span-2 col-start-1 justify-self-start"
					variant="ghost"
					size="sm"
					icon-left="lucide-plus"
					label="Add filter"
					@click="add"
				/>
			</div>
			<template #actions="{ close }">
				<div class="flex justify-end gap-2">
					<Button label="Cancel" @click="close" />
					<Button variant="solid" label="Apply" @click="apply" />
				</div>
			</template>
		</Dialog>
	</PropertyRow>
</template>

<script setup>
import { getOperators, parseFilters, serializeFilters } from "builder";
import { Button, Dialog, Select, TextInput } from "frappe-ui";
import { computed, ref } from "vue";
import {
	ENTRY_FIELD,
	getStartValue,
	getValueInput,
	LEFT_OUT_OPERATORS,
	toControlFilters,
	toFilterField,
	toSourceFilters,
} from "../cms/filters.js";
import PropertyRow from "./PropertyRow.vue";

// "not like" or "in" on an entry name means nothing to a user
const REFERENCE_OPERATORS = ["equals", "not equals", "is"];
// a multi-reference matches through a join, so "not equals" would match any other entry it holds
const MULTI_OPERATORS = [{ label: "Contains", value: "equals" }];

const MATCH_OPTIONS = [
	{ label: "and", value: "all" },
	{ label: "or", value: "any" },
];

const props = defineProps({
	source: { type: Object, required: true },
	/** The fields of the list's collection that a filter can use. */
	fields: { type: Array, required: true },
	/** On the collection page of the list's collection, a filter can name the entry the page shows. */
	isCollectionPage: { type: Boolean, default: false },
});
const emit = defineEmits(["update"]);
const isOpen = ref(false);
/** The rows while the dialog is open. Apply saves them. */
const rows = ref([]);
const match = ref("all");

const filterFields = computed(() =>
	[...(props.isCollectionPage ? [ENTRY_FIELD] : []), ...props.fields].map(toFilterField)
);
const fieldOptions = computed(() =>
	filterFields.value.map(({ label, value }) => ({ label, value }))
);
const matchLabel = computed(() => (match.value === "any" ? "or" : "and"));
const summary = computed(() => {
	const count = props.source.filters.length;
	if (!count) return "Add filter";
	return count === 1 ? "1 filter" : `${count} filters`;
});

const findField = (fieldname) => filterFields.value.find((field) => field.fieldname === fieldname);
const getRowOperators = (row) => {
	const field = findField(row.fieldname);
	if (field?.isMulti) return MULTI_OPERATORS;
	const kept = (value) =>
		field?.links_to
			? REFERENCE_OPERATORS.includes(value)
			: !LEFT_OUT_OPERATORS.includes(value);
	return getOperators(field?.fieldtype ?? "").filter(({ value }) => kept(value));
};
const getInput = (row) => getValueInput(findField(row.fieldname), row.operator);
const blankRow = () => ({ fieldname: "", operator: "equals", value: "" });

const setRow = (index, patch) =>
	(rows.value = rows.value.map((row, at) => (at === index ? { ...row, ...patch } : row)));
const setOperator = (index, operator) =>
	setRow(index, {
		operator,
		value: getStartValue(findField(rows.value[index].fieldname), operator),
	});
const setField = (index, fieldname) => {
	const operator = getRowOperators({ fieldname })[0]?.value ?? "equals";
	setRow(index, { fieldname, operator, value: getStartValue(findField(fieldname), operator) });
};
const add = () => (rows.value = [...rows.value, blankRow()]);
// the last row empties, so the popover keeps a row to fill
const remove = (index) =>
	(rows.value = rows.value.length > 1 ? rows.value.toSpliced(index, 1) : [blankRow()]);

const toPatch = () => ({
	filters: toSourceFilters(serializeFilters(rows.value.filter((row) => row.fieldname))),
	matchAny: match.value === "any",
});
// the dialog starts on what the list shows, and with a blank row to fill when it has no filter
const open = () => {
	const read = parseFilters(filterFields.value, toControlFilters(props.source.filters));
	rows.value = read.length
		? read.map(({ fieldname, operator, value }) => ({ fieldname, operator, value }))
		: [blankRow()];
	match.value = props.source.matchAny ? "any" : "all";
	isOpen.value = true;
};

// a row with no value narrows nothing, so it saves nothing
const apply = () => {
	emit("update", toPatch());
	isOpen.value = false;
};
</script>
