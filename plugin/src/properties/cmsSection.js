/**
 * The CMS section of Builder's right panel. It shows one view for the selected
 * block: the page body connects a collection page, a list (a repeater of
 * cards, or a table) shows a collection, a details block shows the entry of a
 * collection page, and a text or image block shows a field.
 */

import { blockController, useCanvasStore } from "builder";
import { defineAsyncComponent } from "vue";
import { getSourcesForBlock } from "../blocks/blockActions.js";
import { getListRepeater, isDetailsBlock } from "../cms/pageActions.js";
import { getOpenPageSources } from "../editor/context.js";

const PageProperties = defineAsyncComponent(() => import("./PageProperties.vue"));
const ListProperties = defineAsyncComponent(() => import("./ListProperties.vue"));
const DetailsProperties = defineAsyncComponent(() => import("./DetailsProperties.vue"));
const FieldProperties = defineAsyncComponent(() => import("./FieldProperties.vue"));

const getSelectedBlock = () => {
	const blocks = blockController.getSelectedBlocks();
	return blocks.length === 1 ? blocks[0] : null;
};

const hasFieldsInReach = (block) =>
	(block.isText() || block.isImage()) &&
	getSourcesForBlock(getOpenPageSources(), block).length > 0;

// the panel keys controls by section, not by block, so each view gets the block id to follow the selection
const withBlockId = () => ({ blockId: getSelectedBlock().blockId });

export const cmsSection = {
	name: "CMS",
	// next to Builder's own Collection section, which shows the key a repeater reads
	before: "Collection",
	condition: () => useCanvasStore().editingMode === "page" && Boolean(getSelectedBlock()),
	properties: [
		{
			component: PageProperties,
			searchKeyWords: "CMS, Collection page, Preview, Entry",
			condition: () => getSelectedBlock().isRoot(),
		},
		{
			component: ListProperties,
			getProps: withBlockId,
			searchKeyWords: "CMS, Collection list, Sort, Limit",
			condition: () => Boolean(getListRepeater(getSelectedBlock())),
		},
		{
			component: DetailsProperties,
			getProps: withBlockId,
			searchKeyWords: "CMS, Collection details, Collection page, Fields",
			condition: () => isDetailsBlock(getSelectedBlock()),
		},
		{
			component: FieldProperties,
			getProps: withBlockId,
			searchKeyWords: "CMS, Field, Bind",
			condition: () => hasFieldsInReach(getSelectedBlock()),
		},
	],
};
