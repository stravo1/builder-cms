<template>
	<div class="flex flex-col gap-2">
		<div v-for="(field, index) in fields" :key="index" class="flex flex-col gap-1">
			<div class="flex items-center gap-1">
				<FormControl v-model="field.label" class="flex-1" placeholder="Field name" />
				<Select v-model="field.fieldtype" :options="FIELD_TYPES" class="w-28" />
				<Button
					variant="ghost"
					icon="lucide-x"
					label="Remove field"
					@click="fields.splice(index, 1)"
				/>
			</div>
			<!-- under the name, so the row keeps its width in a narrow pane -->
			<Select
				v-if="REFERENCE_TYPES.includes(field.fieldtype)"
				v-model="field.options"
				class="mr-8"
				placeholder="Links to"
				:options="collectionOptions"
			/>
		</div>
	</div>
</template>

<script setup>
import { Button, FormControl, Select } from "frappe-ui";
import { computed, shallowRef } from "vue";
import { Collection, FIELD_TYPES, REFERENCE_TYPES } from "../../cms/collection.js";
import { useTask } from "../useTask.js";

const fields = defineModel({ type: Array, required: true });
const collections = shallowRef([]);
const collectionOptions = computed(() =>
	collections.value.map((collection) => ({ label: collection.title, value: collection.doctype }))
);

useTask().run(async () => (collections.value = await Collection.all()));
</script>
