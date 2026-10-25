import { dynamicValueGroups, leftPanelTabs, lucideIcon, settingsItems, useBuilderStore } from "builder";
import { defineAsyncComponent } from "vue";
import { getFieldItems } from "./blocks/blockActions.js";
import "./index.css";

export default {
	install(_app, context) {
		const icon = lucideIcon("lucide-newspaper");
		leftPanelTabs.register({
			name: "cms",
			label: "CMS",
			icon,
			placement: "drawer",
			component: defineAsyncComponent(() => import("./panel/CmsPanel.vue")),
		});
		settingsItems.register({
			name: "cms",
			label: "CMS",
			title: "CMS",
			icon,
			group: "Global",
			component: defineAsyncComponent(() => import("./panel/SettingsPane.vue")),
		});
		dynamicValueGroups.register({ name: "cms", label: "CMS fields", getItems: getFieldItems });
		context.setOpenHandler(() => (useBuilderStore().activeDrawerTab = "cms"));
	},
};
