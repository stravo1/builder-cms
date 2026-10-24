<template>
	<section class="flex flex-col gap-3 p-3">
		<div>
			<span class="cms-section-label">Template page</span>
			<p class="cms-hint mt-1">One design that shows each entry at {{ collection.url }}/:slug.</p>
		</div>
		<div v-if="pending" class="cms-card flex flex-col gap-2">
			<p v-for="line in pending.lines" :key="line" class="text-p-sm text-ink-gray-7">
				{{ line }}
			</p>
			<div class="flex gap-2">
				<Button variant="solid" label="Confirm" :loading="isRunning" @click="confirm" />
				<Button label="Cancel" :disabled="isRunning" @click="pending = null" />
			</div>
		</div>
		<form v-else-if="stopRoute !== null" class="cms-card flex flex-col gap-2" @submit.prevent="stop">
			<p class="text-p-sm text-ink-gray-7">Stop using "{{ template.page_title }}" for each entry?</p>
			<FormControl v-model="stopRoute" type="text" label="New URL" />
			<div class="flex gap-2">
				<Button type="submit" theme="red" variant="solid" label="Stop using" :loading="isRunning" />
				<Button label="Cancel" :disabled="isRunning" @click="stopRoute = null" />
			</div>
		</form>
		<template v-else>
			<div v-if="template" class="flex flex-col gap-2">
				<SidebarItem
					:label="template.page_title"
					:suffix="`/${template.route}`"
					@click="emit('open', template.name)"
				>
					<template #prefix>
						<span class="lucide-file-text size-4 text-ink-gray-6" aria-hidden="true" />
					</template>
				</SidebarItem>
				<p v-if="isBroken" role="alert" class="cms-error">
					This page lost its /:slug URL or its entry content. Use it again to repair it.
				</p>
			</div>
			<p v-else class="cms-hint">No template page yet.</p>
			<div v-if="access.can_manage" class="flex flex-col gap-2">
				<Button v-if="!template" variant="solid" label="Create template page" @click="ask(null)" />
				<Button v-if="canUseCurrent" label="Use current page" @click="ask(context.page)" />
				<Button v-if="isBroken" label="Use again" @click="ask(template)" />
				<FormControl
					type="combobox"
					:options="pageOptions"
					placeholder="Choose a page…"
					@update:model-value="(name) => ask(pages.find((page) => page.name === name))"
				/>
				<Button v-if="template" variant="ghost" theme="red" label="Stop using" @click="startStop" />
			</div>
		</template>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</section>
</template>

<script setup>
import { Button, FormControl, SidebarItem } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import {
	clearCollectionPage,
	createCollectionPage,
	getCollectionPageChange,
	isCollectionPageOf,
	useCollectionPage,
} from "../../cms/pageActions.js";
import { getDefaultRoute } from "../../cms/routes.js";
import { getDocument, getDocuments } from "../../data/documents.js";
import { PageData } from "../../data/pageData.js";
import { useEditorContext } from "../../editor/context.js";
import { useAccess } from "../useAccess.js";
import { useTask } from "../useTask.js";

const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["open"]);
const context = useEditorContext();
const access = useAccess();
const { isRunning, error, run } = useTask();
const template = shallowRef(null);
const isBroken = ref(false);
const pages = shallowRef([]);
// what the user confirms: the lines it shows, and the action
const pending = shallowRef(null);
const stopRoute = ref(null);

const canUseCurrent = computed(() => context.page && context.page.name !== template.value?.name);
const pageOptions = computed(() =>
	pages.value
		.filter((page) => page.name !== template.value?.name)
		.map((page) => ({ label: `${page.page_title} · /${page.route}`, value: page.name })),
);

const load = () =>
	run(async () => {
		const name = props.collection.collectionPage;
		pages.value = await getDocuments("Builder Page", {
			fields: ["name", "page_title", "route"],
			orderBy: "modified desc",
			pageLength: 500,
		});
		if (!name) return void (template.value = null);
		const [page, sources] = await Promise.all([getDocument("Builder Page", name), new PageData(name).load()]);
		template.value = page;
		isBroken.value = !isCollectionPageOf(props.collection, page, sources);
	});
watch(() => props.collection.collectionPage, load, { immediate: true });

/** `page` is null for a new page. */
const ask = (page) =>
	run(async () => {
		if (page === undefined) return;
		const change = await getCollectionPageChange(props.collection, page?.name);
		const lines = [
			`${page ? `"${page.page_title}"` : "A new page"} moves to /${change.route}.`,
			...change.moves.map((move) => `"${move.title}" moves to /${move.route}.`),
			...(change.replaces ? [`"${template.value.page_title}" stops being the template.`] : []),
		];
		const action = page
			? () => useCollectionPage(props.collection, page.name)
			: () => createCollectionPage(props.collection);
		pending.value = { lines, action };
	});
const confirm = async () => {
	const done = await run(async () => (await pending.value.action(), true), "Template page set");
	pending.value = null;
	if (done) await load();
};

const startStop = () => (stopRoute.value = `/${getDefaultRoute(template.value.name)}`);
const stop = async () => {
	const done = await run(
		async () => (await clearCollectionPage(props.collection, stopRoute.value), true),
		"Template page stopped",
	);
	if (!done) return;
	stopRoute.value = null;
	await load();
};
</script>
