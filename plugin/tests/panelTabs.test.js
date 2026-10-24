import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

vi.mock("frappe-ui", async () => ({
	Tabs: (await import("../node_modules/frappe-ui/src/components/Tabs/Tabs.vue")).default,
	TabList: (await import("../node_modules/frappe-ui/src/components/Tabs/TabList.vue")).default,
	TabPanel: (await import("../node_modules/frappe-ui/src/components/Tabs/TabPanel.vue")).default,
	TabTrigger: (await import("../node_modules/frappe-ui/src/components/Tabs/TabTrigger.vue")).default,
}));

vi.mock("../src/cms/access.js", () => ({ getAccess: async () => ({ is_manager: false }) }));
vi.mock("../src/panel/collections/CollectionsTab.vue", () => ({
	default: { render: () => h("div", { "data-cms-view": "collections" }, "Collection content") },
}));

import CmsPanel from "../src/panel/CmsPanel.vue";

describe("CMS panel tabs", () => {
	it("shows collection content when the panel opens", async () => {
		const html = await renderToString(createSSRApp(CmsPanel));

		expect(html).toContain('data-cms-view="collections"');
		expect(html).toContain('aria-selected="true"');
	});

	it("shows no Settings tab before it knows the user is a manager", async () => {
		const html = await renderToString(createSSRApp(CmsPanel));

		expect(html).toContain("Collections");
		expect(html).not.toContain("Settings");
	});
});
