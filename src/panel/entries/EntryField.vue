<template>
	<div ref="container" :class="{ 'flex items-end gap-2': isImage }">
		<RichTextField ref="control" v-if="field.fieldtype === 'Text Editor'" v-model="value" :label="label" />
		<FormControl
			ref="control"
			v-else
			v-model="value"
			:class="{ 'min-w-0 flex-1': isImage }"
			:type="type"
			:label="label"
			:required="Boolean(field.reqd)"
			:options="options"
			:placeholder="isImage ? 'Paste an image URL' : ''"
		/>
		<ImageUploader v-if="isImage" @upload="(url) => (value = url)" />
	</div>
</template>

<script setup>
import { FormControl } from "frappe-ui";
import { computed, ref } from "vue";
import { isMultilineField } from "../../data/doctypes.js";
import RichTextField from "../collections/RichTextField.vue";
import ImageUploader from "./ImageUploader.vue";

const props = defineProps({ field: { type: Object, required: true } });
const value = defineModel();
const control = ref(null);
const container = ref(null);
defineExpose({
	focus: () => {
		container.value.scrollIntoView({ block: "nearest" });
		if (props.field.fieldtype === "Text Editor") control.value?.focus();
		else container.value.querySelector("input, textarea, button")?.focus();
	},
});
const label = computed(() => props.field.label || props.field.fieldname);
const isImage = computed(() => props.field.fieldtype === "Attach Image");
const options = computed(() => ["", ...(props.field.options || "").split("\n").filter(Boolean)]);
const type = computed(() => {
	const fieldtype = props.field.fieldtype;
	if (fieldtype === "Check") return "checkbox";
	if (["Int", "Float", "Currency", "Percent"].includes(fieldtype)) return "number";
	if (isMultilineField(props.field)) return "textarea";
	return { Date: "date", Datetime: "datetime", Time: "time", Select: "select" }[fieldtype] || "text";
});
</script>
