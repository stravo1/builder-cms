# Copyright (c) 2026, stravo1 and contributors
# For license information, please see license.txt

"""Making a collection runs DDL, and DDL commits. So each test removes what it made."""

import frappe
from frappe.tests import IntegrationTestCase

from cms.api.collections import create_collection
from cms.collections.access import SETTINGS_DOCTYPE, get_cms_roles, set_cms_roles
from cms.collections.schema import CollectionSchema

EDITOR_ROLE = "CMS Test Editor"
AUTHOR_ROLE = "CMS Test Author"
EDITOR = "cms-editor@example.com"
AUTHOR = "cms-author@example.com"
OUTSIDER = "cms-outsider@example.com"


def make_role(name: str, is_custom: int = 0) -> str:
	if not frappe.db.exists("Role", name):
		frappe.get_doc({"doctype": "Role", "role_name": name, "is_custom": is_custom}).insert()
	return name


def make_user(email: str, roles: tuple[str, ...] = ()) -> str:
	if not frappe.db.exists("User", email):
		frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": email.split("@")[0],
				"send_welcome_email": 0,
				"roles": [{"role": role} for role in roles],
			}
		).insert(ignore_permissions=True)
	return email


class CMSTestCase(IntegrationTestCase):
	"""An editor has CMS-wide access. An author gets one collection at a time. An outsider has neither."""

	def setUp(self):
		make_role(EDITOR_ROLE)
		make_role(AUTHOR_ROLE)
		make_user(EDITOR, (EDITOR_ROLE,))
		make_user(AUTHOR, (AUTHOR_ROLE,))
		make_user(OUTSIDER, ("Blogger",))
		self.addCleanup(frappe.set_user, "Administrator")
		self.restore_cms_roles(get_cms_roles())
		set_cms_roles([*get_cms_roles(), EDITOR_ROLE])

	def restore_cms_roles(self, roles: list[str]) -> None:
		def restore():
			frappe.set_user("Administrator")
			set_cms_roles(roles)
			frappe.db.commit()

		self.addCleanup(restore)

	def make_collection(self, fields: list[dict] | None = None, roles: tuple[str, ...] = ()) -> dict:
		label = f"Test {frappe.generate_hash(length=6)}"
		collection = create_collection(label, fields=fields)
		self.addCleanup(self.delete_collection, collection["collection"])
		if roles:
			document = frappe.get_doc(SETTINGS_DOCTYPE, collection["name"])
			document.set("roles", [{"role": role} for role in roles])
			document.save()
		return collection

	def delete_collection(self, doctype: str) -> None:
		frappe.set_user("Administrator")
		name = frappe.db.get_value(SETTINGS_DOCTYPE, {"collection": doctype})
		if name:
			frappe.delete_doc(SETTINGS_DOCTYPE, name)
		elif frappe.db.exists("DocType", doctype):
			CollectionSchema(doctype).delete()
		frappe.db.commit()

	def get_doctype_roles(self, doctype: str) -> list[str]:
		return sorted(frappe.get_all("DocPerm", filters={"parent": doctype}, pluck="role"))
