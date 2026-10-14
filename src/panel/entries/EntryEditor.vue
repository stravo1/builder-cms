<template>
	<form aria-label="Entry editor" class="flex h-full min-h-0 flex-col" @submit.prevent="save">
		<header class="shrink-0 px-3 py-3" :class="{ 'border-b border-outline-gray-1': !isDrawer }">
			<h3 class="truncate text-base font-semibold text-ink-gray-9">
				{{ entryName ? "Edit entry" : "New entry" }}
			</h3>
			<p class="mt-1 truncate text-p-sm text-ink-gray-5">
				{{ collection.label }}
			</p>
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			<p v-if="!isLoaded && !error" class="cms-hint">Loading entry…</p>
			<div v-if="isLoaded" class="flex flex-col gap-4">
				<p v-if="!collection.isOwned" class="cms-hint">
					Saved to {{ collection.doctype }}. Use Desk for child tables and advanced fields.
				</p>
				<fieldset :disabled="isRunning" class="flex min-w-0 flex-col gap-4">
					<EntryField
						v-for="field in fields"
						:key="field.fieldname"
						:ref="(control) => fieldControls.set(field.fieldname, control)"
						v-model="draft[field.fieldname]"
						:field="field"
					/>
				</fieldset>
				<Button
					v-if="!collection.isOwned || entryName"
					class="self-start"
					variant="ghost"
					icon-left="lucide-external-link"
					label="Open in Desk"
					@click="builder.ui.openUrl(collection.getDeskUrl(entryName || 'new'))"
				/>
			</div>
			<p v-if="error" role="alert" class="cms-error mt-3">{{ error }}</p>
		</div>
		<footer class="flex shrink-0 justify-end gap-2 p-3" :class="{ 'border-t border-outline-gray-1': !isDrawer }">
			<Button label="Cancel" :disabled="isRunning" @click="emit('back')" />
			<Button type="submit" variant="solid" label="Save" :loading="isRunning" :disabled="!isLoaded" />
		</footer>
	</form>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button } from "frappe-ui";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { slugify } from "../../cms/collection.js";
import { getWritableFields } from "../../data/doctypes.js";
import { useTask } from "../useTask.js";
import EntryField from "./EntryField.vue";

const props = defineProps({
	collection: { type: Object, required: true },
	entryName: { type: String, default: "" },
	fieldName: { type: String, default: "" },
	isDrawer: Boolean,
});
const emit = defineEmits(["back", "saved"]);
const fields = shallowRef([]);
const fieldControls = new Map();
const draft = ref({});
const initialDraft = ref("");
const isLoaded = ref(false);
const { run, isRunning, error } = useTask();
const isDirty = computed(() => isLoaded.value && JSON.stringify(draft.value) !== initialDraft.value);
defineExpose({ isDirty, isRunning });

watch(
	[isLoaded, isRunning, () => props.fieldName],
	([isReady, isBusy, fieldName]) => {
		if (isReady && !isBusy && fieldName) fieldControls.get(fieldName)?.focus();
	},
	{ flush: "post" },
);

onMounted(() =>
	run(async () => {
		fields.value = getWritableFields(await props.collection.getTableFields());
		const entry = props.entryName ? await props.collection.getEntry(props.entryName) : {};
		draft.value = Object.fromEntries(
			fields.value.map((field) => [field.fieldname, entry[field.fieldname] ?? getDefault(field)]),
		);
		initialDraft.value = JSON.stringify(draft.value);
		isLoaded.value = true;
	}),
);

// a new entry's slug follows its title. An existing slug stays, because live links use it
watch(
	() => draft.value.title,
	(title, previous) => {
		const slugField = props.collection.slugField;
		if (props.entryName || !(slugField in draft.value)) return;
		if (props.collection.isSlugFromTitle(draft.value[slugField], previous)) {
			draft.value[slugField] = slugify(title ?? "");
		}
	},
);

const getDefault = (field) => {
	// a new entry starts published. The user unticks it to keep a draft
	if (field.fieldname === props.collection.publishedField) return 1;
	if (field.fieldtype === "Check") return Number(field.default || 0);
	return field.default && !String(field.default).startsWith(":") ? field.default : "";
};

const save = async () => {
	if (!isLoaded.value || isRunning.value) return;
	const saved = await run(
		() =>
			props.collection.saveEntry({
				...draft.value,
				...(props.entryName && { name: props.entryName }),
			}),
		"Entry saved",
	);
	if (saved) {
		initialDraft.value = JSON.stringify(draft.value);
		emit("saved", saved);
	}
};
</script>
