import { getDocuments, updateDocument } from "../data/documents.js";
/**
 * Keeps one page on a collection page route. Builder does not refuse two pages on
 * one route, so the plugin checks before it writes one.
 */

const PAGE = "Builder Page";

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
export const releaseRoute = (pageName) => updateDocument(PAGE, pageName, { route: getDefaultRoute(pageName) });

/** Gives `route` to `pageName`. The user confirmed the move of each other page on it. */
export const claimRoute = async (route, pageName) => {
	for (const holder of await getRouteHolders(route, pageName)) await releaseRoute(holder.name);
	await updateDocument(PAGE, pageName, { route });
};
