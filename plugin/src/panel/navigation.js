import { useBuilderStore } from "builder";
import { ref } from "vue";

/** What the CMS drawer shows. It lives here, so the right panel can open a collection in the drawer. */
export const panelView = ref({ name: "collections" });

/** An entry is open: its editor and preview take the place of the entry table and the collection list. */
export const isEditingEntry = ref(false);

/** Opens the CMS drawer on a collection. */
export const openCollectionInDrawer = (collection) => {
	panelView.value = { name: "collection", collection };
	useBuilderStore().activeDrawerTab = "cms";
};
