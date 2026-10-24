import { onBeforeUnmount, shallowRef } from "vue";

/**
 * A two-click confirm. The first click on `key` arms it, and a second click
 * confirms. It disarms after `timeout`, so a late click asks again.
 */
export const useArmedClick = (timeout = 3000) => {
	const armed = shallowRef(null);
	let timer;
	const disarm = () => {
		clearTimeout(timer);
		armed.value = null;
	};
	/** True on the click that confirms. */
	const confirm = (key = true) => {
		if (armed.value === key) {
			disarm();
			return true;
		}
		disarm();
		armed.value = key;
		timer = setTimeout(disarm, timeout);
		return false;
	};
	onBeforeUnmount(disarm);
	return { armed, confirm };
};
