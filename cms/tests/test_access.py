# Copyright (c) 2026, stravo1 and contributors
# For license information, please see license.txt

import frappe
from frappe.permissions import add_permission

from cms.api.access import get_access, update_cms_roles, update_collection_roles
from cms.api.collections import map_doctype
from cms.collections.access import get_cms_roles
from cms.tests.fixtures import (
	AUTHOR,
	AUTHOR_ROLE,
	EDITOR,
	EDITOR_ROLE,
	CMSTestCase,
	make_role,
)


class TestCMSRoles(CMSTestCase):
	def test_a_new_cms_role_reaches_every_collection(self):
		collection = self.make_collection()

		update_cms_roles([*get_cms_roles(), AUTHOR_ROLE])

		self.assertIn(AUTHOR_ROLE, self.get_doctype_roles(collection["collection"]))

	def test_a_removed_cms_role_leaves_every_collection(self):
		collection = self.make_collection()

		update_cms_roles([role for role in get_cms_roles() if role != EDITOR_ROLE])

		self.assertNotIn(EDITOR_ROLE, self.get_doctype_roles(collection["collection"]))

	def test_a_role_permission_manager_change_syncs_too(self):
		collection = self.make_collection()

		add_permission("CMS Collection", AUTHOR_ROLE, ptype="create")

		self.assertIn(AUTHOR_ROLE, self.get_doctype_roles(collection["collection"]))

	def test_only_a_manager_changes_cms_roles(self):
		frappe.set_user(EDITOR)

		with self.assertRaises(frappe.PermissionError):
			update_cms_roles([EDITOR_ROLE, AUTHOR_ROLE])

	def test_a_custom_role_is_refused(self):
		custom = make_role("CMS Test Custom", is_custom=1)

		with self.assertRaises(frappe.ValidationError):
			update_cms_roles([custom])

	def test_an_editor_sees_what_they_can_do_but_not_the_roles(self):
		frappe.set_user(EDITOR)

		access = get_access()

		self.assertEqual((access["can_create"], access["is_manager"]), (True, False))
		self.assertNotIn("cms_roles", access)


class TestCollectionRoles(CMSTestCase):
	def test_a_collection_role_reaches_its_doctype_only(self):
		own = self.make_collection()
		other = self.make_collection()

		update_collection_roles(own["collection"], [AUTHOR_ROLE])

		self.assertIn(AUTHOR_ROLE, self.get_doctype_roles(own["collection"]))
		self.assertNotIn(AUTHOR_ROLE, self.get_doctype_roles(other["collection"]))

	def test_an_editor_cannot_grant_collection_roles(self):
		collection = self.make_collection()
		frappe.set_user(EDITOR)

		with self.assertRaises(frappe.PermissionError):
			update_collection_roles(collection["collection"], [AUTHOR_ROLE])

	def test_an_editor_cannot_map_a_doctype(self):
		frappe.set_user(EDITOR)

		with self.assertRaises(frappe.PermissionError):
			map_doctype("ToDo", slug_field="name")

	def test_a_mapped_doctype_keeps_its_permissions(self):
		before = self.get_doctype_roles("ToDo")
		map_doctype("ToDo", slug_field="name")
		self.addCleanup(self.delete_collection, "ToDo")

		update_collection_roles("ToDo", [AUTHOR_ROLE])

		self.assertEqual(self.get_doctype_roles("ToDo"), before)
		self.assertTrue(frappe.db.exists("DocType", "ToDo"))

	def test_an_author_cannot_read_another_collection(self):
		collection = self.make_collection()
		frappe.set_user(AUTHOR)

		self.assertFalse(frappe.has_permission(collection["collection"], "read"))
