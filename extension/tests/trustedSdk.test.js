import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { call, frappeRequest } from "frappe-ui";

const runtime = vi.hoisted(() => ({
	builder: null,
	page: null,
	canvas: null,
	selected: [],
	router: { push: vi.fn() },
}));
vi.mock("builder", () => ({
	useBuilderStore: () => runtime.builder,
	usePageStore: () => runtime.page,
	useCanvasStore: () => runtime.canvas,
	blockController: { getSelectedBlocks: () => runtime.selected },
}));
vi.mock("builder/internal/router", () => ({ default: runtime.router }));

import { getBlock, insertBlock } from "../src/editor/canvas.js";
import { getEditorContext, useEditorContext } from "../src/editor/context.js";
import { openPage, refreshPageData, setRouteVariables, updatePageDocument } from "../src/editor/page.js";
import { getDocuments, getMetadata, subscribeDocuments } from "../src/data/documents.js";
import { bindBlock, insertBlocks } from "../src/blocks/blockActions.js";
import { DataSource } from "../src/data/dataSource.js";
import { collectionDialog, openCollectionDialog, closeCollectionDialog } from "../src/editor/windows.js";

const block = (id) => ({
	blockId: id,
	element: "div",
	dynamicValues: [],
	canHaveChildren: () => true,
	getElement: () => "div",
	isContainer: () => true,
	isText: () => false,
	isHTML: () => false,
	isImage: () => false,
	isLink: () => false,
	isRoot: () => id === "root",
	addChild: vi.fn((tree) => tree),
});

beforeEach(() => {
	vi.clearAllMocks();
	runtime.builder = reactive({ readOnlyMode: false, realtime: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } });
	runtime.page = reactive({
		activePage: { name: "page", route: "posts", page_data_script: "data.old = 1" },
		routeVariables: {},
		setPageData: vi.fn(),
		setPage: vi.fn(),
		savingPage: false,
		waitTillPageIsSaved: vi.fn(),
	});
	const root = block("root");
	runtime.canvas = {
		activeCanvas: { getRootBlock: () => root, findBlock: (id) => (id === "root" ? root : null) },
		editingMode: "page",
	};
	runtime.selected = [];
	vi.stubGlobal("localStorage", { setItem: vi.fn() });
	closeCollectionDialog();
});

describe("trusted editor integration", () => {
	it("derives live page, read-only and selection state without a bridge", () => {
		const context = useEditorContext();
		runtime.selected.push(block("root"));
		expect(context.selection).toMatchObject({ count: 1, isRoot: true, blockId: "root" });
		runtime.builder.readOnlyMode = true;
		expect(context.readOnly).toBe(true);
		runtime.page.activePage = { name: "other" };
		expect(context.page.name).toBe("other");
		runtime.selected.push(block("second"));
		expect(getEditorContext().selection.blockId).toBeUndefined();
	});

	it("inserts native Block options with styles and source discriminators", async () => {
		const source = new DataSource({ name: "posts", fields: ["title"] });
		const tree = await insertBlocks(
			source,
			[{ fieldname: "title", label: "Title", fieldtype: "Data" }],
			"Posts",
		);
		expect(tree.baseStyles).toMatchObject({ display: "grid" });
		const descendants = (node) => [node, ...(node.children || []).flatMap(descendants)];
		for (const node of descendants(tree)) {
			expect(node.styles).toBeUndefined();
			for (const binding of node.dynamicValues || []) expect(binding.comesFrom).toBe("dataScript");
		}
	});

	it("prevents native block mutations in read-only mode", async () => {
		runtime.builder.readOnlyMode = true;
		expect(() => insertBlock("root", { element: "div" })).toThrow("read-only");
		await expect(bindBlock("root", "entry.title", "text")).rejects.toThrow("read-only");
		expect(getBlock("root").dynamicValues).toEqual([]);
	});

	it("fails clearly when a target block has disappeared", () => {
		expect(() => getBlock("removed")).toThrow("no longer exists");
	});

	it("updates the open page script without replacing canvas edits", async () => {
		call.mockResolvedValue({ name: "page" });
		runtime.page.activePage.draft_blocks = "unsaved canvas";
		await updatePageDocument("page", { page_data_script: "data.posts = []" });
		expect(call).toHaveBeenCalledWith("frappe.client.set_value", {
			doctype: "Builder Page",
			name: "page",
			fieldname: { page_data_script: "data.posts = []" },
		});
		expect(runtime.page.activePage.draft_blocks).toBe("unsaved canvas");
		expect(runtime.page.setPageData).toHaveBeenCalledWith(runtime.page.activePage);
	});

	it("waits for a pending canvas save before writing page settings", async () => {
		runtime.page.savingPage = true;
		await updatePageDocument("page", { route: "news" });
		expect(runtime.page.waitTillPageIsSaved.mock.invocationCallOrder[0]).toBeLessThan(
			call.mock.invocationCallOrder[0],
		);
		expect(runtime.page.route).toBe("news");
	});

	it("refreshes page data from the current server script", async () => {
		call.mockResolvedValue({ name: "page", route: "posts", page_data_script: "data.updated = 1" });
		await refreshPageData();
		expect(runtime.page.activePage.page_data_script).toBe("data.updated = 1");
		expect(runtime.page.setPageData).toHaveBeenCalledOnce();
	});

	it("ignores a refresh result after navigation", async () => {
		call.mockImplementationOnce(async () => {
			runtime.page.activePage = { name: "other" };
			return { name: "page", page_data_script: "old" };
		});
		await refreshPageData();
		expect(runtime.page.activePage).toEqual({ name: "other" });
		expect(runtime.page.setPageData).not.toHaveBeenCalled();
	});

	it("persists preview route variables and waits for the data refresh", async () => {
		await setRouteVariables({ slug: "first" });
		expect(localStorage.setItem).toHaveBeenCalledWith("page:routeVariables", '{"slug":"first"}');
		expect(runtime.page.setPageData).toHaveBeenCalledOnce();
	});

	it("loads a page before changing the route", async () => {
		runtime.page.setPage.mockImplementation(async (name) => {
			runtime.page.activePage = { name };
		});
		await openPage("other");
		expect(runtime.router.push).toHaveBeenCalledWith({ name: "builder", params: { pageId: "other" } });
		expect(runtime.page.setPage.mock.invocationCallOrder[0]).toBeLessThan(
			runtime.router.push.mock.invocationCallOrder[0],
		);
	});
});

describe("Frappe data integration", () => {
	it("translates list paging and ordering to Frappe parameters", async () => {
		await getDocuments("CMS Posts", {
			fields: ["name"],
			pageLength: 100,
			start: 200,
			orderBy: "modified desc",
		});
		expect(call).toHaveBeenCalledWith("frappe.client.get_list", {
			doctype: "CMS Posts",
			fields: ["name"],
			limit_page_length: 100,
			limit_start: 200,
			order_by: "modified desc",
		});
	});
	it("reads metadata from Frappe's document bundle", async () => {
		frappeRequest.mockResolvedValue({ docs: [{ doctype: "DocType", name: "CMS Posts", fields: [] }] });
		expect(await getMetadata("CMS Posts")).toMatchObject({ name: "CMS Posts", fields: [] });
	});
	it("rejects incomplete metadata instead of hiding the failure", async () => {
		frappeRequest.mockResolvedValue({ docs: [] });
		await expect(getMetadata("CMS Posts")).rejects.toThrow("Could not load fields");
	});
	it("shares a realtime room and releases it only after the last subscriber", () => {
		const first = vi.fn();
		const second = vi.fn();
		const stopFirst = subscribeDocuments("CMS Posts", first);
		const stopSecond = subscribeDocuments("CMS Posts", second);
		const realtime = runtime.builder.realtime;
		expect(realtime.emit).toHaveBeenCalledTimes(1);
		realtime.on.mock.calls[0][1]({ doctype: "Other" });
		expect(first).not.toHaveBeenCalled();
		realtime.on.mock.calls[0][1]({ doctype: "CMS Posts" });
		expect(first).toHaveBeenCalledOnce();
		stopFirst();
		expect(realtime.emit).toHaveBeenCalledTimes(1);
		stopSecond();
		stopSecond();
		expect(realtime.emit).toHaveBeenCalledTimes(2);
		expect(realtime.emit).toHaveBeenLastCalledWith("doctype_unsubscribe", "CMS Posts");
	});
});

it("resolves dialog callers when the collection dialog closes", async () => {
	const options = { props: { doctype: "CMS Posts" } };
	const closed = openCollectionDialog(options);
	expect(collectionDialog.value).toEqual(options);
	closeCollectionDialog();
	await expect(closed).resolves.toBeUndefined();
	expect(collectionDialog.value).toBeNull();
});
