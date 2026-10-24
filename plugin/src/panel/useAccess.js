import { onMounted, shallowRef } from "vue";
import { getAccess } from "../cms/access.js";

/** What this user can do. Every right is false until the read answers, so nothing shows that the user cannot use. */
export const useAccess = () => {
	const access = shallowRef({});
	onMounted(async () => (access.value = await getAccess()));
	return access;
};
