<template>
	<!-- the dots show the wait. The label is for screen readers -->
	<div class="flex flex-1 items-center justify-center py-10" role="status" :aria-label="label">
		<!-- the same three dots that Builder shows while it loads a plugin frame -->
		<svg class="h-6 w-6 text-ink-gray-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
			<circle v-for="(begin, index) in [0, 0.33, 0.67]" :key="index" :cx="6 + index * 6" cy="12" r="0" fill="currentColor">
				<animate
					attributeName="r"
					:begin="begin"
					calcMode="spline"
					dur="1.5s"
					keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
					repeatCount="indefinite"
					values="0;2;0;0"
				/>
			</circle>
		</svg>
	</div>
</template>

<script setup>
defineProps({ label: { type: String, required: true } });
</script>
