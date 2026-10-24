import { useBuilderStore, useCanvasStore } from "builder";

export const getRootBlock = () => {
	const block = useCanvasStore().activeCanvas?.getRootBlock();
	if (!block) throw new Error("Open a page first.");
	return block;
};

export const getBlock = (blockId) => {
	const block = useCanvasStore().activeCanvas?.findBlock(blockId);
	if (!block) throw new Error("This block no longer exists.");
	return block;
};

export const assertWritable = () => {
	if (useBuilderStore().readOnlyMode) throw new Error("This page is read-only.");
};

export const updateBlock = (blockId, patch) => {
	assertWritable();
	const block = getBlock(blockId);
	Object.assign(block, patch);
	return block;
};

export const insertBlock = (parentId, tree) => {
	assertWritable();
	const parent = getBlock(parentId);
	if (!parent.canHaveChildren()) throw new Error("Select a container to insert content.");
	return parent.addChild(tree);
};
