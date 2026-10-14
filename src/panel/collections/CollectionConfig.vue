<template>
	<PanelHeader :title="collection.label" back @back="emit('back')">
		<Button size="sm" variant="solid" icon-left="lucide-table" label="Show entries" @click="showEntries" />
	</PanelHeader>
	<div class="flex flex-col gap-5 p-3">
		<section class="flex flex-col gap-1">
			<span class="text-xs text-ink-gray-5">Fields</span>
			<FieldList :fields="collectionFields" />
			<form v-if="collection.isOwned" class="flex flex-col gap-2 pt-2" @submit.prevent="addFields">
				<FieldRows v-model="newFields" />
				<Button type="submit" variant="subtle" label="Add fields" :disabled="!hasNewFields" :loading="isRunning" />
			</form>
		</section>
		<form class="flex flex-col gap-2" @submit.prevent="saveUrl">
			<FormControl v-model="url" label="URL" />
			<p class="text-p-sm text-ink-gray-5">Entries live at {{ normalizeUrl(url || "/") }}/entry-slug.</p>
			<Button type="submit" variant="subtle" label="Save URL" :loading="isRunning" />
		</form>
		<CollectionPagePicker :collection="collection" />
		<div v-if="!collection.isOwned" class="flex flex-col gap-1">
			<span class="text-xs text-ink-gray-5">Mapping</span>
			<p class="text-p-sm text-ink-gray-7">
				{{ collection.doctype }} · slug from "{{ collection.slugField }}" ·
				{{ collection.publishedField ? `published by "${collection.publishedField}"` : "every row is public" }}
			</p>
			<Button variant="ghost" label="Open in Desk" @click="run(() => builder.ui.openUrl(`/app/${slugify(collection.doctype)}`))" />
		</div>
	</div>
	<AddToPage :collection="collection" />
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button, FormControl } from "frappe-ui";
import { computed, onMounted, ref, shallowRef } from "vue";
import { normalizeUrl, slugify } from "../../cms/collection.js";
import PanelHeader from "../PanelHeader.vue";
import { useTask } from "../useTask.js";
import CollectionPagePicker from "./CollectionPagePicker.vue";
import AddToPage from "./AddToPage.vue";
import FieldList from "./FieldList.vue";
import FieldRows from "./FieldRows.vue";

const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["back"]);
const url = ref(props.collection.url);
/** The rows of the Add fields form. The collection's own fields are `collectionFields`. */
const newFields = ref([]);
const collectionFields = shallowRef([]);
const { isRunning, run } = useTask();

const hasNewFields = computed(() => newFields.value.some((field) => field.label.trim()));

const loadFields = () => run(async () => (collectionFields.value = await props.collection.getFields()));

/** The entries open in a large dialog, where a table has room. */
const showEntries = () =>
	builder.ui.openDialog({
		title: props.collection.label,
		size: "5xl",
		height: 560,
		props: { doctype: props.collection.doctype },
	});

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
