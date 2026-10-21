import { getDocuments, updateDocument } from "../data/documents.js";
/**
 * Keeps one page on a collection route. Builder does not refuse two pages on
 * one route, so the extension checks before it writes one.
 */

const PAGE = "Builder Page";

/**
 * Where a page goes when another page takes its role. Unique, because page
 * names are. A detail route keeps its `:slug` at the end.
 */
export const getRetiredRoute = (route, pageName) =>
	route.endsWith("/:slug")
		? route.replace(/\/:slug$/, `/previous-${pageName}/:slug`)
		: `${route}/previous-${pageName}`;

/**
 * Gives `route` to `pageName`. The previous collection page moves aside. Any other
 * page on the route stops the change: the extension never moves a page it did not set up.
 */
export const claimRoute = async (route, pageName, previousCollectionPage) => {
	const holders = await getDocuments(PAGE, {
		fields: ["name", "page_title"],
		filters: { route },
		pageLength: 20,
	});
	for (const holder of holders.filter((page) => page.name !== pageName)) {
		if (holder.name !== previousCollectionPage) {
			throw new Error(`The page "${holder.page_title}" already uses /${route}. Give it another route first.`);
		}
		await updateDocument(PAGE, holder.name, { route: getRetiredRoute(route, holder.name) });
	}
	await updateDocument(PAGE, pageName, { route });
};
