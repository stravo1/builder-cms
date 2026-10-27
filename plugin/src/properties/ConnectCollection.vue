<template>
	<PropertyRow label="Collection">
		<div class="flex gap-1">
			<Select
				class="w-full"
				size="sm"
				:model-value="connected?.doctype ?? ''"
				:options="collectionOptions"
				:disabled="isRunning || context.readOnly"
				@update:model-value="choose"
			/>
			<Button
				v-if="connected"
				variant="subtle"
				size="sm"
				icon="lucide-maximize-2"
				tooltip="Open entries"
				aria-label="Open entries"
				@click="openCollectionInDrawer(connected)"
			/>
		</div>
		<Dialog v-model:open="isConfirming" size="sm" :title="pending?.title">
			<div class="flex flex-col gap-1">
				<p v-for="line in pending?.lines" :key="line" class="text-p-base text-ink-gray-7">
					{{ line }}
				</p>
			</div>
			<template #actions="{ close }">
				<div class="flex justify-end gap-2">
					<Button label="Cancel" @click="close" />
					<Button variant="solid" :label="pending?.label" @click="confirm" />
				</div>
			</template>
		</Dialog>
	</PropertyRow>
	<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
</template>

<script setup>
import { Button, Dialog, Select } from "frappe-ui";
import { computed, ref, shallowRef } from "vue";
import {
	connectCollectionPage,
	disconnectCollectionPage,
	getCollectionPageChange,
} from "../cms/pageActions.js";
import { getDefaultRoute } from "../cms/routes.js";
import { useEditorContext } from "../editor/context.js";
import { openCollectionInDrawer } from "../panel/navigation.js";
import { useTask } from "../panel/useTask.js";
import PropertyRow from "./PropertyRow.vue";

const props = defineProps({
	collections: { type: Array, required: true },
	/** The collection whose collection page is the open page. */
	connected: { type: Object, default: null },
});
/** `done` gets the collection the page now shows, or null after a disconnect. */
const emit = defineEmits(["done"]);
const context = useEditorContext();
const { isRunning, error, run } = useTask();
/** The change that waits for a confirm: its title, what moves, and the work. */
const pending = shallowRef(null);
const isConfirming = ref(false);

const collectionOptions = computed(() => [
	{ label: "None", value: "" },
	...props.collections.map((collection) => ({
		label: collection.label,
		value: collection.doctype,
	})),
]);

const apply = async (change) => {
	// `run` gives nothing back when the work fails, so each work gives `true`
	if (await run(change.work, change.done)) emit("done", change.collection);
};

const ask = (change) => {
	pending.value = change;
	isConfirming.value = true;
};

const confirm = () => {
	isConfirming.value = false;
	return apply(pending.value);
};

const askToDisconnect = () =>
	ask({
		title: "Disconnect page",
		lines: [`The page moves to /${getDefaultRoute(context.page.name)}. Its blocks stay.`],
		label: "Disconnect",
		collection: null,
		work: async () => (await disconnectCollectionPage(props.connected), true),
		done: "Page disconnected",
	});

const connect = async (collection) => {
	const found = await run(() => getCollectionPageChange(collection, context.page.name));
	if (!found) return;
	const change = {
		title: `Connect ${collection.label}`,
		lines: found.moves.map((move) => `"${move.title}" moves to /${move.route}.`),
		label: "Connect",
		collection,
		work: async () => (await connectCollectionPage(collection, context.page.name), true),
		done: "Collection page set",
	};
	return found.moves.length ? ask(change) : apply(change);
};

const choose = (doctype) => {
	if (doctype) return connect(props.collections.find((each) => each.doctype === doctype));
	if (props.connected) askToDisconnect();
};
</script>
