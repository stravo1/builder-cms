<template>
	<div class="flex flex-col">
		<div
			v-for="field in fields.slice(0, visibleCount)"
			:key="field.fieldname"
			class="flex items-center gap-2 border-b border-outline-gray-1 py-2 last:border-0"
		>
			<div class="min-w-0 flex-1">
				<span class="block truncate text-sm text-ink-gray-8">{{
					getFieldLabel(field)
				}}</span>
				<span class="block text-xs text-ink-gray-5">{{ typeLabel(field) }}</span>
			</div>
			<Button
				v-if="removable && !STANDARD_FIELDNAMES.includes(field.fieldname)"
				variant="ghost"
				icon="lucide-trash-2"
				:label="`Remove ${getFieldLabel(field)}`"
				:disabled="disabled"
				@click="emit('remove', field)"
			/>
			<Badge v-else label="Required" />
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
import { Badge, Button } from "frappe-ui";
import { ref, shallowRef } from "vue";
import { Collection, FIELD_TYPES, STANDARD_FIELDNAMES } from "../../cms/collection.js";
import { getFieldLabel } from "../../data/doctypes.js";
import { useTask } from "../useTask.js";
defineProps({ fields: { type: Array, required: true }, removable: Boolean, disabled: Boolean });
const emit = defineEmits(["remove"]);
const visibleCount = ref(10);
const collections = shallowRef([]);
useTask().run(async () => (collections.value = await Collection.all()));

/** A reference also names the collection it links to: "Reference · Tag". */
const typeLabel = (field) => {
	const type =
		FIELD_TYPES.find((each) => each.value === field.fieldtype)?.label || field.fieldtype;
	const target =
		field.links_to && collections.value.find((each) => each.doctype === field.links_to);
	return target ? `${type} · ${target.title}` : type;
};
</script>
