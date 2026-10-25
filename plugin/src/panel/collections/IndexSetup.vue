<template>
	<section class="flex flex-col gap-3 border-t border-outline-gray-1 pt-4">
		<div class="flex items-start justify-between gap-2">
			<div>
				<span class="cms-section-label">Index</span>
				<p class="cms-hint mt-1">Lists its entries, each linked to the collection page.</p>
			</div>
			<Button
				variant="subtle"
				label="Insert"
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
