<template>
	<div class="flex flex-col gap-2">
		<div v-for="(field, index) in fields" :key="index" class="flex items-center gap-1">
			<FormControl v-model="field.label" class="flex-1" placeholder="Field name" />
			<Select v-model="field.fieldtype" :options="FIELD_TYPES" class="w-28" />
			<Button variant="ghost" icon="lucide-x" label="Remove field" @click="fields.splice(index, 1)" />
		</div>
	</div>
</template>

<script setup>
import { Button, FormControl, Select } from "frappe-ui";
import { FIELD_TYPES } from "../../cms/collection.js";

const fields = defineModel({ type: Array, required: true });
</script>
