<template>
	<PanelHeader title="New collection" back @back="emit('cancel')" />
	<div class="px-3 pt-3">
		<TabButtons v-if="access.is_manager" v-model="mode" :options="MODES" class="w-full" />
	</div>
	<MapCollection v-if="mode === 'map'" @created="(collection) => emit('created', collection)" />
	<form v-else class="flex flex-col gap-4 p-3" @submit.prevent="create">
		<FormControl v-model="label" label="Name" placeholder="Blog Post" required />
		<FormControl v-model="url" label="URL" :placeholder="normalizeUrl(label || 'blog')" />
		<div class="flex flex-col gap-2">
			<span class="cms-section-label">Fields</span>
			<p class="cms-hint">Every collection has a title, a slug, and a published flag.</p>
			<FieldRows v-model="fields" />
		</div>
		<Button type="submit" variant="solid" label="Create collection" :loading="isRunning" />
	</form>
</template>

<script setup>
import { Button, FormControl, TabButtons } from "frappe-ui";
import { ref } from "vue";
import { Collection, normalizeUrl } from "../../cms/collection.js";
import PanelHeader from "../PanelHeader.vue";
import { useAccess } from "../useAccess.js";
import { useTask } from "../useTask.js";
import FieldRows from "./FieldRows.vue";
import MapCollection from "./MapCollection.vue";

const MODES = [
	{ label: "New content type", value: "create" },
	{ label: "Existing doctype", value: "map" },
];
const mode = ref("create");
// only a manager maps an existing doctype
const access = useAccess();

const emit = defineEmits(["created", "cancel"]);
const label = ref("");
const url = ref("");
const fields = ref([{ label: "", fieldtype: "Data" }]);
const { isRunning, run } = useTask();

const create = async () => {
	const named = fields.value.filter((field) => field.label.trim());
	const collection = await run(() => Collection.create(label.value.trim(), url.value, named), "Collection created");
	if (collection) emit("created", collection);
};
</script>
