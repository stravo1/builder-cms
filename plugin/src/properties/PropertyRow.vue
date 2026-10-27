<template>
	<!-- the label width matches Builder's own property controls -->
	<div class="flex w-full items-center gap-2">
		<span
			class="flex h-7 w-1/3 min-w-[88px] shrink-0 items-center truncate text-xs text-ink-gray-6"
		>
			{{ label }}
		</span>
		<div class="min-w-0 flex-1"><slot /></div>
	</div>
</template>

<script setup>
defineProps({ label: { type: String, required: true } });
</script>
