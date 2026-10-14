import { beforeEach, describe, expect, it, vi } from "vitest";

const builder = vi.hoisted(() => ({ block: { get: vi.fn(), update: vi.fn() } }));
vi.mock("frappe-builder-extension-sdk", () => ({ default: builder }));

import { bindBlock, getBindingTargets } from "../src/blocks/blockActions.js";

beforeEach(() => vi.resetAllMocks());

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
