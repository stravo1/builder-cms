import { ref, shallowRef } from "vue";
import { useTask } from "../useTask.js";

/**
 * The rows of one collection, for the table. A save writes one field and puts
 * the saved row back, so the table shows what Frappe kept. A refused save
 * leaves the old value in place.
 */
export const useCollectionRows = (collection) => {
	const fields = shallowRef([]);
	const rows = ref([]);
	const { isRunning, run } = useTask();

	const reload = () =>
		run(async () => {
			fields.value = await collection.getTableFields();
			rows.value = await collection.getRows(fields.value);
		});

	const replaceRow = (saved) => {
		const index = rows.value.findIndex((row) => row.name === saved.name);
		if (index !== -1) rows.value[index] = { ...rows.value[index], ...saved };
	};

	/** A refused save bumps the row's revision. The table keys its cells by it, so they show the saved value again. */
	const saveCell = async (row, field, value) => {
		const saved = await run(() => collection.updateEntry(row.name, { [field.fieldname]: value }));
		if (saved) replaceRow(saved);
		else row.revision = (row.revision ?? 0) + 1;
	};

	const addRow = () =>
		run(async () => {
			const created = await collection.createEntry();
			rows.value = [created, ...rows.value];
		}, "Entry added");

	const deleteRow = (row) =>
		run(async () => {
			await collection.deleteEntry(row.name);
			rows.value = rows.value.filter((each) => each.name !== row.name);
		}, "Entry deleted");

	return { fields, rows, isRunning, reload, saveCell, addRow, deleteRow };
};
