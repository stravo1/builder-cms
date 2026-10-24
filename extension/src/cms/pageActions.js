import { getRootBlock, removeBlock, selectBlock, updateBlock } from "../editor/canvas.js";
import { openPage, setRouteVariables } from "../editor/page.js";
import { getEditorContext } from "../editor/context.js";
/**
 * What the CMS does to pages: the template page of a collection, and lists
 * and entry content on the open page.
 */

import { getListBlocks, insertBlocks } from "../blocks/blockActions.js";
import { DataSource } from "../data/dataSource.js";
import { insertDocument } from "../data/documents.js";
import { PageData } from "../data/pageData.js";
import { claimRoute, getDefaultRoute, getRouteHolders, moveToRoute } from "./routes.js";
import { Collection } from "./collection.js";

export const SORT_OPTIONS = [
	{ label: "Newest first", value: "creation desc" },
	{ label: "Oldest first", value: "creation asc" },
	{ label: "Recently updated", value: "modified desc" },
];

/** The name of the data source on a template page. Bindings read `entry.title`. */
export const ENTRY_SOURCE = "entry";

const getWritablePage = async () => {
	const context = await getEditorContext();
	if (!context.page) throw new Error("Open a page first.");
	if (context.readOnly) throw new Error("This page is read-only.");
	if (context.editingMode && context.editingMode !== "page")
		throw new Error("Return to page editing to connect a collection.");
	return context.page;
};

export const isPageEmpty = async () => {
	const root = getRootBlock();
	return !root.children?.length;
};

/** What Use changes, for the user to confirm: the route, and each other page that moves off it. */
export const getCollectionPageChange = async (collection, pageName) => {
	const route = collection.collectionPageRoute;
	const holders = await getRouteHolders(route, pageName);
	return {
		route,
		moves: holders.map((page) => ({
			title: page.page_title,
			route: getDefaultRoute(page.name),
		})),
		replaces:
			collection.collectionPage && collection.collectionPage !== pageName ? collection.collectionPage : null,
	};
};

/**
 * Makes `pageName` the template page: the template route, the `entry`
 * source, and the settings. It works on any page, open or not. The previous
 * template page loses its `entry` source, and each page on the route moves off it.
 */
export const setCollectionPage = async (collection, pageName) => {
	const fields = await collection.getFields();
	const previous = collection.collectionPage;
	if (previous && previous !== pageName) await new PageData(previous).remove(ENTRY_SOURCE);
	await claimRoute(collection.collectionPageRoute, pageName);
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
	await assignCollectionPage(collection, pageName);
	return { source, fields };
};

/** Stop: the page moves to `route` and loses its `entry` source. Its design and bindings stay. */
export const clearCollectionPage = async (collection, route) => {
	const pageName = collection.collectionPage;
	await moveToRoute(pageName, route);
	await new PageData(pageName).remove(ENTRY_SOURCE);
	await collection.saveSettings({ entry_page: "" });
};

/**
 * The collection whose template page this is. `isBroken` when the user
 * removed its `:slug` route or its `entry` source by hand.
 */
export const getPageRole = (collections, page, sources) => {
	const collection = collections.find((each) => each.collectionPage === page.name);
	return collection ? { collection, isBroken: !isCollectionPageOf(collection, page, sources) } : null;
};

/** Makes `pageName` the template page and opens it. An empty page also gets bound blocks, and a preview. */
export const useCollectionPage = async (collection, pageName) => {
	const { source, fields } = await setCollectionPage(collection, pageName);
	await openPage(pageName);
	// a designed page keeps its blocks. "Bind to data" binds any block to a field
	if (await isPageEmpty()) await insertBlocks(source, collection.getDisplayFields(fields), collection.label);
	const newest = await collection.getNewestPublished();
	if (newest) await setRouteVariables({ slug: newest.slug });
};

/** A new draft page, made the template page. */
export const createCollectionPage = async (collection) => {
	const page = await insertDocument("Builder Page", {
		page_title: `${collection.label} template`,
	});
	await useCollectionPage(collection, page.name);
};

/** A free name such as `blog_post`, then `blog_post_2`, so two lists of one collection can share a page. */
const getFreeName = (base, sources) => {
	const taken = new Set(sources.map((source) => source.name));
	let name = base;
	for (let count = 2; taken.has(name); count++) name = `${base}_${count}`;
	return name;
};

/**
 * Adds a list of a collection to the open page. The data source behind it
 * takes the collection's defaults: published entries, links to the template page.
 */
export const getCollectionListSource = async (
	collection,
	{ orderBy = SORT_OPTIONS[0].value, limit = 20 } = {},
) => {
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

/** The settings point at the page, and the page still has a `:slug` route and the `entry` source of the collection. */
export const isCollectionPageOf = (collection, page, sources) =>
	collection.collectionPage === page.name &&
	SLUG_ROUTE.test(page.route || "") &&
	sources.some((source) => source.name === ENTRY_SOURCE && source.doctype === collection.doctype);

/** A page is the template of one collection. */
const assignCollectionPage = async (collection, pageName) => {
	for (const other of await Collection.all()) {
		if (other.doctype !== collection.doctype && other.collectionPage === pageName)
			await other.saveSettings({ entry_page: "" });
	}
	await collection.saveSettings({ entry_page: pageName });
};

export const addCollectionList = async (collection, { fields, ...options }) => {
	const source = await getCollectionListSource(collection, options);
	return insertBlocks(source, fields, collection.label, options.layout);
};

/** Inserts blocks bound to the entry of the template page. Each call adds a new set. */
export const addEntryContent = async (collection, fields) => {
	const page = await getWritablePage();
	const source = (await new PageData(page.name).load()).find((each) => each.name === ENTRY_SOURCE);
	if (!source) throw new Error("Make this page the template page first.");
	return insertBlocks(source, fields, collection.label);
};

export const connectCollectionList = async (collection, blockId, options = {}) => {
	const source = await getCollectionListSource(collection, options);
	await updateBlock(blockId, {
		isRepeaterBlock: true,
		dataKey: { key: source.name, comesFrom: "dataScript" },
	});
	return source;
};

/** Selects the first block of the list. False when no block on the page shows it. */
export const selectCollectionList = (source) => {
	const [block] = getListBlocks(source.name);
	if (block) selectBlock(block.blockId);
	return Boolean(block);
};

export const changeCollectionList = async (source, { orderBy, limit }) => {
	const page = await getWritablePage();
	const pageData = new PageData(page.name);
	await pageData.load();
	await pageData.save(new DataSource({ ...source.toJSON(), orderBy, limit }));
};

/** Removes the blocks of the list, then its data source, so no block reads a missing source. */
export const removeCollectionList = async (source) => {
	const page = await getWritablePage();
	for (const block of getListBlocks(source.name)) removeBlock(block.blockId);
	await new PageData(page.name).remove(source.name);
};
