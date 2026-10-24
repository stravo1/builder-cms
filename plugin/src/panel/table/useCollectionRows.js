import { ref, shallowRef } from "vue";
import { useTask } from "../useTask.js";

const ROWS_PER_PAGE = 20;

/**
 * The rows of one collection, for the table. A save writes one field and puts
 * the saved row back, so the table shows what Frappe kept. A refused save
 * leaves the old value in place.
 */
export const useCollectionRows = (collection) => {
	const fields = shallowRef([]);
	const rows = ref([]);
	const hasMore = ref(false);
	const { isRunning, error, run, runCached } = useTask();

	const readTable = async () => {
		const tableFields = await collection.getTableFields();
		return {
			fields: tableFields,
			rows: await collection.getRows(tableFields, { pageLength: ROWS_PER_PAGE }),
		};
	};

	// a copy, so an edit in this table does not change the cached rows
	const show = (table) => {
		fields.value = table.fields;
		rows.value = [...table.rows];
		hasMore.value = table.rows.length === ROWS_PER_PAGE;
	};

	const reload = () => runCached(`rows:${collection.doctype}`, readTable, show);

	const loadMore = () =>
		run(async () => {
			const loaded = await collection.getRows(fields.value, {
				start: rows.value.length,
				pageLength: ROWS_PER_PAGE,
			});
			rows.value.push(...loaded);
			hasMore.value = loaded.length === ROWS_PER_PAGE;
		});

	const replaceRow = (saved) => {
		const index = rows.value.findIndex((row) => row.name === saved.name);
		if (index !== -1) rows.value[index] = { ...rows.value[index], ...saved };
	};

	/** A refused save bumps the row's revision. The table keys its cells by it, so they show the saved value again. */
	const saveCell = async (row, field, value) => {
		const saved = await run(() =>
			collection.updateEntry(row.name, { [field.fieldname]: value }),
		);
		if (saved) replaceRow(saved);
		else row.revision = (row.revision ?? 0) + 1;
		return saved;
	};

	const deleteRow = (row) =>
		run(async () => {
			await collection.deleteEntry(row.name);
			rows.value = rows.value.filter((each) => each.name !== row.name);
		}, "Entry deleted");

	return { fields, rows, hasMore, isRunning, error, run, reload, loadMore, saveCell, deleteRow };
};
