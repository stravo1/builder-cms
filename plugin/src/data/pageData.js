/**
 * The data sources of one page, read from and written to its data script.
 *
 * Each save rereads the record first, so a change that somebody made in the
 * Page Script editor since the last load is kept, not overwritten.
 */

import { updatePageDocument } from "../editor/page.js";
import { DataSource } from "./dataSource.js";
import { getDocument, getDocuments } from "./documents.js";
import { readSections, removeSection, writeSection } from "./scriptSections.js";

const PAGE = "Builder Page";
const PAGE_LENGTH = 100;

/** Every page with a CMS section. It reads every name before a caller writes, because a write can take a page out of the filter and shift the paging. */
export const getCmsPageNames = async () => {
	const names = [];
	for (;;) {
		const pages = await getDocuments(PAGE, {
			fields: ["name"],
			filters: [["page_data_script", "like", "%builder-cms:start%"]],
			pageLength: PAGE_LENGTH,
			start: names.length,
		});
		names.push(...pages.map((page) => page.name));
		if (pages.length < PAGE_LENGTH) return names;
	}
};

export class PageData {
	constructor(pageName) {
		this.pageName = pageName;
		this.sources = [];
	}

	async getScript() {
		const page = await getDocument(PAGE, this.pageName);
		return page.page_data_script || "";
	}

	async load() {
		this.sources = readSections(await this.getScript()).map(
			(definition) => new DataSource(definition)
		);
		return this.sources;
	}

	async writeScript(change) {
		const script = change(await this.getScript());
		await updatePageDocument(this.pageName, { page_data_script: script });
		return this.load();
	}

	/** `previousName` is the name before an edit. A rename moves the section. */
	save(source, previousName = source.name) {
		source.validate();
		const isTaken = this.sources.some(
			(other) => other.name === source.name && other.name !== previousName
		);
		if (isTaken)
			throw new Error(`This page already has a data source named "${source.name}".`);
		return this.writeScript((script) => {
			const kept =
				previousName === source.name ? script : removeSection(script, previousName);
			// a single entry goes first, so a list can filter by it
			return writeSection(kept, source.name, source.toJSON(), source.toPython(), {
				first: !source.isList,
			});
		});
	}

	remove(name) {
		return this.writeScript((script) => removeSection(script, name));
	}
}
