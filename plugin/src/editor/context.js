import { blockController, useBuilderStore, useCanvasStore, usePageStore } from "builder";
import { reactive } from "vue";

/** The open page and the selection, read when a caller asks. */
export const getEditorContext = () => {
	const blocks = blockController.getSelectedBlocks();
	const block = blocks.length === 1 ? blocks[0] : null;
	return {
		page: usePageStore().activePage,
		readOnly: useBuilderStore().readOnlyMode,
		editingMode: useCanvasStore().editingMode,
		routeVariables: usePageStore().routeVariables,
		selection: {
			count: blocks.length,
			blockId: block?.blockId,
			isContainer: block?.isContainer(),
		},
	};
};

/** The open page as reactive state, for a view. */
export const useEditorContext = () =>
	reactive({
		get page() {
			return usePageStore().activePage;
		},
		get readOnly() {
			return useBuilderStore().readOnlyMode;
		},
		get routeVariables() {
			return usePageStore().routeVariables;
		},
	});
