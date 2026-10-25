/**
 * What a data source does to blocks: insert blocks that are bound already,
 * bind the blocks a guess matches, and offer fields to Builder's "Set Dynamic
 * Value" picker.
 */

import { getDoctypeFields, getFieldLabel } from "../data/doctypes.js";
import { PageData } from "../data/pageData.js";
import { getBlock, getRootBlock, insertBlock, updateBlock } from "../editor/canvas.js";
import { getEditorContext } from "../editor/context.js";
import { guessBindings } from "./guessBindings.js";
import { BOUND_PROPERTIES, getBinding, getCardListBlock, getDocumentBlock, getListBlock } from "./pageBlocks.js";

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
	const root = await getRootBlock();
	const ancestors = (findPath(root, blockId) || []).slice(0, -1);
	const nearestList = ancestors.filter((block) => block.isRepeaterBlock).at(-1)?.dataKey?.key;
	const row = sources.find((source) => source.isList && source.name === nearestList);
	if (nearestList) return row ? [{ source: row, prefix: "" }] : [];
	return sources.filter((source) => !source.isList).map((source) => ({ source, prefix: `${source.name}.` }));
};

const fitsTarget = (field, target) => {
	if (target === "link") return ["Data", "Link", "Read Only"].includes(field.fieldtype);
	if (target === "image") return ["Attach Image", "Attach", "Data"].includes(field.fieldtype);
	return field.fieldtype !== "Check" && field.fieldtype !== "Attach Image";
};

/** The fields a source reads, and the URL of its collection page when it links to one. */
const getSourceFields = async (source) => {
	const all = [{ fieldname: "name", label: "Name", fieldtype: "Data" }, ...(await getDoctypeFields(source.doctype))];
	const fields = all.filter((field) => source.readFields.includes(field.fieldname));
	if (source.link) fields.push({ fieldname: "url", label: "Collection page URL", fieldtype: "Data" });
	return fields;
};

const getTarget = (type, property) =>
	Object.keys(BOUND_PROPERTIES).find(
		(target) => BOUND_PROPERTIES[target].type === type && BOUND_PROPERTIES[target].property === property,
	);

/** The fields that fit one property control, as items of Builder's "Set Dynamic Value" picker. */
export const getFieldItems = async ({ block, property, type }) => {
	const target = getTarget(type, property);
	const { page } = getEditorContext();
	if (!target || !page) return [];
	const available = await getSourcesForBlock(await new PageData(page.name).load(), block.blockId);
	const items = await Promise.all(
		available.map(async ({ source, prefix }) =>
			(await getSourceFields(source))
				.filter((field) => fitsTarget(field, target))
				.map((field) => ({
					key: `${prefix}${field.fieldname}`,
					label: `${available.length > 1 ? `${source.name} · ` : ""}${getFieldLabel(field)}`,
					comesFrom: "dataScript",
				})),
		),
	);
	return items.flat();
};

/** Binds `key` to the text or the image of a block, and keeps its other bindings. */
export const bindBlock = async (blockId, key, target) => {
	const binding = getBinding(key, target);
	const block = await getBlock(blockId);
	const others = (block.dynamicValues || []).filter(
		(value) => !(value.property === binding.property && value.type === binding.type),
	);
	// a block bound before `dynamicValues` keeps its binding in `dataKey`
	const legacy = block.dataKey;
	const isLegacyReplaced = legacy?.property === binding.property && (legacy.type || "key") === binding.type;
	await updateBlock(blockId, { dynamicValues: [...others, binding], ...(isLegacyReplaced && { dataKey: null }) });
};

/** Text and image blocks outside lists: the blocks a guess may bind to a document source. */
const getGuessableBlocks = (block) =>
	block.isRepeaterBlock
		? []
		: [
				...(block.isText?.() || block.isImage?.() ? [block] : []),
				...(block.children || []).flatMap(getGuessableBlocks),
			];

/** Binds each block that `guessBindings` matches to a field of `source`. Returns how many it bound. */
export const bindGuessedBlocks = async (source, fields) => {
	const blocks = getGuessableBlocks(await getRootBlock()).map((block) => ({
		blockId: block.blockId,
		name: block.blockName,
		text: block.getTextContent(),
		isImage: block.isImage(),
	}));
	const guesses = await guessBindings(blocks, fields);
	for (const guess of guesses) await bindBlock(guess.blockId, `${source.name}.${guess.fieldname}`, guess.target);
	return guesses.length;
};

/** Into the selected container, or at the end of the page. */
const getParentId = async () => {
	const { selection } = getEditorContext();
	if (selection.count === 1 && selection.isContainer) return selection.blockId;
	const root = await getRootBlock();
	return root.blockId;
};

export const insertBlocks = async (source, fields, label, layout = "cards") => {
	const chosen = fields.filter((field) => source.fields.includes(field.fieldname));
	const listBlock = layout === "table" ? getListBlock : getCardListBlock;
	const tree = source.isList ? listBlock(source, chosen, label) : getDocumentBlock(source, chosen, label);
	return insertBlock(await getParentId(), tree);
};
