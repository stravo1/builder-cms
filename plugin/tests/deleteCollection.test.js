import { beforeEach, describe, expect, it, vi } from "vitest";

const { scripts, builder, api } = vi.hoisted(() => {
	const scripts = new Map();
	const api = { deleteCollection: vi.fn() };
	const builder = {
		data: {
			getList: vi.fn(async (doctype, { start = 0 }) =>
				[...scripts.keys()]
					.filter((name) => scripts.get(name).includes("builder-cms:start"))
					.slice(start, start + 100)
					.map((name) => ({ name })),
			),
			getDoc: vi.fn(async (doctype, name) => ({ name, page_data_script: scripts.get(name) })),
		},
		page: { update: vi.fn(async (name, patch) => scripts.set(name, patch.page_data_script)) },
	};
	return { scripts, builder, api };
});
vi.mock("../src/data/documents.js", () => ({
	getDocuments: builder.data?.getList,
	getDocument: builder.data?.getDoc,
	subscribeDocuments: builder.data?.subscribe,
}));
vi.mock("../src/editor/context.js", () => ({ getEditorContext: builder.context?.get }));
vi.mock("../src/editor/page.js", () => ({
	refreshPageData: builder.page?.refreshData,
	updatePageDocument: builder.page?.update,
	setRouteVariables: builder.page?.setRouteVariables,
}));
vi.mock("../src/editor/canvas.js", () => ({
	getRootBlock: async () => (await builder.page.getBlocks())[0],
	getBlock: builder.block?.get,
	updateBlock: builder.block?.update,
	insertBlock: builder.block?.insert,
}));
vi.mock("frappe-ui", () => ({ toast: { error: builder.ui?.toast, success: builder.ui?.toast } }));
vi.mock("../src/data/api.js", () => ({ api }));

const { Collection } = await import("../src/cms/collection.js");
const { writeSection } = await import("../src/data/scriptSections.js");

const section = (script, name, doctype) =>
	writeSection(script, name, { name, doctype, fields: ["name"] }, "pass");
const sourceNames = (page) =>
	[...scripts.get(page).matchAll(/builder-cms:start (\S+)/g)].map((match) => match[1]);

describe("deleting a collection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		scripts.clear();
		// 101 pages: the last one is on the second page of the list
		for (let index = 0; index < 101; index++) scripts.set(`page-${index}`, section("", "posts", "CMS Post"));
		scripts.set("mixed", section(section("", "posts", "CMS Post"), "news", "CMS News"));
	});

	it("asks the app to delete it, then removes its page sources", async () => {
		await new Collection({ collection: "CMS Post" }).delete();
		expect(api.deleteCollection).toHaveBeenCalledWith("CMS Post");
		expect(sourceNames("page-0")).toEqual([]);
		expect(sourceNames("page-100")).toEqual([]);
		expect(sourceNames("mixed")).toEqual(["news"]);
	});

	it("disconnects a mapped doctype from its pages only", async () => {
		scripts.set("mapped", section("", "users", "User"));
		await new Collection({ collection: "User", is_mapped: 1 }).delete();
		expect(api.deleteCollection).toHaveBeenCalledWith("User");
		expect(sourceNames("mapped")).toEqual([]);
		expect(sourceNames("page-0")).toEqual(["posts"]);
	});

	it("changes no page when the app refuses the deletion", async () => {
		api.deleteCollection.mockRejectedValueOnce(new Error("Not permitted"));
		await expect(new Collection({ collection: "CMS Post" }).delete()).rejects.toThrow("Not permitted");
		expect(sourceNames("page-0")).toEqual(["posts"]);
	});
});
