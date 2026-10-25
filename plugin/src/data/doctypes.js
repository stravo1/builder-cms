/** The doctypes and fields a data source can read, and how the panel shows a field. */

import { api } from "./api.js";
import { cached } from "./cache.js";
import { getMetadata } from "./documents.js";

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

/** A doctype's meta, with its fields. */
export const getDoctype = (doctype) => cached(`doctype:${doctype}`, () => getMetadata(doctype));

/** The doctypes a manager can map. Child tables and Singles are left out. */
export const getDoctypeNames = () => cached("doctype-names", api.getDoctypeNames);

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
	return fields.filter(
		(field) => field.fieldname && !NO_VALUE_TYPES.has(field.fieldtype) && !isSecretField(field),
	);
};

const MULTILINE_TYPES = new Set([
	"Small Text",
	"Text",
	"Long Text",
	"Text Editor",
	"Markdown Editor",
	"Code",
]);

export const isMultilineField = (field) => MULTILINE_TYPES.has(field.fieldtype);

const NUMBER_TYPES = new Set(["Int", "Float", "Currency", "Percent"]);

export const isNumberField = (field) => NUMBER_TYPES.has(field.fieldtype);

export const getFieldLabel = (field) => field.label || field.fieldname;

/** A field as an option of a picker. */
export const toFieldOption = (field) => ({ label: getFieldLabel(field), value: field.fieldname });

/** The choices of a Select field, with an empty choice first. */
export const getSelectOptions = (field) => ["", ...(field.options || "").split("\n").filter(Boolean)];

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
