import {
	blockContextMenuOptions,
	dynamicValueGroups,
	leftPanelTabs,
	lucideIcon,
	toolbarItems,
	useBuilderStore,
} from "builder";
import { defineAsyncComponent } from "vue";
import { getFieldItems } from "./blocks/blockActions.js";
import CmsOverlays from "./editor/CmsOverlays.vue";
import { openBindPopover } from "./editor/windows.js";
import "./index.css";

export default {
	install(_app, context) {
		leftPanelTabs.register({
			name: "cms",
			label: "CMS",
			icon: lucideIcon("lucide-newspaper"),
			placement: "drawer",
			component: defineAsyncComponent(() => import("./panel/CmsPanel.vue")),
		});
		toolbarItems.register({ name: "cms-overlays", region: "right", component: CmsOverlays });
		blockContextMenuOptions.register({
			name: "cms-bind",
			label: "Bind to data",
			action: openBindPopover,
			disabled: () => useBuilderStore().readOnlyMode,
		});
		dynamicValueGroups.register({ name: "cms", label: "CMS fields", getItems: getFieldItems });
		context.setOpenHandler(() => (useBuilderStore().activeDrawerTab = "cms"));
	},
};
