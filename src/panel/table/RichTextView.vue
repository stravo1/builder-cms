<template>
	<div class="flex h-full flex-col">
		<header class="flex items-center gap-1 border-b border-outline-gray-1 px-2 py-2">
			<Button variant="ghost" size="sm" icon-left="lucide-chevron-left" label="Back" @click="emit('back')" />
			<div class="flex min-w-0 flex-1 flex-col px-1">
				<span class="truncate text-base font-medium text-ink-gray-9">{{ field.label }}</span>
				<span class="truncate text-p-sm text-ink-gray-5">{{ entryTitle }}</span>
			</div>
			<Button variant="solid" size="sm" label="Save" :disabled="html === value" :loading="isSaving" @click="emit('save', html)" />
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			<!-- the header names the field already -->
			<RichTextField v-model="html" />
		</div>
	</div>
</template>

<script setup>
import { Button } from "frappe-ui";
import { ref } from "vue";
import RichTextField from "../collections/RichTextField.vue";

const props = defineProps({
	field: { type: Object, required: true },
	entryTitle: { type: String, default: "" },
	value: { type: String, default: "" },
	isSaving: Boolean,
});
const emit = defineEmits(["back", "save"]);
const html = ref(props.value || "");
</script>
