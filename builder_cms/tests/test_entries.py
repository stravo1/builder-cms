# Copyright (c) 2026, stravo1 and contributors
# For license information, please see license.txt

import frappe

from builder_cms.api.entries import (
	delete_entry,
	get_entries,
	get_entry,
	get_newest_published,
	get_rows,
	save_entry,
)
from builder_cms.tests.fixtures import AUTHOR, AUTHOR_ROLE, OUTSIDER, CMSTestCase


class TestEntries(CMSTestCase):
	def setUp(self):
		super().setUp()
		self.doctype = self.make_collection(
			[{"label": "Body", "fieldtype": "Text Editor"}], roles=(AUTHOR_ROLE,)
		)["collection"]

	def test_an_author_saves_an_entry_with_a_slug_from_its_title(self):
		frappe.set_user(AUTHOR)

		entry = save_entry(self.doctype, {"title": "Hello World", "body": "<p>Hi</p>"})

		self.assertEqual((entry["slug"], entry["body"]), ("hello-world", "<p>Hi</p>"))

	def test_a_change_keeps_the_fields_it_does_not_name(self):
		entry = save_entry(self.doctype, {"title": "First", "body": "Kept"})

		save_entry(self.doctype, {"name": entry["name"], "title": "Second"})

		saved = get_entry(self.doctype, entry["name"])
		self.assertEqual((saved["title"], saved["body"], saved["slug"]), ("Second", "Kept", "first"))

	def test_entries_have_one_shape(self):
		save_entry(self.doctype, {"title": "Draft"})

		[entry] = get_entries(self.doctype)

		self.assertEqual((entry["title"], entry["slug"], entry["published"]), ("Draft", "draft", 0))

	def test_newest_published_skips_drafts(self):
		save_entry(self.doctype, {"title": "Live", "published": 1})
		save_entry(self.doctype, {"title": "Draft"})

		self.assertEqual(get_newest_published(self.doctype), {"slug": "live"})

	def test_an_author_deletes_an_entry(self):
		entry = save_entry(self.doctype, {"title": "Gone"})
		frappe.set_user(AUTHOR)

		delete_entry(self.doctype, entry["name"])

		self.assertFalse(frappe.db.exists(self.doctype, entry["name"]))

	def test_rows_come_one_page_at_a_time(self):
		for title in ("One", "Two", "Three"):
			save_entry(self.doctype, {"title": title})

		first = get_rows(self.doctype, ["title"], page_length=2)
		rest = get_rows(self.doctype, ["title"], start=2, page_length=2)

		self.assertEqual([row["title"] for row in first + rest], ["Three", "Two", "One"])

	def test_a_page_larger_than_the_limit_is_refused(self):
		with self.assertRaises(frappe.ValidationError):
			get_rows(self.doctype, ["title"], page_length=500)

	def test_an_outsider_is_refused(self):
		frappe.set_user(OUTSIDER)

		with self.assertRaises(frappe.PermissionError):
			save_entry(self.doctype, {"title": "Refused"})


class TestReferenceEntries(CMSTestCase):
	def test_a_multi_reference_saves_and_reads_entry_names(self):
		tags = self.make_collection()["collection"]
		fields = [
			{"label": "Topic", "fieldtype": "Link", "options": tags},
			{"label": "Tags", "fieldtype": "Table MultiSelect", "options": tags},
		]
		posts = self.make_collection(fields)["collection"]
		news, tech = (save_entry(tags, {"title": title})["name"] for title in ("News", "Tech"))

		entry = save_entry(posts, {"title": "Hello", "topic": news, "tags": [news, tech]})

		self.assertEqual((entry["topic"], entry["tags"]), (news, [news, tech]))
		self.assertEqual(get_rows(posts, ["tags"])[0]["tags"], [news, tech])
		self.assertEqual(
			frappe.get_all(posts, filters=[["tags.entry", "=", tech]], pluck="name"), [entry["name"]]
		)
