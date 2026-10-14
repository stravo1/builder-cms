/**
 * What a data source does to blocks: insert blocks that are bound already, and
 * bind one more block to a field.
 */

import builder from "frappe-builder-extension-sdk";
import { getDocumentBlock, getListBlock, getCardListBlock } from "./pageBlocks.js";

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
	if (nearestList) return row ? [{ source: row, prefix: "" }] : [];
	return [...sources.filter((source) => !source.isList).map((source) => ({ source, prefix: `${source.name}.` }))];
};

export const getBoundProperty = (target) => {
	if (target === "link") return { type: "attribute", property: "href" };
	return target === true || target === "image"
		? { type: "attribute", property: "src" }
		: { type: "key", property: "innerHTML" };
};

export const fitsBlock = (field, selection, target = selection.isImage ? "image" : "text") => {
	if (target === "visibility") return true;
	if (target === "link") return ["Data", "Link", "Read Only"].includes(field.fieldtype);
	if (target === "image") return ["Attach Image", "Attach", "Data"].includes(field.fieldtype);
	return field.fieldtype !== "Check" && field.fieldtype !== "Attach Image";
};

export const getBoundKey = async (selection, target = selection.isImage ? "image" : "text") => {
	const block = await builder.block.get(selection.blockId);
	if (target === "visibility") return block.visibilityCondition?.key || "";
	const property = getBoundProperty(target);
	const bound = (block.dynamicValues || []).find(
		(value) => value.property === property.property && value.type === property.type,
	);
	const legacy = block.dataKey?.property === property.property ? block.dataKey : null;
	return (bound || legacy)?.key || "";
};

export const bindBlock = async (blockId, key, target) => {
	if (target === "visibility") {
		return builder.block.update(blockId, { visibilityCondition: key ? { key, comesFrom: "dataScript" } : null });
	}
	const property = getBoundProperty(target);
	const block = await builder.block.get(blockId);
	const others = (block.dynamicValues || []).filter(
		(value) => !(value.property === property.property && value.type === property.type),
	);
	const dynamicValues = key ? [...others, { key, ...property, comesFrom: "dataScript" }] : others;
	const legacy = block.dataKey;
	const clearLegacy = legacy?.property === property.property && (legacy.type || "key") === property.type;
	await builder.block.update(blockId, { dynamicValues, ...(clearLegacy && { dataKey: null }) });
};

/** Into the selected container, or at the end of the page. */
const getParentId = async () => {
	const { selection } = await builder.context.get();
	if (selection.count === 1 && selection.isContainer) return selection.blockId;
	const [root] = await builder.page.getBlocks();
	return root.blockId;
};

export const insertBlocks = async (source, fields, label, layout = "cards") => {
	const chosen = fields.filter((field) => source.fields.includes(field.fieldname));
	const listBlock = layout === "table" ? getListBlock : getCardListBlock;
	const tree = source.isList ? listBlock(source, chosen, label) : getDocumentBlock(source, chosen, label);
	return builder.block.insert(await getParentId(), tree);
};
