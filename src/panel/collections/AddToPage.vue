<template>
	<section class="mt-auto flex flex-col gap-2 border-t border-outline-gray-1 p-3">
		<h3 class="text-sm font-medium text-ink-gray-9">Add to this page</h3>
		<p v-if="!context.page" class="text-p-sm text-ink-gray-5">Open a page to list {{ collection.label }} on it.</p>
		<template v-else>
			<div class="flex gap-2">
				<FormControl v-model="orderBy" type="select" :options="SORT_OPTIONS" class="flex-1" />
				<FormControl v-model.number="limit" type="number" class="w-20" />
			</div>
			<Button variant="subtle" label="Insert list" :loading="isRunning" @click="insert" />
			<p class="text-p-sm text-ink-gray-5">
				A table of published entries. Each row links to the detail page.
			</p>
		</template>
	</section>
</template>

<script setup>
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { Button, FormControl } from "frappe-ui";
import { ref } from "vue";
import { addCollectionList, SORT_OPTIONS } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";

const props = defineProps({ collection: { type: Object, required: true } });
const context = useBuilderContext(["page"]);
const orderBy = ref(SORT_OPTIONS[0].value);
const limit = ref(10);
const { isRunning, run } = useTask();

const insert = () =>
	run(() => addCollectionList(props.collection, { orderBy: orderBy.value, limit: limit.value }), "List inserted");
</script>
