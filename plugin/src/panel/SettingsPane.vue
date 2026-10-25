<template>
	<div class="flex flex-col gap-2">
		<SectionLoader v-if="!access" label="Loading access" />
		<RoleAccess
			v-else-if="access.is_manager"
			:saved="access.cms_roles"
			:on-save="saveCmsRoles"
			hint="These roles create and manage every collection."
		/>
		<p v-else class="cms-hint">Only a System Manager or a Website Manager can change who uses the CMS.</p>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import { onMounted, shallowRef } from "vue";
import { getAccess, saveCmsRoles } from "../cms/access.js";
import RoleAccess from "./RoleAccess.vue";
import SectionLoader from "./SectionLoader.vue";
import { useTask } from "./useTask.js";

const access = shallowRef(null);
const { error, run } = useTask();

onMounted(() => run(async () => (access.value = await getAccess())));
</script>
