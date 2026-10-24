/**
 * Reads that the panel repeats on each view: the doctypes this plugin made,
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

/** The last value of each key. A write does not forget it, because a fresh read always follows. */
const copies = new Map();

export const hasCopy = (key) => copies.has(key);

/**
 * Shows the last copy of `key` at once, then reads again and shows the fresh
 * value. For content that can change outside this plugin, such as entries,
 * so a stale copy never stays.
 */
export const showThenRefresh = async (key, read, show) => {
	if (copies.has(key)) show(copies.get(key));
	const value = await read();
	copies.set(key, value);
	show(value);
	return value;
};
