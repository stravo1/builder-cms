<template>
	<div class="flex h-full flex-col bg-surface text-ink-gray-8">
		<Tabs v-model="activeTab" :tabs="TABS" class="flex h-full flex-col">
			<template #tab-panel="{ tab }">
				<div class="flex h-full flex-col overflow-y-auto">
					<CollectionsTab v-if="tab.label === 'Collections'" />
					<PageTab v-else />
				</div>
			</template>
		</Tabs>
	</div>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { setConfig, Tabs } from "frappe-ui";
import { ref } from "vue";
import CollectionsTab from "./collections/CollectionsTab.vue";
import PageTab from "./page/PageTab.vue";

// only this frame fetches. Its resources go through the SDK, as Studio's go through Frappe
setConfig("resourceFetcher", builder.data.fetcher);

const TABS = [{ label: "This page" }, { label: "Collections" }];
const activeTab = ref(0);
</script>
