<template>
	<div class="cms-form-column flex flex-col gap-4 py-6">
		<h2 class="px-3 text-lg font-semibold text-ink-gray-9">New collection</h2>
		<div v-if="access.is_manager" class="px-3">
			<TabButtons v-model="mode" :options="MODES" />
		</div>
		<MapCollection
			v-if="mode === 'map'"
			@created="(collection) => emit('created', collection)"
			@cancel="emit('cancel')" />
		<form v-else class="flex flex-col gap-4 px-3" @submit.prevent="create">
			<FormControl v-model="label" label="Name" placeholder="Blog Post" required />
			<FormControl v-model="url" label="URL" :placeholder="normalizeUrl(label || 'blog')" />
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<span class="cms-section-label">Fields</span>
					<Button variant="ghost" size="sm" icon="lucide-plus" label="Add field" @click="fields.push(blankField())" />
				</div>
				<p class="cms-hint">It gets title, slug and published fields.</p>
				<FieldRows v-model="fields" />
			</div>
			<div class="flex justify-end gap-2">
				<Button label="Cancel" :disabled="isRunning" @click="emit('cancel')" />
				<Button type="submit" variant="solid" label="Create collection" :loading="isRunning" />
			</div>
		</form>
	</div>
</template>

<script setup>
import { Button, FormControl, TabButtons } from "frappe-ui";
import { ref } from "vue";
import { blankField, Collection, normalizeUrl } from "../../cms/collection.js";
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
const fields = ref([blankField()]);
const { isRunning, run } = useTask();

const create = async () => {
	const named = fields.value.filter((field) => field.label.trim());
	const collection = await run(() => Collection.create(label.value.trim(), url.value, named), "Collection created");
	if (collection) emit("created", collection);
};
</script>
