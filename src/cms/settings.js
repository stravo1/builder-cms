/**
 * The settings of every collection, one row each, in a doctype this extension
 * makes. Every editor shares them, and Desk shows them.
 *
 * The published page reads this doctype too: a collection list finds the
 * collection page here on each request. So the name and the fieldnames are a contract.
 */

import builder from "frappe-builder-extension-sdk";
import { forget } from "../data/cache.js";
import { forgetSchema, getDoctype, listMadeDoctypes } from "../data/doctypes.js";

export const SETTINGS_DOCTYPE = "CMS Collection";

const SETTINGS_FIELDS = [
	{ fieldname: "collection", label: "Collection", fieldtype: "Data", reqd: true, unique: true, in_list_view: true },
	{ fieldname: "label", label: "Label", fieldtype: "Data", in_list_view: true },
	{ fieldname: "url", label: "URL", fieldtype: "Data", in_list_view: true },
	{ fieldname: "entry_page", label: "Detail page", fieldtype: "Link", options: "Builder Page" },
	{ fieldname: "index_page", label: "Index page", fieldtype: "Link", options: "Builder Page" },
	{ fieldname: "slug_field", label: "Slug field", fieldtype: "Data" },
	{ fieldname: "published_field", label: "Published field", fieldtype: "Data" },
];

const READ_FIELDS = ["name", ...SETTINGS_FIELDS.map((field) => field.fieldname)];

/**
 * Makes the doctype, or adds the fields a newer version of this extension
 * needs. It writes only when something is missing, so a panel load changes nothing.
 */
export const ensureSettingsDoctype = async () => {
	const made = await listMadeDoctypes();
	if (!made.some((row) => row.doctype === SETTINGS_DOCTYPE && row.exists)) {
		await builder.schema.createDoctype(SETTINGS_DOCTYPE, SETTINGS_FIELDS, { naming: "hash" });
		return forgetSchema(SETTINGS_DOCTYPE);
	}
	const { fields } = await getDoctype(SETTINGS_DOCTYPE);
	const missing = SETTINGS_FIELDS.filter((field) => !fields.some((each) => each.fieldname === field.fieldname));
	if (!missing.length) return;
	await builder.schema.updateDoctype(SETTINGS_DOCTYPE, missing);
	forgetSchema(SETTINGS_DOCTYPE);
};

export const getAllSettings = async () => {
	await ensureSettingsDoctype();
	return builder.data.getList(SETTINGS_DOCTYPE, { fields: READ_FIELDS, pageLength: 500 });
};

/** A collection made before the settings doctype has no row yet. The first save adds it. */
export const saveSettings = async (collection, current, patch) => {
	try {
		if (current?.name) return await builder.data.update(SETTINGS_DOCTYPE, current.name, patch);
		await ensureSettingsDoctype();
		return await builder.data.insert(SETTINGS_DOCTYPE, { collection, ...patch });
	} finally {
		// after the write, so a read that ran during it does not stay
		forget("collections");
	}
};
