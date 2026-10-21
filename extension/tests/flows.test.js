import { beforeEach, describe, expect, it, vi } from "vitest";

const { builder, api } = vi.hoisted(() => ({
	builder: {
		context: { get: vi.fn() },
		page: { getBlocks: vi.fn(), setRouteVariables: vi.fn(), refreshData: vi.fn() },
		block: { get: vi.fn(), update: vi.fn(), insert: vi.fn() },
		data: { getList: vi.fn(), getDoc: vi.fn(), update: vi.fn(), subscribe: vi.fn() },
	},
	api: { getCollections: vi.fn(), updateCollection: vi.fn(), getFields: vi.fn(), getNewestPublished: vi.fn() },
}));
vi.mock("frappe-builder-extension-sdk", () => ({ default: builder }));
vi.mock("../src/data/api.js", () => ({ api }));

import { Collection } from "../src/cms/collection.js";
import { addCollectionList, addEntryContent, setCollectionPage, setIndexPage } from "../src/cms/pageActions.js";
import { bindBlock, getSourcesForBlock } from "../src/blocks/blockActions.js";
import { DataSource } from "../src/data/dataSource.js";
import { writeSection } from "../src/data/scriptSections.js";

const fields = [
	{ fieldname: "title", fieldtype: "Data", reqd: 1 },
	{ fieldname: "slug", fieldtype: "Data" },
	{ fieldname: "published", fieldtype: "Check" },
];
let settings;
let page;

beforeEach(() => {
	vi.resetAllMocks();
	settings = [
		{
			name: "posts",
			collection: "CMS Posts",
			label: "Posts",
			index_page: "page",
			url: "/posts",
			slug_field: "slug",
			published_field: "published",
		},
	];
	page = { name: "page", route: "posts", page_data_script: "data.custom = 'kept'" };
	api.getCollections.mockImplementation(async () => structuredClone(settings));
	api.getFields.mockResolvedValue(fields);
	api.updateCollection.mockImplementation(async (collection, patch) =>
		Object.assign(
			settings.find((row) => row.collection === collection),
			patch,
		),
	);
	builder.data.getList.mockResolvedValue([]);
	builder.data.getDoc.mockImplementation(async () => ({ ...page }));
	builder.data.update.mockImplementation(async (doctype, name, patch) => Object.assign(page, patch));
});

const collectionOf = (row) => new Collection({ ...row });

describe("page transitions", () => {
	it("changes an index page to detail without leaving a second role assigned", async () => {
		await setCollectionPage(collectionOf(settings[0]), "page");
		expect(settings[0]).toMatchObject({ index_page: "", entry_page: "page" });
		expect(page.route).toBe("posts/:slug");
		expect(page.page_data_script).toContain("data.custom = 'kept'");
	});

	it("changes detail to index and removes the route-dependent entry source", async () => {
		settings[0] = { ...settings[0], index_page: "", entry_page: "page" };
		const source = new DataSource({ name: "entry", type: "Document", doctype: "CMS Posts", fields: ["title"] });
		page.page_data_script = writeSection(page.page_data_script, "entry", source.toJSON(), source.toPython());
		await setIndexPage(collectionOf(settings[0]), "page");
		expect(settings[0]).toMatchObject({ index_page: "page", entry_page: "" });
		expect(page.page_data_script).not.toContain("data.entry");
	});

	it("clears the previous collection when a page changes collections", async () => {
		settings.push({ name: "news", collection: "CMS News", label: "News", url: "/news", slug_field: "slug" });
		await setCollectionPage(collectionOf(settings[1]), "page");
		expect(settings[0].index_page).toBe("");
		expect(settings[1].entry_page).toBe("page");
	});

	it("keeps the list binding when an index page changes collections", async () => {
		settings.push({ name: "news", collection: "CMS News", label: "News", url: "/news", slug_field: "slug" });
		const source = new DataSource({ name: "posts", doctype: "CMS Posts", fields: ["title"], limit: 5 });
		page.page_data_script = writeSection(page.page_data_script, "posts", source.toJSON(), source.toPython());
		await setIndexPage(collectionOf(settings[1]), "page");
		expect(page.page_data_script).toContain('"name":"posts"');
		expect(page.page_data_script).toContain('"doctype":"CMS News"');
		expect(page.page_data_script).toContain('"limit":5');
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
		expect(() => new Collection({ collection: "Blog Post", is_mapped: 1 }).deleteEntry("post")).toThrow("Desk");
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
		expect(tree.styles.gridTemplateColumns).toBe("fit-content(280px)");
		expect(blockNames(tree)).toContain("Title heading");
	});

	it("inserts the entry content on a detail page each time the user asks", async () => {
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
		await expect(addEntryContent(collectionOf(settings[0]), [title])).rejects.toThrow("detail page");
	});
});
