"""A multi-reference field: a Table MultiSelect whose child DocType holds one Link.

The panel reads and writes its value as a list of entry names. A field the
app makes links through `entry`. A mapped DocType can name its Link anything.
"""

import frappe


class MultiReference:
	def __init__(self, field):
		self.fieldname = field.fieldname
		self.doctype = field.options

	@property
	def link_field(self):
		return next(field for field in frappe.get_meta(self.doctype).fields if field.fieldtype == "Link")

	@property
	def links_to(self) -> str:
		return self.link_field.options

	def read(self, document) -> list[str]:
		return [row.get(self.link_field.fieldname) for row in document.get(self.fieldname)]

	def to_rows(self, names: list[str] | None) -> list[dict]:
		return [{self.link_field.fieldname: name} for name in names or []]

	def to_names(self, rows: list[dict] | None) -> list[str]:
		"""The rows of a child query in `get_list`."""
		return [row[self.link_field.fieldname] for row in rows or []]

	@property
	def child_query(self) -> dict:
		return {self.fieldname: [self.link_field.fieldname]}
