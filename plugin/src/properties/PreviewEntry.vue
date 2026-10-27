<template>
	<PropertyRow v-if="entries.length" label="Preview">
		<Select
			class="w-full"
			size="sm"
			placeholder="Choose an entry"
			:model-value="context.routeVariables?.slug || ''"
			:options="entryOptions"
			@update:model-value="preview"
		/>
	</PropertyRow>
	<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
</template>

<script setup>
import { Select } from "frappe-ui";
import { computed, shallowRef, watch } from "vue";
import { useEditorContext } from "../editor/context.js";
import { setRouteVariables } from "../editor/page.js";
import { useTask } from "../panel/useTask.js";
import PropertyRow from "./PropertyRow.vue";

/** The entry the open collection page shows in the editor. */
const props = defineProps({ collection: { type: Object, required: true } });
const context = useEditorContext();
const { error, run } = useTask();
const entries = shallowRef([]);

const entryOptions = computed(() =>
	entries.value.map((entry) => ({
		label: entry.published ? entry.title : `${entry.title} · Draft`,
		value: entry.slug,
	}))
);

watch(
	() => props.collection,
	(collection) => run(async () => (entries.value = await collection.getEntries())),
	{ immediate: true }
);

const preview = (slug) => slug && run(() => setRouteVariables({ slug }));
</script>
