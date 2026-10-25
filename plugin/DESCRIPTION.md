# CMS

Keep your content in Frappe and show it on your Builder pages. A collection can be a new content type or a DocType that you already have.

## Collections

Open the **CMS** tab to see your collections. Click **New** to add one:

- **New content type** makes a content type with a title, a slug and a published flag. You can add more fields when you make it, or later in **Settings**.
- **Existing doctype** connects a DocType that you already have. Pick the field that gives each entry its URL, and an optional published checkbox. Only a System Manager or a Website Manager can connect a DocType.

Open a collection to see its **Entries**. Edit a cell in the table, or open an entry to edit all of its fields.

## Pages

Each collection has one collection page, a single design for every entry. In the collection's **Settings**, click **Configure** under **Collection page**. Then make a new page with blocks for the fields, or use a page that you already have. A page that you already have can get new blocks, or the CMS can bind the blocks that have the name of a field, such as "Title".

The collection page gets a URL such as `/blog/:slug`, so each entry has its own address.

To list the entries on any page, open that page and click **Insert** under **Index**. Choose cards or a table. Each card or row links to its entry. If you change the collection URL later, the links change with it.

## Bind a block to a field

Select a block and click **Set Dynamic Value** next to its content, image or link in the properties panel. The **CMS fields** group shows the fields that fit. Inside a list, each item shows its own entry.

## Drafts and publishing

A published page shows only published entries. A draft or an unknown slug shows a 404 page. In the editor, the preview of a collection page also shows drafts, so you can check an entry before you publish it.

You do not have to publish the page again after you edit content.

## Access

The CMS needs the `cms` app on the site. Every request runs with the permissions of the user.

A System Manager or a Website Manager chooses who uses the CMS:

- In Builder's **Settings → CMS**, choose the roles that can use the whole CMS. These roles create collections and manage every collection.
- In a collection's **Settings**, choose the roles that can use only the entries of that collection.
