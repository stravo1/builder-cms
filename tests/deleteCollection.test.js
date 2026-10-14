import { beforeEach, describe, expect, it, vi } from "vitest";

const { scripts, builder } = vi.hoisted(() => {
	const scripts = new Map();
	const builder = {
		schema: { deleteDoctype: vi.fn() },
		data: {
			getList: vi.fn(async (doctype, { start = 0 }) =>
				[...scripts.keys()]
					.filter((name) => scripts.get(name).includes("builder-cms:start"))
					.slice(start, start + 100)
					.map((name) => ({ name })),
			),
			getDoc: vi.fn(async (doctype, name) => ({ name, page_data_script: scripts.get(name) })),
			update: vi.fn(async (doctype, name, patch) => scripts.set(name, patch.page_data_script)),
			delete: vi.fn(),
		},
	};
	return { scripts, builder };
});
vi.mock("frappe-builder-extension-sdk", () => ({ default: builder }));

const { Collection } = await import("../src/cms/collection.js");
const { writeSection } = await import("../src/data/scriptSections.js");

const section = (script, name, doctype) => writeSection(script, name, { name, doctype, fields: ["name"] }, "pass");
const sourceNames = (page) => [...scripts.get(page).matchAll(/builder-cms:start (\S+)/g)].map((match) => match[1]);

describe("deleting a collection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		scripts.clear();
		// 101 pages: the last one is on the second page of the list
		for (let index = 0; index < 101; index++) scripts.set(`page-${index}`, section("", "posts", "CMS Post"));
		scripts.set("mixed", section(section("", "posts", "CMS Post"), "news", "CMS News"));
	});

	it("removes the doctype, its page sources, and its settings", async () => {
		await new Collection("CMS Post", { name: "row-1" }).delete();
		expect(builder.schema.deleteDoctype).toHaveBeenCalledWith("CMS Post");
		expect(sourceNames("page-0")).toEqual([]);
		expect(sourceNames("page-100")).toEqual([]);
		expect(sourceNames("mixed")).toEqual(["news"]);
		expect(builder.data.delete).toHaveBeenCalledWith("CMS Collection", "row-1");
	});

	it("keeps a mapped doctype and only disconnects it", async () => {
		scripts.set("mapped", section("", "users", "User"));
		await new Collection("User", { name: "row-2" }).delete();
		expect(builder.schema.deleteDoctype).not.toHaveBeenCalled();
		expect(sourceNames("mapped")).toEqual([]);
		expect(sourceNames("page-0")).toEqual(["posts"]);
		expect(builder.data.delete).toHaveBeenCalledWith("CMS Collection", "row-2");
	});

	it("changes nothing when the user refuses the doctype deletion", async () => {
		builder.schema.deleteDoctype.mockRejectedValueOnce(new Error("The user refused"));
		await expect(new Collection("CMS Post", { name: "row-1" }).delete()).rejects.toThrow("The user refused");
		expect(sourceNames("page-0")).toEqual(["posts"]);
		expect(builder.data.delete).not.toHaveBeenCalled();
	});
});
