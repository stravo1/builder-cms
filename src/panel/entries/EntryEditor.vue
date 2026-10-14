<template>
	<form class="flex h-full min-h-0 flex-col" @submit.prevent="save">
		<header class="flex items-center justify-between gap-3 border-b border-outline-gray-1 pb-3">
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					icon="lucide-arrow-left"
					label="Back to entries"
					:disabled="isRunning"
					@click="emit('back')"
				/>
				<div>
					<h3 class="text-lg font-semibold text-ink-gray-9">{{ entryName ? "Edit entry" : "New entry" }}</h3>
					<p class="text-p-sm text-ink-gray-5">{{ collection.label }}</p>
				</div>
			</div>
			<Button
				type="submit"
				variant="solid"
				:label="entryName ? 'Save changes' : 'Create entry'"
				:loading="isRunning"
				:disabled="!isLoaded"
			/>
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto py-5">
			<p v-if="!isLoaded" class="cms-hint">Loading entry…</p>
			<div v-else class="mx-auto flex max-w-2xl flex-col gap-5 px-2">
				<p v-if="!collection.isOwned" class="cms-hint">
					Saved to {{ collection.doctype }}. Use Desk for child tables and advanced fields.
				</p>
				<EntryField v-for="field in fields" :key="field.fieldname" v-model="draft[field.fieldname]" :field="field" />
				<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
				<Button
					v-if="!collection.isOwned || entryName"
					variant="ghost"
					icon-left="lucide-external-link"
					label="Open in Desk"
					@click="builder.ui.openUrl(collection.getDeskUrl(entryName || 'new'))"
				/>
			</div>
		</div>
	</form>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button } from "frappe-ui";
import { onMounted, ref, shallowRef } from "vue";
import { getWritableFields } from "../../data/doctypes.js";
import { useTask } from "../useTask.js";
import EntryField from "./EntryField.vue";

const props = defineProps({ collection: { type: Object, required: true }, entryName: { type: String, default: "" } });
const emit = defineEmits(["back", "saved"]);
const fields = shallowRef([]);
const draft = ref({});
const isLoaded = ref(false);
const { run, isRunning, error } = useTask();

onMounted(() =>
	run(async () => {
		fields.value = getWritableFields(await props.collection.getTableFields());
		const entry = props.entryName ? await props.collection.getEntry(props.entryName) : {};
		draft.value = Object.fromEntries(
			fields.value.map((field) => [field.fieldname, entry[field.fieldname] ?? getDefault(field)]),
		);
		isLoaded.value = true;
	}),
);

const getDefault = (field) => {
	if (field.fieldtype === "Check") return Number(field.default || 0);
	return field.default && !String(field.default).startsWith(":") ? field.default : "";
};

const save = async () => {
	const saved = await run(
		() => props.collection.saveEntry({ ...draft.value, ...(props.entryName && { name: props.entryName }) }),
		"Entry saved",
	);
	if (saved) emit("saved", saved);
};
</script>
