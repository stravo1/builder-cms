import { describe, expect, it, vi } from "vitest";
import { createRenderer, h } from "vue";

vi.mock("frappe-ui", async () => ({
	Checkbox: (await import("../node_modules/frappe-ui/src/components/Checkbox/Checkbox.vue")).default,
	FormControl: { render: () => null },
	TextInput: { render: () => null },
}));

import TableCell from "../src/panel/entries/TableCell.vue";

const mountCheckbox = (value, onSave) => {
	let input;
	const renderer = createRenderer({
		createElement(tag) {
			const node = { tag, props: {}, children: [] };
			if (tag === "input") input = node;
			return node;
		},
		patchProp: (node, key, previous, next) => (node.props[key] = next),
		insert: (node, parent) => parent.children.push(node),
		createText: (text) => ({ text }),
		createComment: () => ({}),
		setText: () => {},
		setElementText: () => {},
		parentNode: () => null,
		nextSibling: () => null,
		remove: () => {},
	});
	const app = renderer.createApp({
		render: () => h(TableCell, { field: { fieldname: "published", fieldtype: "Check" }, value, onSave }),
	});
	app.mount({ children: [] });
	return { input, unmount: () => app.unmount() };
};

describe("the table's published checkbox", () => {
	it.each([0, 1])("saves exactly once when toggling from %s", (value) => {
		const onSave = vi.fn();
		const checkbox = mountCheckbox(value, onSave);
		try {
			checkbox.input.props.onChange({ target: { checked: !value } });
			expect(onSave).toHaveBeenCalledTimes(1);
			expect(onSave).toHaveBeenCalledWith(value ? 0 : 1);
		} finally {
			checkbox.unmount();
		}
	});
});
