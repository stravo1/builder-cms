/**
 * Writes JavaScript values as Python literals for the page data script.
 *
 * JSON is close, but not equal: `true`, `false`, and `null` are not Python.
 */

/** A Python expression to put in place as it is, such as `frappe.form_dict.get("slug")`. */
export class PythonExpression {
	constructor(code) {
		this.code = code;
	}
}

export const toPython = (value) => {
	if (value instanceof PythonExpression) return value.code;
	if (value === null || value === undefined) return "None";
	if (value === true) return "True";
	if (value === false) return "False";
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "None";
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(toPython).join(", ")}]`;
	const entries = Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${toPython(item)}`);
	return `{${entries.join(", ")}}`;
};

const KEYWORDS = new Set(
	"False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(
		" ",
	),
);

/** A data source name becomes `data.<name>` in Python and a key in a binding. */
export const isIdentifier = (name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !KEYWORDS.has(name);
