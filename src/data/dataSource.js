/**
 * One data source of a page, as Studio has them: a Document List or a
 * Document, read from any doctype.
 *
 * The page data script reads it for the published page, with
 * `frappe.db.get_all`. A visitor is a Guest, so the read skips permissions:
 * the fields and filters chosen here are what decide what a visitor sees.
 */

import { isIdentifier, PythonExpression, toPython } from "./python.js";

export const SOURCE_TYPES = ["Document List", "Document"];
export const OPERATORS = ["=", "!=", "like", "not like", ">", ">=", "<", "<=", "is"];

/** A filter value of `{{ route.slug }}` reads the route variable of the page. */
const ROUTE_VALUE = /^\{\{\s*route\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/;

export class DataSource {
	constructor({
		name = "",
		type = "Document List",
		doctype = "",
		fields = [],
		filters = [],
		orderBy = "creation desc",
		limit = 20,
		link = null,
		publishedField = null,
		// sections saved before a collection could name its published field
		publishedOnly = false,
	} = {}) {
		publishedField ??= publishedOnly ? "published" : null;
		Object.assign(this, { name, type, doctype, fields, filters, orderBy, limit, link, publishedField });
	}

	get isList() {
		return this.type === "Document List";
	}

	/** The fields to read. `name` always comes, so a row has a key. */
	get readFields() {
		return [...new Set(["name", ...this.fields, ...(this.link ? [this.link.field] : [])])];
	}

	/** Throws the first problem, in words a user can act on. */
	validate() {
		if (!isIdentifier(this.name)) throw new Error("Use letters, digits, and _ for the name, such as posts.");
		if (!this.doctype) throw new Error("Pick a doctype.");
		if (!this.fields.length) throw new Error("Pick at least one field.");
		if (this.isList && !(this.limit > 0)) throw new Error("Give the list a limit above 0.");
		const linksTo = this.link?.page || this.link?.collection;
		if (this.link && !(linksTo && this.link.field)) throw new Error("Pick the page and the field to link to.");
	}

	getFilterValue(value, forPreview) {
		const route = typeof value === "string" && value.match(ROUTE_VALUE);
		if (!route) return value;
		return forPreview ? undefined : new PythonExpression(`frappe.form_dict.get(${toPython(route[1])})`);
	}

	/** The Frappe filter form. The preview leaves out route filters: the editor has no route. */
	getFilters(forPreview = false) {
		// a setting, not a filter row, so nobody removes it by mistake and puts drafts on a public page
		const filters = this.publishedField ? { [this.publishedField]: 1 } : {};
		for (const [field, operator, value] of this.filters) {
			const sent = this.getFilterValue(value, forPreview);
			if (sent === undefined) continue;
			filters[field] = operator === "=" ? sent : [operator, sent];
		}
		return filters;
	}

	getReadCall() {
		const limit = this.isList ? this.limit : 1;
		return [
			`frappe.db.get_all(`,
			`    ${toPython(this.doctype)},`,
			`    filters=${toPython(this.getFilters())},`,
			`    fields=${toPython(this.readFields)},`,
			`    order_by=${toPython(this.orderBy)},`,
			`    limit_page_length=${limit},`,
			`)`,
		];
	}

	/**
	 * The page a row links to. A collection names its collection page in its
	 * settings, read on each request, so a list links as soon as the collection page
	 * exists, and still links after it moves.
	 */
	getLinkPageLines() {
		const { page, collection } = this.link;
		if (!collection) return { lines: [], page: toPython(page) };
		const variable = `cms_${this.name}_page`;
		const read = `frappe.db.get_all("CMS Collection", filters={"collection": ${toPython(collection)}}, fields=["entry_page"])`;
		return { lines: [`${variable} = (${read} or [{}])[0].get("entry_page") or ""`], page: variable };
	}

	/**
	 * The route of the linked page is read on each request too, so a route
	 * change never breaks a link. `field` gives the value, and `variable` names
	 * the route variable it fills: a Blog Post's `route` field fills `:slug`.
	 */
	getLinkLines() {
		const { field, variable = field } = this.link;
		const value = `str(row.get(${toPython(field)}) or "")`;
		const route = `cms_${this.name}_route`;
		const { lines, page } = this.getLinkPageLines();
		const read = `frappe.db.get_all("Builder Page", filters={"name": ${page}}, fields=["route"])`;
		const path = `"/" + ${route}.lstrip("/").replace(${toPython(`:${variable}`)}, ${value}).replace(${toPython(`<${variable}>`)}, ${value})`;
		return [
			...lines,
			`${route} = (${read} or [{}])[0].get("route") or ""`,
			`data.${this.name} = [`,
			// a route without the variable cannot name a row, so the row gets no link
			`    dict(row, url=(${path}) if ${toPython(`:${variable}`)} in ${route} or ${toPython(`<${variable}>`)} in ${route} else "")`,
		];
	}

	/** The Python of the section. A list with a link adds `url` to each row. */
	toPython() {
		const read = this.getReadCall();
		if (!this.isList) return [`data.${this.name} = (${read[0]}`, ...read.slice(1, -1), `) or [{}])[0]`].join("\n");
		if (!this.link) return [`data.${this.name} = ${read[0]}`, ...read.slice(1)].join("\n");
		return [...this.getLinkLines(), `    for row in ${read.join("\n    ")}`, `]`].join("\n");
	}

	/** The options of a frappe-ui `createListResource`, for the editor preview. */
	getPreviewOptions() {
		return {
			doctype: this.doctype,
			fields: this.readFields,
			filters: this.getFilters(true),
			orderBy: this.orderBy,
			pageLength: this.isList ? this.limit : 1,
		};
	}

	toJSON() {
		const { name, type, doctype, fields, filters, orderBy, limit, link, publishedField } = this;
		return { name, type, doctype, fields, filters, orderBy, limit, link, publishedField };
	}
}
