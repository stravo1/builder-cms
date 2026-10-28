import { describe, expect, it, vi } from "vitest";

vi.mock("../src/data/api.js", () => ({ api: {} }));
vi.mock("../src/data/documents.js", () => ({
	subscribeDocuments: () => {},
	getMetadata: async () => ({
		fields: [
			{ fieldname: "email", fieldtype: "Data" },
			{ fieldname: "roles_html", fieldtype: "HTML" },
			{ fieldname: "generate_keys", fieldtype: "Button" },
			{ fieldname: "user_image", fieldtype: "Attach Image" },
			{ fieldname: "new_password", fieldtype: "Password" },
			{ fieldname: "reset_password_key", fieldtype: "Data" },
			{ fieldname: "api_key", fieldtype: "Data" },
			{ fieldname: "api_secret", fieldtype: "Password" },
			{ fieldtype: "Section Break" },
		],
	}),
}));

const { Collection, markSameLabels } = await import("../src/cms/collection.js");
const { normalizeUrl } = await import("../src/cms/routes.js");
const { getDoctypeFields, isMultilineField } = await import("../src/data/doctypes.js");
const { getCardBlock, getCollectionListTemplate, getDocumentBlock, getFieldShape, getTableBlock } =
	await import("../src/blocks/pageBlocks.js");
const { CURRENT_ENTRY, DataSource } = await import("../src/data/dataSource.js");
const {
	ENTRY_FIELD,
	getFilterFields,
	getStartValue,
	getValueInput,
	toControlFilters,
	toSourceFilters,
} = await import("../src/cms/filters.js");
const { api } = await import("../src/data/api.js");
const { isIdentifier, toPython } = await import("../src/data/python.js");
const { readSections, removeSection, writeSection } = await import(
	"../src/data/scriptSections.js"
);

const posts = new DataSource({
	name: "posts",
	doctype: "Blog Post",
	fields: ["title", "slug"],
	filters: [
		["published", "=", 1],
		["category", "!=", "News"],
	],
	limit: 5,
});

describe("getDoctypeFields", () => {
	// a read that names a field with no column fails, and takes the whole page data down
	// a list publishes what it binds, so a reset key or an API key would reach every visitor
	it("keeps only fields that have a column and are safe to publish", async () => {
		expect((await getDoctypeFields("User")).map((field) => field.fieldname)).toEqual([
			"email",
			"user_image",
		]);
	});
});

describe("getTableBlock", () => {
	const fields = [
		{ fieldname: "title", label: "Title", fieldtype: "Data" },
		{ fieldname: "cover", label: "Cover", fieldtype: "Attach Image" },
	];
	const table = getTableBlock(
		new DataSource({ name: "posts", link: { collection: "CMS Post", field: "slug" } }),
		fields
	);
	const [header, rows] = table.children;
	const elements = (block) => [block.element, ...(block.children || []).flatMap(elements)];

	it("uses no table tags", () => {
		expect(new Set(elements(table))).toEqual(new Set(["div", "span", "a", "img"]));
	});

	it("reads as a table, with a heading for each field", () => {
		expect(table.attributes.role).toBe("table");
		expect(
			header.children.map((cell) => [cell.attributes.role, cell.children[0].innerHTML])
		).toEqual([
			["columnheader", "Title"],
			["columnheader", "Cover"],
		]);
	});

	// one grid, so each column fits the widest cell of every row
	it("sizes each column to its content, on one grid shared by every row", () => {
		expect(table.baseStyles).toMatchObject({
			display: "grid",
			gridTemplateColumns: "fit-content(280px) max-content",
		});
		for (const part of [header, rows, rows.children[0]]) {
			expect(part.baseStyles).toMatchObject({
				display: "grid",
				gridTemplateColumns: "subgrid",
				gridColumn: "1 / -1",
			});
		}
	});

	it("hugs its columns, and scrolls when wider than the page", () => {
		expect(table.baseStyles).toMatchObject({
			width: "max-content",
			maxWidth: "100%",
			overflowX: "auto",
		});
	});

	// the user styles the table in Builder. It starts with no colors, borders, or hover
	it("has no decorative styles", () => {
		const styles = (block) => [
			block.baseStyles || {},
			...(block.children || []).flatMap(styles),
		];
		const names = styles(table).flatMap(Object.keys);
		for (const name of [
			"color",
			"backgroundColor",
			"border",
			"borderBottom",
			"borderRadius",
			"boxShadow",
		]) {
			expect(names).not.toContain(name);
		}
		expect(names.filter((name) => name.startsWith("hover:"))).toEqual([]);
	});

	it("repeats one row per entry", () => {
		expect(rows).toMatchObject({
			isRepeaterBlock: true,
			dataKey: { key: "posts", comesFrom: "dataScript" },
		});
		expect(rows.children[0].attributes.role).toBe("row");
	});

	it("puts the link in the first cell", () => {
		const [first, second] = rows.children[0].children;
		expect(first.children[0]).toMatchObject({
			element: "a",
			dynamicValues: [{ key: "url", property: "href" }],
		});
		expect(second.children[0]).toMatchObject({
			element: "img",
			dynamicValues: [{ key: "cover", property: "src" }],
		});
	});
});

describe("CMS blocks", () => {
	const title = { fieldname: "title", label: "Title", fieldtype: "Data" };
	const body = { fieldname: "body", label: "Body", fieldtype: "Text Editor" };
	const cover = { fieldname: "cover", label: "Cover", fieldtype: "Attach Image" };
	const textBlock = { baseStyles: { color: "red" }, isImage: () => false };

	it("starts a collection list as a repeater with one card and no data", () => {
		const list = getCollectionListTemplate();
		expect(list).toMatchObject({ isRepeaterBlock: true, children: [{ blockName: "Item" }] });
		expect(list.dataKey).toBeUndefined();
	});

	it.each([
		["table", getTableBlock],
		["card", getCardBlock],
		["collection page", getDocumentBlock],
	])(
		"shows rich text in a block span in the %s, a text block that can hold a heading or a list",
		(_, getBlock) => {
			const find = (block) =>
				block.blockName === "Body"
					? block
					: (block.children || []).map(find).find(Boolean);
			const richText = find(
				getBlock(new DataSource({ name: "posts" }), [title, body], "Posts")
			);
			expect(richText.element).toBe("span");
			expect(richText.baseStyles.display).toMatch(/block|box/);
		}
	);

	it("links a card to the collection page when its source has a link", () => {
		const card = getCardBlock(
			new DataSource({ name: "posts", link: { field: "slug" } }),
			[title],
			"Posts"
		);
		expect(card.children.at(-1)).toMatchObject({
			element: "a",
			dynamicValues: [{ key: "url", property: "href" }],
		});
	});

	it("shapes a block to its field: an image, rich text with its styles, or the text tag it has", () => {
		expect(getFieldShape(cover, textBlock)).toEqual({ element: "img" });
		expect(getFieldShape(body, textBlock)).toEqual({
			element: "span",
			baseStyles: { color: "red", display: "block" },
		});
		expect(getFieldShape(title, textBlock)).toEqual({});
		expect(getFieldShape(title, { isImage: () => true })).toEqual({ element: "p" });
	});
});

describe("toPython", () => {
	it("writes Python literals, not JSON", () => {
		expect(toPython({ a: true, b: null, c: [1, "x", false] })).toBe(
			'{"a": True, "b": None, "c": [1, "x", False]}'
		);
	});

	it.each([
		["posts", true],
		["_draft2", true],
		["2posts", false],
		["my-posts", false],
		["class", false],
	])("knows that %s is a name: %s", (name, expected) =>
		expect(isIdentifier(name)).toBe(expected)
	);
});

describe("DataSource", () => {
	it("reads a list with Frappe filters", () => {
		expect(posts.toPython()).toBe(
			[
				"data.posts = frappe.db.get_all(",
				'    "Blog Post",',
				'    filters=[["published", "=", 1], ["category", "!=", "News"]],',
				'    fields=["name", "title", "slug"],',
				'    order_by="creation desc",',
				"    limit_page_length=5,",
				")",
			].join("\n")
		);
	});

	it("reads the entry a route names, shows drafts in the editor, and answers 404 on a live page", () => {
		const post = new DataSource({
			...posts.toJSON(),
			name: "post",
			type: "Document",
			fields: ["title"],
			filters: [["slug", "=", "{{ route.slug }}"]],
			publishedField: "published",
		});

		expect(post.toPython()).toBe(
			[
				'cms_post_filters = [["slug", "=", frappe.form_dict.get("slug")]]',
				"if not in_preview:",
				'    cms_post_filters.append(["published", "=", 1])',
				"cms_post_rows = frappe.db.get_all(",
				'    "Blog Post",',
				"    filters=cms_post_filters,",
				'    fields=["name", "title"],',
				'    order_by="creation desc",',
				"    limit_page_length=1,",
				")",
				"if not cms_post_rows and not in_preview:",
				'    raise frappe.PageDoesNotExistError("No entry at this address.")',
				"data.post = (cms_post_rows or [{}])[0]",
			].join("\n")
		);
		expect(post.getPreviewOptions().filters).toEqual([]);
	});

	it("reads a fixed single entry without a 404", () => {
		const post = new DataSource({
			...posts.toJSON(),
			name: "post",
			type: "Document",
			filters: [],
		});

		expect(post.toPython()).not.toContain("PageDoesNotExistError");
		expect(post.toPython()).toMatch(/\ndata\.post = \(cms_post_rows or \[\{\}\]\)\[0\]$/);
	});

	it("keeps drafts out with a setting, not a filter row", () => {
		const published = new DataSource({
			...posts.toJSON(),
			filters: [],
			publishedField: "published",
		});

		expect(published.toPython()).toContain('filters=[["published", "=", 1]]');
		expect(published.getPreviewOptions().filters).toEqual([["published", "=", 1]]);
	});

	it("matches any filter through or_filters, and still keeps drafts out", () => {
		const either = new DataSource({
			...posts.toJSON(),
			publishedField: "published",
			matchAny: true,
		});
		expect(either.toPython()).toContain(
			'    filters=[["published", "=", 1]],\n    or_filters=[["published", "=", 1], ["category", "!=", "News"]],'
		);
	});

	it("reads the entry that the collection page shows, from the entry section", () => {
		const others = new DataSource({
			...posts.toJSON(),
			filters: [["name", "!=", CURRENT_ENTRY]],
		});
		expect(others.toPython()).toContain(
			'filters=[["name", "!=", (data.get("entry") or {}).get("name")]]'
		);
	});

	it("reads a route variable on the server, and leaves it out of the preview", () => {
		const post = new DataSource({
			...posts.toJSON(),
			filters: [["slug", "=", "{{ route.slug }}"]],
		});

		expect(post.toPython()).toContain('filters=[["slug", "=", frappe.form_dict.get("slug")]]');
		expect(post.getPreviewOptions().filters).toEqual([]);
	});

	it("links each row through the route of the collection page, read on each request", () => {
		const linked = new DataSource({
			...posts.toJSON(),
			link: { page: "page-1", field: "slug" },
		});
		const python = linked.toPython();

		expect(python).toContain(
			'cms_posts_route = (frappe.db.get_all("Builder Page", filters={"name": "page-1"}, fields=["route"]) or [{}])[0].get("route") or ""'
		);
		expect(python).toContain(
			'url=("/" + cms_posts_route.lstrip("/").replace(":slug", str(row.get("slug") or ""))'
		);
		expect(python).toContain(
			') if ":slug" in cms_posts_route or "<slug>" in cms_posts_route else "")'
		);
		expect(python).toContain('.replace("<slug>", str(row.get("slug") or ""))');
		expect(python).toContain("    for row in frappe.db.get_all(");
	});

	it("reads a source saved with the old publishedOnly flag", () => {
		expect(new DataSource({ ...posts.toJSON(), publishedOnly: true }).publishedField).toBe(
			"published"
		);
	});

	it("fills the route variable it names, from the field it names", () => {
		const linked = new DataSource({
			...posts.toJSON(),
			link: { page: "page-1", field: "route", variable: "slug" },
		});

		expect(linked.toPython()).toContain('.replace(":slug", str(row.get("route") or ""))');
	});

	it("finds a collection's collection page on each request", () => {
		const linked = new DataSource({
			...posts.toJSON(),
			link: { collection: "CMS Blog Post", field: "slug" },
		});

		expect(linked.toPython()).toContain(
			'cms_posts_collection = (frappe.db.get_all("CMS Collection", filters={"collection": "CMS Blog Post"}, fields=["entry_page", "url"]) or [{}])[0]'
		);
		expect(linked.toPython()).toContain(
			'cms_posts_page = cms_posts_collection.get("entry_page") or ""'
		);
		expect(linked.toPython()).toContain('filters={"name": cms_posts_page}');
	});

	it("links under the collection URL while the collection has no detail page", () => {
		const linked = new DataSource({
			...posts.toJSON(),
			link: { collection: "User", field: "name", variable: "slug" },
		});

		expect(linked.toPython()).toContain(
			'.get("route") or ((cms_posts_collection.get("url") or "").rstrip("/") + "/:slug" if cms_posts_collection.get("url") else "")'
		);
	});

	it.each([
		["a name that is not a Python name", { name: "my posts" }],
		["no doctype", { doctype: "" }],
		["no fields", { fields: [] }],
		["a limit of 0", { limit: 0 }],
	])("refuses %s", (_case, change) => {
		expect(() => new DataSource({ ...posts.toJSON(), ...change }).validate()).toThrow();
	});
});

describe("list filters", () => {
	it("shows a filter on the current entry as the Entry field, and keeps it as a filter on the name", () => {
		const source = [
			["title", "LIKE", "%news%"],
			["name", "!=", CURRENT_ENTRY],
			["topic", "=", CURRENT_ENTRY],
		];
		const control = [
			["title", "LIKE", "%news%"],
			[ENTRY_FIELD.fieldname, "!=", "Current entry"],
			["topic", "=", CURRENT_ENTRY],
		];
		expect(toControlFilters(source)).toEqual(control);
		expect(toSourceFilters(control)).toEqual(source);
	});

	it("gives each value the control that fits its field and operator, and starts it on the first choice", () => {
		const status = { fieldtype: "Select", options: "Draft\nLive" };
		expect(getValueInput(status, "equals").options.map((option) => option.value)).toEqual([
			"Draft",
			"Live",
		]);
		expect(getValueInput({ fieldtype: "Check" }, "equals").options[0].value).toBe("Yes");
		expect(getValueInput({ fieldtype: "Data" }, "is").options[0].value).toBe("set");
		expect(getValueInput({ fieldtype: "Int" }, ">")).toEqual({ type: "number" });
		expect(getValueInput({ fieldtype: "Data" }, "like")).toEqual({ type: "text" });
		expect(getStartValue(ENTRY_FIELD, "equals")).toBe("Current entry");
		expect(getStartValue({ fieldtype: "Data" }, "like")).toBe("");
	});

	it("filters a reference by an entry it links to, or by the entry the page shows", async () => {
		api.getCollections = async () => [{ collection: "CMS Tag", label: "Tag" }];
		api.getEntries = async () => [{ name: "t1", title: "News" }];
		const fields = [
			{ fieldname: "body", fieldtype: "Text Editor" },
			{ fieldname: "topic", fieldtype: "Link", links_to: "CMS Tag" },
			{
				fieldname: "tags",
				fieldtype: "Table MultiSelect",
				links_to: "CMS Tag",
				link_fieldname: "entry",
			},
		];

		const [topic, tags] = await getFilterFields(fields, "CMS Tag");

		expect(tags.fieldname).toBe("tags.entry");
		expect([topic.isMulti, tags.isMulti]).toEqual([false, true]);
		expect(getValueInput(topic, "equals").options).toEqual([
			{ label: "Current entry", value: CURRENT_ENTRY },
			{ label: "News", value: "t1" },
		]);
		expect(getValueInput(topic, "is").options[0].value).toBe("set");
	});
});

describe("script sections", () => {
	const write = (script, source) =>
		writeSection(script, source.name, source.toJSON(), source.toPython());

	it("keeps the definition, so it can read the source back", () => {
		const script = write("data.title = 'Hi'", posts);

		expect(readSections(script)).toEqual([posts.toJSON()]);
		expect(script.startsWith("data.title = 'Hi'\n\n# builder-cms:start posts ")).toBe(true);
	});

	it("puts a section first when asked, and moves it there on a rewrite", () => {
		const entry = new DataSource({ ...posts.toJSON(), name: "entry", type: "Document" });
		const first = (script) =>
			writeSection(script, "entry", entry.toJSON(), entry.toPython(), { first: true });
		const script = first(first(write("data.title = 'Hi'", posts)));
		expect(readSections(script).map((section) => section.name)).toEqual(["entry", "posts"]);
		expect(script.startsWith("data.title = 'Hi'\n")).toBe(true);
	});

	it("replaces only its own section", () => {
		const other = new DataSource({ ...posts.toJSON(), name: "authors" });
		let script = write(write("data.title = 'Hi'", posts), other);
		script = write(script, new DataSource({ ...posts.toJSON(), limit: 9 }));

		expect(readSections(script).map((section) => [section.name, section.limit])).toEqual([
			["posts", 9],
			["authors", 5],
		]);
		expect(script).toContain("data.title = 'Hi'");
	});

	it("removes a section and keeps the lines around it", () => {
		const script = removeSection(write("data.title = 'Hi'", posts), "posts");

		expect(script.trim()).toBe("data.title = 'Hi'");
	});

	it("fails loudly on a broken definition", () => {
		expect(() => readSections("# builder-cms:start posts {broken\n")).toThrow(
			'broken CMS section: "posts"'
		);
	});
});

/** A collection the app made, as the app answers it. */
const owned = (label, settings = {}) =>
	new Collection({
		collection: `CMS ${label}`,
		label,
		slug_field: "slug",
		published_field: "published",
		...settings,
	});

/** An existing doctype, mapped. */
const mapped = (doctype, settings = {}) =>
	new Collection({
		collection: doctype,
		is_mapped: 1,
		label: doctype,
		slug_field: "name",
		...settings,
	});

describe("collections", () => {
	it("starts a data source with published entries only, linked through the collection page", () => {
		const fields = [
			{ fieldname: "title", fieldtype: "Data" },
			{ fieldname: "slug", fieldtype: "Data" },
			{ fieldname: "published", fieldtype: "Check" },
			{ fieldname: "body", fieldtype: "Text Editor" },
			// a reference reads the linked title under its own name. A list holds no multi-reference
			{ fieldname: "topic", fieldtype: "Link", links_to: "CMS Tag", title_field: "title" },
			{ fieldname: "tags", fieldtype: "Table MultiSelect", links_to: "CMS Tag" },
		];

		const defaults = owned("Blog Post").getSourceDefaults(fields);

		// complete on its own: nothing else fills in the doctype now
		expect(() => new DataSource(defaults).validate()).not.toThrow();
		expect(defaults).toEqual({
			name: "collection_blog_post",
			doctype: "CMS Blog Post",
			fields: ["name", "title", "slug", "published", "body", "topic.title as topic"],
			orderBy: "creation desc",
			publishedField: "published",
			link: { collection: "CMS Blog Post", field: "slug", variable: "slug" },
		});
	});

	it("names a collection by its label, and adds the doctype only when two labels match", () => {
		const titles = markSameLabels([
			owned("Sample"),
			owned("Blog Post"),
			mapped("Blog Post"),
			mapped("Web Page", { label: "Sample" }),
		]).map((collection) => collection.title);

		expect(titles).toEqual([
			"Sample - CMS",
			"Blog Post - CMS",
			"Blog Post - doctype",
			"Sample - Web Page",
		]);
	});

	it("lets a slug follow the title until the user types one", () => {
		const posts = owned("Blog Post");
		expect(posts.isSlugFromTitle("", "")).toBe(true);
		expect(posts.isSlugFromTitle("hello-world", "Hello World")).toBe(true);
		expect(posts.isSlugFromTitle("my-own-slug", "Hello World")).toBe(false);
		expect(mapped("Web Page").isSlugFromTitle("", "")).toBe(false);
	});

	describe("a mapped doctype", () => {
		const posts = mapped("Blog Post", {
			label: "Posts",
			url: "/posts",
			slug_field: "route",
			published_field: "published",
		});
		const pages = mapped("Web Page", { published_field: null });

		it("reads its slug and published fields from the mapping", () => {
			expect([posts.isOwned, posts.label, posts.slugField, posts.publishedField]).toEqual([
				false,
				"Posts",
				"route",
				"published",
			]);
		});

		it("treats no published field as every row public", () => {
			expect(pages.publishedField).toBe("");
			expect(pages.getSourceDefaults([]).publishedField).toBe(null);
		});

		it("links each row by filling :slug from the mapped field", () => {
			expect(posts.getSourceDefaults([]).link).toEqual({
				collection: "Blog Post",
				field: "route",
				variable: "slug",
			});
		});

		it("leaves the mapped steering fields out of the content", () => {
			const fields = [
				{ fieldname: "title", fieldtype: "Data" },
				{ fieldname: "route", fieldtype: "Data" },
				{ fieldname: "published", fieldtype: "Check" },
			];
			expect(posts.getDisplayFields(fields).map((field) => field.fieldname)).toEqual([
				"title",
			]);
		});

		it("opens its rows in Desk", () => {
			expect(posts.getDeskUrl("my post")).toBe("/app/blog-post/my%20post");
			expect(pages.getDeskUrl("new")).toBe("/app/web-page/new-web-page-1");
			expect(pages.getDeskUrl()).toBe("/app/web-page");
		});
	});

	it("puts the title first and the slug and published flag last in the table", async () => {
		const blog = owned("Blog Post");
		blog.getFields = async () => [
			{ fieldname: "slug" },
			{ fieldname: "body" },
			{ fieldname: "published" },
			{ fieldname: "title" },
		];
		expect((await blog.getTableFields()).map((field) => field.fieldname)).toEqual([
			"title",
			"body",
			"slug",
			"published",
		]);
	});

	it.each([
		["blog", "/blog"],
		[" /Blog/ ", "/blog"],
		["/blog/news", "/blog/news"],
		["Blog Posts", "/blog-posts"],
	])("writes the URL %j as %j", (url, expected) => expect(normalizeUrl(url)).toBe(expected));
});

describe("multiline fields", () => {
	it.each(["Small Text", "Text", "Long Text", "Text Editor", "Markdown Editor", "Code"])(
		"opens %s in the entry editor",
		(fieldtype) => {
			expect(isMultilineField({ fieldtype })).toBe(true);
		}
	);
	it.each(["Data", "Check", "Date", "Select", "Attach Image"])(
		"keeps %s inline",
		(fieldtype) => {
			expect(isMultilineField({ fieldtype })).toBe(false);
		}
	);
});
