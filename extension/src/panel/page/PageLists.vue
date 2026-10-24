<template>
	<section class="flex flex-col gap-2 border-t border-outline-gray-1 p-3">
		<span class="cms-section-label">Lists on this page</span>
		<p v-for="list in lists" :key="list.name" class="text-p-sm text-ink-gray-7">
			{{ list.label }}
		</p>
		<p v-if="!lists.length" class="cms-hint">No lists yet.</p>
		<FormControl
			v-if="collections.length"
			v-model="chosen"
			type="combobox"
			label="Add a list of"
			:options="collections.map((each) => ({ label: each.title, value: each.doctype }))"
			placeholder="Choose a collection…"
		/>
		<div v-else class="cms-card">
			<p class="cms-hint mb-3">Create a collection or connect an existing DocType to get started.</p>
			<Button label="Go to collections" @click="emit('collections')" />
		</div>
	</section>
	<AddToPage
		v-if="collection"
		:key="collection.doctype"
		kind="index"
		:collection="collection"
		@changed="emit('changed')"
	/>
</template>

<script setup>
import { Button, FormControl } from "frappe-ui";
import { computed, ref } from "vue";
import { SORT_OPTIONS } from "../../cms/pageActions.js";
import AddToPage from "../collections/AddToPage.vue";

const props = defineProps({
	collections: { type: Array, required: true },
	sources: { type: Array, required: true },
});
const emit = defineEmits(["changed", "collections"]);
const chosen = ref("");
const collection = computed(() => props.collections.find((each) => each.doctype === chosen.value));
const lists = computed(() =>
	props.sources
		.filter((source) => source.isList)
		.map((source) => {
			const title = props.collections.find((each) => each.doctype === source.doctype)?.title || source.doctype;
			const order = SORT_OPTIONS.find((option) => option.value === source.orderBy)?.label;
			return {
				name: source.name,
				label: [title, order, `${source.limit} entries`].filter(Boolean).join(" · "),
			};
		}),
);
</script>
