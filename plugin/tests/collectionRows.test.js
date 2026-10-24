import { describe, expect, it, vi } from "vitest";

import { useCollectionRows } from "../src/panel/table/useCollectionRows.js";

const createCollection = () => ({
	getTableFields: vi
		.fn()
		.mockResolvedValue([{ fieldname: "title", label: "Title", fieldtype: "Data" }]),
	getRows: vi.fn().mockResolvedValue([{ name: "post", title: "Original" }]),
	updateEntry: vi.fn(),
	deleteEntry: vi.fn(),
});

describe("collection table rows", () => {
	it("appends the next page without losing loaded entries", async () => {
		const collection = createCollection();
		collection.getRows.mockResolvedValueOnce(
			Array.from({ length: 20 }, (_, index) => ({ name: `post-${index}` })),
		);
		const table = useCollectionRows(collection);
		await table.reload();
		expect(table.hasMore.value).toBe(true);
		await table.loadMore();
		expect(collection.getRows).toHaveBeenLastCalledWith(table.fields.value, {
			start: 20,
			pageLength: 20,
		});
		expect(table.rows.value).toHaveLength(21);
		expect(table.rows.value[0].name).toBe("post-0");
		expect(table.hasMore.value).toBe(false);
	});

	it("reloads changes made in the dialog when the panel resumes", async () => {
		const collection = createCollection();
		const table = useCollectionRows(collection);
		await table.reload();
		collection.getRows.mockResolvedValue([{ name: "post", title: "Edited in dialog" }]);
		await table.reload();
		expect(table.rows.value).toEqual([{ name: "post", title: "Edited in dialog" }]);
	});

	it("keeps the saved value and resets a cell after a refused edit", async () => {
		const collection = createCollection();
		collection.updateEntry.mockRejectedValue(new Error("Cannot edit this field"));
		const table = useCollectionRows(collection);
		await table.reload();
		await table.saveCell(table.rows.value[0], table.fields.value[0], "Rejected");
		expect(table.rows.value[0]).toMatchObject({ title: "Original", revision: 1 });
		expect(table.error.value).toBe("Cannot edit this field");
	});
});
