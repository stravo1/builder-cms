import { describe, expect, it, vi } from "vitest";

vi.mock("frappe-builder-extension-sdk", () => ({
	default: {
		schema: {
			getDoctype: async () => ({
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
		},
	},
}));

const { Collection, getCustomFields, markSameLabels, normalizeUrl } = await import("../src/cms/collection.js");
const { getRetiredRoute } = await import("../src/cms/routes.js");
const { getDoctypeFields, isMultilineField } = await import("../src/data/doctypes.js");
const { getListBlock } = await import("../src/blocks/pageBlocks.js");
const { getPageRole, isCollectionPageOf, isIndexPageOf } = await import("../src/cms/pageActions.js");
const { DataSource } = await import("../src/data/dataSource.js");
const { isIdentifier, toPython } = await import("../src/data/python.js");
const { readSections, removeSection, writeSection } = await import("../src/data/scriptSections.js");

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
		expect((await getDoctypeFields("User")).map((field) => field.fieldname)).toEqual(["email", "user_image"]);
	});
});

describe("getListBlock", () => {
	const fields = [
		{ fieldname: "title", label: "Title", fieldtype: "Data" },
		{ fieldname: "cover", label: "Cover", fieldtype: "Attach Image" },
	];
	const table = getListBlock(
		new DataSource({ name: "posts", link: { collection: "CMS Post", field: "slug" } }),
		fields,
	);
	const [header, rows] = table.children;
	const elements = (block) => [block.element, ...(block.children || []).flatMap(elements)];

	it("uses no table tags", () => {
		expect(new Set(elements(table))).toEqual(new Set(["div", "span", "a", "img"]));
	});

	it("reads as a table, with a heading for each field", () => {
		expect(table.attributes.role).toBe("table");
		expect(header.children.map((cell) => [cell.attributes.role, cell.children[0].innerHTML])).toEqual([
			["columnheader", "Title"],
			["columnheader", "Cover"],
		]);
	});

	// one grid, so each column fits the widest cell of every row
	it("sizes each column to its content, on one grid shared by every row", () => {
		expect(table.styles).toMatchObject({ display: "grid", gridTemplateColumns: "fit-content(280px) max-content" });
		for (const part of [header, rows, rows.children[0]]) {
			expect(part.styles).toMatchObject({ display: "grid", gridTemplateColumns: "subgrid", gridColumn: "1 / -1" });
		}
	});

	it("hugs its columns, and scrolls when wider than the page", () => {
		expect(table.styles).toMatchObject({ width: "max-content", maxWidth: "100%", overflowX: "auto" });
	});

	it("highlights a row on hover with a Builder state style", () => {
		expect(rows.children[0].styles["hover:backgroundColor"]).toBeTruthy();
	});

	it("repeats one row per entry", () => {
		expect(rows).toMatchObject({ isRepeaterBlock: true, dataKey: { key: "posts", comesFrom: "dataScript" } });
		expect(rows.children[0].attributes.role).toBe("row");
	});

	it("puts the link in the first cell", () => {
		const [first, second] = rows.children[0].children;
		expect(first.children[0]).toMatchObject({ element: "a", dynamicValues: [{ key: "url", property: "href" }] });
		expect(second.children[0]).toMatchObject({ element: "img", dynamicValues: [{ key: "cover", property: "src" }] });
	});
});

describe("toPython", () => {
	it("writes Python literals, not JSON", () => {
		expect(toPython({ a: true, b: null, c: [1, "x", false] })).toBe('{"a": True, "b": None, "c": [1, "x", False]}');
	});

	it.each([
		["posts", true],
		["_draft2", true],
		["2posts", false],
		["my-posts", false],
		["class", false],
	])("knows that %s is a name: %s", (name, expected) => expect(isIdentifier(name)).toBe(expected));
});

describe("DataSource", () => {
	it("reads a list with Frappe filters", () => {
		expect(posts.toPython()).toBe(
			[
				"data.posts = frappe.db.get_all(",
				'    "Blog Post",',
				'    filters={"published": 1, "category": ["!=", "News"]},',
				'    fields=["name", "title", "slug"],',
				'    order_by="creation desc",',
				"    limit_page_length=5,",
				")",
			].join("\n"),
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
				'cms_post_filters = {"slug": frappe.form_dict.get("slug")}',
				"if not in_preview:",
				'    cms_post_filters["published"] = 1',
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
			].join("\n"),
		);
		expect(post.getPreviewOptions().filters).toEqual({});
	});

	it("reads a fixed single entry without a 404", () => {
		const post = new DataSource({ ...posts.toJSON(), name: "post", type: "Document", filters: [] });

		expect(post.toPython()).not.toContain("PageDoesNotExistError");
		expect(post.toPython()).toMatch(/\ndata\.post = \(cms_post_rows or \[\{\}\]\)\[0\]$/);
	});

	it("keeps drafts out with a setting, not a filter row", () => {
		const published = new DataSource({ ...posts.toJSON(), filters: [], publishedField: "published" });

		expect(published.toPython()).toContain('filters={"published": 1}');
		expect(published.getPreviewOptions().filters).toEqual({ published: 1 });
	});

	it("reads a route variable on the server, and leaves it out of the preview", () => {
		const post = new DataSource({ ...posts.toJSON(), filters: [["slug", "=", "{{ route.slug }}"]] });

		expect(post.toPython()).toContain('filters={"slug": frappe.form_dict.get("slug")}');
		expect(post.getPreviewOptions().filters).toEqual({});
	});

	it("links each row through the route of the collection page, read on each request", () => {
		const linked = new DataSource({ ...posts.toJSON(), link: { page: "page-1", field: "slug" } });
		const python = linked.toPython();

		expect(python).toContain(
			'cms_posts_route = (frappe.db.get_all("Builder Page", filters={"name": "page-1"}, fields=["route"]) or [{}])[0].get("route") or ""',
		);
		expect(python).toContain('url=("/" + cms_posts_route.lstrip("/").replace(":slug", str(row.get("slug") or ""))');
		expect(python).toContain(') if ":slug" in cms_posts_route or "<slug>" in cms_posts_route else "")');
		expect(python).toContain('.replace("<slug>", str(row.get("slug") or ""))');
		expect(python).toContain("    for row in frappe.db.get_all(");
	});

	it("reads a source saved with the old publishedOnly flag", () => {
		expect(new DataSource({ ...posts.toJSON(), publishedOnly: true }).publishedField).toBe("published");
	});

	it("fills the route variable it names, from the field it names", () => {
		const linked = new DataSource({ ...posts.toJSON(), link: { page: "page-1", field: "route", variable: "slug" } });

		expect(linked.toPython()).toContain('.replace(":slug", str(row.get("route") or ""))');
	});

	it("finds a collection's collection page on each request", () => {
		const linked = new DataSource({ ...posts.toJSON(), link: { collection: "CMS Blog Post", field: "slug" } });

		expect(linked.toPython()).toContain(
			'cms_posts_page = (frappe.db.get_all("CMS Collection", filters={"collection": "CMS Blog Post"}, fields=["entry_page"]) or [{}])[0].get("entry_page") or ""',
		);
		expect(linked.toPython()).toContain('filters={"name": cms_posts_page}');
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

describe("script sections", () => {
	const write = (script, source) => writeSection(script, source.name, source.toJSON(), source.toPython());

	it("keeps the definition, so it can read the source back", () => {
		const script = write("data.title = 'Hi'", posts);

		expect(readSections(script)).toEqual([posts.toJSON()]);
		expect(script.startsWith("data.title = 'Hi'\n\n# builder-cms:start posts ")).toBe(true);
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
		expect(() => readSections("# builder-cms:start posts {broken\n")).toThrow('broken CMS section: "posts"');
	});
});

describe("collections", () => {
	it("starts a data source with published entries only, linked through the collection page", () => {
		const fields = [
			{ fieldname: "title", fieldtype: "Data" },
			{ fieldname: "slug", fieldtype: "Data" },
			{ fieldname: "published", fieldtype: "Check" },
			{ fieldname: "body", fieldtype: "Text Editor" },
		];

		const defaults = new Collection("CMS Blog Post").getSourceDefaults(fields);

		// complete on its own: nothing else fills in the doctype now
		expect(() => new DataSource(defaults).validate()).not.toThrow();
		expect(defaults).toEqual({
			name: "collection_blog_post",
			doctype: "CMS Blog Post",
			fields: ["name", "title", "slug", "published", "body"],
			orderBy: "creation desc",
			publishedField: "published",
			link: { collection: "CMS Blog Post", field: "slug", variable: "slug" },
		});
	});

	it("names a collection by its label, and adds the doctype only when two labels match", () => {
		const titles = markSameLabels([
			new Collection("CMS Sample"),
			new Collection("CMS Blog Post"),
			new Collection("Blog Post"),
			new Collection("Web Page", { name: "row", label: "Sample" }),
		]).map((collection) => collection.title);

		expect(titles).toEqual(["Sample - CMS", "Blog Post - CMS", "Blog Post - doctype", "Sample - Web Page"]);
	});

	it("lets a slug follow the title until the user types one", () => {
		const posts = new Collection("CMS Blog Post");
		expect(posts.isSlugFromTitle("", "")).toBe(true);
		expect(posts.isSlugFromTitle("hello-world", "Hello World")).toBe(true);
		expect(posts.isSlugFromTitle("my-own-slug", "Hello World")).toBe(false);
		expect(new Collection("Web Page", { name: "row", slug_field: "name" }).isSlugFromTitle("", "")).toBe(false);
	});

	describe("a mapped doctype", () => {
		const posts = new Collection("Blog Post", {
			name: "row-1",
			label: "Posts",
			url: "/posts",
			slug_field: "route",
			published_field: "published",
		});
		const pages = new Collection("Web Page", { name: "row-2", slug_field: "name", published_field: null });

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
			expect(posts.getSourceDefaults([]).link).toEqual({ collection: "Blog Post", field: "route", variable: "slug" });
		});

		it("leaves the mapped steering fields out of the content", () => {
			const fields = [
				{ fieldname: "title", fieldtype: "Data" },
				{ fieldname: "route", fieldtype: "Data" },
				{ fieldname: "published", fieldtype: "Check" },
			];
			expect(posts.getDisplayFields(fields).map((field) => field.fieldname)).toEqual(["title"]);
		});

		it("opens its rows in Desk", () => {
			expect(posts.getDeskUrl("my post")).toBe("/app/blog-post/my%20post");
			expect(pages.getDeskUrl()).toBe("/app/web-page/new-web-page-1");
		});
	});

	describe("isCollectionPageOf", () => {
		const blog = { doctype: "CMS Blog Post", collectionPage: "page-1" };
		const entry = { name: "entry", doctype: "CMS Blog Post" };
		const page = { name: "page-1", route: "blog/:slug" };

		it("needs the pointer, a :slug route, and the entry source", () => {
			expect(isCollectionPageOf(blog, page, [entry])).toBe(true);
		});

		it.each([
			["the settings point at another page", { ...blog, collectionPage: "page-2" }, page, [entry]],
			["the user removed :slug from the route", blog, { ...page, route: "scrap" }, [entry]],
			["the user removed the entry source", blog, page, []],
			["the entry source reads another collection", blog, page, [{ ...entry, doctype: "CMS Other" }]],
		])("is false when %s", (_case, collection, testPage, sources) => {
			expect(isCollectionPageOf(collection, testPage, sources)).toBe(false);
		});
	});

	it("moves a previous page to a route no other page has", () => {
		expect(getRetiredRoute("blog/:slug", "page-1")).toBe("blog/previous-page-1/:slug");
		expect(getRetiredRoute("blog", "page-1")).toBe("blog/previous-page-1");
	});

	describe("page roles", () => {
		const blog = new Collection("CMS Blog Post", {
			name: "row",
			url: "/blog",
			index_page: "page-index",
			entry_page: "page-detail",
		});
		const entry = { name: "entry", doctype: "CMS Blog Post" };

		it("knows an index page by the pointer and the collection URL", () => {
			expect(isIndexPageOf(blog, { name: "page-index", route: "blog" })).toBe(true);
			expect(isIndexPageOf(blog, { name: "page-index", route: "news" })).toBe(false);
		});

		it("tells an index page from a detail page", () => {
			expect(getPageRole([blog], { name: "page-index", route: "blog" }, [])).toMatchObject({ kind: "index" });
			expect(getPageRole([blog], { name: "page-detail", route: "blog/:slug" }, [entry])).toMatchObject({
				kind: "detail",
			});
			expect(getPageRole([blog], { name: "page-other", route: "about" }, [])).toBe(null);
		});
	});

	it("puts the title first and the slug and published flag last in the table", async () => {
		const blog = new Collection("CMS Blog Post");
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

	it("names custom fields from their labels", () => {
		expect(getCustomFields([{ label: "Cover Image", fieldtype: "Attach Image" }])).toEqual([
			{ label: "Cover Image", fieldtype: "Attach Image", fieldname: "cover_image" },
		]);
	});

	it.each([
		["a standard field", [{ label: "Title", fieldtype: "Data" }]],
		[
			"two fields with one name",
			[
				{ label: "Body", fieldtype: "Data" },
				{ label: "body", fieldtype: "Data" },
			],
		],
	])("refuses %s", (_case, fields) => {
		expect(() => getCustomFields(fields)).toThrow("Pick another name");
	});
});

describe("multiline fields", () => {
	it.each(["Small Text", "Text", "Long Text", "Text Editor", "Markdown Editor", "Code"])(
		"opens %s in the entry editor",
		(fieldtype) => {
			expect(isMultilineField({ fieldtype })).toBe(true);
		},
	);
	it.each(["Data", "Check", "Date", "Select", "Attach Image"])("keeps %s inline", (fieldtype) => {
		expect(isMultilineField({ fieldtype })).toBe(false);
	});
});
