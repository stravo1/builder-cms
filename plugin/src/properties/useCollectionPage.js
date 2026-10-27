import { computed, shallowRef, watch } from "vue";
import { Collection } from "../cms/collection.js";
import { useEditorContext } from "../editor/context.js";
import { useTask } from "../panel/useTask.js";

/** The collections, and the one whose collection page is the open page. */
export const useCollectionPage = () => {
	const context = useEditorContext();
	const task = useTask();
	const collections = shallowRef([]);
	const connected = computed(
		() => collections.value.find((each) => each.collectionPage === context.page?.name) ?? null
	);
	const load = () => task.run(async () => (collections.value = await Collection.all()));
	watch(() => context.page?.name, load, { immediate: true });
	return { context, collections, connected, load, ...task };
};
