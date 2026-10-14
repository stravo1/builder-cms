import { beforeEach, describe, expect, it, vi } from "vitest";

const builder = vi.hoisted(() => ({
	context: { get: vi.fn() },
	page: { getBlocks: vi.fn(), setRouteVariables: vi.fn() },
	block: { get: vi.fn(), update: vi.fn(), insert: vi.fn() },
	data: { getList: vi.fn(), getDoc: vi.fn(), update: vi.fn(), insert: vi.fn() },
	schema: { listDoctypes: vi.fn(), getDoctype: vi.fn() },
}));
vi.mock("frappe-builder-extension-sdk", () => ({ default: builder }));

import { Collection } from "../src/cms/collection.js";
import { setCollectionPage, setIndexPage } from "../src/cms/pageActions.js";
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
	settings = [{ name: "posts", collection: "CMS Posts", index_page: "page", url: "/posts" }];
	page = { name: "page", route: "posts", page_data_script: "data.custom = 'kept'" };
	builder.schema.listDoctypes.mockResolvedValue([
		{ doctype: "CMS Collection", exists: true },
		{ doctype: "CMS Posts", exists: true },
	]);
	builder.schema.getDoctype.mockImplementation(async (doctype) => ({
		fields:
			doctype === "CMS Collection"
				? ["collection", "label", "url", "entry_page", "index_page", "slug_field", "published_field"].map(
						(fieldname) => ({ fieldname }),
					)
				: fields,
	}));
	builder.data.getList.mockImplementation(async (doctype) =>
		doctype === "CMS Collection" ? structuredClone(settings) : [],
	);
	builder.data.getDoc.mockImplementation(async () => ({ ...page }));
	builder.data.update.mockImplementation(async (doctype, name, patch) => {
		const document = doctype === "Builder Page" ? page : settings.find((row) => row.name === name);
		return Object.assign(document || { name }, patch);
	});
});

describe("page transitions", () => {
	it("changes an index page to detail without leaving a second role assigned", async () => {
		await setCollectionPage(new Collection("CMS Posts", { ...settings[0] }), "page");
		expect(settings[0]).toMatchObject({ index_page: "", entry_page: "page" });
		expect(page.route).toBe("posts/:slug");
		expect(page.page_data_script).toContain("data.custom = 'kept'");
	});

	it("changes detail to index and removes the route-dependent entry source", async () => {
		settings[0] = { ...settings[0], index_page: "", entry_page: "page" };
		const source = new DataSource({ name: "entry", type: "Document", doctype: "CMS Posts", fields: ["title"] });
		page.page_data_script = writeSection(page.page_data_script, "entry", source.toJSON(), source.toPython());
		await setIndexPage(new Collection("CMS Posts", { ...settings[0] }), "page");
		expect(settings[0]).toMatchObject({ index_page: "page", entry_page: "" });
		expect(page.page_data_script).not.toContain("data.entry");
	});

	it("clears the previous collection when a page changes collections", async () => {
		settings.push({ name: "news", collection: "CMS News", url: "/news" });
		await setCollectionPage(new Collection("CMS News", { ...settings[1] }), "page");
		expect(settings[0].index_page).toBe("");
		expect(settings[1].entry_page).toBe("page");
	});

	it("keeps the list binding when an index page changes collections", async () => {
		settings.push({ name: "news", collection: "CMS News", url: "/news" });
		const source = new DataSource({ name: "posts", doctype: "CMS Posts", fields: ["title"], limit: 5 });
		page.page_data_script = writeSection(page.page_data_script, "posts", source.toJSON(), source.toPython());
		await setIndexPage(new Collection("CMS News", { ...settings[1] }), "page");
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
	it("protects core fields and mapped DocTypes from field removal", async () => {
		await expect(new Collection("CMS Posts").removeField("title")).rejects.toThrow("required");
		await expect(new Collection("Blog Post").removeField("body")).rejects.toThrow("Desk");
	});

	it("refuses entry deletion for a mapped DocType", () => {
		expect(() => new Collection("Blog Post").deleteEntry("post")).toThrow("Desk");
	});
	it("never sends framework fields back when saving a document", async () => {
		const collection = new Collection("CMS Posts");
		await collection.saveEntry({
			name: "post",
			title: "Hello",
			slug: "",
			doctype: "CMS Posts",
			owner: "Administrator",
			modified: "now",
		});
		expect(builder.data.update).toHaveBeenCalledWith("CMS Posts", "post", { title: "Hello", slug: "hello" });
	});

	it("uses the mapped fields when adding an existing DocType entry", async () => {
		builder.schema.getDoctype.mockResolvedValue({
			fields: [
				{ fieldname: "headline", fieldtype: "Data" },
				{ fieldname: "permalink", fieldtype: "Data" },
			],
		});
		const collection = new Collection("Article", { slug_field: "permalink" });
		await collection.saveEntry({ headline: "Hello", permalink: "hello" });
		expect(builder.data.insert).toHaveBeenCalledWith("Article", { headline: "Hello", permalink: "hello" });
	});
});
