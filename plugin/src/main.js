import { dynamicValueGroups, leftPanelTabs, lucideIcon, useBuilderStore } from "builder";
import { defineAsyncComponent } from "vue";
import { getFieldItems } from "./blocks/blockActions.js";
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
		dynamicValueGroups.register({ name: "cms", label: "CMS fields", getItems: getFieldItems });
		context.setOpenHandler(() => (useBuilderStore().activeDrawerTab = "cms"));
	},
};
