/** The doctypes and fields a data source can read. */

import builder from "frappe-builder-extension-sdk";
import { cached, forget } from "./cache.js";

/**
 * Fields with no database column, as `frappe.model.no_value_fields` lists them.
 * A read that names one fails, and it takes the whole page data down with it.
 */
const NO_VALUE_TYPES = new Set([
	"Section Break",
	"Column Break",
	"Tab Break",
	"Attachment Gallery",
	"HTML",
	"Table",
	"Table MultiSelect",
	"Button",
	"Image",
	"Fold",
	"Heading",
]);

/** A doctype as the schema API gives it. */
export const getDoctype = (doctype) => cached(`doctype:${doctype}`, () => builder.schema.getDoctype(doctype));

/** The doctypes this extension made, whether or not each still exists. */
export const listMadeDoctypes = () => cached("made-doctypes", () => builder.schema.listDoctypes());

/** After a schema write: the doctype, the lists of doctypes, and the collections built on them. */
export const forgetSchema = (doctype) => forget(`doctype:${doctype}`, "made-doctypes", "doctype-names", "collections");

/** Child tables are left out. Their rows belong to a parent document. */
export const getDoctypeNames = () => cached("doctype-names", readDoctypeNames);

const readDoctypeNames = async () => {
	const names = [];
	while (true) {
		const rows = await builder.data.getList("DocType", {
			fields: ["name"],
			filters: { istable: 0, issingle: 0 },
			orderBy: "name asc",
			pageLength: 500,
			start: names.length,
		});
		names.push(...rows.map((row) => row.name));
		if (rows.length < 500) return names;
	}
};

/**
 * Secrets. A collection is public: a list renders every field it binds to any
 * visitor. So a password, a reset key, or an API key must never be offered.
 * The name test is broad on purpose. A field it drops can still be read by hand.
 */
const SECRET_NAME = /password|secret|token|api_key|_key$/;

export const isSecretField = (field) => field.fieldtype === "Password" || SECRET_NAME.test(field.fieldname);

/** The fields that hold a value, so a read can name them, and that are safe to publish. */
export const getDoctypeFields = async (doctype) => {
	const { fields } = await getDoctype(doctype);
	return fields.filter((field) => field.fieldname && !NO_VALUE_TYPES.has(field.fieldtype) && !isSecretField(field));
};

const MULTILINE_TYPES = new Set(["Small Text", "Text", "Long Text", "Text Editor", "Markdown Editor", "Code"]);

export const isMultilineField = (field) => MULTILINE_TYPES.has(field.fieldtype);

const EDITABLE_TYPES = new Set([
	"Data",
	...MULTILINE_TYPES,
	"Attach",
	"Attach Image",
	"Date",
	"Datetime",
	"Time",
	"Int",
	"Float",
	"Currency",
	"Percent",
	"Check",
	"Select",
	"Link",
	"Dynamic Link",
]);

export const getWritableFields = (fields) =>
	fields.filter((field) => !field.read_only && EDITABLE_TYPES.has(field.fieldtype));
