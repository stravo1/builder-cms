"""Who can use the CMS, and the roles a manager grants."""

import frappe

from cms.api.collections import describe, get_collection
from cms.collections.access import (
	SETTINGS_DOCTYPE,
	assert_manager,
	get_assignable_roles,
	get_cms_roles,
	is_manager,
	set_cms_roles,
)


@frappe.whitelist()
def get_access() -> dict:
	"""What this user can do. Only a manager sees the roles."""
	access = {
		"is_manager": is_manager(),
		"can_create": bool(frappe.has_permission(SETTINGS_DOCTYPE, "create")),
		"can_manage": bool(frappe.has_permission(SETTINGS_DOCTYPE, "write")),
	}
	if access["is_manager"]:
		access.update(cms_roles=get_cms_roles(), assignable_roles=get_assignable_roles())
	return access


@frappe.whitelist(methods=["POST"])
def update_cms_roles(roles: list[str]) -> list[str]:
	set_cms_roles(roles)
	return get_cms_roles()


@frappe.whitelist(methods=["POST"])
def update_collection_roles(collection: str, roles: list[str]) -> dict:
	assert_manager()
	document = get_collection(collection)
	document.set("roles", [{"role": role} for role in dict.fromkeys(roles)])
	document.save()
	return describe(document)
