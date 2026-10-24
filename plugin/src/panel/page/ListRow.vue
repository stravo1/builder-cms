<template>
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-1 rounded hover:bg-surface-gray-2">
			<button type="button" class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left" @click="select">
				<span class="lucide-file-text size-4 shrink-0 text-ink-gray-6" aria-hidden="true" />
				<span class="min-w-0 flex-1 truncate text-sm text-ink-gray-8">{{ page.page_title }}</span>
				<span class="max-w-40 shrink-0 truncate text-sm text-ink-gray-5">{{ summary }}</span>
			</button>
			<Dropdown
				aria-label="List actions"
				:options="menu"
				:button="{ icon: 'lucide-ellipsis', variant: 'ghost', size: 'sm', tooltip: 'List actions' }" />
		</div>
		<div v-if="isMissing && !form" class="flex items-center justify-between gap-2 px-2">
			<p class="cms-hint">Not on the page.</p>
			<Button label="Insert" size="sm" :loading="isRunning" @click="insertMissing" />
		</div>
		<form v-if="form === 'change'" class="cms-card flex flex-col gap-2" @submit.prevent="change">
			<FormControl v-model="orderBy" type="select" label="Order" :options="SORT_OPTIONS" />
			<FormControl v-model.number="limit" type="number" label="Number of entries" :min="1" />
			<div class="flex gap-2">
				<Button type="submit" variant="solid" label="Save" :loading="isRunning" />
				<Button label="Cancel" :disabled="isRunning" @click="form = null" />
			</div>
		</form>
		<div v-else-if="form === 'remove'" class="cms-card flex flex-col gap-2">
			<p class="text-p-sm text-ink-gray-7">Remove this list and its blocks from "{{ page.page_title }}"?</p>
			<div class="flex gap-2">
				<Button theme="red" variant="solid" label="Remove" :loading="isRunning" @click="remove" />
				<Button label="Cancel" :disabled="isRunning" @click="form = null" />
			</div>
		</div>
		<p v-if="error" role="alert" class="cms-error px-2">{{ error }}</p>
	</div>
</template>
<script setup>
import { Button, Dropdown, FormControl } from "frappe-ui";
import { computed, ref } from "vue";
import { insertBlocks } from "../../blocks/blockActions.js";
import {
	SORT_OPTIONS,
	changeCollectionList,
	removeCollectionList,
	selectCollectionList,
} from "../../cms/pageActions.js";
import { openPage } from "../../editor/page.js";
import { useTask } from "../useTask.js";

/** One list of `collection` on `page`, which need not be the open page. */
const props = defineProps({
	page: { type: Object, required: true },
	source: { type: Object, required: true },
	collection: { type: Object, required: true },
});
const emit = defineEmits(["changed"]);
const { isRunning, error, run } = useTask();
const form = ref(null);
const isMissing = ref(false);
const orderBy = ref(props.source.orderBy);
const limit = ref(props.source.limit);
const summary = computed(() =>
	[SORT_OPTIONS.find((option) => option.value === props.source.orderBy)?.label, `${props.source.limit} entries`]
		.filter(Boolean)
		.join(" · "),
);
const menu = [
	{ label: "Change", icon: "lucide-settings-2", onClick: () => (form.value = "change") },
	{ label: "Remove", icon: "lucide-trash-2", theme: "red", onClick: () => (form.value = "remove") },
];

const select = () =>
	run(async () => {
		await openPage(props.page.name);
		isMissing.value = !selectCollectionList(props.source);
	});
const insertMissing = async () => {
	const inserted = await run(async () => {
		await openPage(props.page.name);
		const fields = props.collection.getDisplayFields(await props.collection.getFields());
		await insertBlocks(props.source, fields, props.collection.label);
		return true;
	}, "List inserted");
	if (inserted) isMissing.value = false;
};
const finish = async (task, message) => {
	if (!(await run(async () => (await task(), true), message))) return;
	form.value = null;
	emit("changed");
};
const change = () =>
	finish(
		() => changeCollectionList(props.page.name, props.source, { orderBy: orderBy.value, limit: limit.value }),
		"List changed",
	);
// its blocks are on the canvas, so the page must be open
const remove = () =>
	finish(async () => {
		await openPage(props.page.name);
		await removeCollectionList(props.source);
	}, "List removed");
</script>
