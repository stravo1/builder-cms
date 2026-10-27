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

/** Replaces the children of a block with new trees. The block stays, so it keeps the selection. */
export const setChildren = (blockId, trees) => {
	assertWritable();
	const canvasStore = useCanvasStore();
	const block = getBlock(blockId);
	const wasSelected = canvasStore.activeCanvas?.isSelected(block);
	[...block.children].forEach((child) => block.removeChild(child));
	const added = trees.map((tree) => block.addChild(tree, null, false));
	// Builder makes an added text block editable, which selects it, so the block takes the selection back
	if (added.some((child) => child.blockId === canvasStore.editableBlock?.blockId))
		canvasStore.editableBlock = null;
	if (wasSelected) block.selectBlock();
	return added;
};

/** Puts a new tree in the place of a block, and selects it. */
export const replaceBlock = (blockId, tree) => {
	assertWritable();
	const block = getBlock(blockId);
	const parent = block.getParentBlock();
	const index = parent.children.indexOf(block);
	parent.removeChild(block);
	return parent.addChild(tree, index);
};
