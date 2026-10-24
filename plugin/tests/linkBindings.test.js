import { beforeEach, describe, expect, it, vi } from "vitest";

const builder = vi.hoisted(() => ({
	block: { get: vi.fn(), update: vi.fn() },
	context: { get: vi.fn() },
	page: { getBlocks: vi.fn(), loadSources: vi.fn() },
	fields: vi.fn(),
}));
vi.mock("../src/data/doctypes.js", () => ({ getDoctypeFields: builder.fields }));
vi.mock("../src/data/pageData.js", () => ({
	PageData: class {
		load = builder.page.loadSources;
	},
}));
vi.mock("../src/data/documents.js", () => ({
	getDocuments: builder.data?.getList,
	getDocument: builder.data?.getDoc,
	updateDocument: builder.data?.update,
	subscribeDocuments: builder.data?.subscribe,
}));
vi.mock("../src/editor/context.js", () => ({ getEditorContext: builder.context?.get }));
vi.mock("../src/editor/page.js", () => ({
	refreshPageData: builder.page?.refreshData,
	setRouteVariables: builder.page?.setRouteVariables,
}));
vi.mock("../src/editor/canvas.js", () => ({
	getRootBlock: async () => (await builder.page.getBlocks())[0],
	getBlock: builder.block?.get,
	updateBlock: builder.block?.update,
	insertBlock: builder.block?.insert,
}));
vi.mock("frappe-ui", () => ({ toast: { error: builder.ui?.toast, success: builder.ui?.toast } }));

import { bindBlock, getBindingTargets, getFieldItems } from "../src/blocks/blockActions.js";

beforeEach(() => vi.resetAllMocks());

describe("fields for Set Dynamic Value", () => {
	const block = { blockId: "heading" };

	beforeEach(() => {
		builder.context.get.mockReturnValue({ page: { name: "blog-post" } });
		builder.page.getBlocks.mockResolvedValue([{ blockId: "root", children: [block] }]);
		builder.page.loadSources.mockResolvedValue([
			{ name: "entry", isList: false, doctype: "Post", readFields: ["title", "cover", "published"] },
		]);
		builder.fields.mockResolvedValue([
			{ fieldname: "title", label: "Title", fieldtype: "Data" },
			{ fieldname: "cover", label: "Cover", fieldtype: "Attach Image" },
			{ fieldname: "published", label: "Published", fieldtype: "Check" },
		]);
	});

	it("offers the page entry fields that fit the text content", async () => {
		expect(await getFieldItems({ block, property: "innerHTML", type: "key" })).toEqual([
			{ key: "entry.title", label: "Title", comesFrom: "dataScript" },
		]);
	});

	it("offers nothing for a property that no field fits", async () => {
		expect(await getFieldItems({ block, property: "color", type: "style" })).toEqual([]);
	});
});

describe("block link bindings", () => {
	it.each([{ isText: true }, { isHTML: true }])("offers text, link, and visibility for %o", (selection) => {
		expect(getBindingTargets(selection).map(({ value }) => value)).toEqual(["text", "link", "visibility"]);
	});

	it("offers a link for containers without treating them as text", () => {
		expect(getBindingTargets({ isContainer: true }).map(({ value }) => value)).toEqual([
			"link",
			"visibility",
		]);
	});

	it("keeps image source and visibility options for images", () => {
		expect(getBindingTargets({ isImage: true }).map(({ value }) => value)).toEqual(["image", "visibility"]);
	});

	it.each(["p", "div", "a"])("binds a URL to a <%s> alongside text and visibility", async (element) => {
		const text = { key: "entry.title", type: "key", property: "innerHTML", comesFrom: "dataScript" };
		const visibility = { key: "entry.published", comesFrom: "dataScript" };
		const block = { element, dynamicValues: [text], visibilityCondition: visibility };
		builder.block.get.mockResolvedValue(block);
		builder.block.update.mockImplementation(async (id, patch) => Object.assign(block, patch));

		await bindBlock("heading", "entry.url", "link");

		expect(block.element).toBe("a");
		expect(block.dynamicValues).toEqual([
			text,
			{ key: "entry.url", type: "attribute", property: "href", comesFrom: "dataScript" },
		]);
		expect(block.visibilityCondition).toEqual(visibility);
	});

	it("disconnects the link without removing text or visibility bindings", async () => {
		const text = { key: "entry.title", type: "key", property: "innerHTML" };
		const visibility = { key: "entry.published" };
		const block = {
			element: "a",
			dynamicValues: [text, { key: "entry.url", type: "attribute", property: "href" }],
			visibilityCondition: visibility,
		};
		builder.block.get.mockResolvedValue(block);
		builder.block.update.mockImplementation(async (id, patch) => Object.assign(block, patch));

		await bindBlock("heading", "", "link");

		expect(block.dynamicValues).toEqual([text]);
		expect(block.visibilityCondition).toEqual(visibility);
	});
});
