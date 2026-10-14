/**
 * CMS — collections of content in Frappe, shown on Builder pages.
 *
 * A collection is a doctype this extension makes, or an existing one a user
 * maps. Each list or collection page reads it through a section of the page
 * data script, on the server for each request. A block binds to a field in the
 * CMS panel or the "Bind to data" context menu, and it stays live.
 */

import builder from "frappe-builder-extension-sdk";
import { vueAdapter } from "frappe-builder-extension-sdk/vue";
import "./index.css";

builder.use(vueAdapter);

builder.leftPanel.register({
	name: "cms",
	label: "CMS",
	icon: "lucide-newspaper",
	component: () => import("./panel/CmsPanel.vue"),
});

builder.open.register({ kind: "leftPanel", name: "cms" });

builder.popover.register({ component: () => import("./panel/bind/BindPopover.vue") });

/** A collection's table, in a large view. The panel's table opens it with "Open in a large view". */
builder.dialog.register({ component: () => import("./panel/table/CollectionDialog.vue") });

/** The popover follows the selection, so it stays open while the user clicks through blocks. */
const openBindPopover = () => builder.ui.openPopover({ title: "Bind to data", width: 320, height: 440 });

builder.contextMenu.register({
	name: "cms-bind",
	label: "Bind to data",
	action: openBindPopover,
	enableWhen: { readOnly: false },
});
