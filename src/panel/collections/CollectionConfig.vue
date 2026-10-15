<template>
	<div class="flex flex-col gap-5 p-3">
		<section v-if="collection.isOwned" class="flex flex-col gap-1">
			<span class="cms-section-label">Fields</span>
			<FieldList :fields="collectionFields" removable :disabled="isRunning" @remove="removeField" />
			<form class="flex flex-col gap-2 pt-2" @submit.prevent="addFields">
				<FieldRows v-model="newFields" />
				<!-- only once a new field has a name, so a collection with nothing to save shows no button -->
				<Button v-if="hasNewFields" type="submit" variant="solid" label="Save" :loading="isRunning" />
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
		<section v-if="collection.isOwned" class="border-t border-outline-gray-1 pt-4">
			<RoleAccess :doctype="collection.doctype" hint="Roles that can read and change its entries." />
		</section>
		<section class="flex flex-col gap-2 border-t border-outline-gray-1 pt-4">
			<span class="cms-section-label">{{ collection.isOwned ? "Delete collection" : "Disconnect DocType" }}</span>
			<p class="cms-hint">
				{{
					collection.isOwned
						? "Pages stop showing its entries. Builder asks before it deletes the DocType."
						: `Pages stop showing its entries. ${collection.doctype} and its records stay.`
				}}
			</p>
			<Button
				theme="red"
				:variant="isArmed ? 'solid' : 'subtle'"
				:label="isArmed ? 'Click again to confirm' : collection.isOwned ? 'Delete collection' : 'Disconnect'"
				:loading="isRunning"
				@click="remove"
			/>
		</section>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button, FormControl } from "frappe-ui";
import { computed, onMounted, ref, shallowRef } from "vue";
import { normalizeUrl, slugify } from "../../cms/collection.js";
import { useTask } from "../useTask.js";
import RoleAccess from "../RoleAccess.vue";
import FieldList from "./FieldList.vue";
import FieldRows from "./FieldRows.vue";

const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["deleted"]);

const url = ref(props.collection.url);
/** The rows of the new fields form. The collection's own fields are `collectionFields`. */
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

// the frame cannot open a confirm() dialog, so a delete takes two clicks
const isArmed = ref(false);
const remove = async () => {
	if (!isArmed.value) return void (isArmed.value = true);
	isArmed.value = false;
	const message = props.collection.isOwned ? "Collection deleted" : "DocType disconnected";
	if (await run(async () => (await props.collection.delete(), true), message)) emit("deleted");
};

onMounted(loadFields);
</script>
