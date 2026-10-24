import { beforeEach, describe, expect, it, vi } from "vitest";

const { builder, api } = vi.hoisted(() => ({
	builder: {
		context: { get: vi.fn() },
		page: {
			getBlocks: vi.fn(),
			setRouteVariables: vi.fn(),
			refreshData: vi.fn(),
			open: vi.fn(),
		},
		block: { get: vi.fn(), update: vi.fn(), insert: vi.fn() },
		data: {
			getList: vi.fn(),
			getDoc: vi.fn(),
			update: vi.fn(),
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
	updateDocument: builder.data?.update,
	insertDocument: builder.data?.insert,
	subscribeDocuments: builder.data?.subscribe,
}));
vi.mock("../src/editor/context.js", () => ({ getEditorContext: builder.context?.get }));
vi.mock("../src/editor/page.js", () => ({
	refreshPageData: builder.page?.refreshData,
	setRouteVariables: builder.page?.setRouteVariables,
	openPage: builder.page?.open,
}));
vi.mock("../src/editor/canvas.js", () => ({
	getRootBlock: async () => (await builder.page.getBlocks())[0],
	getBlock: builder.block?.get,
	updateBlock: builder.block?.update,
	insertBlock: builder.block?.insert,
}));
vi.mock("frappe-ui", () => ({ toast: { error: builder.ui?.toast, success: builder.ui?.toast } }));
vi.mock("../src/data/api.js", () => ({ api }));

import { Collection } from "../src/cms/collection.js";
import {
	addCollectionList,
	addEntryContent,
	clearCollectionPage,
	createCollectionPage,
	setCollectionPage,
} from "../src/cms/pageActions.js";
import { bindBlock, getSourcesForBlock } from "../src/blocks/blockActions.js";
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
			patch,
		),
	);
	builder.data.getList.mockImplementation(async (doctype, { filters }) =>
		Object.values(pages).filter((each) => each.route === filters.route),
	);
	builder.data.getDoc.mockImplementation(async (doctype, name) => ({ ...pages[name] }));
	builder.data.update.mockImplementation(async (doctype, name, patch) => Object.assign(pages[name], patch));
});

const collectionOf = (row) => new Collection({ ...row });

const entrySource = new DataSource({
	name: "entry",
	type: "Document",
	doctype: "CMS Posts",
	fields: ["title"],
});
const addPage = (name, route, script = "") =>
	(pages[name] = { name, page_title: name, route, page_data_script: script });

describe("template page", () => {
	it("gets the template route, the entry source and the setting, and keeps its own script", async () => {
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

	it("takes over from the old template, which loses its entry source", async () => {
		addPage("old", "posts/:slug", writeSection("", "entry", entrySource.toJSON(), entrySource.toPython()));
		settings[0].entry_page = "old";
		await setCollectionPage(collectionOf(settings[0]), "page");
		expect(pages.old).toMatchObject({ route: "pages/old", page_data_script: "" });
		expect(settings[0].entry_page).toBe("page");
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

	it("stops: moves to the typed route and loses the entry source, but keeps its own script", async () => {
		const collection = collectionOf(settings[0]);
		await setCollectionPage(collection, "page");
		await clearCollectionPage(collection, " /about-us/ ");
		expect(page.route).toBe("about-us");
		expect(page.page_data_script).not.toContain("data.entry");
		expect(page.page_data_script).toContain("data.custom = 'kept'");
		expect(settings[0].entry_page).toBe("");
	});

	it("refuses to stop onto a route another page has", async () => {
		addPage("contact", "contact");
		const collection = collectionOf({ ...settings[0], entry_page: "page" });
		await expect(clearCollectionPage(collection, "/contact")).rejects.toThrow('"contact" already uses /contact');
	});

	it("creates a draft page and opens it as the template", async () => {
		builder.data.insert.mockImplementation(async () => addPage("new", "pages/new"));
		builder.page.getBlocks.mockResolvedValue([{ blockId: "root", children: [] }]);
		builder.context.get.mockResolvedValue({ selection: { count: 0 } });
		await createCollectionPage(collectionOf(settings[0]));
		expect(builder.data.insert).toHaveBeenCalledWith("Builder Page", {
			page_title: "Posts template",
		});
		expect(pages.new.route).toBe("posts/:slug");
		expect(builder.page.open).toHaveBeenCalledWith("new");
		expect(builder.block.insert).toHaveBeenCalled();
	});
});

describe("field connections", () => {
	it("offers only the nearest repeated item inside a list", async () => {
		builder.page.getBlocks.mockResolvedValue([
			{
				blockId: "root",
				children: [
					{
						blockId: "list",
						isRepeaterBlock: true,
						dataKey: { key: "posts" },
						children: [{ blockId: "title" }],
					},
				],
			},
		]);
		const posts = new DataSource({ name: "posts" });
		const entry = new DataSource({ name: "entry", type: "Document" });
		expect(await getSourcesForBlock([posts, entry], "title")).toEqual([{ source: posts, prefix: "" }]);
	});

	it("changes a legacy text binding without leaving it active after disconnect", async () => {
		builder.block.get.mockResolvedValue({
			dataKey: { key: "entry.title", type: "key", property: "innerHTML" },
			dynamicValues: [],
		});
		await bindBlock("title", "", false);
		expect(builder.block.update).toHaveBeenCalledWith(
			"title",
			expect.objectContaining({ dataKey: null, dynamicValues: [] }),
		);
	});
});

describe("collection content", () => {
	it("refuses entry deletion for a mapped DocType", () => {
		expect(() => new Collection({ collection: "Blog Post", is_mapped: 1 }).deleteEntry("post")).toThrow(
			"Desk",
		);
	});
});

describe("inserted blocks", () => {
	const title = { fieldname: "title", label: "Title", fieldtype: "Data" };
	const blockNames = (block) => [block.blockName, ...(block.children || []).flatMap(blockNames)];

	beforeEach(() => {
		builder.context.get.mockResolvedValue({ page, selection: { count: 0 } });
		builder.page.getBlocks.mockResolvedValue([{ blockId: "root", children: [] }]);
	});

	it("inserts only the chosen fields in a collection list", async () => {
		await addCollectionList(collectionOf(settings[0]), { layout: "table", fields: [title] });
		const [, tree] = builder.block.insert.mock.calls[0];
		expect(tree.baseStyles.gridTemplateColumns).toBe("fit-content(280px)");
		expect(blockNames(tree)).toContain("Title heading");
	});

	it("inserts the entry content on a template page each time the user asks", async () => {
		const collection = collectionOf(settings[0]);
		await setCollectionPage(collection, "page");
		await addEntryContent(collection, [title]);
		await addEntryContent(collection, [title]);
		expect(builder.block.insert).toHaveBeenCalledTimes(2);
		expect(builder.block.insert.mock.calls[1][1].children).toMatchObject([
			{ blockName: "Title", dynamicValues: [{ key: "entry.title" }] },
		]);
	});

	it("refuses entry content on a page with no entry source", async () => {
		await expect(addEntryContent(collectionOf(settings[0]), [title])).rejects.toThrow("template page");
	});
});
