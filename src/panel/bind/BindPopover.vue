<template>
	<div class="flex h-full flex-col gap-3 overflow-hidden bg-surface p-3 text-ink-gray-8">
		<p v-if="context.selection.count !== 1" class="text-p-sm text-ink-gray-5">Select one block to bind it.</p>
		<p v-else-if="!sources.length" class="text-p-sm text-ink-gray-5">
			This page lists no collection yet. Open a collection in the CMS tab, and choose Insert list.
		</p>
		<template v-else>
			<FormControl v-model="sourceName" type="combobox" label="Collection" :options="sourceOptions" />
			<div v-if="!fits" class="flex flex-col gap-2">
				<p class="text-p-sm text-ink-gray-5">
					This block is outside the {{ sourceTitle(source) }} list. Select a block inside the list to bind a field of each row.
				</p>
				<Button variant="subtle" label="Insert list" @click="run(() => insertBlocks(source, fields), 'List inserted')" />
			</div>
			<template v-else>
				<FormControl v-if="fields.length > 8" v-model="query" placeholder="Search fields" />
				<div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
					<button
						v-for="field in shownFields"
						:key="field.fieldname"
						class="flex flex-col rounded px-2 py-1.5 text-left hover:bg-surface-gray-2"
						:class="{ 'bg-surface-gray-3': keyOf(field) === boundKey }"
						@click="bind(field)">
						<span class="text-sm text-ink-gray-8">{{ field.label || field.fieldname }}</span>
						<span class="truncate text-p-sm text-ink-gray-5">{{ preview(row?.[field.fieldname]) }}</span>
					</button>
					<p v-if="!shownFields.length" class="p-2 text-p-sm text-ink-gray-5">No field fits this block.</p>
				</div>
				<Button v-if="boundKey" variant="ghost" label="Remove binding" @click="bind(null)" />
			</template>
		</template>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { Button, FormControl } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { bindBlock, fitsBlock, getBoundKey, getSourcesForBlock, insertBlocks } from "../../blocks/blockActions.js";
import { Collection } from "../../cms/collection.js";
import { ENTRY_SOURCE } from "../../cms/pageActions.js";
import { getDoctypeFields } from "../../data/doctypes.js";
import { PageData } from "../../data/pageData.js";
import { useTask } from "../useTask.js";

const context = useBuilderContext(["selection", "page"]);
const sources = shallowRef([]);
const collections = shallowRef([]);
/** The sources this block can bind to, with the key prefix of each: "" for a row, "entry." for a page source. */
const fitting = shallowRef([]);
const sourceName = ref("");
const fields = shallowRef([]);
const row = shallowRef(null);
const boundKey = ref("");
const query = ref("");
const { run } = useTask();

const source = computed(() => sources.value.find((each) => each.name === sourceName.value) ?? null);
const prefix = computed(() => fitting.value.find((each) => each.source.name === sourceName.value)?.prefix);
const fits = computed(() => prefix.value !== undefined);
/** A source shows as its collection. A page with two lists of one collection numbers them. */
const sourceTitle = (each) => {
	const collection = collections.value.find((candidate) => candidate.doctype === each?.doctype);
	const title = collection?.title ?? each?.doctype ?? "";
	const sameCollection = sources.value.filter((other) => other.doctype === each?.doctype);
	if (each?.name === ENTRY_SOURCE) return `${title} · this page's entry`;
	return sameCollection.length > 1 ? `${title} · ${each.name}` : title;
};
const sourceOptions = computed(() => sources.value.map((each) => ({ label: sourceTitle(each), value: each.name })));
const keyOf = (field) => `${prefix.value ?? ""}${field.fieldname}`;
const shownFields = computed(() => {
	const fittingFields = fields.value.filter((field) => fitsBlock(field, context.selection));
	const search = query.value.trim().toLowerCase();
	return search ? fittingFields.filter((field) => (field.label || field.fieldname).toLowerCase().includes(search)) : fittingFields;
});

/** Rich text shows as plain text. DOMParser runs no scripts and loads no images. */
const preview = (value) => {
	if (value === null || value === undefined || value === "") return "Empty";
	return new DOMParser().parseFromString(String(value), "text/html").body.textContent;
};

const loadSources = () =>
	run(async () => {
		[sources.value, collections.value] = context.page
			? await Promise.all([new PageData(context.page.name).load(), Collection.all()])
			: [[], []];
	});

/** A new selection starts on the source it fits best: its list, then a page source. */
const loadBlock = () =>
	run(async () => {
		const selection = context.selection;
		if (selection.count !== 1 || !sources.value.length) return;
		fitting.value = await getSourcesForBlock(sources.value, selection.blockId);
		boundKey.value = await getBoundKey(selection);
		const bound = fitting.value.find(({ prefix }) => boundKey.value && boundKey.value.startsWith(prefix) && prefix !== "");
		sourceName.value = (bound ?? fitting.value[0])?.source.name ?? sources.value[0].name;
	});

const loadSource = () =>
	run(async () => {
		query.value = "";
		if (!source.value) return void (fields.value = []);
		const all = await getDoctypeFields(source.value.doctype);
		fields.value = all.filter((field) => source.value.fields.includes(field.fieldname));
		[row.value] = await builder.data.getList(source.value.doctype, source.value.getPreviewOptions());
	});

const bind = (field) =>
	run(async () => {
		const key = field ? keyOf(field) : "";
		await bindBlock(context.selection.blockId, key, Boolean(context.selection.isImage));
		boundKey.value = key;
	}, field ? `Bound to ${field.label || field.fieldname}` : "Binding removed");

watch(() => context.page?.name, async () => (await loadSources(), loadBlock()), { immediate: true });
watch(() => context.selection.blockId, loadBlock);
watch(sourceName, loadSource);
</script>
