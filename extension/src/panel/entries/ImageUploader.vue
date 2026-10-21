<template>
	<Button
		variant="ghost"
		:icon="isRunning ? undefined : 'lucide-upload'"
		:loading="isRunning"
		label="Upload image"
		:disabled="disabled"
		@click="input.click()"
	/>
	<input ref="input" type="file" accept="image/*" class="hidden" @change="upload" />
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button } from "frappe-ui";
import { ref } from "vue";
import { useTask } from "../useTask.js";

defineProps({ disabled: Boolean });
const emit = defineEmits(["upload"]);
const input = ref(null);
const { isRunning, run } = useTask();

const upload = async (event) => {
	const [file] = event.target.files;
	event.target.value = "";
	if (!file) return;
	const uploaded = await run(() => builder.data.uploadFile(file));
	if (uploaded) emit("upload", uploaded.fileUrl);
};
</script>
