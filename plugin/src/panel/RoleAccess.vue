<template>
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between gap-2">
			<span class="cms-section-label">Access</span>
			<Button
				variant="ghost"
				size="sm"
				icon="lucide-external-link"
				tooltip="Manage roles in Desk"
				aria-label="Manage roles in Desk"
				@click="openUrl('/app/role')" />
		</div>
		<p class="cms-hint">{{ hint }}</p>
		<MultiSelect
			v-model="roles"
			class="w-full"
			:options="options"
			placeholder="Choose roles…"
			:disabled="isRunning" />
		<Button
			v-if="isChanged"
			class="self-start"
			variant="solid"
			label="Save"
			:loading="isRunning"
			@click="save" />
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import { openUrl } from "../editor/windows.js";

import { Button, MultiSelect } from "frappe-ui";
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { forgetAccess, getAccess } from "../cms/access.js";
import { useTask } from "./useTask.js";

/**
 * Roles to pick, without System Manager and Website Manager, which always
 * have access. `hint` says what the roles can do. `onSave` writes the roles
 * and answers with the saved ones.
 */
const props = defineProps({
	hint: { type: String, required: true },
	saved: { type: Array, required: true },
	onSave: { type: Function, required: true },
});
const savedRoles = ref([...props.saved]);
const roles = ref([...props.saved]);
const assignable = shallowRef([]);
const { isRunning, error, run } = useTask();

// a role that already has access stays listed, though Frappe may refuse it now, so a save keeps it
const options = computed(() =>
	[...new Set([...assignable.value, ...savedRoles.value])].map((role) => ({ label: role, value: role })),
);
const isChanged = computed(() => [...roles.value].sort().join() !== [...savedRoles.value].sort().join());

const loadRoles = () => run(async () => (assignable.value = (await getAccess()).assignable_roles));
const reloadRoles = () => {
	forgetAccess();
	return loadRoles();
};

onMounted(() => {
	loadRoles();
	window.addEventListener("focus", reloadRoles);
});
onUnmounted(() => window.removeEventListener("focus", reloadRoles));

const save = () =>
	run(async () => {
		// a plain copy: a request body cannot carry a Vue proxy
		savedRoles.value = await props.onSave([...roles.value]);
		roles.value = [...savedRoles.value];
	}, "Access saved");
</script>
