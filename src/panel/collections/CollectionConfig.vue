<template>
	<div class="flex flex-col gap-5 p-3">
		<section v-if="collection.isOwned" class="flex flex-col gap-1">
			<span class="cms-section-label">Fields</span>
			<FieldList :fields="collectionFields" removable :disabled="isRunning" @remove="removeField" />
			<form class="flex flex-col gap-2 pt-2" @submit.prevent="addFields">
				<FieldRows v-model="newFields" />
				<Button type="submit" variant="subtle" label="Add fields" :disabled="!hasNewFields" :loading="isRunning" />
			</form>
		</section>
		<form class="flex flex-col gap-2" @submit.prevent="saveUrl">
			<FormControl v-model="url" label="URL" />
			<p class="cms-hint">Entries live at {{ normalizeUrl(url || "/") }}/entry-slug.</p>
			<Button type="submit" variant="subtle" label="Save URL" :loading="isRunning" />
		</form>
		<div v-if="!collection.isOwned" class="flex flex-col gap-1">
			<span class="cms-section-label">Mapping</span>
			<p class="text-p-sm text-ink-gray-7">
				{{ collection.doctype }} · slug from "{{ collection.slugField }}" ·
				{{ collection.publishedField ? `published by "${collection.publishedField}"` : "every row is public" }}
			</p>
			<Button
				variant="ghost"
				label="Open in Desk"
				@click="run(() => builder.ui.openUrl(`/app/${slugify(collection.doctype)}`))"
			/>
		</div>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button, FormControl } from "frappe-ui";
import { computed, onMounted, ref, shallowRef } from "vue";
import { normalizeUrl, slugify } from "../../cms/collection.js";
import { useTask } from "../useTask.js";
import FieldList from "./FieldList.vue";
import FieldRows from "./FieldRows.vue";

const props = defineProps({ collection: { type: Object, required: true } });

const url = ref(props.collection.url);
/** The rows of the Add fields form. The collection's own fields are `collectionFields`. */
const newFields = ref([]);
const collectionFields = shallowRef([]);
const { isRunning, error, run } = useTask();

const hasNewFields = computed(() => newFields.value.some((field) => field.label.trim()));

const loadFields = () => run(async () => (collectionFields.value = await props.collection.getFields()));

const removeField = async (field) => {
	await run(async () => {
		await props.collection.removeField(field.fieldname);
		return true;
	}, "Field removed");
	const fields = await props.collection.getFields();
	collectionFields.value = fields;
};

const saveUrl = () => run(() => props.collection.changeUrl(url.value), "URL saved");

const addFields = async () => {
	const named = newFields.value.filter((field) => field.label.trim());
	const added = await run(async () => (await props.collection.addFields(named), true), "Fields added");
	if (!added) return;
	newFields.value = [];
	await loadFields();
};

onMounted(loadFields);
</script>
