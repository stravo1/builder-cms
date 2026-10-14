<template>
	<PanelHeader :title="collection.label" back @back="emit('back')" />
	<div class="border-b border-outline-gray-1 px-3 pb-3 pt-2">
		<p class="mb-2 truncate text-p-sm text-ink-gray-5">
			{{ collection.isOwned ? "CMS collection" : collection.doctype + " · Connected DocType" }}
		</p>
		<TabButtons v-model="tab" :options="tabs" />
	</div>
	<CollectionEntries v-if="tab === 'entries'" :collection="collection" is-panel />
	<div v-else-if="tab === 'pages'" class="flex flex-col gap-3 p-3">
		<div class="cms-card">
			<span class="cms-section-label">Index page</span>
			<p class="mt-1 truncate text-sm text-ink-gray-7">{{ collection.url }}</p>
			<p class="cms-hint mt-1">A list of entries from this collection.</p>
			<Button
				v-if="collection.indexPage"
				label="Open index page"
				variant="subtle"
				class="mt-3"
				@click="open(collection.indexPage)"
			/>
			<p v-else class="cms-hint mt-3">No index page connected yet.</p>
		</div>
		<div class="cms-card">
			<span class="cms-section-label">Detail page</span>
			<p class="mt-1 truncate text-sm text-ink-gray-7">{{ collection.url }}/:slug</p>
			<p class="cms-hint mt-1">One design, a page for every entry.</p>
			<Button
				v-if="collection.collectionPage"
				label="Open detail page"
				variant="subtle"
				class="mt-3"
				@click="open(collection.collectionPage)"
			/>
			<p v-else class="cms-hint mt-3">No detail page connected yet.</p>
		</div>
		<Button label="Set up the current page" icon-left="lucide-file-plus" variant="solid" @click="emit('usePage')" />
	</div>
	<div v-else class="overflow-y-auto"><CollectionConfig :collection="collection" @deleted="emit('back')" /></div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button, TabButtons } from "frappe-ui";
import { ref } from "vue";
import PanelHeader from "../PanelHeader.vue";
import CollectionEntries from "../table/CollectionEntries.vue";
import CollectionConfig from "./CollectionConfig.vue";
import { useTask } from "../useTask.js";

defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["back", "usePage"]);
const tab = ref("entries");
const tabs = [
	{ label: "Entries", value: "entries" },
	{ label: "Pages", value: "pages" },
	{ label: "Settings", value: "settings" },
];
const { run } = useTask();
const open = (name) =>
	run(async () => {
		await builder.page.open(name);
		emit("usePage");
	});
</script>
