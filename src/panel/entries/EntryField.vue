<template>
	<div ref="container">
		<RichTextField ref="control" v-if="field.fieldtype === 'Text Editor'" v-model="value" :label="label" />
		<FormControl
			ref="control"
			v-else
			v-model="value"
			:type="type"
			:label="label"
			:required="Boolean(field.reqd)"
			:options="options"
			:placeholder="field.fieldtype === 'Attach Image' ? 'Paste an image URL' : ''"
		/>
	</div>
</template>

<script setup>
import { FormControl } from "frappe-ui";
import { computed, ref } from "vue";
import { isMultilineField } from "../../data/doctypes.js";
import RichTextField from "../collections/RichTextField.vue";

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
const options = computed(() => ["", ...(props.field.options || "").split("\n").filter(Boolean)]);
const type = computed(() => {
	const fieldtype = props.field.fieldtype;
	if (fieldtype === "Check") return "checkbox";
	if (["Int", "Float", "Currency", "Percent"].includes(fieldtype)) return "number";
	if (isMultilineField(props.field)) return "textarea";
	return { Date: "date", Datetime: "datetime", Time: "time", Select: "select" }[fieldtype] || "text";
});
</script>
