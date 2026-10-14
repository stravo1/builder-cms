# CMS

Manage content in Frappe, and show it on your Builder pages.

Open the **CMS** tab in the left panel. It has two tabs.

| Tab | What you do there |
|---|---|
| This page | Turn the open page into the index page or the detail page of a collection |
| Collections | Make a collection, or use an existing doctype as one. Configure its fields, and show its entries |

## Pages

- **Index page:** gets the collection URL, such as `/blog`, and a list of its published entries.
- **Detail page:** gets `/blog/:slug`, and shows the entry that the URL names. An empty page also
  gets a bound title, cover, and body.

Each collection has one index page and one detail page. Turning another page into one moves the old
page aside to `…/previous-<page>`. To bind any other block, select it and choose **Bind to data**.

## Collections

Click a collection to configure it: its fields, its URL, and its detail page. **Show entries** opens
its entries in a large dialog.

In the dialog, click a cell to edit it. Text saves when you press Enter or leave the cell, and
Escape cancels. Check boxes, dates, and selects save at once. A rich text cell opens its own
editor, with a **Back** button. Each row can open in Desk, or preview on the detail page.

An entry edit shows on the published page at once. You do not publish the page again.

## Use an existing doctype

In **Collections › New**, choose **Existing doctype**. Pick the doctype, the field that names each
entry in its URL (the slug), and the yes/no field that marks an entry as published. With no
published field, every row is public. Its entries open in Desk, which knows the doctype's rules.

## How it works

A collection is a doctype that this extension makes, with the name `CMS <collection>`. Frappe stores,
permits, and versions its entries. You can also edit them in Desk. The `CMS Collection` doctype
keeps the URL and the collection page of each collection.

Every collection has a title, a slug, and a published flag. The slug comes from the title when you
leave it empty.

A data source is one section of the page data script, between `# builder-cms:start <name>` and
`# builder-cms:end <name>`. The extension replaces only those lines. Your own lines stay. The
section reads with `frappe.db.get_all`. A visitor is a Guest, so "Published entries only" is what
keeps drafts off the page.

A list finds the collection page, and its route, each time the page renders. So a new URL or a moved
collection page never breaks a link.

## Permissions

| Permission | Why |
|---|---|
| `schema.write` | Makes a doctype for each collection. You must be a System Manager |
| `data.access` | Reads and writes entries, settings, and the data script of the page |
| `page.edit` | Adds the bound blocks to the page |

## Limits

- A collection page shows an empty page for a draft or an unknown slug. It does not answer 404 yet.
- An image field takes a URL. Upload the file in Desk first, and paste its URL.
- A collection can add fields. It cannot rename or remove one.

## Develop

```sh
npm install
npm run dev
npm test
```

The editor half needs a Builder with the generic block fields, `page.open`,
`page.setRouteVariables`, and `ui.openUrl`.
