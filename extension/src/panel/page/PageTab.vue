<template>
	<div v-if="!context.page" class="cms-empty"><p>Open a page to connect a collection.</p></div>
	<div v-else :key="context.page.name" class="flex flex-col">
		<p v-if="context.readOnly" class="cms-hint p-3">This page is read-only.</p>
		<p v-if="error" role="alert" class="cms-error p-3">{{ error }}</p>
		<SectionLoader v-if="isRunning" label="Loading page connection" />
		<template v-else>
			<fieldset :disabled="context.readOnly" class="min-w-0">
				<TemplateHeader
					v-if="role"
					:collection="role.collection"
					:route="context.page.route"
					:is-broken="role.isBroken"
					@change="emit('collections', role.collection)" />
				<section v-if="context.selection.count === 1" class="border-t border-outline-gray-1">
					<div class="truncate px-3 pt-3">
						<span class="cms-section-label">Selected: {{ context.selection.label }}</span>
					</div>
					<BindFields :revision="revision" />
					<RepeatContainer
						v-if="isPlainContainer && collections.length"
						:collections="collections"
						@changed="changed" />
				</section>
				<PageLists
					:collections="collections"
					:sources="sources"
					:template="role && !role.isBroken ? role.collection : null"
					:revision="revision"
					@changed="changed"
					@collections="emit('collections')" />
			</fieldset>
		</template>
	</div>
</template>

<script setup>
import { useEditorContext } from "../../editor/context.js";

import { computed, ref, shallowRef, watch } from "vue";
import { Collection } from "../../cms/collection.js";
import { getPageRole } from "../../cms/pageActions.js";
import { PageData } from "../../data/pageData.js";
import { useTask } from "../useTask.js";
import BindFields from "../bind/BindFields.vue";
import RepeatContainer from "../bind/RepeatContainer.vue";
import PageLists from "./PageLists.vue";
import TemplateHeader from "./TemplateHeader.vue";
import SectionLoader from "../SectionLoader.vue";

const emit = defineEmits(["collections"]);
const context = useEditorContext();
const collections = shallowRef([]);
const sources = shallowRef([]);
const revision = ref(0);
const { runCached, error, isRunning } = useTask();
// a container that is not a list yet can become one
const isPlainContainer = computed(
	() => context.selection.isContainer && !context.selection.isRoot && !context.selection.isRepeater,
);
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
