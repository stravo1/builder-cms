/**
 * What a data source does to blocks: bind a block to a field, fill a list's
 * card, and offer fields to Builder's "Set Dynamic Value" picker.
 */

import { getDoctypeFields, getFieldLabel } from "../data/doctypes.js";
import { PageData } from "../data/pageData.js";
import { getBlock, setChildren, updateBlock } from "../editor/canvas.js";
import { getEditorContext } from "../editor/context.js";
import {
	BOUND_PROPERTIES,
	getBinding,
	getCardBlock,
	getFieldShape,
	getFieldTarget,
} from "./pageBlocks.js";

/**
 * The sources a block can show, each with the key prefix of its fields. Inside
 * a list, the row of the nearest list comes first: its keys are plain field
 * names. A document source, such as `entry`, fits anywhere: `entry.title`.
 */
export const getSourcesForBlock = (sources, block) => {
	const nearestList = block.getRepeaterParent()?.dataKey?.key;
	const row = sources.find((source) => source.isList && source.name === nearestList);
	if (nearestList) return row ? [{ source: row, prefix: "" }] : [];
	return sources
		.filter((source) => !source.isList)
		.map((source) => ({ source, prefix: `${source.name}.` }));
};

const fitsTarget = (field, target) => {
	if (target === "link") return ["Data", "Link", "Read Only"].includes(field.fieldtype);
	if (target === "image") return ["Attach Image", "Attach", "Data"].includes(field.fieldtype);
	return field.fieldtype !== "Check" && field.fieldtype !== "Attach Image";
};

/** The fields a source reads, and the URL of its collection page when it links to one. */
export const getSourceFields = async (source) => {
	const all = [
		{ fieldname: "name", label: "Name", fieldtype: "Data" },
		...(await getDoctypeFields(source.doctype)),
	];
	const fields = all.filter((field) => source.readFields.includes(field.fieldname));
	if (source.link)
		fields.push({ fieldname: "url", label: "Collection page URL", fieldtype: "Data" });
	return fields;
};

const getTarget = (type, property) =>
	Object.keys(BOUND_PROPERTIES).find(
		(target) =>
			BOUND_PROPERTIES[target].type === type &&
			BOUND_PROPERTIES[target].property === property
	);

/** The fields that fit one property control, as items of Builder's "Set Dynamic Value" picker. */
export const getFieldItems = async ({ block, property, type }) => {
	const target = getTarget(type, property);
	const { page } = getEditorContext();
	if (!target || !page) return [];
	const available = getSourcesForBlock(await new PageData(page.name).load(), block);
	const items = await Promise.all(
		available.map(async ({ source, prefix }) =>
			(
				await getSourceFields(source)
			)
				.filter((field) => fitsTarget(field, target))
				.map((field) => ({
					key: `${prefix}${field.fieldname}`,
					label: `${available.length > 1 ? `${source.name} · ` : ""}${getFieldLabel(
						field
					)}`,
					comesFrom: "dataScript",
				}))
		)
	);
	return items.flat();
};

const isFieldBinding = (value) =>
	[BOUND_PROPERTIES.text, BOUND_PROPERTIES.image].some(
		(bound) => bound.type === value.type && bound.property === value.property
	);

/** The key a block shows as its text or image, if any. */
export const getBoundKey = (block) =>
	(block.dynamicValues || []).find(
		(value) => value.comesFrom === "dataScript" && isFieldBinding(value)
	)?.key || null;

/**
 * Shows `field` in a block: the block becomes an image, rich text or text to
 * fit it, and hides when the value is empty. Other bindings stay.
 */
export const bindField = (blockId, key, field) => {
	const block = getBlock(blockId);
	const others = (block.dynamicValues || []).filter((value) => !isFieldBinding(value));
	return updateBlock(blockId, {
		dynamicValues: [...others, getBinding(key, getFieldTarget(field))],
		visibilityCondition: { key, comesFrom: "dataScript" },
		// a block bound before `dynamicValues` keeps its binding in `dataKey`
		dataKey: null,
		...getFieldShape(field, block),
	});
};

/** The keys that `block` and the blocks in it show. */
export const getBoundKeys = (block) =>
	[getBoundKey(block), ...(block.children || []).flatMap(getBoundKeys)].filter(Boolean);

/** True when a block below `block` shows a value already. */
export const hasBoundChild = (block) =>
	(block.children || []).some(
		(child) => (child.dynamicValues || []).length || hasBoundChild(child)
	);

/** The card of a list shows the display fields of `source`. */
export const fillCard = (blockId, source, fields, label) =>
	setChildren(blockId, [getCardBlock(source, fields, label)]);

/** The data source names that the repeaters in `block` show. */
export const getRepeatedKeys = (block) => [
	...(block.isRepeaterBlock && block.dataKey?.key ? [block.dataKey.key] : []),
	...(block.children || []).flatMap(getRepeatedKeys),
];
