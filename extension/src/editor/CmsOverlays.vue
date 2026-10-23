<script setup>
import DraggablePopup from "builder/internal/components/Controls/DraggablePopup.vue";
import { Dialog } from "frappe-ui";
import { defineAsyncComponent } from "vue";
import { bindPopover, collectionDialog, closeCollectionDialog } from "./windows.js";
const BindPopover = defineAsyncComponent(() => import("../panel/bind/BindPopover.vue"));
const CollectionDialog = defineAsyncComponent(() => import("../panel/table/CollectionDialog.vue"));
</script>
<template>
	<DraggablePopup
		v-if="bindPopover"
		:model-value="true"
		:width="320"
		:height="440"
		@update:model-value="bindPopover = false"
	>
		<template #header>Bind to data</template>
		<template #content>
			<div data-cms>
				<div class="max-h-[min(440px,60vh)] overflow-y-auto"><BindPopover /></div>
			</div>
		</template>
	</DraggablePopup>
	<Dialog
		v-if="collectionDialog"
		:model-value="true"
		:options="{ title: collectionDialog.title, size: collectionDialog.size || '5xl' }"
		@update:model-value="
			(open) => {
				if (!open) closeCollectionDialog();
			}
		"
	>
		<template #body-content>
			<div data-cms>
				<div class="h-[min(600px,75vh)] overflow-hidden">
					<CollectionDialog v-bind="collectionDialog.props" />
				</div>
			</div>
		</template>
	</Dialog>
</template>
