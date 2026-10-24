import { blockController, useBuilderStore, useCanvasStore, usePageStore } from "builder";
import { reactive } from "vue";

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
			blockIds: blocks.map((each) => each.blockId),
			blockId: block?.blockId,
			element: block?.getElement(),
			isContainer: block?.isContainer(),
			isText: block?.isText(),
			isHTML: block?.isHTML(),
			isImage: block?.isImage(),
			isLink: block?.isLink(),
			isRoot: block?.isRoot(),
			isRepeater: Boolean(block?.isRepeaterBlock),
			label: block?.getBlockDescription(),
		},
	};
};

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
		get selection() {
			return getEditorContext().selection;
		},
	});
