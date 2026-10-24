<template>
	<div class="min-h-0 flex-1 overflow-auto">
		<div
			v-if="fields.length"
			role="table"
			:aria-label="`${collection.label} entries`"
			class="grid w-max min-w-full text-sm"
			:style="{ gridTemplateColumns: columns }">
			<div class="row" role="row">
				<div
					v-for="(field, index) in fields"
					:key="field.fieldname"
					class="cell head"
					role="columnheader"
					:class="{ first: index === 0 }">
					{{ field.label || field.fieldname }}
				</div>
				<div class="cell head" role="columnheader"><span class="sr-only">Actions</span></div>
			</div>
			<div
				v-for="row in rows"
				:key="row.name"
				class="row group"
				:class="{ selected: row.name === selectedEntryName }"
				role="row"
				:aria-selected="row.name === selectedEntryName">
				<div
					v-for="(field, index) in fields"
					:key="`${field.fieldname}-${row.revision ?? 0}`"
					class="cell"
					role="cell"
					:class="{ first: index === 0 }">
					<Button
						v-if="index === 0"
						size="sm"
						variant="ghost"
						icon="lucide-square-pen"
						label="Edit entry"
						@click="emit('edit', row)" />
					<div class="min-w-0 flex-1">
						<TableCell
							:field="field"
							:read-only="Boolean(field.read_only) || row.name === selectedEntryName"
							:value="row[field.fieldname]"
							@save="(value) => emit('save', row, field, value)"
							@open="emit('openField', row, field)" />
					</div>
				</div>
				<div class="cell flex items-center gap-0.5" role="cell">
					<Button
						v-if="collection.collectionPage && row[collection.slugField]"
						size="sm"
						variant="ghost"
						icon="lucide-eye"
						label="Preview on the template page"
						@click="emit('preview', row)" />
					<Button
						size="sm"
						variant="ghost"
						icon="lucide-external-link"
						label="Open in Desk"
						@click="openUrl(collection.getDeskUrl(row.name))" />
					<Button
						size="sm"
						variant="ghost"
						v-if="collection.isOwned"
						:disabled="row.name === selectedEntryName"
						:theme="armed === row.name ? 'red' : 'gray'"
						icon="lucide-trash-2"
						:label="armed === row.name ? 'Click again to delete' : 'Delete'"
						@click="remove(row)" />
				</div>
			</div>
		</div>
		<p v-if="!rows.length && fields.length" class="cms-hint p-3">{{ emptyMessage }}</p>
	</div>
</template>

<script setup>
import { openUrl } from "../../editor/windows.js";

import { Button } from "frappe-ui";
import { computed, ref } from "vue";
import { isMultilineField } from "../../data/doctypes.js";
import TableCell from "./TableCell.vue";

const props = defineProps({
	collection: { type: Object, required: true },
	fields: { type: Array, required: true },
	rows: { type: Array, required: true },
	selectedEntryName: { type: String, default: "" },
	emptyMessage: { type: String, default: "No entries yet." },
});
const emit = defineEmits(["save", "openField", "edit", "preview", "delete"]);
// the frame cannot open a confirm() dialog, so a delete takes two clicks
const armed = ref("");

/** One grid for every row, so a column fits its widest cell. The last column holds the row actions. */
const columns = computed(() => {
	const width = (field, index) => {
		if (field.fieldtype === "Check") return "max-content";
		// a cap, not 1fr: in this max-content grid, 1fr grows every column to the longest value of any column
		if (index === 0) return "minmax(120px, 180px)";
		return isMultilineField(field) ? "minmax(200px, 320px)" : "minmax(140px, 260px)";
	};
	return [...props.fields.map(width), "max-content"].join(" ");
});

const remove = (row) => {
	if (armed.value !== row.name) return void (armed.value = row.name);
	armed.value = "";
	emit("delete", row);
};
</script>

<style scoped>
/* a row has no box: its cells sit on the one grid, so every column fits its widest cell */
.row {
	@apply contents;
}
/* min-w-0: a cell never grows past its column, so the pinned title never covers its neighbor */
.cell {
	@apply flex min-h-9 min-w-0 items-center border-b border-outline-gray-1 bg-surface-base px-2 py-1;
}
.cell :deep(input[data-variant="ghost"]) {
	@apply bg-transparent hover:bg-surface-gray-2 focus:bg-surface-gray-2;
}
.row:hover > .cell:not(.head) {
	@apply bg-surface-gray-1;
}
.row.selected > .cell:not(.head) {
	@apply bg-surface-gray-2;
}
.head {
	@apply sticky top-0 z-20 bg-surface-gray-1 text-sm text-ink-gray-5;
}
/* the title stays in view while the table scrolls sideways */
.first {
	@apply sticky left-0 z-10;
}
.head.first {
	@apply z-30;
}
</style>
