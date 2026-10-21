import { beforeEach, describe, expect, it, vi } from "vitest";

const { builder, api } = vi.hoisted(() => ({
	builder: { data: { subscribe: vi.fn() }, ui: { toast: vi.fn() } },
	api: { getCollections: vi.fn(), updateCollection: vi.fn() },
}));
vi.mock("frappe-builder-extension-sdk", () => ({ default: builder }));
vi.mock("../src/data/api.js", () => ({ api }));

const { cached, forget, hasCopy, showThenRefresh } = await import("../src/data/cache.js");
const { Collection } = await import("../src/cms/collection.js");
const { useTask } = await import("../src/panel/useTask.js");

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
		api.getCollections.mockResolvedValue([{ name: "row", collection: "CMS Blog Post", label: "Posts" }]);
		const [posts] = await Collection.all();
		await Collection.all();
		expect(api.getCollections).toHaveBeenCalledOnce();
		// a settings write in another frame, such as the dialog, reaches this frame here
		expect(builder.data.subscribe).toHaveBeenCalledWith("CMS Collection", expect.any(Function));

		const renamed = { name: "row", collection: "CMS Blog Post", label: "Articles" };
		api.updateCollection.mockResolvedValue(renamed);
		api.getCollections.mockResolvedValue([renamed]);
		await posts.saveSettings({ label: "Articles" });
		expect(api.updateCollection).toHaveBeenCalledWith("CMS Blog Post", { label: "Articles" });
		expect((await Collection.all())[0].label).toBe("Articles");
	});

	it("shows the last copy at once, then the fresh value", async () => {
		const shown = [];
		await showThenRefresh("rows:Blog", async () => ["first"], (rows) => shown.push(rows));
		expect(hasCopy("rows:Blog")).toBe(true);

		let finish;
		const refresh = showThenRefresh("rows:Blog", () => new Promise((resolve) => (finish = resolve)), (rows) => shown.push(rows));
		// the copy shows before the read ends
		expect(shown).toEqual([["first"], ["first"]]);
		finish(["second"]);
		await refresh;
		expect(shown).toEqual([["first"], ["first"], ["second"]]);
	});

	it("keeps copies when the reads are forgotten", async () => {
		await showThenRefresh("rows:Kept", async () => ["row"], () => {});
		forget();
		expect(hasCopy("rows:Kept")).toBe(true);
	});

	it("loads a view one time, then shows its copy with no loading state", async () => {
		const first = useTask();
		const load = first.runCached("page:home", async () => "first", () => {});
		expect(first.isRunning.value).toBe(true);
		await load;

		// the tab mounts again, as when the user comes back to it
		const again = useTask();
		const shown = [];
		let finish;
		const refresh = again.runCached("page:home", () => new Promise((resolve) => (finish = resolve)), (value) => shown.push(value));
		expect(again.isRunning.value).toBe(false);
		expect(shown).toEqual(["first"]);
		finish("second");
		await refresh;
		expect(shown).toEqual(["first", "second"]);
	});
});
