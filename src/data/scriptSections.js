/**
 * The sections this extension owns in a page data script.
 *
 * A section starts with `# builder-cms:start <name> <definition as JSON>` and
 * ends with `# builder-cms:end <name>`. The Python between them is made from
 * the definition. So the script is the one place that keeps a data source, and
 * the lines a user wrote around a section stay as they are.
 */

const START = "# builder-cms:start ";
const END = "# builder-cms:end ";

const findSection = (script, name) => {
	const from = script.indexOf(`${START}${name} `);
	const endLine = `${END}${name}`;
	const to = script.indexOf(endLine, from);
	if (from === -1 || to === -1) return null;
	return { from, to: to + endLine.length };
};

/** Each definition in the order of the script. A start line with bad JSON fails loudly. */
export const readSections = (script) =>
	(script || "")
		.split("\n")
		.filter((line) => line.startsWith(START))
		.map((line) => {
			const rest = line.slice(START.length);
			const space = rest.indexOf(" ");
			try {
				return JSON.parse(rest.slice(space + 1));
			} catch {
				throw new Error(`The data script has a broken CMS section: "${rest.slice(0, space)}".`);
			}
		});

/** Replaces the section of `name`, or adds it at the end. */
export const writeSection = (script, name, definition, body) => {
	const section = `${START}${name} ${JSON.stringify(definition)}\n${body}\n${END}${name}`;
	const current = script || "";
	const found = findSection(current, name);
	if (found) return current.slice(0, found.from) + section + current.slice(found.to);
	return current.trimEnd() ? `${current.trimEnd()}\n\n${section}\n` : `${section}\n`;
};

export const removeSection = (script, name) => {
	const current = script || "";
	const found = findSection(current, name);
	if (!found) return current;
	return `${current.slice(0, found.from).trimEnd()}\n${current.slice(found.to).replace(/^\n+/, "")}`.trimStart();
};
