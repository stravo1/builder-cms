<template>
	<div class="flex flex-col">
		<div
			v-for="field in fields"
			:key="field.fieldname"
			class="flex items-center justify-between gap-2 border-b border-outline-gray-1 py-1.5 last:border-0">
			<span class="truncate text-base text-ink-gray-8">{{ field.label || field.fieldname }}</span>
			<span class="shrink-0 text-p-sm text-ink-gray-5">{{ typeLabel(field) }}</span>
		</div>
	</div>
</template>

<script setup>
import { FIELD_TYPES } from "../../cms/collection.js";

defineProps({ fields: { type: Array, required: true } });

/** The names the New collection form uses. A mapped doctype can have others, shown as Frappe names them. */
const typeLabel = (field) => FIELD_TYPES.find((type) => type.value === field.fieldtype)?.label ?? field.fieldtype;
</script>
