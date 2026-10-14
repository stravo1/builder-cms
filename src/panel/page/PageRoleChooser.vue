<template>
	<section class="flex flex-col gap-2 p-3">
		<h3 class="text-sm font-medium text-ink-gray-9">Use this page for a collection</h3>
		<FormControl v-model="chosen" type="combobox" :options="collectionOptions" placeholder="Pick a collection" />
		<template v-if="collection">
			<button class="role" :disabled="isRunning" @click="convert('index')">
				<span class="text-sm font-medium text-ink-gray-8">Index page</span>
				<span class="text-p-sm text-ink-gray-5">Lists every entry at {{ collection.url }}</span>
			</button>
			<button class="role" :disabled="isRunning" @click="convert('detail')">
				<span class="text-sm font-medium text-ink-gray-8">Detail page</span>
				<span class="text-p-sm text-ink-gray-5">Shows one entry at {{ collection.url }}/entry-slug</span>
			</button>
		</template>
	</section>
</template>

<script setup>
import { FormControl } from "frappe-ui";
import { computed, ref } from "vue";
import { useAsCollectionPage, useAsIndexPage } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";

const props = defineProps({ collections: { type: Array, required: true } });
const emit = defineEmits(["changed"]);
const chosen = ref("");
const { isRunning, run } = useTask();

const collection = computed(() => props.collections.find((each) => each.doctype === chosen.value) ?? null);
const collectionOptions = computed(() => props.collections.map((each) => ({ label: each.title, value: each.doctype })));

/** An existing index or detail page of this collection moves aside, as the route allows one page. */
const convert = async (kind) => {
	const action = kind === "index" ? useAsIndexPage : useAsCollectionPage;
	const word = kind === "index" ? "index" : "detail";
	await run(() => action(collection.value), `This page is now the ${word} page of ${collection.value.label}`);
	emit("changed");
};
</script>

<style scoped>
.role {
	@apply flex flex-col items-start rounded border border-outline-gray-2 px-3 py-2 text-left hover:bg-surface-gray-2 disabled:opacity-50;
}
</style>
