<template>
	<section class="flex flex-col gap-3 border-t border-outline-gray-1 pt-4 first:border-t-0 first:pt-0">
		<div class="flex items-start justify-between gap-2">
			<div>
				<span class="cms-section-label">Collection page</span>
				<p class="cms-hint mt-1">One design that shows each entry.</p>
			</div>
			<Button
				v-if="!page && access.can_manage"
				variant="subtle"
				label="Configure"
				:loading="isRunning"
				@click="isConfiguring = true" />
		</div>
		<template v-if="page">
			<div class="flex h-7 items-center gap-2 px-2">
				<span class="lucide-file-text size-4 shrink-0 text-ink-gray-6" aria-hidden="true" />
				<span class="min-w-0 flex-1 truncate text-sm text-ink-gray-8">{{ page.page_title }}</span>
				<span class="max-w-40 shrink-0 truncate text-sm text-ink-gray-5">/{{ page.route }}</span>
				<Button
					v-if="!isOpen"
					variant="ghost"
					size="sm"
					icon="lucide-arrow-up-right"
					tooltip="Open page"
					aria-label="Open page"
					@click="emit('open', page.name)" />
			</div>
			<p v-if="isBroken" role="alert" class="cms-error">
				This page lost its /:slug URL or its entry content. Disconnect it and set up the collection page again.
			</p>
			<p v-if="notice" class="cms-hint">{{ notice }}</p>
			<Combobox
				v-if="isOpen && !isBroken && entries.length"
				:model-value="context.routeVariables?.slug || ''"
				label="Preview"
				placeholder="Choose an entry…"
				:options="entryOptions"
				@update:model-value="preview" />
			<AddToPageDialog v-model:open="isInserting" kind="detail" :collection="collection" />
			<div v-if="isOpen && access.can_manage" class="flex flex-wrap gap-2">
				<Button v-if="!isBroken" variant="subtle" label="Insert fields" @click="isInserting = true" />
				<Button
					variant="subtle"
					:theme="armed ? 'red' : 'gray'"
					:label="armed ? 'Click again to confirm' : 'Disconnect page'"
					:loading="isRunning"
					@click="disconnect" />
			</div>
		</template>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
		<CollectionPageDialog v-model:open="isConfiguring" :collection="collection" @done="configured" />
	</section>
</template>

<script setup>
import { Button, Combobox } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { disconnectCollectionPage, isCollectionPageOf } from "../../cms/pageActions.js";
import { getDocument } from "../../data/documents.js";
import { PageData } from "../../data/pageData.js";
import { useEditorContext } from "../../editor/context.js";
import { setRouteVariables } from "../../editor/page.js";
import { useAccess } from "../useAccess.js";
import { useArmedClick } from "../useArmedClick.js";
import { useTask } from "../useTask.js";
import AddToPageDialog from "./AddToPageDialog.vue";
import CollectionPageDialog from "./CollectionPageDialog.vue";

const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["open"]);
const access = useAccess();
const context = useEditorContext();
const { isRunning, error, run } = useTask();
const page = shallowRef(null);
const isBroken = ref(false);
const isConfiguring = ref(false);
const notice = ref("");
const isInserting = ref(false);
const entries = shallowRef([]);

const isOpen = computed(() => context.page?.name === page.value?.name);
const entryOptions = computed(() =>
	entries.value.map((entry) => ({
		label: entry.published ? entry.title : `${entry.title} · Draft`,
		value: entry.slug,
	})),
);

const load = () =>
	run(async () => {
		const name = props.collection.collectionPage;
		if (!name) return void (page.value = null);
		const [loaded, sources] = await Promise.all([getDocument("Builder Page", name), new PageData(name).load()]);
		page.value = loaded;
		isBroken.value = !isCollectionPageOf(props.collection, loaded, sources);
		entries.value = await props.collection.getEntries();
	});
watch(() => props.collection.collectionPage, load, { immediate: true });

// Preview, Insert fields and Disconnect act on the collection page, so they show only while it is open
const preview = (slug) => slug && run(() => setRouteVariables({ slug }));

const configured = ({ bound, isGuess }) => {
	notice.value = isGuess && !bound ? "No blocks matched a field. Bind them with Bind to data." : "";
	return load();
};

// a second click confirms, as for Delete collection
const { armed, confirm } = useArmedClick();
const disconnect = () => confirm() && run(() => disconnectCollectionPage(props.collection), "Page disconnected");
</script>
