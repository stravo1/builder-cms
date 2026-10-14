/**
 * Block trees bound to a data source. Builder renders the bindings on each
 * request, so a content edit shows on the published page with no new publish.
 *
 * The blocks have minimal styles. The user styles them in Builder like any other block.
 */

const column = { display: "flex", flexDirection: "column" };

/** How a field shows: an image sets `src`, every other field sets the text. */
const getBinding = (field, key) =>
	field.fieldtype === "Attach Image"
		? { key, type: "attribute", property: "src" }
		: { key, type: "key", property: "innerHTML" };

const fieldBlock = (field, key, isFirst) => {
	const binding = getBinding(field, key);
	const shared = { blockName: field.label, dynamicValues: [binding], visibilityCondition: { key } };
	if (binding.type === "attribute") {
		return { ...shared, element: "img", attributes: { alt: "" }, styles: { width: "100%", objectFit: "cover" } };
	}
	const element = field.fieldtype === "Text Editor" ? "div" : isFirst ? "h3" : "p";
	return { ...shared, element };
};

const fieldBlocks = (fields, keyOf) =>
	fields.map((field, index) => fieldBlock(field, keyOf(field.fieldname), index === 0));

/**
 * One opinionated look: a white card with a soft border, a muted header band,
 * and roomy rows that light up on hover. Every value is a normal Builder style,
 * so a user restyles the table like any other block.
 */
const COLORS = {
	border: "#e5e7eb",
	divider: "#f1f2f4",
	header: "#f9fafb",
	hover: "#f6f7f9",
	text: "#1f2937",
	muted: "#6b7280",
	strong: "#111827",
};

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
 * each row still has its own box for the hover color and the divider.
 */
const subgrid = { display: "grid", gridTemplateColumns: "subgrid", gridColumn: "1 / -1" };

/**
 * A column is never narrower than its longest word or its heading. `break-word`
 * still breaks a word too long for the cap, but unlike `anywhere` it does not
 * let the grid squeeze a column to one letter.
 */
const cell = { padding: "12px 16px", overflowWrap: "break-word" };

const headerCell = {
	...cell,
	paddingTop: "10px",
	paddingBottom: "10px",
	fontSize: "12px",
	fontWeight: "600",
	letterSpacing: "0.04em",
	textTransform: "uppercase",
	color: COLORS.muted,
	// one line, and the column is at least as wide as the label
	whiteSpace: "nowrap",
};

/** Text, an image thumbnail, or rich text kept to two lines. */
const valueBlock = (field, key) => {
	const binding = getBinding(field, key);
	const shared = { blockName: field.label, dynamicValues: [binding], visibilityCondition: { key } };
	if (binding.type === "attribute") {
		return {
			...shared,
			element: "img",
			attributes: { alt: "" },
			styles: { width: "40px", height: "40px", objectFit: "cover", borderRadius: "8px", display: "block" },
		};
	}
	if (field.fieldtype === "Text Editor") {
		return {
			...shared,
			element: "div",
			styles: {
				display: "-webkit-box",
				WebkitLineClamp: "2",
				WebkitBoxOrient: "vertical",
				overflow: "hidden",
				color: COLORS.muted,
			},
		};
	}
	return { ...shared, element: "span" };
};

/** The first cell holds the link to the row's page. It reads as the row's title. */
const linked = (source, block) =>
	source.link
		? {
				element: "a",
				blockName: "Link",
				styles: {
					color: COLORS.strong,
					fontWeight: "500",
					textDecoration: "none",
					"hover:textDecoration": "underline",
				},
				dynamicValues: [{ key: "url", type: "attribute", property: "href" }],
				children: [block],
			}
		: { ...block, styles: { ...block.styles, color: COLORS.strong, fontWeight: "500" } };

/**
 * A grid of divs that reads as a table: a header row with the field labels,
 * and a repeater with one row per entry. ARIA roles give screen readers the
 * table structure that the tags no longer carry.
 */
export const getListBlock = (source, fields, label = source.name) => ({
	element: "div",
	blockName: `${label} table`,
	attributes: { role: "table" },
	styles: {
		display: "grid",
		gridTemplateColumns: fields.map(columnWidth).join(" "),
		// as wide as its columns. A table wider than the page scrolls inside itself
		width: "max-content",
		maxWidth: "100%",
		overflowX: "auto",
		backgroundColor: "#ffffff",
		border: `1px solid ${COLORS.border}`,
		borderRadius: "12px",
		boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
		fontSize: "14px",
		lineHeight: "1.5",
		color: COLORS.text,
	},
	children: [
		{
			element: "div",
			blockName: "Header",
			attributes: { role: "row" },
			styles: { ...subgrid, backgroundColor: COLORS.header, borderBottom: `1px solid ${COLORS.border}` },
			children: fields.map((field) => ({
				element: "div",
				attributes: { role: "columnheader" },
				styles: headerCell,
				children: [{ element: "span", blockName: `${field.label} heading`, innerHTML: field.label }],
			})),
		},
		{
			element: "div",
			blockName: `${label} rows`,
			attributes: { role: "rowgroup" },
			isRepeaterBlock: true,
			dataKey: { key: source.name, comesFrom: "dataScript" },
			styles: subgrid,
			children: [
				{
					element: "div",
					blockName: `${label} row`,
					attributes: { role: "row" },
					styles: {
						...subgrid,
						alignItems: "center",
						borderBottom: `1px solid ${COLORS.divider}`,
						"hover:backgroundColor": COLORS.hover,
					},
					children: fields.map((field, index) => {
						const value = valueBlock(field, field.fieldname);
						return {
							element: "div",
							attributes: { role: "cell" },
							styles: cell,
							children: [index === 0 ? linked(source, value) : value],
						};
					}),
				},
			],
		},
	],
});

export const getDocumentBlock = (source, fields, label = source.name) => ({
	element: "div",
	blockName: label,
	styles: { ...column, gap: "16px", width: "100%" },
	children: fieldBlocks(fields, (fieldname) => `${source.name}.${fieldname}`),
});

/** The container repeats one editable card. All its children remain normal Builder blocks. */
export const getCardListBlock = (source, fields, label = source.name) => ({
	element: "div",
	blockName: `${label} list`,
	isRepeaterBlock: true,
	dataKey: { key: source.name, comesFrom: "dataScript" },
	styles: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", width: "100%" },
	children: [
		{
			element: "div",
			blockName: `${label} item`,
			styles: { ...column, gap: "12px", padding: "20px", border: "1px solid #e5e7eb", borderRadius: "12px" },
			children: [
				...fieldBlocks(fields.filter((field) => field.fieldtype !== "Check").slice(0, 4), (name) => name),
				...(source.link
					? [
							{
								element: "a",
								innerHTML: "Read more →",
								dynamicValues: [{ key: "url", type: "attribute", property: "href" }],
								visibilityCondition: { key: "url" },
							},
						]
					: []),
			],
		},
	],
});
