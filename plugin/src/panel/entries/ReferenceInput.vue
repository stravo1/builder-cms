<template>
	<MultiSelect
		v-if="isMulti"
		class="w-full"
		placeholder="Choose entries"
		:size="size"
		:variant="variant"
		:disabled="disabled"
		:loading="isRunning"
		:model-value="modelValue || []"
		:options="options"
		@update:model-value="(names) => emit('update:modelValue', names)"
	/>
	<!-- a button trigger looks like a select, and searches in its popover -->
	<Combobox
		v-else
		class="w-full"
		trigger="button"
		placeholder="Choose an entry"
		:size="size"
		:variant="variant"
		:disabled="disabled"
		:loading="isRunning"
		:model-value="modelValue || ''"
		:options="[{ label: 'None', value: '' }, ...options]"
		@update:model-value="(name) => emit('update:modelValue', name || null)"
	/>
</template>

<script setup>
import { Combobox, MultiSelect } from "frappe-ui";
import { computed, shallowRef } from "vue";
import { Collection } from "../../cms/collection.js";
import { useTask } from "../useTask.js";

/** Picks the entries of the collection a reference links to. The value is the entry name, or a list of them. */
const props = defineProps({
	field: { type: Object, required: true },
	modelValue: { type: [String, Array], default: null },
	size: { type: String, default: "md" },
	variant: { type: String, default: "subtle" },
	disabled: Boolean,
});
const emit = defineEmits(["update:modelValue"]);
const { isRunning, run } = useTask();
const options = shallowRef([]);
const isMulti = computed(() => props.field.fieldtype === "Table MultiSelect");

run(async () => {
	const target = (await Collection.all()).find((each) => each.doctype === props.field.links_to);
	if (!target) throw new Error(`You cannot read the entries of ${props.field.links_to}.`);
	options.value = await target.getEntryOptions();
});
</script>
