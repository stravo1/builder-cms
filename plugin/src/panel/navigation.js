import { useBuilderStore } from "builder";
import { ref } from "vue";

/** What the CMS drawer shows. It lives here, so the right panel can open a collection in the drawer. */
export const panelView = ref({ name: "collections" });

/** Opens the CMS drawer at full size on a collection. */
export const openCollectionInDrawer = (collection) => {
	panelView.value = { name: "collection", collection };
	const store = useBuilderStore();
	store.activeDrawerTab = "cms";
	store.isDrawerExpanded = true;
};
