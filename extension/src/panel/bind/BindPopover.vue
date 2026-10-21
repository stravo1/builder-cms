<template>
	<div class="h-full overflow-y-auto bg-surface-base text-ink-gray-8"><BindFields /></div>
</template>
<script setup>
import { forget } from "../../data/cache.js";
import BindFields from "./BindFields.vue";

// the panel can change a schema while this frame is hidden, and a schema write sends no event
forget();
</script>
