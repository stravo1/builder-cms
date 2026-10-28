<template>
	<!-- the gap of Builder's CollapsibleSection, so the rows space like its own -->
	<div class="flex flex-col gap-3">
		<ConnectCollection :collections="collections" :connected="connected" @done="connectedTo" />
		<PropertyRow v-if="connected && fields.length" label="Fields">
			<MultiSelect
				class="w-full"
				size="sm"
				placeholder="Choose fields"
				:model-value="pickedFields"
				:options="fieldOptions"
				@update:model-value="changeFields"
			/>
		</PropertyRow>
		<PreviewEntry v-if="connected" :collection="connected" />
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import { MultiSelect } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { canShow } from "../cms/collection.js";
import { fillDetails, getDetailsFields } from "../cms/pageActions.js";
import { getBlock } from "../editor/canvas.js";
import ConnectCollection from "./ConnectCollection.vue";
import PreviewEntry from "./PreviewEntry.vue";
import PropertyRow from "./PropertyRow.vue";
import { useCollectionPage } from "./useCollectionPage.js";

const props = defineProps({ blockId: { type: String, required: true } });
const { collections, connected, load, error, run } = useCollectionPage();
/** The fields of the connected collection. */
const fields = shallowRef([]);
/** The ticked fields. They show at once, before the block is built again from them. */
const pickedFields = ref([]);

const fieldOptions = computed(() =>
	fields.value.filter(canShow).map((field) => ({ label: field.label, value: field.fieldname }))
);
const chosenFields = computed(() =>
	getDetailsFields(getBlock(props.blockId), fields.value).map((field) => field.fieldname)
);

watch(
	connected,
	(collection) =>
		run(async () => (fields.value = collection ? await collection.getFields() : [])),
	{
		immediate: true,
	}
);
watch(chosenFields, (fieldnames) => (pickedFields.value = fieldnames), { immediate: true });

/** A new collection page shows its display fields in this block. */
const connectedTo = async (collection) => {
	await load();
	if (collection) await run(() => fillDetails(props.blockId, collection));
};

const changeFields = (fieldnames) => {
	pickedFields.value = fieldnames;
	return run(() => fillDetails(props.blockId, connected.value, fieldnames));
};
</script>
