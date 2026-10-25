<template>
	<form class="flex flex-col gap-4 px-3" @submit.prevent="map">
		<FormControl v-model="doctype" type="combobox" label="Doctype" :options="doctypeNames" />
		<template v-if="doctype">
			<FormControl v-model="label" label="Name" :placeholder="doctype" />
			<FormControl v-model="url" label="URL" :placeholder="normalizeUrl(label || doctype)" />
			<FormControl v-model="slugField" type="select" label="Slug field" :options="slugOptions" />
			<p class="cms-hint">
				URLs look like {{ normalizeUrl(url || label || doctype) }}/my-entry.
			</p>
			<FormControl v-model="publishedField" type="select" label="Published field" :options="publishedOptions" />
			<Alert
				v-if="!publishedField"
				theme="amber"
				:dismissible="false"
				title="All entries are public."
			/>
		</template>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
		<div class="flex justify-end gap-2">
			<Button label="Cancel" :disabled="isRunning" @click="emit('cancel')" />
			<Button
				type="submit"
				variant="solid"
				label="Use as collection"
				:disabled="!doctype || !slugField"
				:loading="isRunning"
			/>
		</div>
	</form>
</template>

<script setup>
import { Alert, Button, FormControl } from "frappe-ui";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { Collection, SETTINGS_DOCTYPE } from "../../cms/collection.js";
import { normalizeUrl } from "../../cms/routes.js";
import { getDoctypeFields, getDoctypeNames, toFieldOption } from "../../data/doctypes.js";
import { useTask } from "../useTask.js";

const emit = defineEmits(["created", "cancel"]);
const doctypeNames = ref([]);
const doctype = ref("");
const label = ref("");
const url = ref("");
const slugField = ref("name");
const publishedField = ref("");
const fields = shallowRef([]);
const { isRunning, error, run } = useTask();

/** A slug is text in one URL segment, so text fields and the name fit. */
const slugOptions = computed(() => [
	{ label: "Name", value: "name" },
	...fields.value
		.filter((field) => ["Data", "Read Only"].includes(field.fieldtype))
		.map(toFieldOption),
]);

const publishedOptions = computed(() => [
	{ label: "None, every row is public", value: "" },
	...fields.value
		.filter((field) => field.fieldtype === "Check")
		.map(toFieldOption),
]);

/** A field named like the role is the likely pick. The user can change it. */
const guess = (options, names, fallback) => options.find((option) => names.includes(option.value))?.value ?? fallback;

watch(doctype, (name) =>
	run(async () => {
		fields.value = name ? await getDoctypeFields(name) : [];
		// not `route`: a Frappe route such as "blog/dev/post" has slashes, and a slug fills one URL segment
		slugField.value = guess(slugOptions.value, ["slug"], "name");
		publishedField.value = guess(publishedOptions.value, ["published", "is_published"], "");
	}),
);

const map = async () => {
	const settings = {
		label: label.value.trim(),
		url: url.value,
		slugField: slugField.value,
		publishedField: publishedField.value,
	};
	const collection = await run(() => Collection.map(doctype.value, settings), "Collection added");
	if (collection) emit("created", collection);
};

onMounted(() =>
	run(async () => {
		const [names, existing] = await Promise.all([getDoctypeNames(), Collection.all()]);
		const taken = new Set([SETTINGS_DOCTYPE, ...existing.map((collection) => collection.doctype)]);
		doctypeNames.value = names.filter((name) => !taken.has(name));
	}),
);
</script>
