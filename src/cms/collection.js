/**
 * A collection is one content type, such as "Blog Post". It is a doctype that
 * this extension made, so Frappe stores, permits, and versions its entries.
 */

import builder from "frappe-builder-extension-sdk";
import { getDoctypeFields, getWritableFields } from "../data/doctypes.js";
import { PageData } from "../data/pageData.js";
import { claimRoute } from "./routes.js";
import { ensureSettingsDoctype, getAllSettings, saveSettings, SETTINGS_DOCTYPE } from "./settings.js";

/** Our doctypes start with this, so a collection cannot take the name of a Frappe doctype. */
export const PREFIX = "CMS ";

export const FIELD_TYPES = [
	{ label: "Text", value: "Data" },
	{ label: "Long text", value: "Small Text" },
	{ label: "Rich text", value: "Text Editor" },
	{ label: "Image", value: "Attach Image" },
	{ label: "Date", value: "Date" },
	{ label: "Number", value: "Int" },
	{ label: "Yes or no", value: "Check" },
];

/** Every collection has these. The page bindings and the entry route need them. */
const STANDARD_FIELDS = [
	{ fieldname: "title", label: "Title", fieldtype: "Data", reqd: true, in_list_view: true },
	{ fieldname: "slug", label: "Slug", fieldtype: "Data", unique: true },
	{ fieldname: "published", label: "Published", fieldtype: "Check", default: 0, in_list_view: true },
];

export const slugify = (text) =>
	text
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const snakeCase = (text) => slugify(text).replace(/-/g, "_");

/**
 * Each field gets a fieldname from its label. Two fields cannot share one, and
 * `name` belongs to Frappe. `existing` holds the fieldnames a collection has.
 */
export const getCustomFields = (fields, existing = []) => {
	const taken = new Set(["name", ...STANDARD_FIELDS.map((field) => field.fieldname), ...existing]);
	return fields.map((field) => {
		const fieldname = snakeCase(field.label);
		if (!fieldname || taken.has(fieldname)) throw new Error(`Pick another name for the field "${field.label}".`);
		taken.add(fieldname);
		return { label: field.label, fieldtype: field.fieldtype, fieldname };
	});
};

/** `blog`, `/blog/`, and ` /Blog ` all become `/blog`. Each segment is a slug: `/blog/news` stays. */
export const normalizeUrl = (url) => `/${url.split("/").map(slugify).filter(Boolean).join("/")}`;

/** Marks the collections whose label another one has too, such as two "Blog Post"s. */
export const markSameLabels = (collections) => {
	for (const collection of collections) {
		collection.isLabelShared = collections.some((other) => other !== collection && other.label === collection.label);
	}
	return collections;
};

export class Collection {
	constructor(doctype, settings = null) {
		this.doctype = doctype;
		this.settings = settings;
	}

	/** The doctypes this extension made, and every doctype a user mapped, each once. */
	static async all() {
		const made = (await builder.schema.listDoctypes()).filter((row) => row.exists).map((row) => row.doctype);
		const rows = made.includes(SETTINGS_DOCTYPE) ? await getAllSettings() : [];
		// the settings doctype has the prefix too, and it is not a collection
		const owned = made.filter((doctype) => doctype.startsWith(PREFIX) && doctype !== SETTINGS_DOCTYPE);
		const doctypes = [...new Set([...owned, ...rows.map((row) => row.collection)])];
		return markSameLabels(
			doctypes.map(
				(doctype) =>
					new Collection(
						doctype,
						rows.find((row) => row.collection === doctype),
					),
			),
		);
	}

	/**
	 * Uses an existing doctype as a collection. Its rows stay where they are, and
	 * Desk edits them. `publishedField` empty means every row is public.
	 */
	static async map(doctype, { label, url, slugField, publishedField }) {
		if (!doctype || !slugField) throw new Error("Pick a doctype and its slug field.");
		const existing = await Collection.all();
		if (existing.some((collection) => collection.doctype === doctype)) {
			throw new Error(`${doctype} is a collection already.`);
		}
		const collection = new Collection(doctype);
		await collection.saveSettings({
			label: label || doctype,
			url: normalizeUrl(url || label || doctype),
			slug_field: slugField,
			published_field: publishedField || "",
		});
		return collection;
	}

	/** True for a doctype this extension made. Its entries are edited in the panel. */
	get isOwned() {
		return this.doctype.startsWith(PREFIX);
	}

	/** The label. Only when another collection has the same label, where it comes from follows it. */
	get title() {
		if (!this.isLabelShared) return this.label;
		if (this.isOwned) return `${this.label} - CMS`;
		return `${this.label} - ${this.label === this.doctype ? "doctype" : this.doctype}`;
	}

	get slugField() {
		return this.settings?.slug_field || "slug";
	}

	/** Empty when every row is public. A collection this extension made always has `published`. */
	get publishedField() {
		return this.settings?.published_field || (this.isOwned ? "published" : "");
	}

	/** Where Desk edits one row. Desk names a doctype by its slug: `blog-post`. */
	getDeskUrl(name = "new") {
		const route = slugify(this.doctype);
		return `/app/${route}/${name === "new" ? `new-${route}-1` : encodeURIComponent(name)}`;
	}

	static async create(label, url, fields) {
		if (!label) throw new Error("Give the collection a name.");
		const custom = getCustomFields(fields);
		await ensureSettingsDoctype();
		await builder.schema.createDoctype(`${PREFIX}${label}`, [...STANDARD_FIELDS, ...custom], { naming: "hash" });
		const collection = new Collection(`${PREFIX}${label}`);
		await collection.saveSettings({ url: normalizeUrl(url || label) });
		return collection;
	}

	get label() {
		return this.settings?.label || (this.isOwned ? this.doctype.slice(PREFIX.length) : this.doctype);
	}

	get url() {
		return this.settings?.url || normalizeUrl(this.label);
	}

	get collectionPage() {
		return this.settings?.entry_page || null;
	}

	get indexPage() {
		return this.settings?.index_page || null;
	}

	/** The route of the index page, such as `blog`. Builder stores a route with no leading slash. */
	get indexRoute() {
		return this.url.slice(1);
	}

	/** The route of the detail page. Builder stores a route with no leading slash. */
	get collectionPageRoute() {
		return `${this.url.slice(1)}/:slug`;
	}

	async saveSettings(patch) {
		this.settings = await saveSettings(this.doctype, this.settings, patch);
	}

	/** The index and detail pages follow the URL. Lists read the detail route on each request, so their links follow too. */
	async changeUrl(url) {
		const previous = this.settings;
		this.settings = { ...previous, url: normalizeUrl(url) };
		try {
			if (this.indexPage) await claimRoute(this.indexRoute, this.indexPage, this.indexPage);
			if (this.collectionPage) await claimRoute(this.collectionPageRoute, this.collectionPage, this.collectionPage);
		} catch (error) {
			// the route was not taken, so the URL stays as it was
			this.settings = previous;
			throw error;
		}
		await this.saveSettings({ url: this.settings.url });
	}

	/** Shows one entry on the collection page: previewed in the editor, or live in a new tab. */
	async openEntry(slug, live = false) {
		if (!this.collectionPage) throw new Error("Set up a detail page first.");
		if (!live) {
			await builder.page.open(this.collectionPage);
			return builder.page.setRouteVariables({ slug });
		}
		const page = await builder.data.getDoc("Builder Page", this.collectionPage);
		const path = page.route.replace(/:slug\b|<slug>/, encodeURIComponent(slug));
		return builder.ui.openUrl(`/${path.replace(/^\//, "")}`);
	}

	async addFields(fields) {
		const existing = (await this.getFields()).map((field) => field.fieldname);
		await builder.schema.updateDoctype(this.doctype, getCustomFields(fields, existing));
		await this.refreshPageFields();
	}

	async removeField(fieldname) {
		if (!this.isOwned) throw new Error("Manage existing DocType fields in Desk.");
		if (["title", "slug", "published"].includes(fieldname))
			throw new Error("This field is required by the collection.");
		await builder.schema.updateDoctype(this.doctype, [], { removeFields: [fieldname] });
		await this.refreshPageFields(fieldname);
	}

	async refreshPageFields(fieldname) {
		let start = 0;
		while (true) {
			const pages = await builder.data.getList("Builder Page", {
				fields: ["name"],
				filters: [["page_data_script", "like", "%builder-cms:start%"]],
				pageLength: 100,
				start,
			});
			for (const page of pages) await this.removePageField(page.name, fieldname);
			if (pages.length < 100) return;
			start += pages.length;
		}
	}

	async removePageField(pageName, fieldname) {
		const page = new PageData(pageName);
		const sources = await page.load();
		for (const source of sources.filter((each) => each.doctype === this.doctype)) {
			source.fields = ["name", ...(await this.getFields()).map((field) => field.fieldname)];
			source.filters = source.filters.filter(([name]) => name !== fieldname);
			await page.save(source);
		}
	}

	getFields() {
		return getDoctypeFields(this.doctype);
	}

	/**
	 * A complete data source of this collection: the content fields, newest
	 * first, published entries only, and a link through the collection page.
	 */
	getSourceDefaults(fields) {
		return {
			name: `collection_${snakeCase(this.label) || "items"}`,
			doctype: this.doctype,
			// the slug only steers the link, and the link reads it by itself
			fields: [...new Set(["name", ...fields.map((field) => field.fieldname)])],
			orderBy: "creation desc",
			publishedField: this.publishedField || null,
			// the slug field gives the value. The collection page route names it `:slug`
			link: { collection: this.doctype, field: this.slugField, variable: "slug" },
		};
	}

	/** The fields a visitor reads. The slug and the flags only steer the page. */
	getDisplayFields(fields) {
		const steering = [this.slugField, this.publishedField];
		const display = fields.filter((field) => !steering.includes(field.fieldname) && field.fieldtype !== "Check");
		return display.length ? display : [{ fieldname: "name", label: "Name", fieldtype: "Data" }];
	}

	/**
	 * Each entry has `slug` and `published` under those names, whatever the
	 * mapping calls them, so the panel reads one shape. `title` falls back to the slug.
	 */
	async getEntries({ start = 0 } = {}) {
		const fields = await this.getFields();
		const hasTitle = fields.some((field) => field.fieldname === "title");
		const rows = await builder.data.getList(this.doctype, {
			fields: [
				...new Set([
					"name",
					"modified",
					this.slugField,
					...(this.publishedField ? [this.publishedField] : []),
					...(hasTitle ? ["title"] : []),
				]),
			],
			orderBy: "modified desc",
			pageLength: 100,
			start,
		});
		return rows.map((row) => ({
			...row,
			title: row.title || row[this.slugField] || row.name,
			slug: row[this.slugField],
			published: this.publishedField ? row[this.publishedField] : 1,
		}));
	}

	async getNewestPublished() {
		const [entry] = await builder.data.getList(this.doctype, {
			fields: [this.slugField],
			filters: this.publishedField ? { [this.publishedField]: 1 } : {},
			orderBy: "creation desc",
			pageLength: 1,
		});
		return entry ? { slug: entry[this.slugField] } : null;
	}

	/** The table's columns: the title first, then the content, then the slug and the published flag. */
	async getTableFields() {
		const fields = await this.getFields();
		const rank = (field) =>
			field.fieldname === "title" ? 0 : [this.slugField, this.publishedField].includes(field.fieldname) ? 2 : 1;
		return [...fields].sort((first, second) => rank(first) - rank(second));
	}

	/** Every row, with the fields the table shows. */
	getRows(fields) {
		return builder.data.getList(this.doctype, {
			fields: ["name", ...fields.map((field) => field.fieldname)],
			orderBy: "modified desc",
			pageLength: 200,
		});
	}

	/** Saves one or more fields of one row. Frappe validates, and answers with the saved row. */
	updateEntry(name, patch) {
		return builder.data.update(this.doctype, name, patch);
	}

	getEntry(name) {
		return builder.data.getDoc(this.doctype, name);
	}

	async saveEntry(entry) {
		const fields = getWritableFields(await this.getFields());
		const doc = Object.fromEntries(
			fields.filter((field) => field.fieldname in entry).map((field) => [field.fieldname, entry[field.fieldname]]),
		);
		if (this.isOwned) doc.slug = doc.slug || slugify(doc.title || "");
		if (entry.name) return builder.data.update(this.doctype, entry.name, doc);
		return builder.data.insert(this.doctype, doc);
	}

	deleteEntry(name) {
		if (!this.isOwned) throw new Error("Manage deletion of existing DocType entries in Desk.");
		return builder.data.delete(this.doctype, name);
	}
}
