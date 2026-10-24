<template>
	<section class="flex flex-col gap-3 border-t border-outline-gray-1 pt-4">
		<div class="flex items-start justify-between gap-2">
			<div>
				<span class="cms-section-label">Lists</span>
				<p class="cms-hint mt-1">Shows its entries on the open page, with links to the collection page.</p>
			</div>
			<Button
				variant="subtle"
				label="Add to open page"
				:disabled="!context.page || context.readOnly"
				@click="adding = true" />
		</div>
		<AddToPageDialog v-model:open="adding" kind="index" :collection="collection" />
	</section>
</template>

<script setup>
import { Button } from "frappe-ui";
import { ref } from "vue";
import { useEditorContext } from "../../editor/context.js";
import AddToPageDialog from "./AddToPageDialog.vue";

defineProps({ collection: { type: Object, required: true } });
const context = useEditorContext();
const adding = ref(false);
</script>
