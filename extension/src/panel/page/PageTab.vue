<template>
	<div v-if="!context.page" class="cms-empty"><p>Open a page to connect a collection.</p></div>
	<div v-else :key="context.page.name" class="flex flex-col">
		<p v-if="context.readOnly" class="cms-hint p-3">This page is read-only.</p>
		<p v-if="error" role="alert" class="cms-error p-3">{{ error }}</p>
		<SectionLoader v-if="isRunning" label="Loading page connection" />
		<template v-else>
			<fieldset :disabled="context.readOnly" class="min-w-0">
				<PageRoleChooser
					v-if="access.can_manage"
					:collections="collections"
					:role="role"
					:page-name="context.page.name"
					@changed="changed"
					@collections="emit('collections')"
				/>
				<DetailPagePreview v-if="role?.kind === 'detail'" :collection="role.collection" />
				<AddToPage
					v-if="role"
					:key="`${role.kind}:${role.collection.doctype}`"
					:kind="role.kind"
					:collection="role.collection"
					@changed="changed"
				/>
			</fieldset>
			<section class="border-t border-outline-gray-1">
				<div class="px-3 pt-4">
					<span class="cms-section-label">Connect a field</span>
					<p class="cms-hint mt-2">Select a block on the canvas, then choose its content.</p>
				</div>
				<BindFields :revision="revision" />
			</section>
		</template>
	</div>
</template>

<script setup>
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { computed, ref, shallowRef, watch } from "vue";
import { Collection } from "../../cms/collection.js";
import { getPageRole } from "../../cms/pageActions.js";
import { PageData } from "../../data/pageData.js";
import { useAccess } from "../useAccess.js";
import { useTask } from "../useTask.js";
import BindFields from "../bind/BindFields.vue";
import AddToPage from "../collections/AddToPage.vue";
import DetailPagePreview from "./DetailPagePreview.vue";
import PageRoleChooser from "./PageRoleChooser.vue";
import SectionLoader from "../SectionLoader.vue";

const emit = defineEmits(["collections"]);
// a page connection writes the collection settings, which the CMS-wide roles own
const access = useAccess();
const context = useBuilderContext(["page", "readOnly"]);
const collections = shallowRef([]);
const sources = shallowRef([]);
const revision = ref(0);
const { runCached, error, isRunning } = useTask();
const role = computed(() => (context.page ? getPageRole(collections.value, context.page, sources.value) : null));
const reload = () => {
	const name = context.page?.name;
	if (!name) return;
	return runCached(
		`page:${name}`,
		() => Promise.all([Collection.all(), new PageData(name).load()]),
		(loaded) => {
			// a read of the previous page can finish after the user opens another page
			if (name === context.page?.name) [collections.value, sources.value] = loaded;
		},
	);
};
// BindFields loads on its own when the page changes. It only needs a nudge after a change made here.
const changed = async () => {
	await reload();
	revision.value++;
};
watch(() => [context.page?.name, context.page?.route], reload, { immediate: true });
</script>
