<template>
	<section class="flex flex-col gap-3 border-t border-outline-gray-1 p-3">
		<span class="cms-section-label">Collection list</span>
		<p class="cms-hint">
			Insert a list, or repeat the children of a container you designed. Select a block inside it to connect fields.
		</p>
		<div class="flex flex-col gap-1.5">
			<FormLabel label="Layout" />
			<TabButtons
				v-model="layout"
				:options="[
					{ label: 'Cards', value: 'cards' },
					{ label: 'Table', value: 'table' },
				]"
			/>
		</div>
		<Button
			variant="subtle"
			icon-left="lucide-plus"
			label="Insert collection list"
			:loading="isRunning"
			@click="insert"
		/>
		<Button
			v-if="canConnect"
			variant="ghost"
			label="Use selected container as list"
			:loading="isRunning"
			@click="connect"
		/>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</section>
</template>
<script setup>
import { useBuilderContext } from "frappe-builder-extension-sdk/vue";
import { Button, FormLabel, TabButtons } from "frappe-ui";
import { computed, ref } from "vue";
import { addCollectionList, connectCollectionList } from "../../cms/pageActions.js";
import { useTask } from "../useTask.js";
const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["changed"]);
const context = useBuilderContext(["page", "selection"]);
const layout = ref("cards");
const { isRunning, run, error } = useTask();
const canConnect = computed(
	() => context.selection.count === 1 && context.selection.isContainer && !context.selection.isRoot,
);
const insert = async () => {
	const inserted = await run(
		() => addCollectionList(props.collection, { layout: layout.value }),
		"Collection list inserted",
	);
	if (inserted) emit("changed");
};
const connect = async () => {
	const source = await run(
		() => connectCollectionList(props.collection, context.selection.blockId),
		"Container connected. Connect its child blocks to fields.",
	);
	if (source) emit("changed");
};
</script>
