# Copyright (c) 2026, stravo1 and contributors
# For license information, please see license.txt

import frappe

from builder_cms.collections.access import SETTINGS_DOCTYPE
from builder_cms.collections.schema import STANDARD_FIELDS
from builder_cms.install import ExtensionCollection, get_extension_doctypes
from builder_cms.tests.fixtures import AUTHOR_ROLE, EDITOR_ROLE, CMSTestCase


class TestAdoptExtensionCollection(CMSTestCase):
	def setUp(self):
		super().setUp()
		self.doctype = f"CMS Old {frappe.generate_hash(length=6)}"
		roles = ("System Manager", "Website Manager", EDITOR_ROLE, AUTHOR_ROLE)
		frappe.get_doc(
			{
				"doctype": "DocType",
				"name": self.doctype,
				"module": "Builder",
				"custom": 1,
				"autoname": "hash",
				"fields": list(STANDARD_FIELDS),
				"permissions": [
					{"role": role, "read": 1, "write": 1, "create": 1, "delete": 1} for role in roles
				],
			}
		).insert()
		self.addCleanup(self.delete_collection, self.doctype)

	def test_an_extension_doctype_is_found(self):
		self.assertIn(self.doctype, get_extension_doctypes())

	def test_adopting_moves_it_to_the_cms_module_and_makes_its_row(self):
		ExtensionCollection(self.doctype).adopt()

		self.assertEqual(frappe.db.get_value("DocType", self.doctype, "module"), "CMS")
		collection = frappe.get_doc(SETTINGS_DOCTYPE, {"collection": self.doctype})
		self.assertEqual(collection.label, self.doctype.removeprefix("CMS "))
		self.assertEqual((collection.slug_field, collection.is_mapped), ("slug", 0))

	def test_a_collection_keeps_only_the_roles_that_are_not_cms_wide(self):
		ExtensionCollection(self.doctype).adopt()

		collection = frappe.get_doc(SETTINGS_DOCTYPE, {"collection": self.doctype})
		self.assertEqual([row.role for row in collection.roles], [AUTHOR_ROLE])
		self.assertTrue({EDITOR_ROLE, AUTHOR_ROLE} <= set(self.get_doctype_roles(self.doctype)))
