<template>
	<section class="flex flex-col gap-3 border-t border-outline-gray-1 p-3">
		<span class="cms-section-label">Preview content</span>
		<FormControl
			v-if="entries.length"
			:model-value="context.routeVariables?.slug || ''"
			type="combobox"
			label="Entry"
			placeholder="Choose an entry…"
			:options="entries.map((entry) => ({ label: entry.published ? entry.title : `${entry.title} · Draft`, value: entry.slug }))"
			@update:model-value="preview"
		/>
		<p v-else class="cms-hint">Add an entry to preview this template with its content.</p>
		<Button label="Manage entries" icon-left="lucide-database" variant="subtle" @click="manage" />
	</section>
</template>
<script setup>
import builder from "frappe-builder-extension-sdk";
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { Button, FormControl } from "frappe-ui";
import { shallowRef, watch } from "vue";
import { useTask } from "../useTask.js";
const props = defineProps({ collection: { type: Object, required: true } });
const context = useBuilderContext(["routeVariables"]);
const entries = shallowRef([]);
const { run } = useTask();
const load = () =>
	run(async () => {
		entries.value = await props.collection.getEntries();
	});
watch(() => props.collection.doctype, load, { immediate: true });
const preview = (slug) => slug && run(() => builder.page.setRouteVariables({ slug }));
const manage = async () => {
	await builder.ui.openDialog({
		title: props.collection.label,
		size: "5xl",
		height: 600,
		props: { doctype: props.collection.doctype },
	});
	await load();
	if (context.routeVariables?.slug) await preview(context.routeVariables.slug);
};
</script>
