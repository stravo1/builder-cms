<template>
	<RichTextField v-if="field.fieldtype === 'Text Editor'" v-model="value" :label="label" />
	<FormControl
		v-else
		v-model="value"
		:type="type"
		:label="label"
		:required="Boolean(field.reqd)"
		:options="options"
		:placeholder="field.fieldtype === 'Attach Image' ? 'Paste an image URL' : ''"
	/>
</template>

<script setup>
import { FormControl } from "frappe-ui";
import { computed } from "vue";
import RichTextField from "../collections/RichTextField.vue";

const props = defineProps({ field: { type: Object, required: true } });
const value = defineModel();
const label = computed(() => props.field.label || props.field.fieldname);
const options = computed(() => ["", ...(props.field.options || "").split("\n").filter(Boolean)]);
const type = computed(() => {
	const fieldtype = props.field.fieldtype;
	if (fieldtype === "Check") return "checkbox";
	if (["Int", "Float", "Currency", "Percent"].includes(fieldtype)) return "number";
	if (["Small Text", "Text", "Long Text", "Markdown Editor", "Code"].includes(fieldtype)) return "textarea";
	return { Date: "date", Datetime: "datetime", Time: "time", Select: "select" }[fieldtype] || "text";
});
</script>
