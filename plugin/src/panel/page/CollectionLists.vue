<template>
	<section class="flex flex-col gap-3 border-t border-outline-gray-1 pt-4">
		<div class="flex items-start justify-between gap-2">
			<div>
				<span class="cms-section-label">Lists</span>
				<p class="cms-hint mt-1">Pages that show a list of this collection.</p>
			</div>
			<Button
				v-if="!adding"
				variant="subtle"
				label="Add to open page"
				:disabled="!context.page || context.readOnly"
				@click="adding = true" />
		</div>
		<AddToPage v-if="adding" kind="index" :collections="[collection]" @changed="added" @cancel="adding = false" />
		<ListRow
			v-for="{ page, source } in lists"
			:key="`${page.name}:${source.name}`"
			:page="page"
			:source="source"
			:collection="collection"
			@changed="load" />
		<p v-if="!lists.length && !isRunning" class="cms-hint">No page shows a list of it yet.</p>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</section>
</template>

<script setup>
import { Button } from "frappe-ui";
import { ref, shallowRef, watch } from "vue";
import { getCollectionLists } from "../../cms/pageActions.js";
import { useEditorContext } from "../../editor/context.js";
import AddToPage from "../collections/AddToPage.vue";
import { useTask } from "../useTask.js";
import ListRow from "./ListRow.vue";

const props = defineProps({ collection: { type: Object, required: true } });
const context = useEditorContext();
const { isRunning, error, run } = useTask();
const lists = shallowRef([]);
const adding = ref(false);

const load = () => run(async () => (lists.value = await getCollectionLists(props.collection)));
watch(() => props.collection.doctype, load, { immediate: true });
const added = () => {
	adding.value = false;
	return load();
};
</script>
