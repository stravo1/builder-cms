/**
 * Block trees bound to a data source. Builder renders the bindings on each
 * request, so a content edit shows on the published page with no new publish.
 *
 * The blocks have minimal styles. The user styles them in Builder like any other block.
 */

const column = { display: "flex", flexDirection: "column" };

/**
 * Rich text is a text block, so Builder edits and styles it as text. Not a `p`:
 * the browser closes a `p` at the first heading, list, or paragraph in the
 * content, and the content falls out of the block. A `span` keeps it.
 */
const richText = { element: "span", baseStyles: { display: "block" } };

/** The block properties a field can set, by binding target. */
export const BOUND_PROPERTIES = {
	text: { type: "key", property: "innerHTML" },
	image: { type: "attribute", property: "src" },
	link: { type: "attribute", property: "href" },
};

/** An image field sets `src`, and every other field sets the text. */
export const getFieldTarget = (field) => (field.fieldtype === "Attach Image" ? "image" : "text");

export const getBinding = (key, target) => ({
	key,
	...BOUND_PROPERTIES[target],
	comesFrom: "dataScript",
});

/** Shows the value of `key`, and hides when it is empty. */
const boundBlock = (field, key) => ({
	blockName: field.label,
	dynamicValues: [getBinding(key, getFieldTarget(field))],
	visibilityCondition: { key, comesFrom: "dataScript" },
});

const imageBlock = (baseStyles) => ({ element: "img", attributes: { alt: "" }, baseStyles });

const linkBinding = getBinding("url", "link");

const fieldBlock = (field, key, isFirst) => {
	const bound = boundBlock(field, key);
	if (getFieldTarget(field) === "image")
		return { ...bound, ...imageBlock({ width: "100%", objectFit: "cover" }) };
	if (field.fieldtype === "Text Editor") return { ...bound, ...richText };
	return { ...bound, element: isFirst ? "h3" : "p" };
};

const fieldBlocks = (fields, keyOf) =>
	fields.map((field, index) => fieldBlock(field, keyOf(field.fieldname), index === 0));

/**
 * Each column is as wide as its widest cell, up to a cap. Past the cap, the
 * text wraps. An image column is as wide as the thumbnail or its heading.
 */
const columnWidth = (field) => {
	if (field.fieldtype === "Attach Image") return "max-content";
	if (field.fieldtype === "Text Editor") return "fit-content(420px)";
	return "fit-content(280px)";
};

/**
 * The table is the one grid. The header, the row group, and each row take its
 * columns with `subgrid`. So a column fits the widest cell of every row, and
 * each row still has its own box for the user to style.
 */
const subgrid = { display: "grid", gridTemplateColumns: "subgrid", gridColumn: "1 / -1" };

/**
 * A column is never narrower than its longest word or its heading. `break-word`
 * still breaks a word too long for the cap, but unlike `anywhere` it does not
 * let the grid squeeze a column to one letter.
 */
const cell = { padding: "8px 12px", overflowWrap: "break-word" };

// one line, and the column is at least as wide as the label
const headerCell = { ...cell, fontWeight: "600", whiteSpace: "nowrap" };

/** Text, an image thumbnail, or rich text kept to two lines. */
const valueBlock = (field, key) => {
	const bound = boundBlock(field, key);
	if (getFieldTarget(field) === "image") {
		return {
			...bound,
			...imageBlock({ width: "40px", height: "40px", objectFit: "cover", display: "block" }),
		};
	}
	if (field.fieldtype === "Text Editor") {
		return {
			...bound,
			element: richText.element,
			baseStyles: {
				display: "-webkit-box",
				WebkitLineClamp: "2",
				WebkitBoxOrient: "vertical",
				overflow: "hidden",
			},
		};
	}
	return { ...bound, element: "span" };
};

/** The first cell holds the link to the row's page. */
const linked = (source, block) =>
	source.link
		? {
				element: "a",
				blockName: "Link",
				dynamicValues: [linkBinding],
				children: [block],
		  }
		: block;

/**
 * A grid of divs that reads as a table: a header row with the field labels,
 * and a repeater with one row per entry. ARIA roles give screen readers the
 * table structure that the tags no longer carry.
 */
export const getTableBlock = (source, fields, label = source.name) => ({
	element: "div",
	blockName: `${label} table`,
	attributes: { role: "table" },
	baseStyles: {
		display: "grid",
		gridTemplateColumns: fields.map(columnWidth).join(" "),
		// as wide as its columns. A table wider than the page scrolls inside itself
		width: "max-content",
		maxWidth: "100%",
		overflowX: "auto",
	},
	children: [
		{
			element: "div",
			blockName: "Header",
			attributes: { role: "row" },
			baseStyles: subgrid,
			children: fields.map((field) => ({
				element: "div",
				attributes: { role: "columnheader" },
				baseStyles: headerCell,
				children: [
					{
						element: "span",
						blockName: `${field.label} heading`,
						innerHTML: field.label,
					},
				],
			})),
		},
		{
			element: "div",
			blockName: `${label} rows`,
			attributes: { role: "rowgroup" },
			isRepeaterBlock: true,
			dataKey: { key: source.name, comesFrom: "dataScript" },
			baseStyles: subgrid,
			children: [
				{
					element: "div",
					blockName: `${label} row`,
					attributes: { role: "row" },
					baseStyles: { ...subgrid, alignItems: "center" },
					children: fields.map((field, index) => {
						const value = valueBlock(field, field.fieldname);
						return {
							element: "div",
							attributes: { role: "cell" },
							baseStyles: cell,
							children: [index === 0 ? linked(source, value) : value],
						};
					}),
				},
			],
		},
	],
});

/** Marks the block that shows one entry, so the CMS section finds it before it shows anything. */
export const DETAILS_ATTRIBUTES = { "data-cms": "details" };

const getDetails = (blockName, children) => ({
	element: "div",
	blockName,
	attributes: { ...DETAILS_ATTRIBUTES },
	baseStyles: { ...column, gap: "16px", width: "100%" },
	children,
});

export const getDocumentBlock = (source, fields, label = source.name) =>
	getDetails(
		label,
		fieldBlocks(fields, (fieldname) => `${source.name}.${fieldname}`)
	);

/** The Blocks tab tile on a page that shows no entry yet. The user chooses the collection in the CMS section. */
export const getCollectionDetailsTemplate = () =>
	getDetails("Collection details", [
		{ element: "p", innerHTML: "Choose a collection in the CMS section." },
	]);

const getCard = (blockName, children) => ({
	element: "div",
	blockName,
	baseStyles: {
		...column,
		gap: "12px",
		padding: "20px",
		border: "1px solid #e5e7eb",
		borderRadius: "12px",
	},
	children,
});

/** The Blocks tab tile: a repeater with a placeholder card, until the user chooses a collection. */
export const getCollectionListTemplate = () => ({
	element: "div",
	blockName: "Collection list",
	isRepeaterBlock: true,
	baseStyles: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
		gap: "24px",
		width: "100%",
	},
	children: [
		getCard("Item", [{ element: "p", innerHTML: "Choose a collection in the CMS section." }]),
	],
});

/** The card a list repeats: the fields, and a link to the collection page. */
export const getCardBlock = (source, fields, label) =>
	getCard(`${label} item`, [
		...fieldBlocks(fields, (name) => name),
		...(source.link
			? [
					{
						element: "a",
						innerHTML: "Read more →",
						dynamicValues: [linkBinding],
						visibilityCondition: { key: "url" },
					},
			  ]
			: []),
	]);

/** A list of cards: the repeater repeats one card. */
export const getCardListBlock = (source, fields, label) => ({
	...getCollectionListTemplate(),
	blockName: `${label} list`,
	dataKey: { key: source.name, comesFrom: "dataScript" },
	children: [getCardBlock(source, fields, label)],
});

/** What `block` changes to show `field`: an image, rich text, or the text tag it has. */
export const getFieldShape = (field, block) => {
	if (getFieldTarget(field) === "image") return { element: "img" };
	if (field.fieldtype === "Text Editor") {
		return {
			element: richText.element,
			baseStyles: { ...block.baseStyles, ...richText.baseStyles },
		};
	}
	return block.isImage() ? { element: "p" } : {};
};
