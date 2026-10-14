/**
 * Reads that the panel repeats on each view: the doctypes this extension made,
 * the fields of a doctype, and the collections. Each key is read one time,
 * until a write forgets it. Every frame keeps its own copy.
 */

const reads = new Map();

/** The promise of one read. A failed read is not kept, so the next call tries again. */
export const cached = (key, read) => {
	if (!reads.has(key)) {
		reads.set(
			key,
			read().catch((error) => {
				reads.delete(key);
				throw error;
			}),
		);
	}
	return reads.get(key);
};

/** Forgets each key that starts with one of `prefixes`. No prefix forgets every key. */
export const forget = (...prefixes) => {
	for (const key of [...reads.keys()]) {
		if (!prefixes.length || prefixes.some((prefix) => key.startsWith(prefix))) reads.delete(key);
	}
};
