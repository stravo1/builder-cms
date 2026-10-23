"""The entries of one collection. Frappe permissions on its DocType apply."""

import frappe

from builder_cms.api.collections import get_collection
from builder_cms.collections.entries import CollectionEntries


def get_entries_of(collection: str) -> CollectionEntries:
	return CollectionEntries(get_collection(collection))


@frappe.whitelist()
def get_entries(collection: str, start: int = 0) -> list[dict]:
	return get_entries_of(collection).get_list(start)


@frappe.whitelist()
def get_rows(collection: str, fieldnames: list[str], start: int = 0) -> list[dict]:
	return get_entries_of(collection).get_rows(fieldnames, start)


@frappe.whitelist()
def get_entry(collection: str, name: str) -> dict:
	return get_entries_of(collection).get(name)


@frappe.whitelist()
def get_newest_published(collection: str) -> dict | None:
	return get_entries_of(collection).get_newest_published()


@frappe.whitelist(methods=["POST"])
def save_entry(collection: str, entry: dict) -> dict:
	return get_entries_of(collection).save(entry)


@frappe.whitelist(methods=["POST"])
def delete_entry(collection: str, name: str) -> None:
	get_entries_of(collection).delete(name)
