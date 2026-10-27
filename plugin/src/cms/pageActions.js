/**
 * What the CMS does to pages: the collection page of a collection, and lists
 * and entry content on the open page.
 */

import { fillCard, getBoundKeys, getRepeatedKeys, hasBoundChild } from "../blocks/blockActions.js";
import {
	getCardListBlock,
	getCollectionDetailsTemplate,
	getDocumentBlock,
	getTableBlock,
} from "../blocks/pageBlocks.js";
import { DataSource, getSourceFieldnames } from "../data/dataSource.js";
import { insertDocument } from "../data/documents.js";
import { PageData } from "../data/pageData.js";
import {
	getBlock,
	getRootBlock,
	insertBlock,
	replaceBlock,
	setChildren,
	updateBlock,
} from "../editor/canvas.js";
import { getEditorContext } from "../editor/context.js";
import { openPage, setRouteVariables } from "../editor/page.js";
import { Collection } from "./collection.js";
import { claimRoute, getDefaultRoute, getRouteHolders, releaseRoute } from "./routes.js";

export const SORT_OPTIONS = [
	{ label: "Newest first", value: "creation desc" },
	{ label: "Oldest first", value: "creation asc" },
	{ label: "Recently updated", value: "modified desc" },
];

export const LAYOUT_OPTIONS = [
	{ label: "Cards", value: "cards" },
	{ label: "Table", value: "table" },
];

/** The name of the data source on a collection page. Bindings read `entry.title`. */
export const ENTRY_SOURCE = "entry";

const getWritablePage = () => {
	const context = getEditorContext();
	if (!context.page) throw new Error("Open a page first.");
	if (context.readOnly) throw new Error("This page is read-only.");
	if (context.editingMode && context.editingMode !== "page")
		throw new Error("Return to page editing to connect a collection.");
	return context.page;
};

/** What Use changes, for the user to confirm: the route, and each other page that moves off it. */
export const getCollectionPageChange = async (collection, pageName) => {
	const route = collection.collectionPageRoute;
	const holders = await getRouteHolders(route, pageName);
	return {
		route,
		moves: holders.map((page) => ({
			name: page.name,
			title: page.page_title,
			route: getDefaultRoute(page.name),
		})),
	};
};

/**
 * Makes `pageName` the collection page: its route, the `entry` source, and
 * the settings. It works on any page, open or not. Each other page on the
 * route moves off it.
 */
export const setCollectionPage = async (collection, pageName) => {
	const fields = await collection.getFields();
	await claimRoute(collection.collectionPageRoute, pageName);
	const pageData = new PageData(pageName);
	await pageData.load();
	const source = new DataSource({
		name: ENTRY_SOURCE,
		type: "Document",
		doctype: collection.doctype,
		fields: getSourceFieldnames(fields),
		// the route always names it `:slug`. The mapping says which field holds it
		filters: [[collection.slugField, "=", "{{ route.slug }}"]],
		publishedField: collection.publishedField || null,
	});
	await pageData.save(source);
	await assignCollectionPage(collection, pageName);
	return { source, fields };
};

/** The page leaves the collection: back to Builder's default route, without the `entry` source. Its design and bindings stay. */
export const disconnectCollectionPage = async (collection) => {
	const pageName = collection.collectionPage;
	await releaseRoute(pageName);
	await new PageData(pageName).remove(ENTRY_SOURCE);
	await collection.saveSettings({ entry_page: "" });
};

/**
 * Makes `pageName` the collection page, opens it and previews the newest entry.
 * An empty page gets blocks for the display fields.
 */
export const connectCollectionPage = async (collection, pageName) => {
	const { source, fields } = await setCollectionPage(collection, pageName);
	await openPage(pageName);
	const root = getRootBlock();
	if (!root.children.length) {
		insertBlock(
			root.blockId,
			getDocumentBlock(source, collection.getDisplayFields(fields), collection.label)
		);
	}
	const newest = await collection.getNewestPublished();
	if (newest) await setRouteVariables({ slug: newest.slug });
};

/** A new draft page with the display fields, made the collection page. */
export const createCollectionPage = async (collection) => {
	const page = await insertDocument("Builder Page", { page_title: `${collection.label} page` });
	await connectCollectionPage(collection, page.name);
};

/** A free name such as `blog_post`, then `blog_post_2`, so two lists of one collection can share a page. */
const getFreeName = (base, sources) => {
	const taken = new Set(sources.map((source) => source.name));
	let name = base;
	for (let count = 2; taken.has(name); count++) name = `${base}_${count}`;
	return name;
};

/** A page is the collection page of one collection. */
const assignCollectionPage = async (collection, pageName) => {
	for (const other of await Collection.all()) {
		if (other.doctype !== collection.doctype && other.collectionPage === pageName)
			await other.saveSettings({ entry_page: "" });
	}
	await collection.saveSettings({ entry_page: pageName });
};

/** The CMS data source a repeater shows, or null. */
export const getListSource = (sources, block) =>
	sources.find((source) => source.isList && source.name === block.dataKey?.key) ?? null;

/** Removes the list sources that no repeater on the page shows any more. */
const removeUnusedListSources = async (pageData) => {
	const used = new Set(getRepeatedKeys(getRootBlock()));
	for (const source of pageData.sources.filter((each) => each.isList && !used.has(each.name))) {
		await pageData.remove(source.name);
	}
};

/**
 * Points a repeater at a new data source of `collection`, or at none. The card
 * gets the display fields when nothing in it shows a value yet.
 */
export const setListCollection = async (blockId, collection) => {
	const pageData = new PageData(getWritablePage().name);
	await pageData.load();
	updateBlock(blockId, { dataKey: null });
	await removeUnusedListSources(pageData);
	if (!collection) return;
	const fields = await collection.getFields();
	const defaults = collection.getSourceDefaults(fields);
	const source = new DataSource({
		...defaults,
		name: getFreeName(defaults.name, pageData.sources),
	});
	await pageData.save(source);
	updateBlock(blockId, { dataKey: { key: source.name, comesFrom: "dataScript" } });
	// a card holds a few fields. The user can choose more
	const shown = collection.getDisplayFields(fields).slice(0, 4);
	if (!hasBoundChild(getBlock(blockId))) fillCard(blockId, source, shown, collection.label);
};

/** Changes the sort order or the limit of the list a repeater shows. */
export const updateList = async (blockId, patch) => {
	const pageData = new PageData(getWritablePage().name);
	const source = getListSource(await pageData.load(), getBlock(blockId));
	if (!source) throw new Error("This list shows no collection.");
	Object.assign(source, patch);
	await pageData.save(source);
};

const isTable = (block) => block?.attributes?.role === "table";

/** The repeater of a list. A list of cards is its own repeater. A table repeats its row group. */
export const getListRepeater = (block) => {
	if (isTable(block)) return block.children.find((child) => child.isRepeaterBlock) ?? null;
	return block.isRepeaterBlock && !isTable(block.getParentBlock()) ? block : null;
};

export const getListLayout = (list) => (isTable(list) ? "table" : "cards");

/** The fields a list shows: the ones its blocks show, in the order of the collection. */
export const getListFields = (repeater, fields) => {
	const keys = new Set(getBoundKeys(repeater));
	return fields.filter((field) => keys.has(field.fieldname));
};

/**
 * Builds a list again, as cards or a table, with `fieldnames`. Each one left
 * out keeps what the list has now. A new layout is a new list block, which
 * takes the selection. New fields keep the list block and replace what is in
 * it, so the selection and an open field picker stay.
 */
export const rebuildList = async (listId, collection, { layout, fieldnames } = {}) => {
	const list = getBlock(listId);
	const repeater = getListRepeater(list);
	const source = getListSource(await new PageData(getWritablePage().name).load(), repeater);
	if (!source) throw new Error("Choose a collection first.");
	if (fieldnames && !fieldnames.length) throw new Error("Choose at least one field.");
	const all = await collection.getFields();
	const shown = fieldnames
		? all.filter((field) => fieldnames.includes(field.fieldname))
		: getListFields(repeater, all);
	const fields = shown.length ? shown : collection.getDisplayFields(all);
	const isNewLayout = layout && layout !== getListLayout(list);
	const tree = ((layout ?? getListLayout(list)) === "table" ? getTableBlock : getCardListBlock)(
		source,
		fields,
		collection.label
	);
	if (isNewLayout) return replaceBlock(listId, tree);
	setChildren(listId, tree.children);
	// the columns of a table follow its fields. The other styles of the list are the user's
	if (isTable(list)) {
		updateBlock(listId, {
			baseStyles: {
				...list.baseStyles,
				gridTemplateColumns: tree.baseStyles.gridTemplateColumns,
			},
		});
	}
};

export const isDetailsBlock = (block) => block.attributes?.["data-cms"] === "details";

/** The fields a details block shows: the entry fields that its blocks show, in the order of the collection. */
export const getDetailsFields = (block, fields) => {
	const keys = new Set(getBoundKeys(block));
	return fields.filter((field) => keys.has(`${ENTRY_SOURCE}.${field.fieldname}`));
};

/**
 * Shows `fieldnames` of the page's entry in a details block, or the display
 * fields without them. The block stays, so the selection and an open picker stay.
 */
export const fillDetails = async (blockId, collection, fieldnames) => {
	const pageData = new PageData(getWritablePage().name);
	const source = (await pageData.load()).find((each) => each.name === ENTRY_SOURCE);
	if (!source) throw new Error("Choose the collection first.");
	const all = await collection.getFields();
	const fields = fieldnames
		? all.filter((field) => fieldnames.includes(field.fieldname))
		: collection.getDisplayFields(all);
	if (!fields.length) throw new Error("Choose at least one field.");
	setChildren(blockId, getDocumentBlock(source, fields, collection.label).children);
};

/** The Blocks tab tile. On a collection page it shows the entry's display fields at once. */
export const getDetailsTemplate = async () => {
	const { page } = getEditorContext();
	const collection =
		page && (await Collection.all()).find((each) => each.collectionPage === page.name);
	const source =
		collection &&
		(await new PageData(page.name).load()).find((each) => each.name === ENTRY_SOURCE);
	if (!source) return getCollectionDetailsTemplate();
	return getDocumentBlock(
		source,
		collection.getDisplayFields(await collection.getFields()),
		collection.label
	);
};
