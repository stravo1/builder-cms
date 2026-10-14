# CMS

Create content in Frappe and connect it to Builder pages. A collection can be a CMS content type or an existing DocType.

## Manage content

Open **CMS → Collections**, then choose a collection.

- **Entries** shows an editable table in the panel. Search the loaded rows, edit a cell, or choose **New entry**. The edit button opens the entry form in the panel. Click rich text or another multiline field to open the same form and focus that field. **Save** returns to the table; **Cancel** discards the draft. Leave a new CMS entry's slug empty to generate it from its title.
- **View in dialog** expands the table into a large dialog. The edit button and multiline cells open an entry drawer over its right side. The table keeps its width and columns. The clicked field receives focus. **Save** closes the drawer and updates both tables immediately; **Cancel** discards the draft. A failed save keeps it open. The drawer has only a left divider, with no shadow or animation. Save or cancel pending changes before switching entries. Simple text cells save on Enter or blur; Escape cancels the edit.
- **Pages** opens the collection's index and detail pages, or takes you to page setup.
- **Settings** manages the URL and CMS fields. Fields show ten at a time; **Load more fields** reveals the next ten. Custom CMS fields can be removed after confirmation. Title, Slug, and Published are required by the CMS. **Delete collection** removes the DocType after Builder asks, and removes the collection from every page. For an existing DocType, **Disconnect** removes only the CMS link, and the DocType and its records stay.

Existing DocTypes support simple entry fields in the same editor. Use **Open in Desk** for child tables, naming rules, and advanced fields. The plugin offers no schema removal or entry deletion for these collections.

## Connect a page

Open a Builder page and select **CMS → This page**. Choose a collection, select a page type, then click **Connect page**.

| Page type | Content | URL |
|---|---|---|
| Index | A repeating collection list | `/blog` |
| Detail | One entry selected by its slug | `/blog/:slug` |

Each collection has one index page and one detail page. Assigning a replacement moves the previous page to a `previous-<page>` URL. Route conflicts with unrelated pages stop the change.

An empty page gets bound starter blocks. A designed page keeps its layout. On an index page, insert a **Cards** or **Table** list, or select a container and choose **Use selected container as list**. Its children repeat for each entry.

To map content, select a block on the canvas and choose a field under **Connect a field**. The CMS panel stays open while you select blocks. Text, image source, link URL, and visibility bindings are available for compatible blocks. Text and container blocks can also bind a **Link URL**. Binding a URL turns the block into a link and keeps its text and visibility bindings. Right-click **Bind to data** for the same field picker.

Inside a list, fields come from the current item. On a detail page, they come from the page entry. **Disconnect field** removes that property's binding. The detail page's **Preview content** picker switches between published entries.

## Connect an existing DocType

Choose **Collections → New → Existing doctype**. Select a DocType, a slug field, and an optional published checkbox field. Use a unique text field that fits in one URL segment. With no published field, all entries can appear on the page. Child tables and Single DocTypes are not independent collections.

## Storage and rendering

CMS collections use extension-owned `CMS <name>` DocTypes. `CMS Collection` stores collection settings and page assignments. Frappe applies its normal permissions and document validation when you edit entries.

Each page data source has a marked section in `page_data_script`. The plugin updates its own sections and keeps other script content. Public rendering reads the configured fields with `frappe.db.get_all`; a configured published field excludes drafts. Removing or adding a CMS field updates these generated sources. After an entry changes, the extension calls `builder.page.refreshData()` to update the canvas with the current page data.

Content edits appear on published pages without republishing their layouts. A detail page answers 404 for a draft or unknown slug. In the editor, **Preview content** also lists drafts. This needs a Builder version that gives page scripts `in_preview`. A page connected with version 0.1.0 gets this after you connect it again. Image fields accept URLs; upload files through Desk.

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

Load the dev server through Builder's **Extensions → Load dev extension**. The SDK origin in `vite.config.js` must match the editor origin.

The host needs `data.subscribe` for live table updates across extension frames, the block binding APIs, `page.open`, `page.setRouteVariables`, `page.refreshData`, `ui.openUrl`, dialog sizing, and `schema.updateDoctype` with explicit `removeFields`. After changing the host SDK, run `yarn build:sdk` from Builder's `frontend` directory.

The extension uses `page.edit`, `data.access`, and `schema.write`. Schema changes require the site's normal System Manager permissions. Removing a field uses `update_doctype(remove_fields=[...])`; omitted fields remain.

### Browser checks

The Playwright checks use a separate browser and keep authentication in memory. Start the dev server and install Chromium with `npx playwright install chromium`. Set `CMS_TEST_PAGE` to an unpublished test page and supply `CMS_TEST_PASSWORD` through your environment, then run `npm run test:browser`.

Optional variables:

- `CMS_TEST_ORIGIN`, `CMS_TEST_USER`, `CMS_TEST_DEV_SERVER`: local site and extension connection.
- `CMS_TEST_MAPPED_COLLECTION`, `CMS_TEST_OWNED_COLLECTION`: collections for the table restrictions and entry form checks.
- `CMS_TEST_COMPLEX_FIELDS`: comma-separated multiline field labels to check in the mapped collection (defaults to `Bio,Email Signature` for `User`).
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: an existing Chromium executable.
- `CMS_TEST_COLOR_SCHEME`: `light` or `dark` for theme checks.
- `CMS_TEST_PANEL_SCREENSHOT`, `CMS_TEST_TABLE_SCREENSHOT`: screenshots of the panel and expanded table.
- `CMS_TEST_ENTRY_PANEL_SCREENSHOT`, `CMS_TEST_ENTRY_DIALOG_SCREENSHOT`: screenshots of the entry form in each view.
- `CMS_TEST_EDIT_ENTRY=1`: verify saves across panel and dialog, restore the first entry's title, then create, edit, and remove test entries. Use only disposable QA content.
- `CMS_TEST_SCREENSHOT`: screenshot output path (defaults to `/tmp/cms-browser-check.png`).
