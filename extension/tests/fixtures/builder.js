export const useBuilderStore = () => ({ readOnlyMode: false, realtime: { emit() {}, on() {}, off() {} } });
export const usePageStore = () => ({ activePage: null, routeVariables: {} });
export const useCanvasStore = () => ({ activeCanvas: null, editingMode: "page" });
export const blockController = { getSelectedBlocks: () => [] };
