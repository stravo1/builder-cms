<template>
	<section class="flex flex-col gap-2 p-3">
		<h3 class="text-sm font-medium text-ink-gray-9">Detail page</h3>
		<p class="text-p-sm text-ink-gray-5">Shows one entry of {{ pageCollection.label }} at {{ pageCollection.url }}/entry-slug.</p>
		<FormControl v-model="switchTo" type="combobox" label="Collection" :options="switchOptions" />
		<template v-if="switchTo !== pageCollection.doctype">
			<p class="text-p-sm text-ink-amber-6">
				<template v-if="switchTo">
					This page takes the URL {{ nextCollection?.url }}/:slug. Blocks bound to {{ pageCollection.label }}
					fields keep those bindings. Bind them again with "Bind to data".
				</template>
				<template v-else>This page keeps its URL and content, and stops being the detail page.</template>
			</p>
			<Button variant="subtle" label="Save" :loading="isRunning" @click="saveCollection" />
		</template>
		<FormControl
			v-model="previewSlug"
			type="select"
			label="Preview entry"
			:options="entries.map((entry) => ({ label: entry.title, value: entry.slug }))"
			@update:model-value="preview" />
	</section>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { Button, FormControl } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { getPageCollection, switchCollectionPage } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";

const props = defineProps({
	collections: { type: Array, required: true },
	page: { type: Object, required: true },
	sources: { type: Array, required: true },
});
const emit = defineEmits(["changed"]);
const entries = shallowRef([]);
const previewSlug = ref("");
const context = useBuilderContext(["routeVariables"]);
const { isRunning, run } = useTask();

const pageCollection = computed(() => getPageCollection(props.collections, props.page, props.sources));

/** The collection this page shows, as the picker holds it until Save. "" is none. */
const switchTo = ref("");
watch(pageCollection, (collection) => (switchTo.value = collection?.doctype ?? ""), { immediate: true });
const nextCollection = computed(() => props.collections.find((collection) => collection.doctype === switchTo.value));
const switchOptions = computed(() => [
	{ label: "None", value: "" },
	...props.collections.map((collection) => ({ label: collection.title, value: collection.doctype })),
]);

const saveCollection = async () => {
	const done = switchTo.value ? `This page now shows one ${nextCollection.value.label}` : "This page is no longer a detail page";
	await run(() => switchCollectionPage(pageCollection.value, nextCollection.value ?? null, props.page.name), done);
	emit("changed");
};

watch(
	pageCollection,
	(collection) =>
		collection &&
		run(async () => (entries.value = (await collection.getEntries()).filter((entry) => entry.published))),
	{ immediate: true },
);

const preview = (slug) => run(() => builder.page.setRouteVariables({ slug }));

// the editor keeps the preview value. An older Builder sends no routeVariables
watch(() => context.routeVariables?.slug, (slug) => (previewSlug.value = slug ?? ""), { immediate: true });
</script>
