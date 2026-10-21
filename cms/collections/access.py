"""Who can use the CMS.

CMS-wide roles are the DocPerms on `CMS Collection`. They create collections,
manage them, and use every collection. Collection roles are the `roles` table
of one collection, and they use that collection's entries only. The app writes
both onto each collection DocType, so Frappe enforces them everywhere.
"""

import frappe
from frappe import _
from frappe.permissions import AUTOMATIC_ROLES, setup_custom_perms

from cms.collections.schema import FULL_ACCESS

SETTINGS_DOCTYPE = "CMS Collection"

# they always have CMS-wide access, so no picker shows them
FIXED_ROLES = ("System Manager", "Website Manager")


def is_manager(user: str | None = None) -> bool:
	"""Only a manager grants roles or maps an existing DocType."""
	return bool(set(FIXED_ROLES) & set(frappe.get_roles(user)))


def assert_manager() -> None:
	if not is_manager():
		frappe.throw(_("Only a System Manager or a Website Manager can do this."), frappe.PermissionError)


def get_assignable_roles() -> list[str]:
	"""Frappe refuses custom and automatic roles on a custom DocType unless Administrator saves it."""
	return frappe.get_all(
		"Role",
		filters={"is_custom": 0, "disabled": 0, "name": ("not in", [*AUTOMATIC_ROLES, *FIXED_ROLES])},
		pluck="name",
		order_by="name asc",
	)


def assert_assignable(roles: list[str]) -> None:
	refused = sorted(set(roles) - set(get_assignable_roles()))
	if refused:
		frappe.throw(_("These roles cannot get CMS access: {0}").format(", ".join(refused)))


def get_cms_roles() -> list[str]:
	"""The CMS-wide roles besides the fixed ones. `create` is the one grant for now.

	Reads the rows, not the meta: the meta leaves out Custom DocPerm during an install or a patch.
	"""
	has_custom = frappe.db.exists("Custom DocPerm", {"parent": SETTINGS_DOCTYPE})
	roles = frappe.get_all(
		"Custom DocPerm" if has_custom else "DocPerm",
		filters={"parent": SETTINGS_DOCTYPE, "permlevel": 0, "create": 1},
		pluck="role",
	)
	return sorted({role for role in roles if role not in FIXED_ROLES})


def set_cms_roles(roles: list[str]) -> None:
	"""The Custom DocPerm hook syncs every collection after each row change."""
	assert_manager()
	assert_assignable(roles)
	setup_custom_perms(SETTINGS_DOCTYPE)
	current = set(get_cms_roles())
	for role in current - set(roles):
		remove_cms_role(role)
	for role in set(roles) - current:
		add_cms_role(role)


def add_cms_role(role: str) -> None:
	frappe.get_doc(
		{
			"doctype": "Custom DocPerm",
			"parent": SETTINGS_DOCTYPE,
			"parenttype": "DocType",
			"parentfield": "permissions",
			"role": role,
			"permlevel": 0,
			**FULL_ACCESS,
		}
	).insert(ignore_permissions=True)


def remove_cms_role(role: str) -> None:
	rows = frappe.get_all("Custom DocPerm", filters={"parent": SETTINGS_DOCTYPE, "role": role}, pluck="name")
	for name in rows:
		frappe.delete_doc("Custom DocPerm", name, ignore_permissions=True, force=True)


def get_collection_roles(collection) -> list[str]:
	"""Everyone who can use one collection's entries: fixed, CMS-wide, and its own roles."""
	own = [row.role for row in collection.roles]
	return list(dict.fromkeys([*FIXED_ROLES, *get_cms_roles(), *own]))


def sync_all_collections(doc=None, method=None) -> None:
	"""A `Custom DocPerm` hook. Desk's Role Permission Manager changes CMS-wide roles too."""
	if doc and doc.parent != SETTINGS_DOCTYPE:
		return
	for name in frappe.get_all(SETTINGS_DOCTYPE, filters={"is_mapped": 0}, pluck="name"):
		frappe.get_doc(SETTINGS_DOCTYPE, name).sync_permissions()
