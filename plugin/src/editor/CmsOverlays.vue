<script setup>
import DraggablePopup from "builder/internal/components/Controls/DraggablePopup.vue";
import { defineAsyncComponent } from "vue";
import { bindPopover } from "./windows.js";
const BindPopover = defineAsyncComponent(() => import("../panel/bind/BindPopover.vue"));
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
			<div class="max-h-[min(440px,60vh)] overflow-y-auto"><BindPopover /></div>
		</template>
	</DraggablePopup>
</template>
