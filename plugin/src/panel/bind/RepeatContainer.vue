<template>
	<form class="flex flex-wrap items-end gap-2 border-t border-outline-gray-1 p-3" @submit.prevent="repeat">
		<FormControl
			v-model="chosen"
			class="w-full max-w-sm"
			type="combobox"
			label="Repeat for each entry of"
			:options="collections.map((each) => ({ label: each.title, value: each.doctype }))"
			placeholder="Choose a collection…" />
		<Button v-if="chosen" type="submit" label="Repeat" :loading="isRunning" />
		<p v-if="error" role="alert" class="cms-error basis-full">{{ error }}</p>
	</form>
</template>
<script setup>
import { Button, FormControl } from "frappe-ui";
import { ref } from "vue";
import { connectCollectionList } from "../../cms/pageActions.js";
import { useEditorContext } from "../../editor/context.js";
import { useTask } from "../useTask.js";

/** Makes the selected container a list: it repeats once for each entry. */
const props = defineProps({ collections: { type: Array, required: true } });
const emit = defineEmits(["changed"]);
const context = useEditorContext();
const chosen = ref("");
const { isRunning, error, run } = useTask();
const repeat = async () => {
	const collection = props.collections.find((each) => each.doctype === chosen.value);
	const source = await run(
		() => connectCollectionList(collection, context.selection.blockId),
		"The container repeats for each entry.",
	);
	if (source) emit("changed");
};
</script>
