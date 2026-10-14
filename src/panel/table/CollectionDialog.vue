<template>
	<div class="flex h-full flex-col bg-surface-base text-ink-gray-8">
		<CollectionEntries v-if="collection" :collection="collection" />
		<p v-else class="p-3 text-p-sm text-ink-gray-5">Loading…</p>
	</div>
</template>

<script setup>
import { onMounted, shallowRef } from "vue";
import { Collection } from "../../cms/collection.js";
import CollectionEntries from "./CollectionEntries.vue";

/** The dialog gets only the doctype in its props. It finds the collection, settings included. */
const props = defineProps({ doctype: { type: String, required: true } });
const collection = shallowRef(null);

onMounted(async () => {
	collection.value = (await Collection.all()).find((each) => each.doctype === props.doctype) ?? null;
});
</script>
