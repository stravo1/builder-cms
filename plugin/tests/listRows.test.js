import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import ItemListRow from "../node_modules/frappe-ui/src/components/ItemListRow/ItemListRow.vue";
import NativeButton from "../src/panel/NativeButton.js";

describe("CMS rows in the editor app", () => {
	it("uses a native button when the editor registers a global Button component", async () => {
		const app = createSSRApp({
			render: () =>
				h(
					ItemListRow,
					{ as: NativeButton, class: "cms-list-row" },
					{
						prefix: () => h("span", "icon"),
						default: () => "Posts",
						suffix: () => h("span", "/posts"),
					},
				),
		});
		app.component("Button", { render: () => h("button", { "data-global-button": "" }, "Wrong button") });
		const html = await renderToString(app);
		expect(html).not.toContain("data-global-button");
		expect(html).toContain("item-prefix");
		expect(html).toContain("item-suffix");
		expect(html).toContain('type="button"');
	});
	it("disables native button interaction when the row is disabled", async () => {
		const app = createSSRApp({
			render: () => h(ItemListRow, { as: NativeButton, disabled: true }, () => "Posts"),
		});
		expect(await renderToString(app)).toContain(" disabled");
	});
});
