# CMS

Keep your content in Frappe and show it on your Builder pages. A collection can be a new content type or a DocType that you already have.

## Collections

Open **CMS → Collections** to make or open a collection.

- **New collection** makes a content type with a title, a slug, and a published flag. Add your own fields in **Settings**.
- **Existing doctype** connects a DocType that you already have. Pick the field that gives each entry its URL, and an optional published checkbox.
- **Show entries** opens a table. Edit a cell in place, or open an entry to edit all of its fields.

## Pages

Make a page, then open **CMS → This page** and pick a collection.

| Page type | What it shows | Example URL |
|---|---|---|
| Index | A list of entries, as cards or a table | `/blog` |
| Detail | One entry, found by its slug | `/blog/:slug` |

The CMS sets the page URL and the data for you. An empty page gets starter blocks. A designed page keeps its layout.

Each card or row on an index page links to its entry, such as `/blog/my-first-post`. The link follows the collection URL. If you change the URL later, the links change with it.

## Bind blocks to content

Select a block, then choose **Bind to data** in the toolbar or the context menu. Pick a field for the text, the image, the link, or the visibility of the block. Inside a list, each item reads its own entry.

## Drafts and publishing

A published page shows only published entries. A draft or an unknown slug shows a 404 page. In the editor, **Preview content** also shows drafts, so you can check an entry before you publish it.

You do not have to publish the page again after you edit content.

## Permissions

The CMS asks for these permissions:

- **Edit pages**, to set the URL, the data, and the blocks of a page.
- **Read and write data**, to show and edit your entries.
- **Change the schema**, to make content types and add or remove their fields. This needs a System Manager.
