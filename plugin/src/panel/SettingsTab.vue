<template>
	<SectionLoader v-if="!access" label="Loading access" />
	<div v-else class="cms-form-column px-3 py-6">
		<RoleAccess
			:saved="access.cms_roles"
			:on-save="saveCmsRoles"
			hint="These roles create and manage every collection."
		/>
	</div>
	<p v-if="error" role="alert" class="cms-error p-3">{{ error }}</p>
</template>

<script setup>
import { onMounted, shallowRef } from "vue";
import { getAccess, saveCmsRoles } from "../cms/access.js";
import RoleAccess from "./RoleAccess.vue";
import SectionLoader from "./SectionLoader.vue";
import { useTask } from "./useTask.js";

/** Only a manager opens this tab, so the access holds the roles. */
const access = shallowRef(null);
const { error, run } = useTask();

onMounted(() => run(async () => (access.value = await getAccess())));
</script>
