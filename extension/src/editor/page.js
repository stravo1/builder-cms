import { usePageStore } from "builder";
import router from "builder/internal/router";
import { call } from "frappe-ui";
import { assertWritable } from "./canvas.js";

export const refreshPageData = async () => {
	const store = usePageStore();
	if (!store.activePage) return;
	const page = await call("frappe.client.get", { doctype: "Builder Page", name: store.activePage.name });
	if (store.activePage?.name !== page.name) return;
	Object.assign(store.activePage, { page_data_script: page.page_data_script, route: page.route });
	await store.setPageData(store.activePage);
};

export const openPage = async (name) => {
	const store = usePageStore();
	if (store.activePage?.name !== name) {
		if (store.savingPage) await store.waitTillPageIsSaved();
		await store.setPage(name);
		if (store.activePage?.name !== name) throw new Error("The page could not open.");
	}
	await router.push({ name: "builder", params: { pageId: name } });
};

export const setRouteVariables = async (variables) => {
	const store = usePageStore();
	if (!store.activePage) throw new Error("Open a page first.");
	Object.assign(store.routeVariables, variables);
	localStorage.setItem(`${store.activePage.name}:routeVariables`, JSON.stringify(store.routeVariables));
	await store.setPageData(store.activePage);
};

export const updatePageDocument = async (name, patch) => {
	const store = usePageStore();
	if (store.activePage?.name === name) {
		assertWritable();
		if (store.savingPage) await store.waitTillPageIsSaved();
	}
	const page = await call("frappe.client.set_value", { doctype: "Builder Page", name, fieldname: patch });
	if (store.activePage?.name === name) {
		Object.assign(store.activePage, patch);
		if ("route" in patch) store.route = patch.route;
		if ("page_data_script" in patch) await store.setPageData(store.activePage);
	}
	return page;
};
