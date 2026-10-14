<template>
	<span
		v-if="isBroken"
		class="flex size-7 shrink-0 items-center justify-center rounded-1 bg-surface-gray-2"
		:title="src"
		aria-hidden="true"
	>
		<span class="lucide-image size-4 text-ink-gray-5" />
	</span>
	<img v-else :src="src" alt="" class="size-7 shrink-0 rounded-1 object-cover" @error="isBroken = true" />
</template>

<script setup>
import { ref, watch } from "vue";

// a frame may load images only from the site, so an image from another site fails here
const props = defineProps({ src: { type: String, required: true } });
const isBroken = ref(false);
watch(
	() => props.src,
	() => (isBroken.value = false),
);
</script>
