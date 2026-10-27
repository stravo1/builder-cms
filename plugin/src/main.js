import {
	blockTemplates,
	dynamicValueGroups,
	leftPanelTabs,
	lucideIcon,
	propertySections,
	settingsItems,
	useBuilderStore,
} from "builder";
import { defineAsyncComponent } from "vue";
import { getFieldItems } from "./blocks/blockActions.js";
import { getCollectionListTemplate } from "./blocks/pageBlocks.js";
import { getDetailsTemplate } from "./cms/pageActions.js";
import { cmsSection } from "./properties/cmsSection.js";
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
		blockTemplates.register({
			name: "cms-collection-list",
			label: "Collection list",
			category: "CMS",
			icon: lucideIcon("lucide-layout-grid"),
			getBlock: getCollectionListTemplate,
		});
		blockTemplates.register({
			name: "cms-collection-details",
			label: "Collection details",
			category: "CMS",
			icon: lucideIcon("lucide-file-text"),
			getBlock: getDetailsTemplate,
		});
		propertySections.register(cmsSection);
		context.setOpenHandler(() => (useBuilderStore().activeDrawerTab = "cms"));
	},
};
