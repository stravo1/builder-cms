import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

vi.mock("../src/panel/collections/CollectionsTab.vue", () => ({
	default: { render: () => h("div", { "data-cms-view": "collections" }, "Collection content") },
}));

import CmsPanel from "../src/panel/CmsPanel.vue";

describe("CMS panel", () => {
	// the CMS settings live in Builder's Settings dialog, so the panel has no tabs
	it("shows the collections when the panel opens", async () => {
		const html = await renderToString(createSSRApp(CmsPanel));

		expect(html).toContain('data-cms-view="collections"');
		expect(html).not.toContain("Settings");
	});
});
