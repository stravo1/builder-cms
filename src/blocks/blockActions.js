/**
 * What a data source does to blocks: insert blocks that are bound already, and
 * bind one more block to a field.
 */

import builder from "frappe-builder-extension-sdk";
import { getDocumentBlock, getListBlock } from "./pageBlocks.js";

/** The blocks from a root down to `blockId`, or null when the tree does not hold it. */
const findPath = (block, blockId, path = []) => {
	const here = [...path, block];
	if (block.blockId === blockId) return here;
	for (const child of block.children || []) {
		const found = findPath(child, blockId, here);
		if (found) return found;
	}
	return null;
};

/**
 * The sources a block can show, each with the key prefix of its fields. Inside
 * a list, the row of the nearest list comes first: its keys are plain field
 * names. A document source, such as `entry`, fits anywhere: `entry.title`.
 */
export const getSourcesForBlock = async (sources, blockId) => {
	const [root] = await builder.page.getBlocks();
	const ancestors = (findPath(root, blockId) || []).slice(0, -1);
	const nearestList = ancestors.filter((block) => block.isRepeaterBlock).at(-1)?.dataKey?.key;
	const row = sources.find((source) => source.isList && source.name === nearestList);
	return [
		...(row ? [{ source: row, prefix: "" }] : []),
		...sources.filter((source) => !source.isList).map((source) => ({ source, prefix: `${source.name}.` })),
	];
};

/** What a binding sets: the `src` of an image, the text of anything else. */
export const getBoundProperty = (isImage) =>
	isImage ? { type: "attribute", property: "src" } : { type: "key", property: "innerHTML" };

/** Text fields for a text block, image fields for an image. A yes or no fits neither. */
export const fitsBlock = (field, selection) => {
	if (field.fieldtype === "Check") return false;
	return field.fieldtype === "Attach Image" ? selection.isImage : selection.isText || selection.isHTML;
};

/** The key the selected block is bound to now, or "". */
export const getBoundKey = async (selection) => {
	const target = getBoundProperty(selection.isImage);
	const { dynamicValues = [] } = await builder.block.get(selection.blockId);
	const bound = dynamicValues.find((value) => value.property === target.property && value.type === target.type);
	return bound?.key ?? "";
};

/** Binds the block to `key`, or removes its binding when `key` is empty. Other bindings stay. */
export const bindBlock = async (blockId, key, isImage) => {
	const target = getBoundProperty(isImage);
	const block = await builder.block.get(blockId);
	const others = (block.dynamicValues || []).filter(
		(value) => !(value.property === target.property && value.type === target.type),
	);
	const dynamicValues = key ? [...others, { key, ...target, comesFrom: "dataScript" }] : others;
	await builder.block.update(blockId, { dynamicValues });
};

/** Into the selected container, or at the end of the page. */
const getParentId = async () => {
	const { selection } = await builder.context.get();
	if (selection.count === 1 && selection.isContainer) return selection.blockId;
	const [root] = await builder.page.getBlocks();
	return root.blockId;
};

export const insertBlocks = async (source, fields, label) => {
	const chosen = fields.filter((field) => source.fields.includes(field.fieldname));
	const tree = source.isList ? getListBlock(source, chosen, label) : getDocumentBlock(source, chosen, label);
	return builder.block.insert(await getParentId(), tree);
};
