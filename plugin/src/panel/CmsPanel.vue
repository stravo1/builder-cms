<template>
	<div data-cms-panel class="flex h-full flex-col bg-surface-base text-ink-gray-8">
		<Tabs v-model="activeTab" class="flex h-full flex-col">
			<TabList class="shrink-0 px-5 py-2">
				<TabTrigger
					v-for="tab in tabs"
					:key="tab.value"
					:value="tab.value"
					:label="tab.label"
				/>
			</TabList>
			<TabPanel
				v-for="tab in tabs"
				:key="tab.value"
				:value="tab.value"
				class="min-h-0 flex-1 overflow-y-auto"
			>
				<div class="flex h-full flex-col">
					<CollectionsTab v-if="tab.value === 0" :start-at="startAt" @use-page="activeTab = 1" />
					<PageTab v-else-if="tab.value === 1" @collections="showCollections" />
					<SettingsTab v-else />
				</div>
			</TabPanel>
		</Tabs>
	</div>
</template>

<script setup>
import { TabList, TabPanel, Tabs, TabTrigger } from "frappe-ui";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { getAccess } from "../cms/access.js";
import SettingsTab from "./SettingsTab.vue";
import CollectionsTab from "./collections/CollectionsTab.vue";
import PageTab from "./page/PageTab.vue";

const TABS = [
	{ value: 0, label: "Collections" },
	{ value: 1, label: "This page" },
	{ value: 2, label: "Settings" },
];
const activeTab = ref(0);
const access = shallowRef(null);
// the collection the Collections tab opens on, once
const startAt = shallowRef(null);
const showCollections = (collection = null) => {
	startAt.value = collection;
	activeTab.value = 0;
};
watch(activeTab, (tab) => tab !== 0 && (startAt.value = null));
// the CMS-wide roles are a manager's to choose
const tabs = computed(() => (access.value?.is_manager ? TABS : TABS.slice(0, 2)));

onMounted(async () => (access.value = await getAccess()));
</script>
