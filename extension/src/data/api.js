/**
 * The `cms` app's methods. The SDK sends each call through Builder, and each
 * one needs the `method.call` permission. A collection is named by its doctype.
 */

import { call } from "frappe-ui";

const COLLECTIONS = "cms.api.collections";
const ENTRIES = "cms.api.entries";
const ACCESS = "cms.api.access";

export const api = {
	getCollections: () => call(`${COLLECTIONS}.get_collections`),
	createCollection: (label, url, fields) => call(`${COLLECTIONS}.create_collection`, { label, url, fields }),
	mapDoctype: (doctype, { label, url, slugField, publishedField }) =>
		call(`${COLLECTIONS}.map_doctype`, {
			doctype,
			label,
			url,
			slug_field: slugField,
			published_field: publishedField,
		}),
	updateCollection: (collection, values) => call(`${COLLECTIONS}.update_collection`, { collection, values }),
	deleteCollection: (collection) => call(`${COLLECTIONS}.delete_collection`, { collection }),
	getFields: (collection) => call(`${COLLECTIONS}.get_fields`, { collection }),
	addFields: (collection, fields) => call(`${COLLECTIONS}.add_fields`, { collection, fields }),
	removeField: (collection, fieldname) => call(`${COLLECTIONS}.remove_field`, { collection, fieldname }),
	getDoctypeNames: () => call(`${COLLECTIONS}.get_doctype_names`),

	getEntries: (collection, start) => call(`${ENTRIES}.get_entries`, { collection, start }),
	getRows: (collection, fieldnames, start) => call(`${ENTRIES}.get_rows`, { collection, fieldnames, start }),
	getEntry: (collection, name) => call(`${ENTRIES}.get_entry`, { collection, name }),
	getNewestPublished: (collection) => call(`${ENTRIES}.get_newest_published`, { collection }),
	saveEntry: (collection, entry) => call(`${ENTRIES}.save_entry`, { collection, entry }),
	deleteEntry: (collection, name) => call(`${ENTRIES}.delete_entry`, { collection, name }),

	getAccess: () => call(`${ACCESS}.get_access`),
	updateCmsRoles: (roles) => call(`${ACCESS}.update_cms_roles`, { roles }),
	updateCollectionRoles: (collection, roles) => call(`${ACCESS}.update_collection_roles`, { collection, roles }),
};
