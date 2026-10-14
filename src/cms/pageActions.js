/**
 * What the CMS does to the open page. The user makes the page; these do
 * everything after that: the route, the data source, the blocks, the preview.
 */

import builder from "frappe-builder-extension-sdk";
import { insertBlocks } from "../blocks/blockActions.js";
import { DataSource } from "../data/dataSource.js";
import { PageData } from "../data/pageData.js";
import { claimRoute } from "./routes.js";
import { Collection } from "./collection.js";

export const SORT_OPTIONS = [
	{ label: "Newest first", value: "creation desc" },
	{ label: "Oldest first", value: "creation asc" },
	{ label: "Recently updated", value: "modified desc" },
];

/** The name of the data source on a collection page. Bindings read `entry.title`. */
export const ENTRY_SOURCE = "entry";

const getWritablePage = async () => {
	const context = await builder.context.get();
	if (!context.page) throw new Error("Open a page first.");
	if (context.readOnly) throw new Error("This page is read-only.");
	if (context.editingMode && context.editingMode !== "page")
		throw new Error("Return to page editing to connect a collection.");
	return context.page;
};

export const isPageEmpty = async () => {
	const [root] = await builder.page.getBlocks();
	return !root.children?.length;
};

/**
 * Makes `pageName` the collection page: the collection route, the `entry`
 * source, and the settings. It works on any page, open or not. The previous
 * collection page moves aside, so one page holds the route.
 */
export const setCollectionPage = async (collection, pageName) => {
	const fields = await collection.getFields();
	await claimRoute(collection.collectionPageRoute, pageName, collection.collectionPage);
	const pageData = new PageData(pageName);
	await pageData.load();
	const source = new DataSource({
		name: ENTRY_SOURCE,
		type: "Document",
		doctype: collection.doctype,
		fields: [...new Set(["name", ...fields.map((field) => field.fieldname)])],
		// the route always names it `:slug`. The mapping says which field holds it
		filters: [[collection.slugField, "=", "{{ route.slug }}"]],
		publishedField: collection.publishedField || null,
	});
	await pageData.save(source);
	await assignPageRole(collection, pageName, "entry_page");
	return { source, fields };
};

/** Ends the role. The page keeps its route and its content, and stops being the detail page. */
export const clearCollectionPage = (collection) => collection.saveSettings({ entry_page: "" });

export const clearIndexPage = (collection) => collection.saveSettings({ index_page: "" });

/** The role of a page: index or detail of a collection, or none. */
export const getPageRole = (collections, page, sources) => {
	const detail = collections.find((collection) => isCollectionPageOf(collection, page, sources));
	if (detail) return { kind: "detail", collection: detail };
	const index = collections.find((collection) => isIndexPageOf(collection, page));
	return index ? { kind: "index", collection: index } : null;
};

/** The open page becomes the collection page. An empty page also gets bound blocks, and a preview. */
export const useAsCollectionPage = async (collection) => {
	const page = await getWritablePage();
	const { source, fields } = await setCollectionPage(collection, page.name);
	// a designed page keeps its blocks. "Bind to data" binds any block to a field
	if (await isPageEmpty()) await insertBlocks(source, collection.getDisplayFields(fields), collection.label);
	const newest = await collection.getNewestPublished();
	if (newest) await builder.page.setRouteVariables({ slug: newest.slug });
};

/**
 * Makes `pageName` the index page: it takes the collection URL, such as
 * `/blog`, and lists the collection. The previous index page moves aside.
 */
export const setIndexPage = async (collection, pageName) => {
	const previous = (await Collection.all()).find((each) => each.indexPage === pageName);
	await claimRoute(collection.indexRoute, pageName, collection.indexPage);
	const data = new PageData(pageName);
	const sources = await data.load();
	if (sources.some((source) => source.name === ENTRY_SOURCE)) await data.remove(ENTRY_SOURCE);
	const previousSource = sources.find((source) => source.isList && source.doctype === previous?.doctype);
	if (previousSource && previous.doctype !== collection.doctype) {
		const defaults = collection.getSourceDefaults(await collection.getFields());
		await data.save(
			new DataSource({
				...defaults,
				name: previousSource.name,
				orderBy: previousSource.orderBy,
				limit: previousSource.limit,
			}),
		);
	}
	await assignPageRole(collection, pageName, "index_page");
};

/** The open page becomes the index page. It gets a list, unless it lists this collection already. */
export const useAsIndexPage = async (collection) => {
	const page = await getWritablePage();
	await setIndexPage(collection, page.name);
	const sources = await new PageData(page.name).load();
	const hasList = sources.some((source) => source.isList && source.doctype === collection.doctype);
	if (!hasList) {
		const source = await getCollectionListSource(collection);
		if (await isPageEmpty())
			await insertBlocks(source, collection.getDisplayFields(await collection.getFields()), collection.label);
	}
};

/** True when this page is the index page: the settings point at it, and it still has the collection URL. */
export const isIndexPageOf = (collection, page) =>
	collection.indexPage === page.name && (page.route || "").replace(/^\//, "") === collection.indexRoute;

/** A free name such as `blog_post`, then `blog_post_2`, so two lists of one collection can share a page. */
const getFreeName = (base, sources) => {
	const taken = new Set(sources.map((source) => source.name));
	let name = base;
	for (let count = 2; taken.has(name); count++) name = `${base}_${count}`;
	return name;
};

/**
 * Adds a list of a collection to the open page. The data source behind it
 * takes the collection's defaults: published entries, links to the collection page.
 */
export const getCollectionListSource = async (collection, { orderBy = SORT_OPTIONS[0].value, limit = 20 } = {}) => {
	const page = await getWritablePage();
	const fields = await collection.getFields();
	const pageData = new PageData(page.name);
	const sources = await pageData.load();
	const existing = sources.find((source) => source.isList && source.doctype === collection.doctype);
	if (existing) return existing;
	const defaults = collection.getSourceDefaults(fields);
	const source = new DataSource({ ...defaults, name: getFreeName(defaults.name, sources), orderBy, limit });
	await pageData.save(source);
	return source;
};

const SLUG_ROUTE = /:slug\b|<slug>/;

/**
 * The page owns this fact: a `:slug` route and an `entry` source of the
 * collection. The settings only point at the page. So a user who removes the
 * route or the source by hand ends the role, and the panel follows.
 */
export const isCollectionPageOf = (collection, page, sources) =>
	collection.collectionPage === page.name &&
	SLUG_ROUTE.test(page.route || "") &&
	sources.some((source) => source.name === ENTRY_SOURCE && source.doctype === collection.doctype);

/** A page has one role. Clear every old assignment after the new route and source are ready. */
const assignPageRole = async (collection, pageName, field) => {
	const collections = await Collection.all();
	for (const other of collections) {
		const patch = {};
		for (const role of ["index_page", "entry_page"]) {
			if (other.settings?.[role] === pageName) patch[role] = "";
		}
		if (other.doctype === collection.doctype) {
			collection.settings = other.settings;
			await collection.saveSettings({ ...patch, [field]: pageName });
		} else if (Object.keys(patch).length) await other.saveSettings(patch);
	}
	if (!collections.some((other) => other.doctype === collection.doctype)) {
		await collection.saveSettings({ [field]: pageName });
	}
};

export const addCollectionList = async (collection, options = {}) => {
	const source = await getCollectionListSource(collection, options);
	return insertBlocks(
		source,
		collection.getDisplayFields(await collection.getFields()),
		collection.label,
		options.layout,
	);
};

export const connectCollectionList = async (collection, blockId, options = {}) => {
	const source = await getCollectionListSource(collection, options);
	await builder.block.update(blockId, {
		isRepeaterBlock: true,
		dataKey: { key: source.name, comesFrom: "dataScript" },
	});
	return source;
};
