import { beforeEach, describe, expect, it, vi } from "vitest";

const { builder } = vi.hoisted(() => ({
	builder: {
		data: { getList: vi.fn(), update: vi.fn(), subscribe: vi.fn() },
		schema: { listDoctypes: vi.fn(), getDoctype: vi.fn() },
	},
}));
vi.mock("frappe-builder-extension-sdk", () => ({ default: builder }));

const { cached, forget } = await import("../src/data/cache.js");
const { Collection } = await import("../src/cms/collection.js");

describe("the read cache", () => {
	beforeEach(() => {
		forget();
		vi.clearAllMocks();
	});

	it("reads a key one time", async () => {
		const read = vi.fn().mockResolvedValue("value");
		expect(await cached("key", read)).toBe("value");
		expect(await cached("key", read)).toBe("value");
		expect(read).toHaveBeenCalledOnce();
	});

	it("reads again after a failed read", async () => {
		const read = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("value");
		await expect(cached("key", read)).rejects.toThrow("offline");
		expect(await cached("key", read)).toBe("value");
	});

	it("forgets the keys that start with a prefix, and only those", async () => {
		const read = vi.fn().mockResolvedValue("value");
		await cached("doctype:Blog", read);
		await cached("collections", read);
		forget("doctype:");
		await cached("doctype:Blog", read);
		await cached("collections", read);
		expect(read).toHaveBeenCalledTimes(3);
	});

	it("reads the collections again after a settings save", async () => {
		builder.schema.listDoctypes.mockResolvedValue([{ doctype: "CMS Collection", exists: true }]);
		// the settings doctype already has every field, so nothing writes the schema
		const settingsFields = ["collection", "label", "url", "entry_page", "index_page", "slug_field", "published_field"];
		builder.schema.getDoctype.mockResolvedValue({ fields: settingsFields.map((fieldname) => ({ fieldname })) });
		builder.data.getList.mockResolvedValue([{ name: "row", collection: "Blog Post", label: "Posts" }]);
		const [posts] = await Collection.all();
		await Collection.all();
		expect(builder.data.getList).toHaveBeenCalledOnce();
		// a settings write in another frame, such as the dialog, reaches this frame here
		expect(builder.data.subscribe).toHaveBeenCalledWith("CMS Collection", expect.any(Function));

		builder.data.getList.mockResolvedValue([{ name: "row", collection: "Blog Post", label: "Articles" }]);
		await posts.saveSettings({ label: "Articles" });
		expect((await Collection.all())[0].label).toBe("Articles");
	});
});
