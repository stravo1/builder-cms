<template>
	<form class="flex flex-col gap-4 p-3" @submit.prevent="save">
		<div>
			<span class="cms-section-label">Page connection</span>
			<p class="cms-hint mt-1">Choose the collection and how this page uses its content.</p>
		</div>
		<FormControl
			v-model="chosen"
			type="combobox"
			label="Collection"
			:options="collectionOptions"
			placeholder="Choose a collection…"
			:disabled="isRunning"
		/>
		<div v-if="!collections.length" class="cms-card">
			<p class="cms-hint mb-3">Create a collection or connect an existing DocType to get started.</p>
			<Button label="Go to collections" @click="emit('collections')" />
		</div>
		<template v-if="collection">
			<div class="flex flex-col gap-1.5">
				<FormLabel label="Page type" />
				<TabButtons v-model="kind" :options="roles" />
				<p class="cms-hint">
					{{ roles.find((option) => option.value === kind).description }} at
					<span class="whitespace-nowrap text-ink-gray-7">{{ collection.url }}{{ kind === "detail" ? "/:slug" : "" }}</span>
				</p>
			</div>
			<p v-if="isChanged && previousPage" class="cms-hint">
				The existing {{ kind }} page will be disconnected and moved to a new URL.
			</p>
			<Button
				v-if="isChanged"
				type="submit"
				variant="solid"
				:label="role ? 'Update connection' : 'Connect page'"
				:loading="isRunning"
			/>
			<div v-else class="flex items-center justify-between">
				<Badge theme="green" label="Connected" />
				<Button label="Disconnect" variant="ghost" size="sm" :disabled="isRunning" @click="disconnect" />
			</div>
		</template>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</form>
</template>

<script setup>
import { Badge, Button, FormControl, FormLabel, TabButtons } from "frappe-ui";
import { computed, ref, watch } from "vue";
import { clearCollectionPage, clearIndexPage, useAsCollectionPage, useAsIndexPage } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";

const props = defineProps({
	collections: { type: Array, required: true },
	role: { type: Object, default: null },
	pageName: { type: String, required: true },
});
const emit = defineEmits(["changed", "collections"]);
const chosen = ref("");
const kind = ref("index");
const roles = [
	{ value: "index", label: "Index", description: "A list of entries" },
	{ value: "detail", label: "Detail", description: "One page for each entry" },
];
const { isRunning, error, run } = useTask();
watch(
	() => props.role,
	(role) => {
		chosen.value = role?.collection.doctype || chosen.value;
		kind.value = role?.kind || kind.value;
	},
	{ immediate: true },
);
const collection = computed(() => props.collections.find((each) => each.doctype === chosen.value));
const collectionOptions = computed(() => props.collections.map((each) => ({ label: each.title, value: each.doctype })));
const isChanged = computed(() => props.role?.collection.doctype !== chosen.value || props.role?.kind !== kind.value);
const previousPage = computed(() => {
	const name = kind.value === "index" ? collection.value?.indexPage : collection.value?.collectionPage;
	return name && name !== props.pageName;
});
const save = async () => {
	const completed = await run(async () => {
		await (kind.value === "index" ? useAsIndexPage : useAsCollectionPage)(collection.value);
		return true;
	}, "Page connected");
	if (completed) emit("changed");
};
const disconnect = async () => {
	const completed = await run(async () => {
		await (props.role.kind === "index" ? clearIndexPage : clearCollectionPage)(props.role.collection);
		return true;
	}, "Page disconnected");
	if (completed) emit("changed");
};
</script>
