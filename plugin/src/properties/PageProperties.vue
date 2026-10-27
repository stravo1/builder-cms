<template>
	<!-- the gap of Builder's CollapsibleSection, so the rows space like its own -->
	<div class="flex flex-col gap-3">
		<ConnectCollection :collections="collections" :connected="connected" @done="load" />
		<template v-if="connected">
			<p class="cms-hint">
				This page shows one entry at /{{ connected.collectionPageRoute }}.
			</p>
			<PreviewEntry :collection="connected" />
		</template>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import ConnectCollection from "./ConnectCollection.vue";
import PreviewEntry from "./PreviewEntry.vue";
import { useCollectionPage } from "./useCollectionPage.js";

const { collections, connected, load, error } = useCollectionPage();
</script>
