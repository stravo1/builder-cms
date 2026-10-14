<template>
	<header class="flex items-center gap-1 border-b border-outline-gray-1 px-2 py-2">
		<Button v-if="back" variant="ghost" size="sm" icon-left="lucide-chevron-left" label="Back" @click="emit('back')" />
		<h2 class="flex-1 truncate px-1 text-base font-medium text-ink-gray-9">{{ title }}</h2>
		<slot />
	</header>
</template>

<script setup>
import { Button } from "frappe-ui";

defineProps({ title: { type: String, required: true }, back: Boolean });
const emit = defineEmits(["back"]);
</script>
