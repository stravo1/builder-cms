<template>
	<div class="h-full overflow-y-auto bg-surface-base text-ink-gray-8">
		<BindFields :revision="revision" />
		<RepeatContainer
			v-if="isPlainContainer && collections.length"
			:collections="collections"
			@changed="revision++" />
	</div>
</template>
<script setup>
import { computed, onMounted, ref, shallowRef } from "vue";
import { Collection } from "../../cms/collection.js";
import { forget } from "../../data/cache.js";
import { useEditorContext } from "../../editor/context.js";
import BindFields from "./BindFields.vue";
import RepeatContainer from "./RepeatContainer.vue";

// Reload field metadata when this view opens after a schema change.
forget();
const context = useEditorContext();
const collections = shallowRef([]);
// BindFields reads the page's sources again when a container starts to repeat
const revision = ref(0);
// a container that is not a list yet can become one
const isPlainContainer = computed(
	() => context.selection.isContainer && !context.selection.isRoot && !context.selection.isRepeater,
);
onMounted(async () => (collections.value = await Collection.all()));
</script>
