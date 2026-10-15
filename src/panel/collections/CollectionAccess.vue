<template>
	<section class="flex flex-col gap-2 border-t border-outline-gray-1 pt-4">
		<span class="cms-section-label">Access</span>
		<p class="cms-hint">
			Roles that can read and change its entries. System Manager and Website Manager always can. Create
			roles and give them to users in Desk.
		</p>
		<MultiSelect
			v-model="roles"
			class="w-full"
			:options="options"
			placeholder="Choose roles…"
			:disabled="isRunning"
		/>
		<Button v-if="isChanged" variant="solid" label="Save" :loading="isRunning" @click="save" />
		<Button
			variant="ghost"
			icon-left="lucide-external-link"
			label="Manage roles in Desk"
			@click="builder.ui.openUrl('/app/role')"
		/>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</section>
</template>

<script setup>
import builder from "frappe-builder-extension-sdk";
import { Button, MultiSelect } from "frappe-ui";
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { forgetSchema, getDoctype } from "../../data/doctypes.js";
import { useTask } from "../useTask.js";

/** They always keep access, so the picker leaves them out. */
const DEFAULT_ROLES = ["System Manager", "Website Manager"];

const props = defineProps({ collection: { type: Object, required: true } });
const roles = ref([]);
const savedRoles = ref([]);
const grantable = shallowRef([]);
const { isRunning, error, run } = useTask();

const withoutDefaults = (list) => list.filter((role) => !DEFAULT_ROLES.includes(role));
// a role that already has access stays listed, though this user may not grant it, so a save keeps it
const options = computed(() =>
	[...new Set([...grantable.value, ...savedRoles.value])].map((role) => ({ label: role, value: role })),
);
const isChanged = computed(() => [...roles.value].sort().join() !== [...savedRoles.value].sort().join());

const show = (doctype) => {
	savedRoles.value = withoutDefaults(doctype.roles ?? []);
	roles.value = [...savedRoles.value];
};

const loadRoles = async () => (grantable.value = withoutDefaults(await builder.schema.listRoles()));

onMounted(() =>
	run(async () => {
		const [doctype] = await Promise.all([getDoctype(props.collection.doctype), loadRoles()]);
		show(doctype);
	}),
);

// a role made in Desk shows up when the user comes back to this frame
const reloadRoles = () => run(loadRoles);
window.addEventListener("focus", reloadRoles);
onUnmounted(() => window.removeEventListener("focus", reloadRoles));

/** Builder asks the user first, and names the roles. */
const save = () =>
	run(async () => {
		// a plain copy: a message to Builder cannot carry a Vue proxy
		const doctype = await builder.schema.setAccess(props.collection.doctype, [...roles.value]);
		forgetSchema(props.collection.doctype);
		show(doctype);
	}, "Access saved");
</script>
