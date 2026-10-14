<template>
	<section class="flex flex-col gap-2 p-3">
		<h3 class="text-sm font-medium text-ink-gray-9">Index page</h3>
		<p class="text-p-sm text-ink-gray-5">Lists every published entry of {{ collection.label }} at {{ collection.url }}.</p>
		<FormControl v-model="next" type="combobox" label="Collection" :options="options" />
		<template v-if="next !== collection.doctype">
			<p class="text-p-sm text-ink-amber-6">
				<template v-if="next">This page takes the URL {{ nextCollection?.url }}, and gets a list of it.</template>
				<template v-else>This page keeps its URL and content, and stops being the index page.</template>
			</p>
			<Button variant="subtle" label="Save" :loading="isRunning" @click="save" />
		</template>
	</section>
</template>

<script setup>
import { Button, FormControl } from "frappe-ui";
import { computed, ref } from "vue";
import { clearIndexPage, useAsIndexPage } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";

const props = defineProps({ collection: { type: Object, required: true }, collections: { type: Array, required: true } });
const emit = defineEmits(["changed"]);
const next = ref(props.collection.doctype);
const { isRunning, run } = useTask();

const nextCollection = computed(() => props.collections.find((each) => each.doctype === next.value) ?? null);
const options = computed(() => [
	{ label: "None", value: "" },
	...props.collections.map((each) => ({ label: each.title, value: each.doctype })),
]);

/** The new collection is set first, so a refused URL leaves the page as it was. */
const save = async () => {
	await run(async () => {
		if (nextCollection.value) await useAsIndexPage(nextCollection.value);
		await clearIndexPage(props.collection);
	}, "Index page saved");
	emit("changed");
};
</script>
