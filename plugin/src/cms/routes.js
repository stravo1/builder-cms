/**
 * Keeps one page on a collection page route. Builder does not refuse two pages on
 * one route, so the plugin checks before it writes one.
 */

import { getDocuments } from "../data/documents.js";
import { updatePageDocument } from "../editor/page.js";

const PAGE = "Builder Page";

export const slugify = (text) =>
	text
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

/** `blog`, `/blog/`, and ` /Blog ` all become `/blog`. Each segment is a slug: `/blog/news` stays. */
export const normalizeUrl = (url) => `/${url.split("/").map(slugify).filter(Boolean).join("/")}`;

/** The route variable that names an entry: `:slug`, or `<slug>` in Frappe's form. */
export const SLUG_ROUTE = /:slug\b|<slug>/;

/** Builder gives a new page this route. A page that leaves a collection page route goes back to it. */
export const getDefaultRoute = (pageName) => `pages/${pageName}`;

/** The other pages on `route`. */
export const getRouteHolders = async (route, pageName) => {
	const holders = await getDocuments(PAGE, {
		fields: ["name", "page_title", "route"],
		filters: { route },
		pageLength: 20,
	});
	return holders.filter((page) => page.name !== pageName);
};

export const assertRouteFree = async (route, pageName) => {
	const [holder] = await getRouteHolders(route, pageName);
	if (holder) throw new Error(`The page "${holder.page_title}" already uses /${route}. Give it another route first.`);
};

/** Moves a page back to the route Builder gave it. */
export const releaseRoute = (pageName) => updatePageDocument(pageName, { route: getDefaultRoute(pageName) });

/** Gives `route` to `pageName`. The user confirmed the move of each other page on it. */
export const claimRoute = async (route, pageName) => {
	for (const holder of await getRouteHolders(route, pageName)) await releaseRoute(holder.name);
	await updatePageDocument(pageName, { route });
};
