<template>
	<div v-if="!context.page" class="cms-empty"><p>Open a page to connect a collection.</p></div>
	<div v-else :key="context.page.name" class="flex flex-col">
		<p v-if="context.readOnly" class="cms-hint p-3">This page is read-only.</p>
		<p v-if="error" role="alert" class="cms-error p-3">{{ error }}</p>
		<SectionLoader v-if="isRunning && !isLoaded" label="Loading page connection" />
		<fieldset v-else :disabled="context.readOnly" class="min-w-0">
			<PageRoleChooser
				:collections="collections"
				:role="role"
				:page-name="context.page.name"
				@changed="reload"
				@collections="emit('collections')"
			/>
			<DetailPagePreview v-if="role?.kind === 'detail'" :collection="role.collection" />
			<AddToPage v-if="role?.kind === 'index'" :collection="role.collection" @changed="reload" />
		</fieldset>
		<section class="border-t border-outline-gray-1">
			<div class="px-3 pt-4">
				<span class="cms-section-label">Connect a field</span>
				<p class="cms-hint mt-2">Select a block on the canvas, then choose its content.</p>
			</div>
			<BindFields :revision="revision" />
		</section>
	</div>
</template>

<script setup>
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { computed, ref, shallowRef, watch } from "vue";
import { Collection } from "../../cms/collection.js";
import { getPageRole } from "../../cms/pageActions.js";
import { PageData } from "../../data/pageData.js";
import { useTask } from "../useTask.js";
import BindFields from "../bind/BindFields.vue";
import AddToPage from "../collections/AddToPage.vue";
import DetailPagePreview from "./DetailPagePreview.vue";
import PageRoleChooser from "./PageRoleChooser.vue";
import SectionLoader from "../SectionLoader.vue";

const emit = defineEmits(["collections"]);
const context = useBuilderContext(["page", "readOnly"]);
const collections = shallowRef([]);
const sources = shallowRef([]);
const revision = ref(0);
const isLoaded = ref(false);
const { run, error, isRunning } = useTask();
const role = computed(() => (context.page ? getPageRole(collections.value, context.page, sources.value) : null));
let loadVersion = 0;
const reload = () =>
	run(async () => {
		const version = ++loadVersion;
		const name = context.page?.name;
		if (!name) return;
		const loaded = await Promise.all([Collection.all(), new PageData(name).load()]);
		if (version !== loadVersion) return;
		[collections.value, sources.value] = loaded;
		isLoaded.value = true;
		revision.value++;
	});
watch(() => [context.page?.name, context.page?.route], reload, { immediate: true });
</script>
