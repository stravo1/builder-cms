# CMS

Create content in Frappe and connect it to Builder pages. A collection can be a CMS content type or an existing DocType.

## Use

The plugin adds a **CMS** tab to the editor. [DESCRIPTION.md](DESCRIPTION.md) describes the features for users. In short:

- The left list shows the collections. **New** makes a content type, or connects an existing DocType.
- **Entries** shows an editable table. Text cells save on Enter or blur, and Escape cancels the edit. The edit button and multiline cells open the entry form at the right. Save or cancel the form before you open another entry.
- **Settings** holds the fields, the URL, the collection page, the roles and **Delete collection**. For an existing DocType, **Disconnect** removes only the CMS link. The DocType and its records stay.
- The Insert panel has a **CMS** group: **Collection list** and **Collection details**. After a drop, the **CMS** section of the right panel sets the collection and the fields. Collection details also makes the page the collection page, and so does the page body's CMS section. On a text or image block, the section sets the field.
- Builder's **Set Dynamic Value** picker shows a **CMS fields** group for text, image and link properties.
- Builder's **Settings → CMS** holds the roles that can use the whole CMS.

Existing DocTypes support simple fields in the entry form. Use **Open in Desk** for child tables, naming rules and other fields.

## Storage and rendering

The `cms` app owns the collections. Each one is a `CMS Collection` row and a custom `CMS <name>` DocType in the CMS module. The row stores the settings, the collection page and the roles of that collection. The app writes the DocPerms of each DocType, so Frappe applies its normal permissions and validation when you edit entries.

Each data source of a page is a marked section in `page_data_script`. The plugin changes only its own sections, and keeps the rest of the script. A published page reads the fields with `frappe.db.get_all`, and a published field leaves out drafts. When you add or remove a CMS field, the plugin updates these sections on every page. After an entry changes, the plugin reads the page data again, so the canvas shows the new content.

A collection page answers 404 for a draft or an unknown slug. In the editor, the entry preview also lists drafts. Image fields take a URL or an upload. An upload is public. The panel shows an image icon for an image on another site, because a frame may load images only from the site.

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

Load the dev server through Builder's **Plugins → Load dev plugin**. The SDK origin in `vite.config.js` must match the editor origin. Restart the dev server after you change dependencies.

The plugin uses the trusted SDK from `stravo1/frappe-builder-extension-sdk` on the `trusted-extensions-api` branch. Its entry, `src/main.js`, registers the CMS drawer tab, the CMS settings pane, the CMS block templates, the CMS section of the right panel and the **CMS fields** group of **Set Dynamic Value**. Builder supplies Vue, its stores and frappe-ui through shared imports.

| Folder | What it holds |
| --- | --- |
| `src/blocks/` | The block trees that the plugin inserts, and the bindings of a block. |
| `src/cms/` | Collections, collection pages, routes and access. |
| `src/data/` | Calls to the `cms` app and to Frappe, the read cache, and the data sources in a page script. |
| `src/editor/` | The editor state, the canvas and the open page. |
| `src/panel/` | The Vue views of the drawer and the settings pane. |
| `src/properties/` | The CMS section of the right panel. |

The plugin calls `builder_cms.api.*` through frappe-ui's `call()` in `src/data/api.js`. Each request uses the session of the user, and the app checks permissions. Removing a field drops its column.

Component edits use Vite hot reload with a development Vue build of Builder. With a production Vue build, the SDK reloads Builder and restores the dev plugin. A change to a registration can also reload Builder.

### Browser checks

The Playwright checks use a separate browser and keep authentication in memory. Start the dev server and install Chromium with `npx playwright install chromium`. Set `CMS_TEST_PAGE` to an unpublished test page and supply `CMS_TEST_PASSWORD` through your environment, then run `npm run test:browser`.

Optional variables:

- `CMS_TEST_ORIGIN`, `CMS_TEST_USER`, `CMS_TEST_DEV_SERVER`: local site and plugin connection.
- `CMS_TEST_MAPPED_COLLECTION`, `CMS_TEST_OWNED_COLLECTION`: collections for the table restrictions and entry form checks.
- `CMS_TEST_COMPLEX_FIELDS`: comma-separated multiline field labels to check in the mapped collection (defaults to `Bio,Email Signature` for `User`).
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: an existing Chromium executable.
- `CMS_TEST_COLOR_SCHEME`: `light` or `dark` for theme checks.
- `CMS_TEST_PANEL_SCREENSHOT`, `CMS_TEST_TABLE_SCREENSHOT`: screenshots of the panel and expanded table.
- `CMS_TEST_ENTRY_PANEL_SCREENSHOT`, `CMS_TEST_ENTRY_DIALOG_SCREENSHOT`: screenshots of the entry form in each view.
- `CMS_TEST_EDIT_ENTRY=1`: verify saves across panel and dialog, restore the first entry's title, then create, edit, and remove test entries. Use only disposable QA content.
- `CMS_TEST_SCREENSHOT`: screenshot output path (defaults to `/tmp/cms-browser-check.png`).
