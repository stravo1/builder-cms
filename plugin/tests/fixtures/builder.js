export const useBuilderStore = () => ({ readOnlyMode: false, realtime: { emit() {}, on() {}, off() {} } });
export const usePageStore = () => ({ activePage: null, routeVariables: {} });
export const useCanvasStore = () => ({ activeCanvas: null, editingMode: "page" });
export const blockController = { getSelectedBlocks: () => [] };
// the editor moves the slot into its drawer header; a test renders it in place
export const DrawerHeader = { setup: (_props, { slots }) => () => slots.default?.() };
