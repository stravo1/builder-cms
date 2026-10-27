/**
 * The filters of a list in the framework's filter control. A data source keeps
 * each one as a Frappe filter row: `[fieldname, operator, value]`.
 */

import { CURRENT_ENTRY } from "../data/dataSource.js";

/** The entry that a collection page shows, offered as a field, so a post page can list the other posts. */
export const ENTRY_FIELD = {
	fieldname: "cms_current_entry",
	label: "Entry",
	fieldtype: "Select",
	options: "Current entry",
};

const mapRows = (filters, change) => filters.map((row) => change(row) ?? row);

/** The rows as the control reads them: a filter on the current entry is a filter on the Entry field. */
export const toControlFilters = (filters) =>
	mapRows(filters, ([, operator, value]) =>
		value === CURRENT_ENTRY ? [ENTRY_FIELD.fieldname, operator, ENTRY_FIELD.options] : null
	);

/** The rows as the data source keeps them. */
export const toSourceFilters = (filters) =>
	mapRows(filters, ([fieldname, operator]) =>
		fieldname === ENTRY_FIELD.fieldname ? ["name", operator, CURRENT_ENTRY] : null
	);

/** A field in the shape the control takes. */
export const toFilterField = ({ fieldname, label, fieldtype, options }) => ({
	label,
	value: fieldname,
	fieldname,
	fieldtype,
	options,
});

/** Operators that need a range or a period control, which the filter rows do not have. */
export const LEFT_OUT_OPERATORS = ["between", "timespan"];

const SET_OPTIONS = [
	{ label: "Set", value: "set" },
	{ label: "Not set", value: "not set" },
];
const YES_NO_OPTIONS = [
	{ label: "Yes", value: "Yes" },
	{ label: "No", value: "No" },
];
const NUMBER_TYPES = ["Int", "Float", "Currency", "Percent"];

/** The control for a value: a select with `options`, or an input of `type`. */
export const getValueInput = (field, operator) => {
	if (operator === "is" || operator === "is not") return { options: SET_OPTIONS };
	if (field?.fieldtype === "Check") return { options: YES_NO_OPTIONS };
	if (field?.fieldtype === "Select") {
		return {
			options: (field.options || "")
				.split("\n")
				.filter(Boolean)
				.map((value) => ({ label: value, value })),
		};
	}
	if (NUMBER_TYPES.includes(field?.fieldtype)) return { type: "number" };
	if (field?.fieldtype === "Date") return { type: "date" };
	return { type: "text" };
};

/** The value a row starts with after its field or operator changes. */
export const getStartValue = (field, operator) => {
	const input = getValueInput(field, operator);
	return input.options?.length ? input.options[0].value : "";
};
