"""Collections: list, create, map, change, and delete them, and their fields.

A collection is named by its DocType, such as `CMS Blog Post`.
"""

import frappe

from cms.collections.access import SETTINGS_DOCTYPE, assert_manager
from cms.collections.schema import CollectionSchema

SETTINGS_FIELDS = (
	"name",
	"collection",
	"label",
	"url",
	"is_mapped",
	"index_page",
	"entry_page",
	"slug_field",
	"published_field",
)

# what a page connection and the settings form change. The rest is set once
CHANGEABLE_FIELDS = ("label", "url", "index_page", "entry_page")


def get_collection(collection: str):
	name = frappe.db.get_value(SETTINGS_DOCTYPE, {"collection": collection})
	if not name:
		frappe.throw(frappe._("{0} is not a collection.").format(collection), frappe.DoesNotExistError)
	return frappe.get_doc(SETTINGS_DOCTYPE, name)


def describe(collection) -> dict:
	return {
		**{field: collection.get(field) for field in SETTINGS_FIELDS},
		"roles": [row.role for row in collection.roles],
	}


@frappe.whitelist()
def get_collections() -> list[dict]:
	"""The collections whose entries this user can read."""
	names = frappe.get_all(SETTINGS_DOCTYPE, pluck="name", order_by="label asc")
	collections = [frappe.get_doc(SETTINGS_DOCTYPE, name) for name in names]
	return [describe(each) for each in collections if frappe.has_permission(each.collection, "read")]


@frappe.whitelist(methods=["POST"])
def create_collection(label: str, url: str | None = None, fields: list[dict] | None = None) -> dict:
	collection = frappe.new_doc(SETTINGS_DOCTYPE, label=label, url=url)
	collection.flags.fields = fields or []
	collection.insert()
	return describe(collection)


@frappe.whitelist(methods=["POST"])
def map_doctype(
	doctype: str,
	slug_field: str,
	label: str | None = None,
	url: str | None = None,
	published_field: str | None = None,
) -> dict:
	collection = frappe.new_doc(
		SETTINGS_DOCTYPE,
		collection=doctype,
		is_mapped=1,
		label=label or doctype,
		url=url,
		slug_field=slug_field,
		published_field=published_field,
	)
	collection.insert()
	return describe(collection)


@frappe.whitelist(methods=["POST"])
def update_collection(collection: str, values: dict) -> dict:
	document = get_collection(collection)
	document.update({key: values[key] for key in CHANGEABLE_FIELDS if key in values})
	document.save()
	return describe(document)


@frappe.whitelist(methods=["POST"])
def delete_collection(collection: str) -> None:
	frappe.delete_doc(SETTINGS_DOCTYPE, get_collection(collection).name)


@frappe.whitelist()
def get_fields(collection: str) -> list[dict]:
	"""The fields that hold a value and that are safe to publish."""
	document = get_collection(collection)
	frappe.has_permission(document.collection, "read", throw=True)
	keys = ("fieldname", "label", "fieldtype", "options", "reqd", "read_only")
	return [{key: field.get(key) for key in keys} for field in CollectionSchema(document.collection).fields]


@frappe.whitelist(methods=["POST"])
def add_fields(collection: str, fields: list[dict]) -> list[dict]:
	get_collection(collection).add_fields(fields)
	return get_fields(collection)


@frappe.whitelist(methods=["POST"])
def remove_field(collection: str, fieldname: str) -> list[dict]:
	get_collection(collection).remove_field(fieldname)
	return get_fields(collection)


@frappe.whitelist()
def get_doctype_names() -> list[str]:
	"""The DocTypes a manager can map. Child tables and Singles hold no entries of their own."""
	assert_manager()
	return frappe.get_all("DocType", filters={"istable": 0, "issingle": 0}, pluck="name", order_by="name asc")
