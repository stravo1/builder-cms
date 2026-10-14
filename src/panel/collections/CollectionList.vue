<template>
	<PanelHeader title="Collections">
		<Button size="sm" icon-left="lucide-plus" label="New" @click="emit('create')" />
	</PanelHeader>
	<div class="flex flex-col gap-1 p-2">
		<p v-if="isRunning" class="p-2 text-p-sm text-ink-gray-5">Loading…</p>
		<p v-else-if="!collections.length" class="p-2 text-p-sm text-ink-gray-5">
			No collections yet. A collection is a content type, such as Blog Post.
		</p>
		<button
			v-for="collection in collections"
			:key="collection.doctype"
			class="flex items-center justify-between rounded px-2 py-1.5 text-left text-base text-ink-gray-8 hover:bg-surface-gray-2"
			@click="emit('open', collection)">
			{{ collection.title }}
			<LucideChevronRight class="h-4 w-4 text-ink-gray-5" />
		</button>
	</div>
</template>

<script setup>
import { Button } from "frappe-ui";
import LucideChevronRight from "~icons/lucide/chevron-right";
import { onMounted, ref } from "vue";
import { Collection } from "../../cms/collection.js";
import PanelHeader from "../PanelHeader.vue";
import { useTask } from "../useTask.js";

const emit = defineEmits(["open", "create"]);
const collections = ref([]);
const { isRunning, run } = useTask();

onMounted(() => run(async () => (collections.value = await Collection.all())));
</script>
