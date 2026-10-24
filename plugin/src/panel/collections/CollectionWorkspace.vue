<template>
	<PanelHeader :title="collection.label" back @back="emit('back')" />
	<div class="border-b border-outline-gray-1 px-3 pb-3 pt-2">
		<p class="mb-2 truncate text-p-sm text-ink-gray-5">
			{{
				collection.isOwned ? "CMS collection" : collection.doctype + " · Connected DocType"
			}}
		</p>
		<TabButtons v-model="tab" :options="tabs" />
	</div>
	<!-- v-show: it keeps its rows, so a return to this tab reads nothing again -->
	<CollectionEntries v-show="tab === 'entries'" :collection="collection" is-panel />
	<TemplatePageSetup v-if="tab === 'pages'" :collection="collection" @open="open" />
	<div v-else-if="tab === 'settings'" class="overflow-y-auto">
		<CollectionConfig :collection="collection" @deleted="emit('back')" />
	</div>
</template>

<script setup>
import { openPage } from "../../editor/page.js";

import { TabButtons } from "frappe-ui";
import { computed, ref } from "vue";
import PanelHeader from "../PanelHeader.vue";
import CollectionEntries from "../table/CollectionEntries.vue";
import CollectionConfig from "./CollectionConfig.vue";
import TemplatePageSetup from "./TemplatePageSetup.vue";
import { useAccess } from "../useAccess.js";
import { useTask } from "../useTask.js";

const props = defineProps({
	collection: { type: Object, required: true },
	startTab: { type: String, default: "entries" },
});
const emit = defineEmits(["back", "usePage"]);
const tab = ref(props.startTab);
const access = useAccess();
const TABS = [
	{ label: "Entries", value: "entries" },
	{ label: "Pages", value: "pages" },
	{ label: "Settings", value: "settings" },
];
// fields, URL, and delete are for the CMS-wide roles
const tabs = computed(() => (access.value.can_manage ? TABS : TABS.slice(0, 2)));
const { run } = useTask();
const open = (name) =>
	run(async () => {
		await openPage(name);
		emit("usePage");
	});
</script>
