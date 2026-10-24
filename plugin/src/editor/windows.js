import { shallowRef } from "vue";

export const bindPopover = shallowRef(false);

export const openBindPopover = () => {
	bindPopover.value = true;
};
export const openUrl = (url) => window.open(url, "_blank", "noopener,noreferrer");
