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
	<div v-if="tab === 'pages'" class="flex flex-col gap-0.5 p-2">
		<SidebarItem
			v-for="page in pages"
			:key="page.label"
			:label="page.label"
			:suffix="page.name ? page.route : 'Not set'"
			:title="page.hint"
			@click="page.name && open(page.name)"
		>
			<template #prefix>
				<span :class="page.icon" class="size-4 text-ink-gray-6" aria-hidden="true" />
			</template>
		</SidebarItem>
		<Button
			v-if="access.can_manage"
			class="mx-1 mt-2"
			label="Set up the current page"
			icon-left="lucide-file-plus"
			variant="subtle"
			size="sm"
			@click="emit('usePage')"
		/>
	</div>
	<div v-else-if="tab === 'settings'" class="overflow-y-auto">
		<CollectionConfig :collection="collection" @deleted="emit('back')" />
	</div>
</template>

<script setup>
import { openPage } from "../../editor/page.js";

import { Button, SidebarItem, TabButtons } from "frappe-ui";
import { computed, ref } from "vue";
import PanelHeader from "../PanelHeader.vue";
import CollectionEntries from "../table/CollectionEntries.vue";
import CollectionConfig from "./CollectionConfig.vue";
import { useAccess } from "../useAccess.js";
import { useTask } from "../useTask.js";

const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["back", "usePage"]);
const tab = ref("entries");
const access = useAccess();
const TABS = [
	{ label: "Entries", value: "entries" },
	{ label: "Pages", value: "pages" },
	{ label: "Settings", value: "settings" },
];
// fields, URL, and delete are for the CMS-wide roles
const tabs = computed(() => (access.value.can_manage ? TABS : TABS.slice(0, 2)));
const pages = computed(() => [
	{
		label: "Index page",
		icon: "lucide-list",
		route: props.collection.url,
		name: props.collection.indexPage,
		hint: "A list of entries from this collection",
	},
	{
		label: "Detail page",
		icon: "lucide-file-text",
		route: `${props.collection.url}/:slug`,
		name: props.collection.collectionPage,
		hint: "One design, a page for every entry",
	},
]);
const { run } = useTask();
const open = (name) =>
	run(async () => {
		await openPage(name);
		emit("usePage");
	});
</script>
