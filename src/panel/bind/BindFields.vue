<template>
	<div class="flex min-h-0 flex-col gap-3 p-3">
		<p v-if="context.selection.count !== 1" class="cms-hint">Select one text, image, link, or container block.</p>
		<p v-else-if="context.readOnly" class="cms-hint">This page is read-only.</p>
		<SectionLoader v-else-if="isRunning && !source" label="Loading fields" />
		<p v-else-if="!fitting.length" class="cms-hint">
			{{
				sources.length
					? "Select a block inside a collection list to connect the fields of each item."
					: "Connect this page to a collection first."
			}}
		</p>
		<template v-else>
			<FormControl v-model="target" type="select" label="Block property" :options="targets" />
			<FormControl
				v-if="fitting.length > 1"
				v-model="sourceName"
				type="combobox"
				label="Content from"
				:options="sourceOptions"
			/>
			<div v-else class="rounded bg-surface-gray-2 px-2 py-1.5 text-sm text-ink-gray-7">
				{{ sourceOptions[0]?.label }}
			</div>
			<FormControl v-model="query" placeholder="Search fields…" aria-label="Search fields" />
			<div class="flex min-h-0 flex-col gap-1 overflow-y-auto">
				<ItemListRow
					v-for="field in shownFields.slice(0, visibleCount)"
					:key="field.fieldname"
					as="button"
					class="cms-list-row"
					:selected="keyOf(field) === boundKey"
					:disabled="isRunning"
					:aria-pressed="keyOf(field) === boundKey"
					@click="bind(field)"
				>
					<template #prefix>
						<span :class="fieldIcon(field)" class="size-4 text-ink-gray-5" aria-hidden="true" />
					</template>
					<span class="block truncate text-sm text-ink-gray-8">{{ field.label || field.fieldname }}</span>
					<span class="block truncate text-xs text-ink-gray-5">{{ preview(row?.[field.fieldname]) }}</span>
					<template #suffix>
						<span v-if="keyOf(field) === boundKey" class="lucide-check size-4 text-ink-gray-7" />
					</template>
				</ItemListRow>
				<p v-if="!shownFields.length" class="cms-hint p-2">No matching fields for this property.</p>
			</div>
			<Button
				v-if="shownFields.length > visibleCount"
				variant="ghost"
				label="Load more fields"
				@click="visibleCount += 10"
			/>
			<Button v-if="boundKey" variant="ghost" label="Disconnect field" :disabled="isRunning" @click="bind(null)" />
		</template>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { Button, FormControl, ItemListRow } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import {
	bindBlock,
	fitsBlock,
	getBindingTargets,
	getBoundKey,
	getSourcesForBlock,
} from "../../blocks/blockActions.js";
import { Collection } from "../../cms/collection.js";
import { getDoctypeFields } from "../../data/doctypes.js";
import { PageData } from "../../data/pageData.js";
import { useTask } from "../useTask.js";
import SectionLoader from "../SectionLoader.vue";

const props = defineProps({ revision: { type: Number, default: 0 } });
const context = useBuilderContext(["selection", "page", "routeVariables", "readOnly"]);
const sources = shallowRef([]);
const collections = shallowRef([]);
const fitting = shallowRef([]);
const sourceName = ref("");
const fields = shallowRef([]);
const row = shallowRef(null);
const boundKey = ref("");
const query = ref("");
const visibleCount = ref(10);
watch(query, () => {
	visibleCount.value = 10;
});
const target = ref("text");
const { run, isRunning, error } = useTask();
let loadVersion = 0;
let fieldVersion = 0;
const source = computed(() => fitting.value.find((each) => each.source.name === sourceName.value)?.source);
const prefix = computed(() => fitting.value.find((each) => each.source.name === sourceName.value)?.prefix || "");
const targets = computed(() => getBindingTargets(context.selection));
const sourceOptions = computed(() =>
	fitting.value.map(({ source }) => ({
		value: source.name,
		label: `${collections.value.find((each) => each.doctype === source.doctype)?.label || source.doctype} · ${source.isList ? "current item" : "page entry"}`,
	})),
);
const keyOf = (field) => `${prefix.value}${field.fieldname}`;
const shownFields = computed(() =>
	fields.value.filter(
		(field) =>
			fitsBlock(field, context.selection, target.value) &&
			(field.label || field.fieldname).toLowerCase().includes(query.value.toLowerCase()),
	),
);
const FIELD_ICONS = { "Attach Image": "lucide-image", Check: "lucide-square-check", "Text Editor": "lucide-text" };
const fieldIcon = (field) => FIELD_ICONS[field.fieldtype] || "lucide-type";
const preview = (value) => {
	if (value === null || value === undefined || value === "") return "Empty";
	return new DOMParser().parseFromString(String(value), "text/html").body.textContent;
};
const loadBlock = () =>
	run(async () => {
		const version = ++loadVersion;
		const selection = { ...context.selection };
		fitting.value = [];
		if (!context.page || selection.count !== 1) return;
		const [loadedSources, loadedCollections] = await Promise.all([
			new PageData(context.page.name).load(),
			Collection.all(),
		]);
		const currentTarget = targets.value.some((each) => each.value === target.value)
			? target.value
			: targets.value[0].value;
		const [available, key] = await Promise.all([
			getSourcesForBlock(loadedSources, selection.blockId),
			getBoundKey(selection, currentTarget),
		]);
		if (version !== loadVersion) return;
		sources.value = loadedSources;
		collections.value = loadedCollections;
		fitting.value = available;
		target.value = currentTarget;
		boundKey.value = key;
		const bound = available.find(({ prefix }) => prefix && boundKey.value.startsWith(prefix));
		sourceName.value = (bound || available[0])?.source.name || "";
		await loadFields();
	});
const loadFields = () =>
	run(async () => {
		const version = ++fieldVersion;
		const current = source.value;
		fields.value = [];
		row.value = null;
		visibleCount.value = 10;
		if (!current) return;
		const all = await getDoctypeFields(current.doctype);
		const options = current.getPreviewOptions();
		if (!current.isList && context.routeVariables?.slug) {
			const routeFilter = current.filters.find(
				([, , value]) => typeof value === "string" && value.includes("route.slug"),
			);
			if (routeFilter) options.filters[routeFilter[0]] = context.routeVariables.slug;
		}
		const [sample] = await builder.data.getList(current.doctype, options);
		if (version !== fieldVersion) return;
		fields.value = [{ fieldname: "name", label: "Name", fieldtype: "Data" }, ...all].filter((field) =>
			current.readFields.includes(field.fieldname),
		);
		if (current.link) fields.value.push({ fieldname: "url", label: "Detail page URL", fieldtype: "Data" });
		const collection = collections.value.find((each) => each.doctype === current.doctype);
		row.value = sample && {
			...sample,
			...(current.link && collection?.collectionPage && { url: `${collection.url}/${sample[current.link.field]}` }),
		};
	});
const bind = (field) =>
	run(async () => {
		const key = field ? keyOf(field) : "";
		await bindBlock(context.selection.blockId, key, target.value);
		boundKey.value = key;
	});
watch(() => [context.page?.name, context.page?.route, context.selection.blockId, props.revision], loadBlock, {
	immediate: true,
});
watch(
	() => context.selection.blockId,
	() => {
		query.value = "";
		target.value = targets.value[0]?.value || "visibility";
	},
);
watch(sourceName, loadFields);
watch(() => context.routeVariables?.slug, loadFields);
watch(target, () =>
	run(async () => {
		if (context.selection.count !== 1) return;
		const selection = { ...context.selection };
		const property = target.value;
		const key = await getBoundKey(selection, property);
		if (selection.blockId === context.selection.blockId && property === target.value) boundKey.value = key;
	}),
);
</script>
