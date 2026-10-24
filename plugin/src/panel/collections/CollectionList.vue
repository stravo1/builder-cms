<template>
	<PanelHeader title="Collections">
		<Button v-if="access.can_create" size="sm" icon-left="lucide-plus" label="New" @click="emit('create')" />
	</PanelHeader>
	<div class="flex flex-col gap-0.5 p-2">
		<FormControl
			v-if="collections.length"
			v-model="query"
			placeholder="Search collections…"
			aria-label="Search collections"
			class="mb-2" />
		<p v-if="error" role="alert" class="cms-error p-2">{{ error }}</p>
		<!-- only with nothing to show yet, so a refresh does not flash it -->
		<SectionLoader v-else-if="isRunning && !collections.length" label="Loading collections" />
		<p v-else-if="!collections.length" class="p-2 text-p-sm text-ink-gray-5">
			No collections yet. A collection is a content type, such as Blog Post.
		</p>
		<ItemListRow
			v-for="collection in shown"
			:key="collection.doctype"
			:as="NativeButton"
			class="cms-list-row transition-none"
			@click="emit('open', collection)">
			<template #prefix>
				<span class="lucide-database size-4 text-ink-gray-5" aria-hidden="true" />
			</template>
			<span class="block truncate text-sm text-ink-gray-8">{{ collection.title }}</span>
			<template #suffix>
				<span class="max-w-24 truncate text-sm text-ink-gray-4">
					{{ collection.isOwned ? collection.url : collection.doctype }}
				</span>
			</template>
		</ItemListRow>
	</div>
</template>

<script setup>
import NativeButton from "../NativeButton.js";
import { Button, FormControl, ItemListRow } from "frappe-ui";
import { computed, onMounted, ref } from "vue";
import { Collection } from "../../cms/collection.js";
import PanelHeader from "../PanelHeader.vue";
import { useAccess } from "../useAccess.js";
import { useTask } from "../useTask.js";
import SectionLoader from "../SectionLoader.vue";

const emit = defineEmits(["open", "create"]);
const collections = ref([]);
const query = ref("");
const shown = computed(() =>
	collections.value.filter((collection) =>
		collection.title.toLowerCase().includes(query.value.toLowerCase()),
	),
);
const { isRunning, error, run } = useTask();
const access = useAccess();

onMounted(() => run(async () => (collections.value = await Collection.all())));
</script>
