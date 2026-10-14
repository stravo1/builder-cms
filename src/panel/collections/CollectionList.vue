<template>
	<PanelHeader title="Collections">
		<Button size="sm" icon-left="lucide-plus" label="New" @click="emit('create')" />
	</PanelHeader>
	<div class="flex flex-col gap-1 p-2">
		<FormControl
			v-if="collections.length"
			v-model="query"
			placeholder="Search collections…"
			aria-label="Search collections"
			class="mb-2"
		/>
		<p v-if="error" role="alert" class="cms-hint p-2">{{ error }}</p>
		<p v-else-if="isRunning" class="p-2 text-p-sm text-ink-gray-5">Loading…</p>
		<p v-else-if="!collections.length" class="p-2 text-p-sm text-ink-gray-5">
			No collections yet. A collection is a content type, such as Blog Post.
		</p>
		<button
			v-for="collection in shown"
			:key="collection.doctype"
			class="cms-list-row"
			@click="emit('open', collection)"
		>
			<span class="min-w-0 flex-1"
				><span class="block truncate text-sm font-medium">{{ collection.title }}</span
				><span class="mt-1 block truncate text-xs text-ink-gray-5">{{
					collection.isOwned ? collection.url : collection.doctype + " · DocType"
				}}</span></span
			>
			<LucideChevronRight class="h-4 w-4 text-ink-gray-5" />
		</button>
	</div>
</template>

<script setup>
import { Button, FormControl } from "frappe-ui";
import LucideChevronRight from "~icons/lucide/chevron-right";
import { computed, onMounted, ref } from "vue";
import { Collection } from "../../cms/collection.js";
import PanelHeader from "../PanelHeader.vue";
import { useTask } from "../useTask.js";

const emit = defineEmits(["open", "create"]);
const collections = ref([]);
const query = ref("");
const shown = computed(() =>
	collections.value.filter((collection) => collection.title.toLowerCase().includes(query.value.toLowerCase())),
);
const { isRunning, error, run } = useTask();

onMounted(() => run(async () => (collections.value = await Collection.all())));
</script>
