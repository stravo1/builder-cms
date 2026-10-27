import { beforeEach, describe, expect, it, vi } from "vitest";

const { builder, api } = vi.hoisted(() => ({
	builder: {
		context: { get: vi.fn() },
		page: {
			getRoot: vi.fn(),
			setRouteVariables: vi.fn(),
			refreshData: vi.fn(),
			open: vi.fn(),
			update: vi.fn(),
		},
		block: {
			get: vi.fn(),
			update: vi.fn(),
			insert: vi.fn(),
			setChildren: vi.fn(),
			replace: vi.fn(),
		},
		data: {
			getList: vi.fn(),
			getDoc: vi.fn(),
			insert: vi.fn(),
			subscribe: vi.fn(),
		},
	},
	api: {
		getCollections: vi.fn(),
		updateCollection: vi.fn(),
		getFields: vi.fn(),
		getNewestPublished: vi.fn(),
	},
}));
vi.mock("../src/data/documents.js", () => ({
	getDocuments: builder.data?.getList,
	getDocument: builder.data?.getDoc,
	insertDocument: builder.data?.insert,
	subscribeDocuments: builder.data?.subscribe,
}));
vi.mock("../src/editor/context.js", () => ({ getEditorContext: builder.context?.get }));
vi.mock("../src/editor/page.js", () => ({
	refreshPageData: builder.page?.refreshData,
	updatePageDocument: builder.page?.update,
	setRouteVariables: builder.page?.setRouteVariables,
	openPage: builder.page?.open,
}));
vi.mock("../src/editor/canvas.js", () => ({
	getRootBlock: builder.page?.getRoot,
	getBlock: builder.block?.get,
	updateBlock: builder.block?.update,
	insertBlock: builder.block?.insert,
	setChildren: builder.block?.setChildren,
	replaceBlock: builder.block?.replace,
}));
vi.mock("frappe-ui", () => ({ toast: { error: builder.ui?.toast, success: builder.ui?.toast } }));
vi.mock("../src/data/api.js", () => ({ api }));

import { Collection } from "../src/cms/collection.js";
import {
	connectCollectionPage,
	createCollectionPage,
	disconnectCollectionPage,
	setCollectionPage,
	fillDetails,
	getDetailsFields,
	getDetailsTemplate,
	getListRepeater,
	setListCollection,
	rebuildList,
	updateList,
} from "../src/cms/pageActions.js";
import { bindField, getBoundKeys, getSourcesForBlock } from "../src/blocks/blockActions.js";
import { DataSource } from "../src/data/dataSource.js";
import { writeSection } from "../src/data/scriptSections.js";

const fields = [
	{ fieldname: "title", fieldtype: "Data", reqd: 1 },
	{ fieldname: "slug", fieldtype: "Data" },
	{ fieldname: "published", fieldtype: "Check" },
];
let settings;
let pages;
let page;
let blocks;

/** The open page holds `children` under its root, and block reads and writes go to them. */
const setBlocks = (...children) => {
	blocks = { root: { blockId: "root", children } };
	for (const child of children) blocks[child.blockId] = child;
};

beforeEach(() => {
	vi.resetAllMocks();
	settings = [
		{
			name: "posts",
			collection: "CMS Posts",
			label: "Posts",
			url: "/posts",
			slug_field: "slug",
			published_field: "published",
		},
	];
	page = {
		name: "page",
		page_title: "About",
		route: "about",
		page_data_script: "data.custom = 'kept'",
	};
	pages = { page };
	api.getCollections.mockImplementation(async () => structuredClone(settings));
	api.getFields.mockResolvedValue(fields);
	api.updateCollection.mockImplementation(async (collection, patch) =>
		Object.assign(
			settings.find((row) => row.collection === collection),
			patch
		)
	);
	builder.data.getList.mockImplementation(async (doctype, { filters }) =>
		Object.values(pages).filter((each) => each.route === filters.route)
	);
	builder.data.getDoc.mockImplementation(async (doctype, name) => ({ ...pages[name] }));
	builder.page.update.mockImplementation(async (name, patch) =>
		Object.assign(pages[name], patch)
	);
	setBlocks();
	builder.page.getRoot.mockImplementation(() => blocks.root);
	builder.block.get.mockImplementation((id) => blocks[id]);
	builder.block.update.mockImplementation((id, patch) => Object.assign(blocks[id], patch));
	builder.context.get.mockReturnValue({ page, selection: { count: 0 } });
});

const collectionOf = (row) => new Collection({ ...row });

const addPage = (name, route, script = "") =>
	(pages[name] = { name, page_title: name, route, page_data_script: script });

describe("collection page", () => {
	it("gets the collection page route, the entry source and the setting, and keeps its own script", async () => {
		await setCollectionPage(collectionOf(settings[0]), "page");
		expect(settings[0].entry_page).toBe("page");
		expect(page.route).toBe("posts/:slug");
		expect(page.page_data_script).toContain("data.custom = 'kept'");
		expect(page.page_data_script).toContain("data.entry");
	});

	it("moves each other page off the template route to its default route", async () => {
		addPage("other", "posts/:slug");
		await setCollectionPage(collectionOf(settings[0]), "page");
		expect(pages.other.route).toBe("pages/other");
	});

	it("clears the previous collection when a page changes collections", async () => {
		settings[0].entry_page = "page";
		settings.push({
			name: "news",
			collection: "CMS News",
			label: "News",
			url: "/news",
			slug_field: "slug",
		});
		await setCollectionPage(collectionOf(settings[1]), "page");
		expect(settings[0].entry_page).toBe("");
		expect(settings[1].entry_page).toBe("page");
	});

	it("connects a page: an empty page gets the display fields, and the preview shows the newest entry", async () => {
		api.getNewestPublished.mockResolvedValue({ slug: "hello" });
		await connectCollectionPage(collectionOf(settings[0]), "page");
		expect(builder.page.open).toHaveBeenCalledWith("page");
		expect(builder.block.insert.mock.calls[0][1].children).toMatchObject([
			{ dynamicValues: [{ key: "entry.title" }] },
		]);
		expect(builder.page.setRouteVariables).toHaveBeenCalledWith({ slug: "hello" });
	});

	it("connects a designed page and keeps its blocks as they are", async () => {
		setBlocks({ blockId: "heading", children: [] });
		await connectCollectionPage(collectionOf(settings[0]), "page");
		expect(builder.block.insert).not.toHaveBeenCalled();
	});

	it("disconnects: back to the default route, no entry source, but keeps its own script", async () => {
		const collection = collectionOf(settings[0]);
		await setCollectionPage(collection, "page");
		await disconnectCollectionPage(collection);
		expect(page.route).toBe("pages/page");
		expect(page.page_data_script).not.toContain("data.entry");
		expect(page.page_data_script).toContain("data.custom = 'kept'");
		expect(settings[0].entry_page).toBe("");
	});

	it("creates a draft page and opens it as the collection page", async () => {
		builder.data.insert.mockImplementation(async () => addPage("new", "pages/new"));
		await createCollectionPage(collectionOf(settings[0]));
		expect(builder.data.insert).toHaveBeenCalledWith("Builder Page", {
			page_title: "Posts page",
		});
		expect(pages.new.route).toBe("posts/:slug");
		expect(builder.page.open).toHaveBeenCalledWith("new");
		expect(builder.block.insert).toHaveBeenCalled();
	});
});

describe("field connections", () => {
	const posts = new DataSource({ name: "posts" });
	const entry = new DataSource({ name: "entry", type: "Document" });
	const inList = (key) => ({ getRepeaterParent: () => ({ dataKey: { key } }) });

	it("offers only the nearest repeated item inside a list, and the entry outside one", () => {
		expect(getSourcesForBlock([posts, entry], inList("posts"))).toEqual([
			{ source: posts, prefix: "" },
		]);
		expect(getSourcesForBlock([posts, entry], { getRepeaterParent: () => null })).toEqual([
			{ source: entry, prefix: "entry." },
		]);
	});

	it("turns a text block into an image for an image field, and keeps its other bindings", () => {
		const color = {
			key: "entry.color",
			type: "style",
			property: "color",
			comesFrom: "dataScript",
		};
		setBlocks({
			blockId: "field",
			element: "p",
			isImage: () => false,
			dataKey: { key: "entry.title", type: "key", property: "innerHTML" },
			dynamicValues: [
				{
					key: "entry.title",
					type: "key",
					property: "innerHTML",
					comesFrom: "dataScript",
				},
				color,
			],
		});
		bindField("field", "entry.cover", {
			fieldname: "cover",
			label: "Cover",
			fieldtype: "Attach Image",
		});
		expect(blocks.field).toMatchObject({
			element: "img",
			dataKey: null,
			dynamicValues: [color, { key: "entry.cover", type: "attribute", property: "src" }],
			visibilityCondition: { key: "entry.cover" },
		});
	});
});

describe("collection content", () => {
	it("refuses entry deletion for a mapped DocType", () => {
		expect(() =>
			new Collection({ collection: "Blog Post", is_mapped: 1 }).deleteEntry("post")
		).toThrow("Desk");
	});
});

describe("collection lists", () => {
	const repeater = (children = []) => ({
		blockId: "list",
		isRepeaterBlock: true,
		dataKey: null,
		children,
	});

	it("points a repeater at a new source and fills an empty card with the display fields", async () => {
		setBlocks(repeater([{ blockId: "card", children: [{ blockId: "hint" }] }]));
		await setListCollection("list", collectionOf(settings[0]));
		expect(blocks.list.dataKey).toEqual({ key: "collection_posts", comesFrom: "dataScript" });
		expect(page.page_data_script).toContain("data.collection_posts");
		const [, [card]] = builder.block.setChildren.mock.calls[0];
		expect(card.children[0]).toMatchObject({ dynamicValues: [{ key: "title" }] });
	});

	it("keeps a designed card, and gives each list of one collection its own source", async () => {
		const other = { ...repeater(), blockId: "other", dataKey: { key: "collection_posts" } };
		setBlocks(
			other,
			repeater([{ blockId: "card", children: [{ dynamicValues: [{ key: "title" }] }] }])
		);
		await setListCollection("other", collectionOf(settings[0]));
		await setListCollection("list", collectionOf(settings[0]));
		expect(blocks.list.dataKey.key).toBe("collection_posts_2");
		expect(builder.block.setChildren).toHaveBeenCalledTimes(1);
	});

	it("drops the source when the list shows no collection, and keeps the blocks", async () => {
		setBlocks(repeater());
		await setListCollection("list", collectionOf(settings[0]));
		await setListCollection("list", null);
		expect(blocks.list.dataKey).toBe(null);
		expect(page.page_data_script).not.toContain("collection_posts");
		expect(page.page_data_script).toContain("data.custom = 'kept'");
	});

	it("changes the sort and the limit of the list's own source", async () => {
		setBlocks(repeater());
		await setListCollection("list", collectionOf(settings[0]));
		await updateList("list", { orderBy: "creation asc", limit: 3 });
		expect(page.page_data_script).toContain('order_by="creation asc"');
		expect(page.page_data_script).toContain("limit_page_length=3");
	});

	it("finds the repeater of a list: the list of cards itself, or the row group of a table", () => {
		const rows = { isRepeaterBlock: true };
		const table = { attributes: { role: "table" }, children: [{ blockId: "header" }, rows] };
		rows.getParentBlock = () => table;
		const cards = { isRepeaterBlock: true, getParentBlock: () => blocks.root };
		expect(getListRepeater(table)).toBe(rows);
		expect(getListRepeater(cards)).toBe(cards);
		// the row group is a part of the table, so the table holds the list settings
		expect(getListRepeater(rows)).toBe(null);
	});

	it("builds a list again as a table and back as cards, in the place of the old list", async () => {
		builder.block.replace.mockImplementation((id, tree) => tree);
		setBlocks({ ...repeater(), getParentBlock: () => blocks.root });
		const collection = collectionOf(settings[0]);
		await setListCollection("list", collection);

		await rebuildList("list", collection, { layout: "table" });
		const [id, table] = builder.block.replace.mock.calls[0];
		expect(id).toBe("list");
		expect(table.attributes.role).toBe("table");
		expect(table.children[1].dataKey.key).toBe("collection_posts");

		blocks.table = { ...table, blockId: "table", children: [table.children[0], blocks.list] };
		await rebuildList("table", collection, { layout: "cards" });
		expect(builder.block.replace.mock.calls[1]).toMatchObject([
			"table",
			{ isRepeaterBlock: true },
		]);
	});

	it("shows the chosen fields, and keeps them when the layout changes", async () => {
		builder.block.replace.mockImplementation((id, tree) => tree);
		setBlocks({ ...repeater(), getParentBlock: () => blocks.root });
		const collection = collectionOf(settings[0]);
		await setListCollection("list", collection);

		// the slug is not a display field, so only a choice puts it in the list
		// the list block stays, so the selection and an open picker stay too
		await rebuildList("list", collection, { fieldnames: ["slug"] });
		const [id, children] = builder.block.setChildren.mock.calls.at(-1);
		expect(id).toBe("list");
		expect(getBoundKeys({ children })).toEqual(["slug"]);
		expect(builder.block.replace).not.toHaveBeenCalled();
		await expect(rebuildList("list", collection, { fieldnames: [] })).rejects.toThrow(
			"at least one field"
		);

		blocks.list.children = children;
		await rebuildList("list", collection, { layout: "table" });
		const rows = builder.block.replace.mock.calls[0][1].children[1];
		expect(getBoundKeys(rows)).toEqual(["slug"]);
	});
});

describe("collection details", () => {
	it("starts as a marked placeholder, and on a collection page with the entry's display fields", async () => {
		const placeholder = await getDetailsTemplate();
		expect(placeholder.attributes).toEqual({ "data-cms": "details" });
		expect(getBoundKeys(placeholder)).toEqual([]);

		await setCollectionPage(collectionOf(settings[0]), "page");
		const filled = await getDetailsTemplate();
		expect(filled.attributes).toEqual({ "data-cms": "details" });
		expect(getBoundKeys(filled)).toEqual(["entry.title"]);
	});

	it("shows the chosen fields of the entry in place, and reads them back from its blocks", async () => {
		const collection = collectionOf(settings[0]);
		await setCollectionPage(collection, "page");
		setBlocks({ blockId: "details", attributes: { "data-cms": "details" }, children: [] });

		await fillDetails("details", collection, ["title", "slug"]);
		const [id, children] = builder.block.setChildren.mock.calls.at(-1);
		expect(id).toBe("details");
		expect(getDetailsFields({ children }, fields).map((field) => field.fieldname)).toEqual([
			"title",
			"slug",
		]);
		await expect(fillDetails("details", collection, [])).rejects.toThrow("at least one field");
	});
});
