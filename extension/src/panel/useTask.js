import builder from "frappe-builder-extension-sdk";
import { ref } from "vue";
import { hasCopy, showThenRefresh } from "../data/cache.js";

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

	/**
	 * Like `run` for the first read of `key`. After that, the last copy shows at
	 * once and the fresh read replaces it, with no loading state and no toast.
	 */
	const runCached = (key, read, show) => {
		if (!hasCopy(key)) return run(() => showThenRefresh(key, read, show));
		return showThenRefresh(key, read, show).catch((cause) => (error.value = cause.message || String(cause)));
	};

	return { isRunning, error, run, runCached };
};
