"""Adopts what the CMS extension made before this app existed.

The extension made a custom `CMS Collection` and custom `CMS <name>` DocTypes
in the Builder module, and Builder recorded the extension as their owner. The
app ships `CMS Collection` itself, owns the collection DocTypes, and moves them
to the CMS module. Every row and entry stays.
"""

import frappe

from builder_cms.collections.access import (
	FIXED_ROLES,
	SETTINGS_DOCTYPE,
	add_cms_role,
	get_assignable_roles,
	get_cms_roles,
)
from builder_cms.collections.schema import MODULE, PREFIX

EXTENSION = "stravo1/cms"
RESOURCE_TABLE = "Builder Extension Resource"


def before_install() -> None:
	"""The sync replaces only an older DocType, so the custom one goes first. Its table and rows stay."""
	if not frappe.db.get_value("DocType", SETTINGS_DOCTYPE, "custom"):
		return
	roles = get_extra_roles(SETTINGS_DOCTYPE)
	frappe.delete_doc("DocType", SETTINGS_DOCTYPE, force=True, for_reload=True, ignore_permissions=True)
	if not roles:
		return
	# Custom DocPerm replaces the shipped DocPerms, so it holds the fixed roles too
	for role in [*FIXED_ROLES, *roles]:
		add_cms_role(role)


def after_install() -> None:
	for doctype in get_extension_doctypes():
		ExtensionCollection(doctype).adopt()
	for name in frappe.get_all(
		SETTINGS_DOCTYPE, filters={"collection": ("not like", f"{PREFIX}%")}, pluck="name"
	):
		frappe.db.set_value(SETTINGS_DOCTYPE, name, "is_mapped", 1)
	forget_extension_resources()


def get_extra_roles(doctype: str) -> list[str]:
	"""Roles the extension granted, besides the fixed ones. A role Frappe refuses on a custom DocType is dropped."""
	granted = frappe.get_all("DocPerm", filters={"parent": doctype}, pluck="role")
	assignable = set(get_assignable_roles())
	return [role for role in dict.fromkeys(granted) if role in assignable]


def get_extension_doctypes() -> list[str]:
	return frappe.get_all(
		"DocType",
		filters={"custom": 1, "module": "Builder", "name": ("like", f"{PREFIX}%")},
		pluck="name",
	)


def forget_extension_resources() -> None:
	"""Builder's ownership rows would let the extension change or drop what the app owns now."""
	if frappe.db.table_exists(RESOURCE_TABLE):
		frappe.db.delete(RESOURCE_TABLE, {"extension": EXTENSION, "resource_type": "DocType"})


class ExtensionCollection:
	def __init__(self, doctype: str):
		self.doctype = doctype

	def adopt(self) -> None:
		own_roles = self.get_own_roles()
		frappe.db.set_value("DocType", self.doctype, "module", MODULE)
		frappe.clear_cache(doctype=self.doctype)
		collection = frappe.get_doc(SETTINGS_DOCTYPE, self.get_or_make_row())
		collection.label = collection.label or self.doctype.removeprefix(PREFIX)
		collection.slug_field, collection.published_field = "slug", "published"
		collection.set("roles", [{"role": role} for role in own_roles])
		collection.save()

	def get_own_roles(self) -> list[str]:
		"""The CMS-wide roles reach every collection by themselves, so a collection keeps only the rest."""
		cms_roles = get_cms_roles()
		return [role for role in get_extra_roles(self.doctype) if role not in cms_roles]

	def get_or_make_row(self) -> str:
		"""A collection made before the settings DocType existed has no row. Inserting runs no hooks, so no DocType is made."""
		name = frappe.db.get_value(SETTINGS_DOCTYPE, {"collection": self.doctype})
		if name:
			return name
		row = frappe.new_doc(
			SETTINGS_DOCTYPE, collection=self.doctype, label=self.doctype.removeprefix(PREFIX)
		)
		row.db_insert()
		return row.name
