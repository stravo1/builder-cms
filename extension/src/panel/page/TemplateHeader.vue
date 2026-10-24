<template>
	<section class="flex flex-col gap-2 p-3">
		<div class="flex items-center justify-between gap-2">
			<span class="cms-section-label">Template for each {{ collection.label }}</span>
			<Button label="Change" variant="ghost" size="sm" @click="emit('change')" />
		</div>
		<p class="cms-hint">/{{ route }}</p>
		<p v-if="isBroken" role="alert" class="cms-error">
			This page lost its /:slug URL or its entry content. Repair it with Change.
		</p>
		<FormControl
			v-else-if="entries.length"
			:model-value="context.routeVariables?.slug || ''"
			type="combobox"
			label="Preview"
			placeholder="Choose an entry…"
			:options="
				entries.map((entry) => ({
					label: entry.published ? entry.title : `${entry.title} · Draft`,
					value: entry.slug,
				}))
			"
			@update:model-value="preview" />
		<p v-else class="cms-hint">Add an entry to preview this template with its content.</p>
	</section>
</template>
<script setup>
import { useEditorContext } from "../../editor/context.js";
import { setRouteVariables } from "../../editor/page.js";

import { Button, FormControl } from "frappe-ui";
import { shallowRef, watch } from "vue";
import { useTask } from "../useTask.js";
const props = defineProps({
	collection: { type: Object, required: true },
	route: { type: String, required: true },
	isBroken: { type: Boolean, default: false },
});
const emit = defineEmits(["change"]);
const context = useEditorContext();
const entries = shallowRef([]);
const { run, runCached } = useTask();
watch(
	() => props.collection.doctype,
	() =>
		runCached(
			`entries:${props.collection.doctype}`,
			() => props.collection.getEntries(),
			(list) => (entries.value = list),
		),
	{ immediate: true },
);
const preview = (slug) => slug && run(() => setRouteVariables({ slug }));
</script>
