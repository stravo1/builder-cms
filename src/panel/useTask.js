import builder from "frappe-builder-extension-sdk";
import { ref } from "vue";

/** Runs one async task at a time, and shows its error as a Builder toast. */
export const useTask = () => {
	const isRunning = ref(false);

	const run = async (task, success) => {
		isRunning.value = true;
		try {
			const result = await task();
			if (success) builder.ui.toast(success, { type: "success" });
			return result;
		} catch (error) {
			builder.ui.toast(error.message || String(error), { type: "error" });
		} finally {
			isRunning.value = false;
		}
	};

	return { isRunning, run };
};
