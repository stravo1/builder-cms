import { getFieldTarget } from "./pageBlocks.js";

/**
 * Guesses which blocks of a designed page show which fields: a block whose
 * name or text is the field's label or fieldname. A stub until an LLM guesses.
 */

const normalize = (text) => (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** `blocks` are `{ blockId, name, text, isImage }`. A field gets one block at most, and a block one field. */
export const guessBindings = (blocks, fields) => {
	const free = [...blocks];
	return fields.flatMap((field) => {
		if (field.fieldtype === "Check") return [];
		const names = [field.fieldname, field.label].map(normalize).filter(Boolean);
		const target = getFieldTarget(field);
		const index = free.findIndex(
			(block) =>
				block.isImage === (target === "image") &&
				[block.name, block.text].some((text) => names.includes(normalize(text))),
		);
		if (index < 0) return [];
		const [block] = free.splice(index, 1);
		return [{ blockId: block.blockId, fieldname: field.fieldname, target }];
	});
};
