/**
 * One data source of a page, as Studio has them: a Document List or a
 * Document, read from any doctype.
 *
 * The page data script reads it for the published page, with
 * `frappe.db.get_all`. A visitor is a Guest, so the read skips permissions:
 * the fields and filters chosen here are what decide what a visitor sees.
 */

import { isIdentifier, PythonExpression, toPython } from "./python.js";

/**
 * A reference reads the title of the entry it links to, under its own name, so
 * a block bound to `topic` shows "News" and not the entry's name. A filter on
 * `topic` still compares the stored name.
 */
const getReadField = ({ fieldname, fieldtype, title_field }) =>
	fieldtype === "Link" && title_field
		? `${fieldname}.${title_field} as ${fieldname}`
		: fieldname;

/** The key a read field gives a row: `topic` for `topic.title as topic`. */
export const getReadKey = (readField) => readField.split(" as ").pop();

/**
 * The fields a data source reads. `name` always comes, so a row has a key. A
 * multi-reference has no column, so a plain read cannot name it.
 */
export const getSourceFieldnames = (fields) => [
	...new Set([
		"name",
		...fields.filter((field) => field.fieldtype !== "Table MultiSelect").map(getReadField),
	]),
];

/** A filter value of `{{ route.slug }}` reads the route variable of the page. */
const ROUTE_VALUE = /^\{\{\s*route\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/;

/**
 * A filter value that reads the entry a collection page shows. The `entry`
 * section runs first in the script, so `data.entry` is there for every list.
 */
export const CURRENT_ENTRY = "{{ entry.name }}";

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
		// the filters match when any one holds, not all of them
		matchAny = false,
		// sections saved before a collection could name its published field
		publishedOnly = false,
	} = {}) {
		publishedField ??= publishedOnly ? "published" : null;
		Object.assign(this, {
			name,
			type,
			doctype,
			fields,
			filters,
			orderBy,
			limit,
			link,
			publishedField,
			matchAny,
		});
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
		if (!isIdentifier(this.name))
			throw new Error("Use letters, digits, and _ for the name, such as posts.");
		if (!this.doctype) throw new Error("Pick a doctype.");
		if (!this.fields.length) throw new Error("Pick at least one field.");
		if (this.isList && !(this.limit > 0)) throw new Error("Give the list a limit above 0.");
		const linksTo = this.link?.page || this.link?.collection;
		if (this.link && !(linksTo && this.link.field))
			throw new Error("Pick the page and the field to link to.");
	}

	getFilterValue(value, forPreview) {
		if (value === CURRENT_ENTRY)
			return new PythonExpression(`(data.get("entry") or {}).get("name")`);
		const route = typeof value === "string" && value.match(ROUTE_VALUE);
		if (!route) return value;
		return forPreview
			? undefined
			: new PythonExpression(`frappe.form_dict.get(${toPython(route[1])})`);
	}

	/**
	 * Frappe filter rows, so one field can hold more than one filter, such as a
	 * date range. The preview leaves out route filters: the editor has no route.
	 */
	getFilters(forPreview = false, publishedOnly = true) {
		// a setting, not a filter row, so nobody removes it by mistake and puts drafts on a public page
		const published =
			this.publishedField && publishedOnly ? [[this.publishedField, "=", 1]] : [];
		return [...published, ...(this.matchAny ? [] : this.getRows(forPreview))];
	}

	/** With `matchAny`, the rows go to `or_filters`. The published filter still holds for each entry. */
	getOrFilters(forPreview = false) {
		return this.matchAny ? this.getRows(forPreview) : [];
	}

	getRows(forPreview) {
		return this.filters.flatMap(([field, operator, value]) => {
			const sent = this.getFilterValue(value, forPreview);
			return sent === undefined ? [] : [[field, operator, sent]];
		});
	}

	get hasRouteFilter() {
		return this.filters.some(
			([, , value]) => typeof value === "string" && ROUTE_VALUE.test(value)
		);
	}

	getReadCall(filters = toPython(this.getFilters())) {
		const limit = this.isList ? this.limit : 1;
		return [
			`frappe.db.get_all(`,
			`    ${toPython(this.doctype)},`,
			`    filters=${filters},`,
			...(this.getOrFilters().length
				? [`    or_filters=${toPython(this.getOrFilters())},`]
				: []),
			`    fields=${toPython(this.readFields)},`,
			`    order_by=${toPython(this.orderBy)},`,
			`    limit_page_length=${limit},`,
			`)`,
		];
	}

	/**
	 * The page a row links to. A collection names its collection page in its
	 * settings, read on each request, so a list links as soon as the collection page
	 * exists, and still links after it moves. Before that, `fallback` gives the
	 * route under the collection URL, such as `/user/:slug`.
	 */
	getLinkPageLines(routeVariable) {
		const { page, collection } = this.link;
		if (!collection) return { lines: [], page: toPython(page), fallback: '""' };
		const settings = `cms_${this.name}_collection`;
		const variable = `cms_${this.name}_page`;
		const read = `frappe.db.get_all("CMS Collection", filters={"collection": ${toPython(
			collection
		)}}, fields=["entry_page", "url"])`;
		const url = `${settings}.get("url")`;
		return {
			lines: [
				`${settings} = (${read} or [{}])[0]`,
				`${variable} = ${settings}.get("entry_page") or ""`,
			],
			page: variable,
			fallback: `((${url} or "").rstrip("/") + ${toPython(
				`/:${routeVariable}`
			)} if ${url} else "")`,
		};
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
		const { lines, page, fallback } = this.getLinkPageLines(variable);
		const read = `frappe.db.get_all("Builder Page", filters={"name": ${page}}, fields=["route"])`;
		const path = `"/" + ${route}.lstrip("/").replace(${toPython(
			`:${variable}`
		)}, ${value}).replace(${toPython(`<${variable}>`)}, ${value})`;
		return [
			...lines,
			`${route} = (${read} or [{}])[0].get("route") or ${fallback}`,
			`data.${this.name} = [`,
			// a route without the variable cannot name a row, so the row gets no link
			`    dict(row, url=(${path}) if ${toPython(`:${variable}`)} in ${route} or ${toPython(
				`<${variable}>`
			)} in ${route} else "")`,
		];
	}

	/**
	 * One entry. `in_preview` is true in the editor, which shows drafts too. A live
	 * page whose route names no entry answers 404.
	 */
	getEntryLines() {
		const filters = `cms_${this.name}_filters`;
		const rows = `cms_${this.name}_rows`;
		const published = this.publishedField
			? [
					`if not in_preview:`,
					`    ${filters}.append([${toPython(this.publishedField)}, "=", 1])`,
			  ]
			: [];
		const missing = [
			`if not ${rows} and not in_preview:`,
			`    raise frappe.PageDoesNotExistError("No entry at this address.")`,
		];
		return [
			`${filters} = ${toPython(this.getFilters(false, false))}`,
			...published,
			`${rows} = ${this.getReadCall(filters).join("\n")}`,
			...(this.hasRouteFilter ? missing : []),
			`data.${this.name} = (${rows} or [{}])[0]`,
		];
	}

	/** The Python of the section. A list with a link adds `url` to each row. */
	toPython() {
		if (!this.isList) return this.getEntryLines().join("\n");
		const read = this.getReadCall();
		if (!this.link) return [`data.${this.name} = ${read[0]}`, ...read.slice(1)].join("\n");
		return [...this.getLinkLines(), `    for row in ${read.join("\n    ")}`, `]`].join("\n");
	}

	/** The options of a frappe-ui `createListResource`, for the editor preview. */
	getPreviewOptions() {
		return {
			doctype: this.doctype,
			fields: this.readFields,
			// like the script in the editor, one entry may be a draft
			filters: this.getFilters(true, this.isList),
			orderBy: this.orderBy,
			pageLength: this.isList ? this.limit : 1,
		};
	}

	toJSON() {
		const {
			name,
			type,
			doctype,
			fields,
			filters,
			orderBy,
			limit,
			link,
			publishedField,
			matchAny,
		} = this;
		return {
			name,
			type,
			doctype,
			fields,
			filters,
			orderBy,
			limit,
			link,
			publishedField,
			matchAny,
		};
	}
}
