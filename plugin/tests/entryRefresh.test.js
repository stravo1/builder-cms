import { beforeEach, describe, expect, it, vi } from "vitest";

const { builder, api } = vi.hoisted(() => ({
	builder: { page: { refreshData: vi.fn() }, ui: { toast: vi.fn() } },
	api: { saveEntry: vi.fn(), deleteEntry: vi.fn() },
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
vi.mock("../src/data/api.js", () => ({ api }));

import { Collection } from "../src/cms/collection.js";

const collection = new Collection({ collection: "CMS Posts" });

beforeEach(() => vi.resetAllMocks());

describe("entry changes on the canvas", () => {
	it("refreshes page data after an inline edit", async () => {
		const stored = { name: "post", title: "Original" };
		let pageData = { ...stored };
		api.saveEntry.mockImplementation(async (doctype, { name, ...patch }) => Object.assign(stored, patch));
		builder.page.refreshData.mockImplementation(async () => (pageData = { ...stored }));

		const saved = await collection.updateEntry("post", { title: "Updated" });

		expect(pageData.title).toBe("Updated");
		expect(saved).toEqual(stored);
		expect(builder.page.refreshData).toHaveBeenCalledOnce();
	});

	it.each(["", "post"])("refreshes after saving an entry form with name '%s'", async (name) => {
		const entry = { name, title: "Updated", slug: "updated" };
		await collection.saveEntry(entry);

		expect(api.saveEntry).toHaveBeenCalledWith("CMS Posts", entry);
		expect(builder.page.refreshData).toHaveBeenCalledOnce();
		expect(api.saveEntry.mock.invocationCallOrder[0]).toBeLessThan(
			builder.page.refreshData.mock.invocationCallOrder[0],
		);
	});

	it("removes deleted entries from page data", async () => {
		let stored = [{ name: "post", title: "Original" }];
		let pageData = [...stored];
		api.deleteEntry.mockImplementation(async () => (stored = []));
		builder.page.refreshData.mockImplementation(async () => (pageData = [...stored]));

		await collection.deleteEntry("post");

		expect(pageData).toEqual([]);
		expect(builder.page.refreshData).toHaveBeenCalledOnce();
	});

	it("does not refresh when the entry write is refused", async () => {
		api.saveEntry.mockRejectedValue(new Error("Permission denied"));

		await expect(collection.updateEntry("post", { title: "Refused" })).rejects.toThrow("Permission denied");
		expect(builder.page.refreshData).not.toHaveBeenCalled();
	});

	it("keeps a successful write successful when the data refresh fails", async () => {
		const saved = { name: "post", title: "Updated" };
		api.saveEntry.mockResolvedValue(saved);
		builder.page.refreshData.mockRejectedValue(new Error("No page is open"));

		await expect(collection.updateEntry("post", { title: "Updated" })).resolves.toEqual(saved);
		expect(api.saveEntry).toHaveBeenCalledOnce();
		expect(builder.ui.toast).toHaveBeenCalledWith(expect.stringContaining("No page is open"));
	});
});
