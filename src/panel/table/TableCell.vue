<template>
	<Checkbox
		v-if="field.fieldtype === 'Check'"
		:model-value="Boolean(value)"
		:disabled="readOnly"
		:aria-label="field.label || field.fieldname"
		@update:model-value="(checked) => emit('save', checked ? 1 : 0)"
	/>
	<button
		v-else-if="isMultilineField(field)"
		class="line-clamp-2 w-full rounded-1 px-2 text-left text-sm text-ink-gray-7 hover:bg-surface-gray-2"
		:disabled="readOnly"
		:aria-label="field.label || field.fieldname"
		@click="emit('open')"
	>
		{{ preview || "Empty" }}
	</button>
	<FormControl
		v-else-if="field.fieldtype === 'Select'"
		type="select"
		size="sm"
		variant="ghost"
		:model-value="value ?? ''"
		:options="selectOptions"
		:disabled="readOnly"
		:aria-label="field.label || field.fieldname"
		@update:model-value="(chosen) => emit('save', chosen)"
	/>
	<FormControl
		v-else-if="field.fieldtype === 'Date'"
		type="date"
		size="sm"
		variant="ghost"
		:model-value="value ?? ''"
		:disabled="readOnly"
		:aria-label="field.label || field.fieldname"
		@update:model-value="(picked) => picked !== value && emit('save', picked || null)"
	/>
	<div v-else class="flex items-center gap-2">
		<img
			v-if="field.fieldtype === 'Attach Image' && value"
			:src="value"
			alt=""
			class="size-7 shrink-0 rounded-1 object-cover"
		/>
		<TextInput
			v-model="draft"
			size="sm"
			variant="ghost"
			class="w-full"
			:type="isNumber ? 'number' : 'text'"
			:placeholder="field.fieldtype === 'Attach Image' ? 'Image URL' : ''"
			:disabled="readOnly"
			:aria-label="field.label || field.fieldname"
			@keydown.enter="($event) => $event.target.blur()"
			@keydown.esc="cancel"
			@blur="commit"
		/>
	</div>
</template>

<script setup>
import { Checkbox, FormControl, TextInput } from "frappe-ui";
import { computed, ref, watch } from "vue";
import { isMultilineField } from "../../data/doctypes.js";

const NUMBER_TYPES = ["Int", "Float", "Currency", "Percent"];

const props = defineProps({ field: { type: Object, required: true }, value: null, readOnly: Boolean });
const emit = defineEmits(["save", "open"]);

const isNumber = computed(() => NUMBER_TYPES.includes(props.field.fieldtype));
const selectOptions = computed(() => ["", ...(props.field.options || "").split("\n").filter(Boolean)]);
const preview = computed(() => {
	if (props.field.fieldtype !== "Text Editor") return String(props.value ?? "");
	return props.value ? new DOMParser().parseFromString(String(props.value), "text/html").body.textContent : "";
});

/** The text being typed. It follows the saved value until the user types. */
const draft = ref("");
watch(
	() => props.value,
	(value) => (draft.value = value ?? ""),
	{ immediate: true },
);

const typed = () => (isNumber.value ? (draft.value === "" ? null : Number(draft.value)) : draft.value);

/** Saves only a real change, when the user leaves the cell or presses Enter. */
const commit = () => {
	if (typed() === (props.value ?? (isNumber.value ? null : ""))) return;
	emit("save", typed());
};

const cancel = (event) => {
	draft.value = props.value ?? "";
	event.target.blur();
};
</script>
