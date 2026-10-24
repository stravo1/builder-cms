<template>
	<section class="flex flex-col gap-2 border-t border-outline-gray-1 p-3">
		<div class="flex items-center justify-between gap-2">
			<span class="cms-section-label">On this page</span>
			<Dropdown
				v-if="addOptions.length && !adding"
				:options="addOptions"
				:button="{ label: 'Add', iconLeft: 'lucide-plus', variant: 'ghost', size: 'sm' }" />
		</div>
		<ListRow
			v-for="source in lists"
			:key="`${source.name}:${revision}`"
			:source="source"
			:collection="collections.find((each) => each.doctype === source.doctype)"
			@changed="emit('changed')" />
		<p v-if="!lists.length && !adding" class="cms-hint">No lists yet.</p>
		<AddToPage
			v-if="adding"
			:kind="adding"
			:collections="adding === 'detail' ? [template] : collections"
			@changed="added"
			@cancel="adding = null" />
		<div v-if="!collections.length" class="cms-card">
			<p class="cms-hint mb-3">Create a collection or connect an existing DocType to get started.</p>
			<Button label="Go to collections" @click="emit('collections')" />
		</div>
	</section>
</template>

<script setup>
import { Button, Dropdown } from "frappe-ui";
import { computed, ref } from "vue";
import AddToPage from "../collections/AddToPage.vue";
import ListRow from "./ListRow.vue";

/** `template` is the collection this page is the template of, or null. */
const props = defineProps({
	collections: { type: Array, required: true },
	sources: { type: Array, required: true },
	template: { type: Object, default: null },
	revision: { type: Number, default: 0 },
});
const emit = defineEmits(["changed", "collections"]);
// the form that is open: "index" for a list, "detail" for entry fields
const adding = ref(null);
const lists = computed(() => props.sources.filter((source) => source.isList));
const addOptions = computed(() => [
	...(props.collections.length
		? [{ label: "List of a collection", icon: "lucide-list", onClick: () => (adding.value = "index") }]
		: []),
	...(props.template
		? [{ label: "Entry fields", icon: "lucide-text-cursor-input", onClick: () => (adding.value = "detail") }]
		: []),
]);
const added = () => {
	adding.value = null;
	emit("changed");
};
</script>
