import { beforeEach, describe, expect, it, vi } from "vitest";

const builder = vi.hoisted(() => ({
	data: { update: vi.fn(), insert: vi.fn(), delete: vi.fn() },
	page: { refreshData: vi.fn() },
	schema: { getDoctype: vi.fn() },
	ui: { toast: vi.fn() },
}));
vi.mock("frappe-builder-extension-sdk", () => ({ default: builder }));

import { Collection } from "../src/cms/collection.js";

const collection = new Collection("CMS Posts");

beforeEach(() => {
	vi.resetAllMocks();
	builder.schema.getDoctype.mockResolvedValue({
		fields: ["title", "slug"].map((fieldname) => ({ fieldname, fieldtype: "Data" })),
	});
});

describe("entry changes on the canvas", () => {
	it("refreshes page data after an inline edit", async () => {
		const stored = { name: "post", title: "Original" };
		let pageData = { ...stored };
		builder.data.update.mockImplementation(async (doctype, name, patch) => Object.assign(stored, patch));
		builder.page.refreshData.mockImplementation(async () => (pageData = { ...stored }));

		const saved = await collection.updateEntry("post", { title: "Updated" });

		expect(pageData.title).toBe("Updated");
		expect(saved).toEqual(stored);
		expect(builder.page.refreshData).toHaveBeenCalledOnce();
	});

	it.each(["", "post"])("refreshes after saving an entry form with name '%s'", async (name) => {
		await collection.saveEntry({ name, title: "Updated", slug: "updated" });

		const write = name ? builder.data.update : builder.data.insert;
		expect(write).toHaveBeenCalledOnce();
		expect(builder.page.refreshData).toHaveBeenCalledOnce();
		expect(write.mock.invocationCallOrder[0]).toBeLessThan(
			builder.page.refreshData.mock.invocationCallOrder[0],
		);
	});

	it("removes deleted entries from page data", async () => {
		let stored = [{ name: "post", title: "Original" }];
		let pageData = [...stored];
		builder.data.delete.mockImplementation(async () => (stored = []));
		builder.page.refreshData.mockImplementation(async () => (pageData = [...stored]));

		await collection.deleteEntry("post");

		expect(pageData).toEqual([]);
		expect(builder.page.refreshData).toHaveBeenCalledOnce();
	});

	it("does not refresh when the entry write is refused", async () => {
		builder.data.update.mockRejectedValue(new Error("Permission denied"));

		await expect(collection.updateEntry("post", { title: "Refused" })).rejects.toThrow("Permission denied");
		expect(builder.page.refreshData).not.toHaveBeenCalled();
	});

	it("keeps a successful write successful when the data refresh fails", async () => {
		const saved = { name: "post", title: "Updated" };
		builder.data.update.mockResolvedValue(saved);
		builder.page.refreshData.mockRejectedValue(new Error("No page is open"));

		await expect(collection.updateEntry("post", { title: "Updated" })).resolves.toEqual(saved);
		expect(builder.data.update).toHaveBeenCalledOnce();
		expect(builder.ui.toast).toHaveBeenCalledWith(expect.stringContaining("No page is open"), {
			type: "error",
		});
	});
});
