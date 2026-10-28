<template>
	<div data-cms-panel class="flex h-full min-h-0 bg-surface-base text-ink-gray-8">
		<aside
			v-show="!isEditingEntry"
			class="relative flex shrink-0 flex-col overflow-y-auto border-r border-outline-gray-1"
			:style="{ width: `${paneWidths.collections}px` }"
		>
			<PanelResizer
				side="right"
				:dimension="paneWidths.collections"
				:min-dimension="200"
				:max-dimension="480"
				@resize="(width) => (paneWidths.collections = width)"
			/>
			<!-- keyed, so it reads the collections again after one is created or deleted -->
			<CollectionList
				:key="listRevision"
				:selected="view.collection?.doctype"
				@open="open"
				@create="show('new-collection')"
			/>
		</aside>
		<main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
			<NewCollection
				v-if="view.name === 'new-collection'"
				@created="created"
				@cancel="show('collections')"
			/>
			<CollectionWorkspace
				v-else-if="view.name === 'collection'"
				:key="view.collection.doctype"
				:collection="view.collection"
				@deleted="deleted"
			/>
			<div v-else class="cms-empty"><p>Choose a collection.</p></div>
		</main>
	</div>
</template>

<script setup>
import PanelResizer from "builder/internal/components/PanelResizer.vue";
import { ref } from "vue";
import CollectionList from "./collections/CollectionList.vue";
import CollectionWorkspace from "./collections/CollectionWorkspace.vue";
import NewCollection from "./collections/NewCollection.vue";
import { isEditingEntry, panelView as view } from "./navigation.js";
import { paneWidths } from "./paneWidths.js";

const listRevision = ref(0);
const show = (name) => (view.value = { name });
const open = (collection) => (view.value = { name: "collection", collection });
const created = (collection) => {
	open(collection);
	listRevision.value++;
};
const deleted = () => {
	view.value = { name: "collections" };
	listRevision.value++;
};
</script>
