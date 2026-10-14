<template>
	<form class="flex flex-col gap-2" @submit.prevent="save">
		<FormControl v-model="chosen" type="combobox" label="Detail page" :options="pageOptions" />
		<p v-if="isChanged && chosen" class="text-p-sm text-ink-amber-6">
			This page gets the URL {{ collection.url }}/:slug.
			<template v-if="collection.collectionPage">The current detail page moves aside.</template>
		</p>
		<p v-else-if="isChanged" class="text-p-sm text-ink-amber-6">
			The current page keeps its URL and content, and stops being the detail page.
		</p>
		<p v-else-if="chosen" class="text-p-sm text-ink-gray-5">Open the page to design it. "Bind to data" binds a block to a field.</p>
		<div class="flex gap-2">
			<Button type="submit" variant="subtle" class="flex-1" label="Save" :disabled="!isChanged" :loading="isRunning" />
			<Button v-if="collection.collectionPage && !isChanged" variant="ghost" label="Open" @click="open" />
		</div>
	</form>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button, FormControl } from "frappe-ui";
import { computed, onMounted, ref, shallowRef } from "vue";
import { clearCollectionPage, setCollectionPage } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";

const props = defineProps({ collection: { type: Object, required: true } });
const chosen = ref(props.collection.collectionPage ?? "");
const pages = shallowRef([]);
const { isRunning, run } = useTask();

const isChanged = computed(() => chosen.value !== (props.collection.collectionPage ?? ""));
const pageOptions = computed(() => [
	{ label: "None", value: "" },
	...pages.value.map((page) => ({ label: `${page.page_title} (/${page.route})`, value: page.name })),
]);

const save = () =>
	run(async () => {
		if (chosen.value) await setCollectionPage(props.collection, chosen.value);
		else await clearCollectionPage(props.collection);
		// the route of the chosen page changed, so the list shows it again
		pages.value = await getPages();
	}, "Detail page saved");

const open = () => run(() => builder.page.open(props.collection.collectionPage));

const getPages = () =>
	builder.data.getList("Builder Page", {
		fields: ["name", "page_title", "route"],
		filters: { is_template: 0 },
		orderBy: "modified desc",
		pageLength: 500,
	});

onMounted(() => run(async () => (pages.value = await getPages())));
</script>
