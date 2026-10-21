import { shallowRef } from "vue";

export const bindPopover = shallowRef(false);
export const collectionDialog = shallowRef(null);
let finishDialog;

export const openBindPopover = () => {
	bindPopover.value = true;
};
export const closeCollectionDialog = () => {
	collectionDialog.value = null;
	finishDialog?.();
	finishDialog = null;
};
export const openCollectionDialog = (options) => {
	closeCollectionDialog();
	collectionDialog.value = options;
	return new Promise((resolve) => {
		finishDialog = resolve;
	});
};
export const openUrl = (url) => window.open(url, "_blank", "noopener,noreferrer");
