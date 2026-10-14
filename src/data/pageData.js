/**
 * The data sources of one page, read from and written to its data script.
 *
 * Each save rereads the record first, so a change that somebody made in the
 * Page Script editor since the last load is kept, not overwritten.
 */

import builder from "frappe-builder-extension-sdk";
import { DataSource } from "./dataSource.js";
import { readSections, removeSection, writeSection } from "./scriptSections.js";

const PAGE = "Builder Page";

export class PageData {
	constructor(pageName) {
		this.pageName = pageName;
		this.sources = [];
	}

	async getScript() {
		const page = await builder.data.getDoc(PAGE, this.pageName);
		return page.page_data_script || "";
	}

	async load() {
		this.sources = readSections(await this.getScript()).map((definition) => new DataSource(definition));
		return this.sources;
	}

	async writeScript(change) {
		const script = change(await this.getScript());
		await builder.data.update(PAGE, this.pageName, { page_data_script: script });
		return this.load();
	}

	/** `previousName` is the name before an edit. A rename moves the section. */
	save(source, previousName = source.name) {
		source.validate();
		const isTaken = this.sources.some((other) => other.name === source.name && other.name !== previousName);
		if (isTaken) throw new Error(`This page already has a data source named "${source.name}".`);
		return this.writeScript((script) => {
			const kept = previousName === source.name ? script : removeSection(script, previousName);
			return writeSection(kept, source.name, source.toJSON(), source.toPython());
		});
	}

	remove(name) {
		return this.writeScript((script) => removeSection(script, name));
	}
}
