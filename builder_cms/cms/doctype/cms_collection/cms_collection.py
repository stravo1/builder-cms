# Copyright (c) 2026, stravo1 and contributors
# For license information, please see license.txt

"""One collection: its settings, and the DocType that holds its entries.

Inserting a collection makes its DocType, and deleting it drops the DocType
with its entries. A mapped collection shows an existing DocType, and the CMS
never changes that DocType.
"""

import frappe
from frappe import _
from frappe.model.document import Document

from builder_cms.collections.access import (
	SETTINGS_DOCTYPE,
	assert_assignable,
	assert_manager,
	get_collection_roles,
)
from builder_cms.collections.schema import PREFIX, CollectionSchema, slugify


def normalize_url(url: str) -> str:
	"""`blog`, `/blog/`, and ` /Blog ` all become `/blog`. Each segment is a slug."""
	segments = [slugify(segment) for segment in url.split("/")]
	return "/" + "/".join(segment for segment in segments if segment)


class CMSCollection(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from builder_cms.cms.doctype.cms_collection_role.cms_collection_role import CMSCollectionRole

		collection: DF.Data | None
		entry_page: DF.Link | None
		index_page: DF.Link | None
		is_mapped: DF.Check
		label: DF.Data
		published_field: DF.Data | None
		roles: DF.Table[CMSCollectionRole]
		slug_field: DF.Data | None
		url: DF.Data | None
	# end: auto-generated types

	@property
	def schema(self) -> CollectionSchema:
		return CollectionSchema(self.collection)

	def before_insert(self):
		if self.is_mapped:
			assert_manager()
			self.validate_mapped_doctype()
		else:
			self.collection = f"{PREFIX}{(self.label or '').strip()}"
			self.slug_field, self.published_field = "slug", "published"
			if frappe.db.exists("DocType", self.collection):
				frappe.throw(_("A DocType called {0} already exists.").format(self.collection))
			# before any write, so a bad field leaves nothing behind
			self.flags.fields = self.schema.read_new_fields(self.flags.fields or [], taken=())

	def validate(self):
		self.url = normalize_url(self.url or self.label)
		if self.has_roles_changed():
			assert_manager()
			assert_assignable([row.role for row in self.roles])

	def after_insert(self):
		# after the row is in, so a refused DocType leaves no collection behind
		if not self.is_mapped:
			self.schema.create(self.flags.fields or [], get_collection_roles(self))

	def on_update(self):
		self.sync_permissions()

	def on_trash(self):
		if not self.is_mapped:
			self.schema.delete()

	def add_fields(self, fields: list[dict]) -> None:
		self.assert_owned()
		self.check_permission("write")
		self.schema.add_fields(fields)

	def remove_field(self, fieldname: str) -> None:
		self.assert_owned()
		self.check_permission("write")
		self.schema.remove_field(fieldname)

	def assert_owned(self) -> None:
		if self.is_mapped:
			frappe.throw(_("Manage the fields of an existing DocType in Desk."))

	def sync_permissions(self) -> None:
		if not self.is_mapped:
			self.schema.set_roles(get_collection_roles(self))

	def has_roles_changed(self) -> bool:
		before = self.get_doc_before_save()
		previous = sorted(row.role for row in before.roles) if before else []
		return previous != sorted(row.role for row in self.roles)

	def validate_mapped_doctype(self) -> None:
		if self.collection == SETTINGS_DOCTYPE:
			frappe.throw(_("{0} cannot be a collection.").format(self.collection))
		meta = frappe.get_meta(self.collection)
		if meta.istable or meta.issingle:
			frappe.throw(_("A child table or a Single DocType cannot be a collection."))
		if self.slug_field != "name" and not meta.has_field(self.slug_field or ""):
			frappe.throw(_("Pick the field that gives each entry its URL."))
		published = meta.get_field(self.published_field) if self.published_field else None
		if self.published_field and (not published or published.fieldtype != "Check"):
			frappe.throw(_("The published field must be a checkbox."))
