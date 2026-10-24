import { getDocuments, updateDocument } from "../data/documents.js";
/**
 * Keeps one page on a template route. Builder does not refuse two pages on
 * one route, so the plugin checks before it writes one.
 */

const PAGE = "Builder Page";

/** Builder gives a new page this route. A page that leaves a template route goes back to it. */
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

/** Gives `route` to `pageName`. The user confirmed the move of each other page on it. */
export const claimRoute = async (route, pageName) => {
	for (const holder of await getRouteHolders(route, pageName)) {
		await updateDocument(PAGE, holder.name, { route: getDefaultRoute(holder.name) });
	}
	await updateDocument(PAGE, pageName, { route });
};

/** Moves a page to a route the user typed. Builder stores it with no leading or trailing slash. */
export const moveToRoute = async (pageName, typedRoute) => {
	const route = (typedRoute || "").trim().replace(/^\/+|\/+$/g, "");
	if (!route) throw new Error("Give the page a URL.");
	await assertRouteFree(route, pageName);
	await updateDocument(PAGE, pageName, { route });
};
