<template>
	<Checkbox
		v-if="field.fieldtype === 'Check'"
		:model-value="Boolean(value)"
		:disabled="readOnly"
		:aria-label="label"
		@update:model-value="(checked) => emit('save', checked ? 1 : 0)"
	/>
	<ReferenceInput
		v-else-if="field.links_to"
		size="sm"
		variant="ghost"
		:field="field"
		:model-value="value"
		:disabled="readOnly"
		:aria-label="label"
		@update:model-value="(chosen) => emit('save', chosen)"
	/>
	<button
		v-else-if="isMultilineField(field)"
		class="line-clamp-2 w-full rounded-1 px-2 text-left text-sm text-ink-gray-7 hover:bg-surface-gray-2"
		:disabled="readOnly"
		:aria-label="label"
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
		:aria-label="label"
		@update:model-value="(chosen) => emit('save', chosen)"
	/>
	<FormControl
		v-else-if="field.fieldtype === 'Date'"
		type="date"
		size="sm"
		variant="ghost"
		:model-value="value ?? ''"
		:disabled="readOnly"
		:aria-label="label"
		@update:model-value="(picked) => picked !== value && emit('save', picked || null)"
	/>
	<div v-else class="flex items-center gap-2">
		<ImageThumbnail v-if="isImage && value" :src="value" />
		<TextInput
			v-model="draft"
			size="sm"
			variant="ghost"
			class="w-full"
			:type="isNumber ? 'number' : 'text'"
			:placeholder="isImage ? 'Image URL' : ''"
			:disabled="readOnly"
			:aria-label="label"
			@keydown.enter="($event) => $event.target.blur()"
			@keydown.esc="cancel"
			@blur="commit"
		/>
		<ImageUploader v-if="isImage" :disabled="readOnly" @upload="(url) => emit('save', url)" />
	</div>
</template>

<script setup>
import { Checkbox, FormControl, TextInput } from "frappe-ui";
import { computed, ref, watch } from "vue";
import {
	getFieldLabel,
	getSelectOptions,
	isMultilineField,
	isNumberField,
} from "../../data/doctypes.js";
import ImageThumbnail from "./ImageThumbnail.vue";
import ImageUploader from "./ImageUploader.vue";
import ReferenceInput from "./ReferenceInput.vue";

const props = defineProps({
	field: { type: Object, required: true },
	value: null,
	readOnly: Boolean,
});
const emit = defineEmits(["save", "open"]);

const label = computed(() => getFieldLabel(props.field));
const isNumber = computed(() => isNumberField(props.field));
const isImage = computed(() => props.field.fieldtype === "Attach Image");
const selectOptions = computed(() => getSelectOptions(props.field));
const preview = computed(() => {
	if (props.field.fieldtype !== "Text Editor") return String(props.value ?? "");
	return props.value
		? new DOMParser().parseFromString(String(props.value), "text/html").body.textContent
		: "";
});

/** The text being typed. It follows the saved value until the user types. */
const draft = ref("");
watch(
	() => props.value,
	(value) => (draft.value = value ?? ""),
	{ immediate: true }
);

const typed = () =>
	isNumber.value ? (draft.value === "" ? null : Number(draft.value)) : draft.value;

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
