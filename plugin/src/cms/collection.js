/**
 * A collection is one content type, such as "Blog Post". The `cms` app owns it:
 * a `CMS Collection` row and a doctype, so Frappe stores, permits, and versions
 * its entries. A mapped collection shows a doctype that exists already.
 */

import { toast } from "frappe-ui";
import { api } from "../data/api.js";
import { cached, forget } from "../data/cache.js";
import { getDocument, subscribeDocuments } from "../data/documents.js";
import { getErrorMessage } from "../data/errors.js";
import { getSourceFieldnames } from "../data/dataSource.js";
import { getCmsPageNames, PageData } from "../data/pageData.js";
import { openPage, refreshPageData, setRouteVariables } from "../editor/page.js";
import { openUrl } from "../editor/windows.js";
import { assertRouteFree, claimRoute, normalizeUrl, slugify, SLUG_ROUTE } from "./routes.js";

/** The page data script reads this doctype on each request. */
export const SETTINGS_DOCTYPE = "CMS Collection";

export const FIELD_TYPES = [
	{ label: "Text", value: "Data" },
	{ label: "Long text", value: "Small Text" },
	{ label: "Rich text", value: "Text Editor" },
	{ label: "Image", value: "Attach Image" },
	{ label: "Date", value: "Date" },
	{ label: "Number", value: "Int" },
	{ label: "Yes or no", value: "Check" },
	{ label: "Reference", value: "Link" },
	{ label: "Multi-reference", value: "Table MultiSelect" },
];
export const blankField = () => ({ label: "", fieldtype: "Data" });

/** A new field of these types names the collection it links to in `options`. */
export const REFERENCE_TYPES = ["Link", "Table MultiSelect"];

/** A page block can show the field. A multi-reference holds a list, which needs a list of its own. */
export const canShow = (field) => !["Check", "Table MultiSelect"].includes(field.fieldtype);

/** Every collection the app makes has these. The page bindings and the entry route need them. */
export const STANDARD_FIELDNAMES = ["title", "slug", "published"];

const snakeCase = (text) => slugify(text).replace(/-/g, "_");

/** Marks the collections whose label another one has too, such as two "Blog Post"s. */
export const markSameLabels = (collections) => {
	for (const collection of collections) {
		collection.isLabelShared = collections.some(
			(other) => other !== collection && other.label === collection.label
		);
	}
	return collections;
};

let isListening = false;

/** A settings write in another view or by another user invalidates the shared cache. */
const listenForSettings = () => {
	if (isListening) return;
	isListening = true;
	subscribeDocuments(SETTINGS_DOCTYPE, () => forget("collections"));
};

/** A completed write must not look like a failed save if the canvas refresh fails. */
const refreshAfterEntryWrite = async (write) => {
	const entry = await write;
	try {
		await refreshPageData();
	} catch (error) {
		toast.error(
			`The entry changed, but page data could not refresh: ${getErrorMessage(error)}`
		);
	}
	return entry;
};

export class Collection {
	/** `settings` is a collection as the app answers it. */
	constructor(settings) {
		this.settings = settings;
	}

	/** The collections whose entries this user can read. */
	static all() {
		listenForSettings();
		return cached("collections", Collection.read);
	}

	static async read() {
		const rows = await api.getCollections();
		return markSameLabels(rows.map((row) => new Collection(row)));
	}

	/** The app names each field from its label, and refuses a name that is taken. */
	static async create(label, url, fields) {
		if (!label) throw new Error("Give the collection a name.");
		const collection = new Collection(await api.createCollection(label, url, fields));
		forget("collections");
		return collection;
	}

	/**
	 * Uses an existing doctype as a collection. Its rows stay where they are, and
	 * Desk edits them. `publishedField` empty means every row is public.
	 */
	static async map(doctype, settings) {
		if (!doctype || !settings.slugField) throw new Error("Pick a doctype and its slug field.");
		const collection = new Collection(await api.mapDoctype(doctype, settings));
		forget("collections");
		return collection;
	}

	get doctype() {
		return this.settings.collection;
	}

	get label() {
		return this.settings.label;
	}

	get url() {
		return this.settings.url || normalizeUrl(this.label);
	}

	/** True for a collection the app made. Its entries are edited in the panel. */
	get isOwned() {
		return !this.settings.is_mapped;
	}

	/** The label. Only when another collection has the same label, where it comes from follows it. */
	get title() {
		if (!this.isLabelShared) return this.label;
		if (this.isOwned) return `${this.label} - CMS`;
		return `${this.label} - ${this.label === this.doctype ? "doctype" : this.doctype}`;
	}

	get slugField() {
		return this.settings.slug_field;
	}

	/** Empty when every row is public. A collection the app made always has `published`. */
	get publishedField() {
		return this.settings.published_field || "";
	}

	/** The roles that use this collection's entries only. The CMS-wide roles are not here. */
	get roles() {
		return this.settings.roles;
	}

	get collectionPage() {
		return this.settings.entry_page || null;
	}

	/** The route of the collection page. Builder stores a route with no leading slash. */
	get collectionPageRoute() {
		return `${this.url.slice(1)}/:slug`;
	}

	/** Where Desk lists the rows, or edits one. Desk names a doctype by its slug: `blog-post`. */
	getDeskUrl(name) {
		const route = slugify(this.doctype);
		if (!name) return `/app/${route}`;
		return `/app/${route}/${name === "new" ? `new-${route}-1` : encodeURIComponent(name)}`;
	}

	async saveSettings(patch) {
		try {
			this.settings = await api.updateCollection(this.doctype, patch);
		} finally {
			// after the write, so a read that ran during it does not stay
			forget("collections");
		}
	}

	async saveRoles(roles) {
		this.settings = await api.updateCollectionRoles(this.doctype, roles);
		forget("collections");
	}

	/** The collection page follows the URL. Lists read its route on each request, so their links follow too. */
	async changeUrl(url) {
		const previous = this.settings;
		this.settings = { ...previous, url: normalizeUrl(url) };
		try {
			if (this.collectionPage) {
				await assertRouteFree(this.collectionPageRoute, this.collectionPage);
				await claimRoute(this.collectionPageRoute, this.collectionPage);
			}
		} catch (error) {
			// the route was not taken, so the URL stays as it was
			this.settings = previous;
			throw error;
		}
		await this.saveSettings({ url: this.settings.url });
	}

	/**
	 * The app drops a collection it made, with its entries. A mapped doctype and
	 * its records stay. The pages lose their sources after, so a refusal changes nothing.
	 */
	async delete() {
		await api.deleteCollection(this.doctype);
		forget("collections", `fields:${this.doctype}`);
		await this.updatePageSources((page, source) => page.remove(source.name));
	}

	/** Runs `change` on each data source of this collection, on every page that has one. */
	async updatePageSources(change) {
		for (const name of await getCmsPageNames()) {
			const page = new PageData(name);
			const sources = await page.load();
			for (const source of sources.filter((each) => each.doctype === this.doctype))
				await change(page, source);
		}
	}

	/** The fields that hold a value and that are safe to publish. */
	getFields() {
		return cached(`fields:${this.doctype}`, () => api.getFields(this.doctype));
	}

	async addFields(fields) {
		await api.addFields(this.doctype, fields);
		// before the pages read the fields again
		forget(`fields:${this.doctype}`);
		await this.syncPageFields();
	}

	/** The app drops the field's column, with the data in it. */
	async removeField(fieldname) {
		await api.removeField(this.doctype, fieldname);
		forget(`fields:${this.doctype}`);
		await this.syncPageFields(fieldname);
	}

	/** Each page source reads every field again, and a removed field leaves its filters. */
	syncPageFields(removedFieldname) {
		return this.updatePageSources(async (page, source) => {
			source.fields = getSourceFieldnames(await this.getFields());
			// a multi-reference filters through its Link, as `tags.entry`
			source.filters = source.filters.filter(
				([name]) => name.split(".")[0] !== removedFieldname
			);
			await page.save(source);
		});
	}

	/** The table's columns: the title first, then the content, then the slug and the published flag. */
	async getTableFields() {
		const steering = [this.slugField, this.publishedField];
		const rank = (field) =>
			field.fieldname === "title" ? 0 : steering.includes(field.fieldname) ? 2 : 1;
		return [...(await this.getFields())].sort((first, second) => rank(first) - rank(second));
	}

	/** The fields a visitor reads. The slug and the flags only steer the page. */
	getDisplayFields(fields) {
		const steering = [this.slugField, this.publishedField];
		const display = fields.filter(
			(field) => !steering.includes(field.fieldname) && canShow(field)
		);
		return display.length
			? display
			: [{ fieldname: "name", label: "Name", fieldtype: "Data" }];
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
			fields: getSourceFieldnames(fields),
			orderBy: "creation desc",
			publishedField: this.publishedField || null,
			// the slug field gives the value. The collection page route names it `:slug`
			link: { collection: this.doctype, field: this.slugField, variable: "slug" },
		};
	}

	/** Shows one entry on the collection page: previewed in the editor, or live in a new tab. */
	async openEntry(slug, live = false) {
		if (!this.collectionPage) throw new Error("Set up a collection page first.");
		if (!live) {
			await openPage(this.collectionPage);
			return setRouteVariables({ slug });
		}
		const page = await getDocument("Builder Page", this.collectionPage);
		const path = page.route.replace(SLUG_ROUTE, encodeURIComponent(slug));
		return openUrl(`/${path.replace(/^\//, "")}`);
	}

	/** The collection page with one entry, rendered from the page's draft and the entry's saved values. */
	getPreviewUrl(slug, colorScheme) {
		if (!this.collectionPage) throw new Error("Set up a collection page first.");
		const query = new URLSearchParams({
			page: this.collectionPage,
			slug,
			prefers_color_scheme: colorScheme,
		});
		return `/api/method/builder.api.get_page_preview_html?${query}`;
	}

	/**
	 * Each entry has `slug` and `published` under those names, whatever the
	 * mapping calls them, so the panel reads one shape. `title` falls back to the slug.
	 */
	getEntries({ start = 0 } = {}) {
		return api.getEntries(this.doctype, start);
	}

	/** The entries as picker options, by name. A write to an entry forgets them. */
	getEntryOptions() {
		return cached(`entries:${this.doctype}`, async () =>
			(await this.getEntries()).map((entry) => ({ label: entry.title, value: entry.name }))
		);
	}

	getNewestPublished() {
		return api.getNewestPublished(this.doctype);
	}

	/** One page of rows, newest first, with the fields the table shows. */
	getRows(fields, { start = 0, pageLength }) {
		return api.getRows(
			this.doctype,
			fields.map((field) => field.fieldname),
			start,
			pageLength
		);
	}

	getEntry(name) {
		return api.getEntry(this.doctype, name);
	}

	/**
	 * True while a slug still matches the title it came from, so it follows the
	 * title. A slug the user typed stays. A doctype's `name` is never a draft field.
	 */
	isSlugFromTitle(slug, title) {
		return this.slugField !== "name" && (slug ?? "") === slugify(title ?? "");
	}

	/** The app keeps only the fields it can write, and fills an empty slug from the title. */
	saveEntry(entry) {
		forget(`entries:${this.doctype}`);
		return refreshAfterEntryWrite(api.saveEntry(this.doctype, entry));
	}

	/** Saves one or more fields of one row. Frappe validates, and answers with the saved row. */
	updateEntry(name, patch) {
		return this.saveEntry({ ...patch, name });
	}

	deleteEntry(name) {
		if (!this.isOwned) throw new Error("Delete these entries in Desk.");
		forget(`entries:${this.doctype}`);
		return refreshAfterEntryWrite(api.deleteEntry(this.doctype, name));
	}
}
