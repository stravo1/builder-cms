import { beforeEach, describe, expect, it, vi } from "vitest";

const builder = vi.hoisted(() => ({
	context: { get: vi.fn() },
	page: { getBlocks: vi.fn(), loadSources: vi.fn() },
	fields: vi.fn(),
}));
vi.mock("../src/data/doctypes.js", async (importOriginal) => ({
	...(await importOriginal()),
	getDoctypeFields: builder.fields,
}));
vi.mock("../src/data/documents.js", () => ({}));
vi.mock("../src/data/pageData.js", () => ({
	PageData: class {
		load = builder.page.loadSources;
	},
}));
vi.mock("../src/editor/context.js", () => ({ getEditorContext: builder.context.get }));
vi.mock("../src/editor/canvas.js", () => ({
	getRootBlock: async () => (await builder.page.getBlocks())[0],
}));

import { getFieldItems } from "../src/blocks/blockActions.js";

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
