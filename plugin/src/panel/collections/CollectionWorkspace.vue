<template>
	<header class="flex shrink-0 items-center gap-3 border-b border-outline-gray-1 px-4 py-2">
		<h2 class="truncate text-base font-medium text-ink-gray-9">{{ collection.label }}</h2>
		<span class="truncate text-p-sm text-ink-gray-5">
			{{ collection.isOwned ? "CMS collection" : collection.doctype + " · Connected DocType" }}
		</span>
		<TabButtons v-model="tab" :options="TABS" class="ml-auto shrink-0" />
	</header>
	<!-- v-show: it keeps its rows, so a return to this tab reads nothing again -->
	<EntriesView v-show="tab === 'entries'" :collection="collection" />
	<CollectionConfig
		v-if="tab === 'settings'"
		class="mx-auto w-full max-w-4xl"
		:collection="collection"
		@deleted="emit('deleted')"
		@open="open" />
</template>

<script setup>
import { openPage } from "../../editor/page.js";

import { TabButtons } from "frappe-ui";
import { ref } from "vue";
import EntriesView from "../table/EntriesView.vue";
import CollectionConfig from "./CollectionConfig.vue";
import { useTask } from "../useTask.js";

defineProps({
	collection: { type: Object, required: true },
});
const emit = defineEmits(["deleted"]);
const tab = ref("entries");
const TABS = [
	{ label: "Entries", value: "entries" },
	{ label: "Settings", value: "settings" },
];
const { run } = useTask();
const open = (name) => run(() => openPage(name));
</script>
