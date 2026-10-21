import { useBuilderStore } from "builder";
import { call, frappeRequest } from "frappe-ui";
import { updatePageDocument } from "../editor/page.js";

export const getDocument = (doctype, name) => call("frappe.client.get", { doctype, name });
export const getDocuments = (doctype, options = {}) => {
	const { pageLength, orderBy, start, ...params } = options;
	return call("frappe.client.get_list", {
		doctype,
		...params,
		limit_page_length: pageLength ?? 20,
		limit_start: start ?? 0,
		order_by: orderBy,
	});
};
export const updateDocument = (doctype, name, values) =>
	doctype === "Builder Page"
		? updatePageDocument(name, values)
		: call("frappe.client.set_value", { doctype, name, fieldname: values });

export const getMetadata = async (doctype) => {
	const response = await frappeRequest({
		url: "/api/method/frappe.desk.form.load.getdoctype",
		params: { doctype },
	});
	const metadata = response.docs?.find((doc) => doc.doctype === "DocType" && doc.name === doctype);
	if (!metadata) throw new Error(`Could not load fields for ${doctype}.`);
	return metadata;
};

const subscriptions = new Map();
export const subscribeDocuments = (doctype, callback) => {
	const realtime = useBuilderStore().realtime;
	let callbacks = subscriptions.get(doctype);
	if (!callbacks) {
		callbacks = new Set();
		subscriptions.set(doctype, callbacks);
		realtime.emit("doctype_subscribe", doctype);
	}
	const onUpdate = (event) => {
		if (event.doctype === doctype) callback(event);
	};
	callbacks.add(onUpdate);
	realtime.on("list_update", onUpdate);
	return () => {
		if (!callbacks.delete(onUpdate)) return;
		realtime.off("list_update", onUpdate);
		if (!callbacks.size) {
			subscriptions.delete(doctype);
			realtime.emit("doctype_unsubscribe", doctype);
		}
	};
};
