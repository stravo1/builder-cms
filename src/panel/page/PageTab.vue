<template>
	<p v-if="!context.page" class="p-3 text-p-sm text-ink-gray-5">Open a page to add content to it.</p>
	<div v-else :key="context.page.name" class="flex flex-col">
		<PageRoleChooser v-if="!role" :collections="collections" @changed="reload" />
		<DetailPageCard
			v-else-if="role.kind === 'detail'"
			:collections="collections"
			:page="context.page"
			:sources="sources"
			@changed="reload" />
		<IndexPageCard v-else :collection="role.collection" :collections="collections" @changed="reload" />
	</div>
</template>

<script setup>
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { computed, shallowRef, watch } from "vue";
import { Collection } from "../../cms/collection.js";
import { getPageRole } from "../../cms/pageActions.js";
import { PageData } from "../../data/pageData.js";
import { useTask } from "../useTask.js";
import DetailPageCard from "./DetailPageCard.vue";
import IndexPageCard from "./IndexPageCard.vue";
import PageRoleChooser from "./PageRoleChooser.vue";

const context = useBuilderContext(["page"]);
const collections = shallowRef([]);
const sources = shallowRef([]);
const { run } = useTask();

/** Index or detail page of a collection, or none. The page itself proves it. */
const role = computed(() => (context.page ? getPageRole(collections.value, context.page, sources.value) : null));

const reload = () =>
	run(async () => {
		if (!context.page) return;
		[collections.value, sources.value] = await Promise.all([
			Collection.all(),
			new PageData(context.page.name).load(),
		]);
	});

// a route edited in Builder can end or start a detail page, so the route reloads this view too
watch(() => [context.page?.name, context.page?.route], reload, { immediate: true });
</script>
