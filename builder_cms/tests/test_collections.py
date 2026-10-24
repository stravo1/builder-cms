# Copyright (c) 2026, stravo1 and contributors
# For license information, please see license.txt

import frappe

from builder_cms.api.collections import (
	add_fields,
	create_collection,
	delete_collection,
	get_collections,
	get_fields,
	map_doctype,
	remove_field,
	update_collection,
)
from builder_cms.collections.access import SETTINGS_DOCTYPE
from builder_cms.collections.schema import MODULE
from builder_cms.tests.fixtures import AUTHOR, AUTHOR_ROLE, EDITOR, EDITOR_ROLE, OUTSIDER, CMSTestCase


class TestCreateCollection(CMSTestCase):
	def test_an_editor_creates_a_collection_in_the_cms_module(self):
		frappe.set_user(EDITOR)

		collection = self.make_collection([{"label": "Cover Image", "fieldtype": "Attach Image"}])

		doctype = frappe.get_doc("DocType", collection["collection"])
		self.assertEqual((doctype.module, doctype.custom), (MODULE, 1))
		fieldnames = [field.fieldname for field in doctype.fields]
		self.assertEqual(fieldnames, ["title", "slug", "published", "cover_image"])
		self.assertEqual((collection["slug_field"], collection["published_field"]), ("slug", "published"))

	def test_the_doctype_gets_the_fixed_and_cms_wide_roles(self):
		collection = self.make_collection()

		roles = self.get_doctype_roles(collection["collection"])
		self.assertTrue({"System Manager", "Website Manager", EDITOR_ROLE} <= set(roles))

	def test_a_user_without_create_permission_is_refused(self):
		frappe.set_user(OUTSIDER)

		with self.assertRaises(frappe.PermissionError):
			create_collection("Refused")

	def test_a_field_name_must_be_new(self):
		with self.assertRaises(frappe.ValidationError):
			create_collection("Clash", fields=[{"label": "Title", "fieldtype": "Data"}])

	def test_the_url_is_normalized(self):
		collection = self.make_collection()

		updated = update_collection(collection["collection"], {"url": " /Café News/ "})

		self.assertEqual(updated["url"], "/cafe-news")


class TestFields(CMSTestCase):
	def test_removing_a_field_drops_its_column(self):
		collection = self.make_collection([{"label": "Body", "fieldtype": "Text Editor"}])
		doctype = collection["collection"]

		fields = remove_field(doctype, "body")

		self.assertNotIn("body", [field["fieldname"] for field in fields])
		self.assertFalse(frappe.db.has_column(doctype, "body"))

	def test_a_standard_field_stays(self):
		collection = self.make_collection()

		with self.assertRaises(frappe.ValidationError):
			remove_field(collection["collection"], "slug")

	def test_an_author_cannot_change_fields(self):
		collection = self.make_collection(roles=(AUTHOR_ROLE,))
		frappe.set_user(AUTHOR)

		with self.assertRaises(frappe.PermissionError):
			add_fields(collection["collection"], [{"label": "Summary", "fieldtype": "Small Text"}])

	def test_get_fields_leaves_out_secrets(self):
		frappe.set_user("Administrator")
		fieldnames = [field["fieldname"] for field in get_fields(self.map_user())]

		self.assertNotIn("api_key", fieldnames)
		self.assertNotIn("new_password", fieldnames)

	def map_user(self) -> str:
		if not frappe.db.exists("CMS Collection", {"collection": "User"}):
			map_doctype("User", slug_field="name")
			self.addCleanup(self.delete_collection, "User")
		return "User"


class TestDeleteCollection(CMSTestCase):
	def test_deleting_drops_the_doctype_and_its_table(self):
		collection = self.make_collection()
		doctype = collection["collection"]

		delete_collection(doctype)

		self.assertFalse(frappe.db.exists("DocType", doctype))
		self.assertFalse(frappe.db.table_exists(doctype))

	def test_an_author_cannot_delete(self):
		collection = self.make_collection(roles=(AUTHOR_ROLE,))
		frappe.set_user(AUTHOR)

		with self.assertRaises(frappe.PermissionError):
			delete_collection(collection["collection"])


class TestCollectionPage(CMSTestCase):
	def test_deleting_the_collection_page_clears_the_setting(self):
		collection = self.make_collection()
		page = frappe.get_doc({"doctype": "Builder Page", "page_title": "Collection page"}).insert()
		update_collection(collection["collection"], {"entry_page": page.name})

		frappe.delete_doc("Builder Page", page.name)

		self.assertFalse(frappe.db.get_value(SETTINGS_DOCTYPE, collection["name"], "entry_page"))


class TestListCollections(CMSTestCase):
	def test_an_author_sees_only_their_collections(self):
		own = self.make_collection(roles=(AUTHOR_ROLE,))
		other = self.make_collection()
		frappe.set_user(AUTHOR)

		doctypes = [collection["collection"] for collection in get_collections()]

		self.assertIn(own["collection"], doctypes)
		self.assertNotIn(other["collection"], doctypes)

	def test_an_editor_sees_every_collection(self):
		collection = self.make_collection()
		frappe.set_user(EDITOR)

		self.assertIn(collection["collection"], [each["collection"] for each in get_collections()])
