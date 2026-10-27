# CMS

Keep your content in Frappe and show it on your Builder pages. A collection can be a new content type or a DocType that you already have.

## Collections

Open the **CMS** tab to see your collections. Click **New** to add one:

- **New content type** makes a content type with a title, a slug and a published flag. You can add more fields when you make it, or later in **Settings**.
- **Existing doctype** connects a DocType that you already have. Pick the field that gives each entry its URL, and an optional published checkbox. Only a System Manager or a Website Manager can connect a DocType.

Open a collection to see its **Entries**. Edit a cell in the table, or open an entry to edit all of its fields.

## Pages

Each collection has one collection page, a single design for every entry. To make a page the collection page, select its body. In the **CMS** section of the right panel, choose the collection. An empty page gets blocks for the fields. **Preview** in the same section shows another entry. To make a new page, click **Create page** in the collection's **Settings**.

The collection page gets a URL such as `/blog/:slug`, so each entry has its own address.

To list the entries on any page, drag **Collection list** from the **CMS** group of the Insert panel onto the page. In the right panel, choose the collection, the layout (cards or a table), the fields, the sort order and the limit. Each card or row links to its entry. If you change the collection URL later, the links change with it.

To show one entry, drag **Collection details** onto a page. In the right panel, choose the collection. The page becomes the collection page, and the block shows the entry's fields. Choose others in **Fields**.

To show a field in a block of your own, select a text or image block in a card or on the collection page. Then choose the field in the right panel.

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
