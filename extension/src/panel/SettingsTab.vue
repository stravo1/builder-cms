<template>
	<SectionLoader v-if="isRunning && !isChecked" label="Loading access" />
	<p v-else-if="!hasSettings" class="cms-hint p-3">Create a collection first. Then choose who can use the CMS here.</p>
	<div v-else class="p-3">
		<RoleAccess
			:doctype="SETTINGS_DOCTYPE"
			hint="Roles that can use the CMS."
		/>
	</div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { SETTINGS_DOCTYPE } from "../cms/settings.js";
import { listMadeDoctypes } from "../data/doctypes.js";
import RoleAccess from "./RoleAccess.vue";
import SectionLoader from "./SectionLoader.vue";
import { useTask } from "./useTask.js";

// the settings doctype comes with the first collection. Opening this tab must not create it
const hasSettings = ref(false);
const isChecked = ref(false);
const { isRunning, run } = useTask();

onMounted(() =>
	run(async () => {
		hasSettings.value = (await listMadeDoctypes()).some((row) => row.doctype === SETTINGS_DOCTYPE && row.exists);
		isChecked.value = true;
	}),
);
</script>
