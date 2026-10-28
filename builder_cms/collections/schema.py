"""The DocType that holds the entries of one collection.

A collection DocType is custom, so it lives in the database only, and it is in
the CMS module. The app makes it on the user's behalf, so a user needs no
permission on DocType itself.
"""

import re
import unicodedata

import frappe
from frappe import _
from frappe.model import no_value_fields
from frappe.utils import get_table_name

MODULE = "CMS"
PREFIX = "CMS "
SETTINGS_DOCTYPE = "CMS Collection"

# the page bindings and the entry route need these
STANDARD_FIELDS = (
	{"fieldname": "title", "label": "Title", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
	{"fieldname": "slug", "label": "Slug", "fieldtype": "Data", "unique": 1},
	{"fieldname": "published", "label": "Published", "fieldtype": "Check", "default": "0", "in_list_view": 1},
)
STANDARD_FIELDNAMES = frozenset(field["fieldname"] for field in STANDARD_FIELDS)

# one access flag for now. Separate read, write, create, and delete can come later
FULL_ACCESS = {"read": 1, "write": 1, "create": 1, "delete": 1}

# a Reference is a Link to a collection. A Multi-reference is a Table MultiSelect of such Links
REFERENCE_TYPES = frozenset({"Link", "Table MultiSelect"})
FIELD_TYPES = frozenset(
	{"Data", "Small Text", "Text Editor", "Attach Image", "Date", "Int", "Check", *REFERENCE_TYPES}
)

# a page renders every field it binds to any visitor, so these are never offered
SECRET_FIELDNAME = re.compile(r"password|secret|token|api_key|_key$")


def slugify(text: str, separator: str = "-") -> str:
	"""`Café Menu!` becomes `cafe-menu`. Accents go, and any other character is a separator."""
	text = unicodedata.normalize("NFKD", text.lower())
	text = "".join(character for character in text if not unicodedata.combining(character))
	return re.sub(r"[^a-z0-9]+", separator, text).strip(separator)


def make_fieldname(label: str) -> str:
	return slugify(label, "_")


def is_secret_field(field) -> bool:
	return field.fieldtype == "Password" or bool(SECRET_FIELDNAME.search(field.fieldname))


def has_value(field) -> bool:
	"""A multi-reference has no column, but it holds the entries it links to."""
	return field.fieldtype == "Table MultiSelect" or field.fieldtype not in no_value_fields


def drop_doctype(doctype: str) -> None:
	"""Removes a DocType and drops its table. Frappe keeps the table of a custom DocType by itself."""
	frappe.delete_doc("DocType", doctype, ignore_permissions=True)
	frappe.db.sql_ddl(f"DROP TABLE IF EXISTS `{get_table_name(doctype)}`")


class CollectionSchema:
	def __init__(self, doctype: str):
		self.doctype = doctype

	@property
	def fields(self) -> list:
		"""The fields that hold a value and that are safe to publish."""
		meta = frappe.get_meta(self.doctype)
		return [
			field
			for field in meta.fields
			if field.fieldname and has_value(field) and not is_secret_field(field)
		]

	@property
	def reference_tables(self) -> list[str]:
		"""The child DocTypes of the multi-references."""
		return [
			field.options
			for field in frappe.get_meta(self.doctype).fields
			if field.fieldtype == "Table MultiSelect"
		]

	def create(self, fields: list[dict], roles: list[str]) -> None:
		"""`fields` are read already, by `read_new_fields`."""
		self.make_reference_tables(fields)
		frappe.get_doc(
			{
				"doctype": "DocType",
				"name": self.doctype,
				"module": MODULE,
				"custom": 1,
				"naming_rule": "Random",
				"autoname": "hash",
				"fields": [*STANDARD_FIELDS, *fields],
				"permissions": [{"role": role, **FULL_ACCESS} for role in roles],
			}
		).insert(ignore_permissions=True)

	def add_fields(self, fields: list[dict]) -> None:
		document = frappe.get_doc("DocType", self.doctype)
		taken = [row.fieldname for row in document.fields]
		rows = self.read_new_fields(fields, taken)
		self.make_reference_tables(rows)
		for row in rows:
			document.append("fields", row)
		document.save(ignore_permissions=True)

	def remove_field(self, fieldname: str) -> None:
		"""Removes the field and drops its column, with the data in it."""
		if fieldname in STANDARD_FIELDNAMES:
			frappe.throw(_("The collection needs the field {0}.").format(fieldname))
		document = frappe.get_doc("DocType", self.doctype)
		row = next((row for row in document.fields if row.fieldname == fieldname), None)
		if not row:
			frappe.throw(_("{0} has no field {1}.").format(self.doctype, fieldname))
		document.remove(row)
		document.save(ignore_permissions=True)
		if row.fieldtype == "Table MultiSelect":
			drop_doctype(row.options)
		elif frappe.db.has_column(self.doctype, fieldname):
			frappe.db.drop_columns(self.doctype, [fieldname])

	def set_roles(self, roles: list[str]) -> None:
		"""Writes only when the roles differ, so a sync with no change saves nothing."""
		document = frappe.get_doc("DocType", self.doctype)
		if sorted(row.role for row in document.permissions) == sorted(roles):
			return
		document.permissions = []
		for role in roles:
			document.append("permissions", {"role": role, **FULL_ACCESS})
		document.save(ignore_permissions=True)

	def delete(self) -> None:
		"""Removes the DocType and the child DocTypes of its multi-references, with their tables."""
		tables = self.reference_tables
		self.assert_unreferenced(ignored=tables)
		drop_doctype(self.doctype)
		for table in tables:
			drop_doctype(table)

	def assert_unreferenced(self, ignored: list[str]) -> None:
		"""A Link to a dropped DocType breaks each save of the DocType that holds it."""
		holders = frappe.get_all(
			"DocField",
			filters={
				"fieldtype": "Link",
				"options": self.doctype,
				"parent": ["not in", [self.doctype, *ignored]],
			},
			pluck="parent",
			distinct=True,
		)
		if holders:
			frappe.throw(_("Remove the fields that link to it first, in {0}.").format(", ".join(holders)))

	def make_reference_tables(self, rows: list[dict]) -> None:
		"""A new multi-reference names the collection it links to, until its child DocType is made."""
		for row in rows:
			if row["fieldtype"] == "Table MultiSelect":
				row["options"] = self.make_reference_table(row["fieldname"], row["options"])

	def make_reference_table(self, fieldname: str, links_to: str) -> str:
		"""Makes the child DocType, such as `CMS Blog Post Tags`, with one Link."""
		name = f"{self.doctype} {fieldname.replace('_', ' ').title()}"
		if frappe.db.exists("DocType", name):
			frappe.throw(_("A DocType called {0} already exists.").format(name))
		link = {"fieldname": "entry", "label": "Entry", "fieldtype": "Link", "options": links_to, "reqd": 1}
		frappe.get_doc(
			{
				"doctype": "DocType",
				"name": name,
				"module": MODULE,
				"custom": 1,
				"istable": 1,
				"fields": [{**link, "in_list_view": 1}],
			}
		).insert(ignore_permissions=True)
		return name

	def read_new_fields(self, fields: list[dict], taken) -> list[dict]:
		taken = {"name", *STANDARD_FIELDNAMES, *taken}
		rows = []
		for field in fields:
			row = self.read_new_field(field, taken)
			taken.add(row["fieldname"])
			rows.append(row)
		return rows

	def read_new_field(self, field: dict, taken: set) -> dict:
		label = (field.get("label") or "").strip()
		fieldname = make_fieldname(label)
		if not fieldname or fieldname in taken:
			frappe.throw(_('Pick another name for the field "{0}".').format(label))
		if field.get("fieldtype") not in FIELD_TYPES:
			frappe.throw(_("A collection cannot have a field of type {0}.").format(field.get("fieldtype")))
		row = {"label": label, "fieldname": fieldname, "fieldtype": field["fieldtype"]}
		if row["fieldtype"] in REFERENCE_TYPES:
			row["options"] = self.read_links_to(field.get("options"), label)
		return row

	def read_links_to(self, collection: str | None, label: str) -> str:
		if not collection or not frappe.db.exists(SETTINGS_DOCTYPE, {"collection": collection}):
			frappe.throw(_('Pick the collection that "{0}" links to.').format(label))
		return collection
