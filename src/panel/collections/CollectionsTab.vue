<template>
	<div class="flex min-h-0 flex-1 flex-col">
		<CollectionList
			v-if="view.name === 'collections'"
			@open="(collection) => (view = { name: 'collection', collection })"
			@create="view = { name: 'new-collection' }" />
		<NewCollection
			v-else-if="view.name === 'new-collection'"
			@created="(collection) => (view = { name: 'collection', collection })"
			@cancel="view = { name: 'collections' }" />
		<CollectionConfig v-else :collection="view.collection" @back="view = { name: 'collections' }" />
	</div>
</template>

<script setup>
import { shallowRef } from "vue";
import CollectionConfig from "./CollectionConfig.vue";
import CollectionList from "./CollectionList.vue";
import NewCollection from "./NewCollection.vue";

/** The panel configures collections. Their entries open in a large dialog, from "Show entries". */
const view = shallowRef({ name: "collections" });
</script>
