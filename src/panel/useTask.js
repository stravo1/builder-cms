import builder from "frappe-builder-extension-sdk";
import { ref } from "vue";

/** Tracks pending work and shows failures in the view and a Builder toast. */
export const useTask = () => {
	const isRunning = ref(false);
	const error = ref("");
	let pending = 0;

	const run = async (task, success) => {
		pending++;
		isRunning.value = true;
		error.value = "";
		try {
			const result = await task();
			if (success) builder.ui.toast(success, { type: "success" });
			return result;
		} catch (cause) {
			error.value = cause.message || String(cause);
			builder.ui.toast(error.value, { type: "error" });
		} finally {
			isRunning.value = --pending > 0;
		}
	};

	return { isRunning, error, run };
};
