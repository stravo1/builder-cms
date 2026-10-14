<template>
	<div class="flex flex-col">
		<div
			v-for="field in fields.slice(0, visibleCount)"
			:key="field.fieldname"
			class="flex items-center gap-2 border-b border-outline-gray-1 py-2 last:border-0"
		>
			<div class="min-w-0 flex-1">
				<span class="block truncate text-sm text-ink-gray-8">{{ field.label || field.fieldname }}</span
				><span class="mt-1 block text-xs text-ink-gray-5">{{ typeLabel(field) }}</span>
			</div>
			<Button
				v-if="removable && !protectedFields.includes(field.fieldname)"
				variant="ghost"
				icon="lucide-trash-2"
				:label="`Remove ${field.label || field.fieldname}`"
				:disabled="disabled"
				@click="emit('remove', field)"
			/>
			<span v-else class="text-xs text-ink-gray-4">Required</span>
		</div>
		<Button
			v-if="fields.length > visibleCount"
			variant="ghost"
			label="Load more fields"
			class="mt-2"
			@click="visibleCount += 10"
		/>
	</div>
</template>
<script setup>
import { Button } from "frappe-ui";
import { ref } from "vue";
import { FIELD_TYPES } from "../../cms/collection.js";
defineProps({ fields: { type: Array, required: true }, removable: Boolean, disabled: Boolean });
const emit = defineEmits(["remove"]);
const visibleCount = ref(10);
const protectedFields = ["title", "slug", "published"];
const typeLabel = (field) => FIELD_TYPES.find((type) => type.value === field.fieldtype)?.label || field.fieldtype;
</script>
