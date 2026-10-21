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

# the page bindings and the entry route need these
STANDARD_FIELDS = (
	{"fieldname": "title", "label": "Title", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
	{"fieldname": "slug", "label": "Slug", "fieldtype": "Data", "unique": 1},
	{"fieldname": "published", "label": "Published", "fieldtype": "Check", "default": "0", "in_list_view": 1},
)
STANDARD_FIELDNAMES = frozenset(field["fieldname"] for field in STANDARD_FIELDS)

# one access flag for now. Separate read, write, create, and delete can come later
FULL_ACCESS = {"read": 1, "write": 1, "create": 1, "delete": 1}

FIELD_TYPES = frozenset({"Data", "Small Text", "Text Editor", "Attach Image", "Date", "Int", "Check"})

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
			if field.fieldname and field.fieldtype not in no_value_fields and not is_secret_field(field)
		]

	def create(self, fields: list[dict], roles: list[str]) -> None:
		"""`fields` are read already, by `read_new_fields`."""
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
		for row in self.read_new_fields(fields, taken):
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
		if frappe.db.has_column(self.doctype, fieldname):
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
		"""Removes the DocType and drops its table. Frappe keeps the table by itself."""
		frappe.delete_doc("DocType", self.doctype, ignore_permissions=True)
		frappe.db.sql_ddl(f"DROP TABLE IF EXISTS `{get_table_name(self.doctype)}`")

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
		return {"label": label, "fieldname": fieldname, "fieldtype": field["fieldtype"]}
