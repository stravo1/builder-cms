<template>
	<!-- the spinner shows the wait. The label is for screen readers -->
	<div class="flex flex-1 items-center justify-center py-10" role="status" :aria-label="label">
		<LoadingIndicator class="size-5 text-ink-gray-5" />
	</div>
</template>

<script setup>
import { LoadingIndicator } from "frappe-ui";

defineProps({ label: { type: String, required: true } });
</script>
