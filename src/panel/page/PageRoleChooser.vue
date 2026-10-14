<template>
	<form class="flex flex-col gap-4 p-3" @submit.prevent="save">
		<div>
			<span class="cms-section-label">Page connection</span>
			<p class="cms-hint mt-2">Choose the collection and how this page uses its content.</p>
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
			<div class="grid grid-cols-2 gap-2">
				<button
					v-for="option in roles"
					:key="option.value"
					type="button"
					class="cms-card flex flex-col items-start gap-2 text-left hover:bg-surface-gray-1"
					:class="{ 'ring-1 ring-outline-gray-4 bg-surface-gray-1': kind === option.value }"
					:aria-pressed="kind === option.value"
					:disabled="isRunning"
					@click="kind = option.value"
				>
					<span :class="option.icon" class="text-ink-gray-6" />
					<span class="text-sm font-medium">{{ option.label }}</span>
					<span class="text-xs leading-relaxed text-ink-gray-5">{{ option.description }}</span>
				</button>
			</div>
			<div class="rounded bg-surface-gray-1 px-3 py-2 text-xs text-ink-gray-6">
				{{ collection.url }}{{ kind === "detail" ? "/:slug" : "" }}
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
				<span class="text-xs text-ink-green-5">Connected</span>
				<Button label="Disconnect" variant="ghost" size="sm" :disabled="isRunning" @click="disconnect" />
			</div>
		</template>
		<p v-if="error" role="alert" class="text-p-sm text-ink-red-5">{{ error }}</p>
	</form>
</template>

<script setup>
import { Button, FormControl } from "frappe-ui";
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
	{
		value: "index",
		label: "Index page",
		description: "A list of collection entries",
		icon: "lucide-layout-grid size-4",
	},
	{ value: "detail", label: "Detail page", description: "One page for each entry", icon: "lucide-file-text size-4" },
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
