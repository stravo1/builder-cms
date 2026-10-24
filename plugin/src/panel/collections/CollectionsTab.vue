<template>
	<div class="flex min-h-0 flex-1 flex-col">
		<CollectionList
			v-if="view.name === 'collections'"
			@open="(collection) => (view = { name: 'collection', collection })"
			@create="view = { name: 'new-collection' }"
		/>
		<NewCollection
			v-else-if="view.name === 'new-collection'"
			@created="(collection) => (view = { name: 'collection', collection })"
			@cancel="view = { name: 'collections' }"
		/>
		<CollectionWorkspace
			v-else
			:key="`${view.collection.doctype}:${view.tab}`"
			:collection="view.collection"
			:start-tab="view.tab"
			@back="view = { name: 'collections' }"
			@use-page="emit('usePage')"
		/>
	</div>
</template>

<script setup>
import { ref, watch } from "vue";
import CollectionWorkspace from "./CollectionWorkspace.vue";
import CollectionList from "./CollectionList.vue";
import NewCollection from "./NewCollection.vue";

/** The panel owns collection navigation. `startAt` opens one collection on its Pages tab. */
const props = defineProps({ startAt: { type: Object, default: null } });
const emit = defineEmits(["usePage"]);
const view = ref({ name: "collections" });
watch(
	() => props.startAt,
	(collection) => collection && (view.value = { name: "collection", collection, tab: "pages" }),
	{ immediate: true },
);
</script>
