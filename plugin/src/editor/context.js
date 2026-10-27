import { blockController, useBuilderStore, useCanvasStore, usePageStore } from "builder";
import { reactive } from "vue";
import { DataSource } from "../data/dataSource.js";
import { readSections } from "../data/scriptSections.js";

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

/** The data sources of the open page, read from the script the editor holds, so a view updates with it. */
export const getOpenPageSources = () =>
	readSections(usePageStore().activePage?.page_data_script).map(
		(definition) => new DataSource(definition)
	);
