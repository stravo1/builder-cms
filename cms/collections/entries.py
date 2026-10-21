"""The entries of one collection.

Every read and write runs as the user, so the DocPerms the app syncs decide
who can do what. A read names only the fields that are safe to publish.
"""

import frappe
from frappe import _

from cms.collections.schema import CollectionSchema, slugify

EDITABLE_TYPES = frozenset(
	{
		"Data",
		"Small Text",
		"Text",
		"Long Text",
		"Text Editor",
		"Markdown Editor",
		"Code",
		"Attach",
		"Attach Image",
		"Date",
		"Datetime",
		"Time",
		"Int",
		"Float",
		"Currency",
		"Percent",
		"Check",
		"Select",
		"Link",
		"Dynamic Link",
	}
)


class CollectionEntries:
	def __init__(self, collection):
		self.collection = collection
		self.doctype = collection.collection

	@property
	def fieldnames(self) -> list[str]:
		return [field.fieldname for field in CollectionSchema(self.doctype).fields]

	@property
	def writable_fieldnames(self) -> list[str]:
		fields = CollectionSchema(self.doctype).fields
		return [
			field.fieldname for field in fields if not field.read_only and field.fieldtype in EDITABLE_TYPES
		]

	def get_list(self, start: int = 0) -> list[dict]:
		"""Each entry has `title`, `slug`, and `published` under those names, whatever the mapping calls them."""
		fields = ["name", "modified", self.collection.slug_field]
		if self.collection.published_field:
			fields.append(self.collection.published_field)
		if "title" in self.fieldnames:
			fields.append("title")
		rows = frappe.get_list(
			self.doctype,
			fields=list(dict.fromkeys(fields)),
			order_by="modified desc",
			start=start,
			page_length=100,
		)
		return [self.describe(row) for row in rows]

	def describe(self, row: dict) -> dict:
		slug = row.get(self.collection.slug_field)
		published_field = self.collection.published_field
		return {
			**row,
			"title": row.get("title") or slug or row.get("name"),
			"slug": slug,
			"published": row.get(published_field) if published_field else 1,
		}

	def get_rows(self, fieldnames: list[str], start: int = 0) -> list[dict]:
		unknown = set(fieldnames) - set(self.fieldnames)
		if unknown:
			frappe.throw(_("{0} has no fields {1}.").format(self.doctype, ", ".join(sorted(unknown))))
		return frappe.get_list(
			self.doctype, fields=["name", *fieldnames], order_by="modified desc", start=start, page_length=200
		)

	def get(self, name: str) -> dict:
		document = frappe.get_doc(self.doctype, name)
		document.check_permission("read")
		return self.read(document)

	def read(self, document) -> dict:
		return {fieldname: document.get(fieldname) for fieldname in ["name", "modified", *self.fieldnames]}

	def save(self, entry: dict) -> dict:
		"""Inserts an entry with no name. With a name, it changes only the fields the entry holds."""
		name = entry.get("name")
		document = frappe.get_doc(self.doctype, name) if name else frappe.new_doc(self.doctype)
		document.update({key: entry[key] for key in self.writable_fieldnames if key in entry})
		if not self.collection.is_mapped and not document.slug:
			document.slug = slugify(document.title or "")
		document.save()
		return self.read(document)

	def delete(self, name: str) -> None:
		if self.collection.is_mapped:
			frappe.throw(_("Delete the entries of an existing DocType in Desk."))
		frappe.delete_doc(self.doctype, name)

	def get_newest_published(self) -> dict | None:
		published_field = self.collection.published_field
		rows = frappe.get_list(
			self.doctype,
			fields=[self.collection.slug_field],
			filters={published_field: 1} if published_field else {},
			order_by="creation desc",
			page_length=1,
		)
		return {"slug": rows[0][self.collection.slug_field]} if rows else None
