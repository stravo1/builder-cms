<template>
	<!-- the gap of Builder's CollapsibleSection, so the rows space like its own -->
	<div class="flex flex-col gap-3">
		<PropertyRow label="Field">
			<Select
				class="w-full"
				size="sm"
				placeholder="Choose a field"
				:model-value="boundKey"
				:options="options"
				@update:model-value="choose"
			/>
		</PropertyRow>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import { Select } from "frappe-ui";
import { computed, shallowRef, watch } from "vue";
import {
	bindField,
	getBoundKey,
	getSourceFields,
	getSourcesForBlock,
} from "../blocks/blockActions.js";
import { getFieldLabel } from "../data/doctypes.js";
import { getBlock } from "../editor/canvas.js";
import { getOpenPageSources } from "../editor/context.js";
import { useTask } from "../panel/useTask.js";
import PropertyRow from "./PropertyRow.vue";

const props = defineProps({ blockId: { type: String, required: true } });
const { error, run } = useTask();
/** Each field in reach, with the key that shows it. */
const fields = shallowRef([]);

const block = computed(() => getBlock(props.blockId));
const boundKey = computed(() => getBoundKey(block.value));
const available = computed(() => getSourcesForBlock(getOpenPageSources(), block.value));
const options = computed(() => fields.value.map(({ key, label }) => ({ label, value: key })));

const loadFields = () =>
	run(async () => {
		const all = await Promise.all(
			available.value.map(async ({ source, prefix }) =>
				(
					await getSourceFields(source)
				)
					.filter((field) => field.fieldtype !== "Check")
					.map((field) => ({
						field,
						key: `${prefix}${field.fieldname}`,
						label: `${
							available.value.length > 1 ? `${source.name} · ` : ""
						}${getFieldLabel(field)}`,
					}))
			)
		);
		fields.value = all.flat();
	});
// a string key, so a new script that leaves the sources in reach as they were does not load again
watch(
	() => available.value.map(({ source }) => `${source.name}:${source.readFields}`).join("|"),
	loadFields,
	{ immediate: true }
);

const choose = (key) => {
	const chosen = fields.value.find((each) => each.key === key);
	if (chosen) run(() => bindField(props.blockId, key, chosen.field));
};
</script>
