<template>
	<div class="flex h-full flex-col bg-surface-base text-ink-gray-8">
		<Tabs v-model="activeTab" class="flex h-full flex-col">
			<TabList class="shrink-0 px-5 py-2">
				<TabTrigger v-for="tab in TABS" :key="tab.value" :value="tab.value" :label="tab.label" />
			</TabList>
			<TabPanel v-for="tab in TABS" :key="tab.value" :value="tab.value" class="min-h-0 flex-1 overflow-y-auto">
				<div class="flex h-full flex-col">
					<CollectionsTab v-if="tab.value === 0" @use-page="activeTab = 1" />
					<PageTab v-else-if="tab.value === 1" @collections="activeTab = 0" />
					<SettingsTab v-else />
				</div>
			</TabPanel>
		</Tabs>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { setConfig, TabList, TabPanel, Tabs, TabTrigger } from "frappe-ui";
import { ref } from "vue";
import SettingsTab from "./SettingsTab.vue";
import CollectionsTab from "./collections/CollectionsTab.vue";
import PageTab from "./page/PageTab.vue";

// only this frame fetches. Its resources go through the SDK, as Studio's go through Frappe
setConfig("resourceFetcher", builder.data.fetcher);

const TABS = [
	{ value: 0, label: "Collections" },
	{ value: 1, label: "This page" },
	{ value: 2, label: "Settings" },
];
const activeTab = ref(0);
</script>
