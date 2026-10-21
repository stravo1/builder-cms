import assert from "node:assert/strict";
import { chromium } from "playwright";
import { expect } from "playwright/test";

const origin = process.env.CMS_TEST_ORIGIN || "http://builder.localhost:8080";
const devServer = process.env.CMS_TEST_DEV_SERVER || "http://127.0.0.1:5173";
const pageName = process.env.CMS_TEST_PAGE;
const password = process.env.CMS_TEST_PASSWORD;
if (!pageName || !password)
	throw new Error("Set CMS_TEST_PAGE and CMS_TEST_PASSWORD. The page must be an unpublished test page.");

const browser = await chromium.launch({
	executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const page = await browser.newPage({
	viewport: { width: 1440, height: 1000 },
	colorScheme: process.env.CMS_TEST_COLOR_SCHEME || "light",
});
const errors = [];

try {
	await page.goto(`${origin}/builder`);
	await page
		.getByRole("textbox", { name: "Email", exact: true })
		.fill(process.env.CMS_TEST_USER || "Administrator");
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Continue", exact: true }).click();
	await page.waitForURL(`${origin}/builder/`);
	await page.goto(`${origin}/builder/page/${pageName}`);
	const sidebar = page.locator("div.flex.min-h-full.flex-col.items-center");
	await sidebar.getByRole("button").first().waitFor();
	page.on("pageerror", (error) => errors.push(error.message));
	const tabCount = await sidebar.getByRole("button").count();
	await page
		.locator("button")
		.filter({ has: page.locator(".lucide-plug") })
		.first()
		.click();
	await page.getByRole("button", { name: "Load dev extension", exact: true }).click();
	await page.getByPlaceholder("http://localhost:5173").fill(devServer);
	await page.getByRole("button", { name: "Load", exact: true }).click();
	await page.waitForFunction(
		(count) =>
			document.querySelector("div.flex.min-h-full.flex-col.items-center").querySelectorAll("button").length >
			count,
		tabCount,
	);
	await sidebar.getByRole("button").last().click();
	const panel = page.locator("[data-cms-panel]");
	await panel.getByRole("button", { name: "New", exact: true }).waitFor();

	const mapped = process.env.CMS_TEST_MAPPED_COLLECTION;
	if (mapped) {
		await panel.getByRole("button", { name: new RegExp(`^${mapped}`) }).click();
		await panel.getByRole("table").waitFor();
		assert.equal(await page.getByRole("dialog").count(), 0);
		assert.equal(await panel.getByRole("button", { name: "Delete", exact: true }).count(), 0);
		const input = panel.locator('input[data-variant="ghost"]:not([disabled])').first();
		await input.waitFor();
		assert.equal(
			await input.evaluate((element) => getComputedStyle(element).backgroundColor),
			"rgba(0, 0, 0, 0)",
		);
		await input.focus();
		if (process.env.CMS_TEST_COLOR_SCHEME === "dark") {
			assert.equal(await panel.locator("html").getAttribute("data-theme"), "dark");
			const background = await input.evaluate((element) => getComputedStyle(element).backgroundColor);
			assert.notEqual(background, "rgb(255, 255, 255)");
		}
		await panel.getByRole("textbox", { name: "Search entries", exact: true }).focus();
		if (process.env.CMS_TEST_PANEL_SCREENSHOT)
			await page.screenshot({ path: process.env.CMS_TEST_PANEL_SCREENSHOT });
		const complexFields = (
			process.env.CMS_TEST_COMPLEX_FIELDS ?? (mapped === "User" ? "Bio,Email Signature" : "")
		)
			.split(",")
			.map((field) => field.trim())
			.filter(Boolean);
		for (const fieldName of complexFields) {
			await panel.getByRole("button", { name: fieldName, exact: true }).first().click();
			const panelForm = panel.getByRole("form", { name: "Entry editor", exact: true });
			await expect(panelForm.getByRole("textbox", { name: fieldName, exact: true })).toBeFocused();
			assert.equal(await page.getByRole("dialog").count(), 0);
			await panelForm.getByRole("button", { name: "Cancel", exact: true }).click();
			await panel.getByRole("button", { name: "View in dialog", exact: true }).click();
			const hostDialog = page.getByRole("dialog");
			const fieldDialog = hostDialog;
			const drawer = fieldDialog.getByRole("complementary", { name: "Entry details", exact: true });
			await expect(fieldDialog.getByRole("table")).toBeVisible();
			await fieldDialog.getByRole("button", { name: fieldName, exact: true }).first().click();
			await expect(drawer.getByRole("textbox", { name: fieldName, exact: true })).toBeFocused();
			await expect(hostDialog).toHaveCount(1);
			assert.equal(await fieldDialog.getByRole("button", { name: "Delete", exact: true }).count(), 0);
			await drawer.getByRole("button", { name: "Cancel", exact: true }).click();
			await expect(drawer).toHaveCount(0);
			await page.getByRole("button", { name: "Close", exact: true }).click();
		}

		await panel.getByRole("button", { name: "View in dialog", exact: true }).click();
		const dialog = page.getByRole("dialog");
		await dialog
			.getByText("Edit the simple fields here. Open a row in Desk for the rest.", { exact: true })
			.waitFor();
		assert.equal(await dialog.getByRole("button", { name: "Delete", exact: true }).count(), 0);
		await page.getByRole("button", { name: "Close", exact: true }).click();
		await panel.getByRole("radio", { name: "Settings", exact: true }).click();
		assert.equal(await panel.getByText("Fields", { exact: true }).count(), 0);
		await panel.getByRole("button", { name: "Back", exact: true }).click();
	}

	const owned = process.env.CMS_TEST_OWNED_COLLECTION;
	if (owned) {
		await panel.getByRole("button", { name: new RegExp(`^${owned}`) }).click();
		await panel.getByRole("table").waitFor();
		const search = panel.getByRole("textbox", {
			name: "Search entries",
			exact: true,
		});
		await search.fill("__no_matching_cms_entry__");
		await panel.getByText("No entries match your search.", { exact: true }).waitFor();
		await search.fill("");
		if (process.env.CMS_TEST_EDIT_ENTRY === "1") {
			const title = panel.getByRole("textbox", { name: "Title", exact: true }).first();
			const original = await title.inputValue();
			const edited = `${original} panel check`;
			await title.fill(edited);
			const panelSave = page.waitForResponse(
				(response) => response.url().endsWith("/cms.api.entries.save_entry") && response.status() === 200,
			);
			await title.press("Enter");
			await panelSave;
			await panel.getByRole("button", { name: "View in dialog", exact: true }).click();
			const tableDialog = page.getByRole("dialog");
			const dialogTitle = tableDialog.getByRole("textbox", { name: "Title", exact: true }).first();
			await dialogTitle.waitFor();
			assert.equal(await dialogTitle.inputValue(), edited);
			await dialogTitle.fill(original);
			const dialogSave = page.waitForResponse(
				(response) => response.url().endsWith("/cms.api.entries.save_entry") && response.status() === 200,
			);
			await dialogTitle.press("Enter");
			await dialogSave;
			await page.getByRole("button", { name: "Close", exact: true }).click();
			await title.waitFor();
			await panel.getByRole("button", { name: "New entry", exact: true }).waitFor({ state: "visible" });
			await expect(title).toHaveValue(original);
		}
		await panel.getByRole("button", { name: "New entry", exact: true }).click();
		const panelEditor = panel.getByRole("form", {
			name: "Entry editor",
			exact: true,
		});
		await panelEditor.getByRole("textbox", { name: /^Title/ }).waitFor();
		assert.equal(await page.getByRole("dialog").count(), 0);
		await panelEditor.getByRole("button", { name: "Save", exact: true }).waitFor();
		await panelEditor.getByRole("textbox", { name: /^Title/ }).fill("Unsaved entry");
		await panelEditor.getByRole("button", { name: "Cancel", exact: true }).click();
		await panel.getByRole("table").waitFor();
		const original = await panel.getByRole("textbox", { name: "Title", exact: true }).first().inputValue();
		await panel.getByRole("button", { name: "Edit entry", exact: true }).first().click();
		await expect(panelEditor.getByRole("textbox", { name: /^Title/ })).toHaveValue(original);
		await panelEditor.getByRole("textbox", { name: /^Title/ }).fill(`${original} cancelled`);
		await panelEditor.getByRole("button", { name: "Cancel", exact: true }).click();
		await expect(panel.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(original);
		if (process.env.CMS_TEST_ENTRY_PANEL_SCREENSHOT) {
			await panel.getByRole("button", { name: "New entry", exact: true }).click();
			await panelEditor.getByRole("textbox", { name: /^Title/ }).waitFor();
			await page.screenshot({
				path: process.env.CMS_TEST_ENTRY_PANEL_SCREENSHOT,
			});
			await panelEditor.getByRole("button", { name: "Cancel", exact: true }).click();
		}
		await panel.getByRole("button", { name: "View in dialog", exact: true }).click();
		const hostDialog = page.getByRole("dialog");
		const dialog = hostDialog;
		await dialog.getByRole("table").waitFor();
		const tableBounds = await dialog.getByRole("table").boundingBox();
		const headerBounds = await dialog.getByRole("columnheader").last().boundingBox();
		assert.ok(
			Math.abs(tableBounds.x + tableBounds.width - headerBounds.x - headerBounds.width) <= 1,
			"Table columns must fill the available width",
		);
		if (process.env.CMS_TEST_TABLE_SCREENSHOT)
			await page.screenshot({ path: process.env.CMS_TEST_TABLE_SCREENSHOT });
		const background = (element) => {
			const context = document.createElement("canvas").getContext("2d");
			context.fillStyle = getComputedStyle(element).backgroundColor;
			context.fillRect(0, 0, 1, 1);
			return [...context.getImageData(0, 0, 1, 1).data];
		};
		const hostBackground = await hostDialog.locator(":scope > .bg-surface-elevation-2").evaluate(background);
		assert.deepEqual(await dialog.locator(".cms-dialog").evaluate(background), hostBackground);
		assert.deepEqual(await dialog.getByRole("cell").first().evaluate(background), hostBackground);
		await dialog.getByRole("button", { name: "Edit entry", exact: true }).first().click();
		const details = dialog.getByRole("complementary", {
			name: "Entry details",
			exact: true,
		});
		const table = dialog.getByRole("table");
		await expect(table).toBeVisible();
		assert.equal(await dialog.getByRole("navigation", { name: "Entries", exact: true }).count(), 0);
		await expect(table.getByRole("columnheader", { name: "Slug", exact: true })).toBeVisible();
		await expect(table.getByRole("row", { selected: true })).toHaveCount(1);
		await expect(table.getByRole("textbox", { name: "Title", exact: true }).first()).toBeDisabled();
		await expect(details).toBeVisible();
		await expect
			.poll(async () => {
				const bounds = await details.boundingBox();
				return Math.abs(bounds.x + bounds.width - tableBounds.x - tableBounds.width);
			})
			.toBeLessThanOrEqual(1);
		const drawerStyle = await details.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				borders: [
					style.borderTopWidth,
					style.borderRightWidth,
					style.borderBottomWidth,
					style.borderLeftWidth,
				],
				shadow: style.boxShadow,
				transition: style.transitionDuration,
				animation: style.animationName,
			};
		});
		assert.deepEqual(drawerStyle.borders, ["0px", "0px", "0px", "1px"]);
		assert.equal(drawerStyle.shadow, "none");
		assert.deepEqual(await details.evaluate(background), hostBackground);
		assert.equal(drawerStyle.transition, "0s");
		assert.equal(drawerStyle.animation, "none");
		for (const selector of ["form > header", "form > footer"]) {
			const borders = await details.locator(selector).evaluate((element) => {
				const style = getComputedStyle(element);
				return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth];
			});
			assert.deepEqual(borders, ["0px", "0px", "0px", "0px"]);
		}
		const drawerBounds = await details.boundingBox();
		const unchangedTable = await table.boundingBox();
		assert.ok(
			Math.abs(unchangedTable.width - tableBounds.width) <= 1,
			"Opening the drawer must not resize the table",
		);
		assert.ok(Math.abs(unchangedTable.x - tableBounds.x) <= 1, "Opening the drawer must not move the table");
		assert.ok(
			drawerBounds.x > tableBounds.x + 200,
			"The table must remain visible to the left of the drawer",
		);
		assert.ok(drawerBounds.x < unchangedTable.x + unchangedTable.width, "The drawer must overlay the table");
		await expect(details.getByRole("textbox", { name: /^Title/ })).toHaveValue(original);
		await details.getByRole("textbox", { name: /^Title/ }).fill(`${original} edited`);
		await dialog.getByRole("button", { name: "Edit entry", exact: true }).first().click();
		await expect(details.getByRole("textbox", { name: /^Title/ })).toHaveValue(`${original} edited`);
		if (process.env.CMS_TEST_EDIT_ENTRY === "1") {
			await details.getByRole("button", { name: "Save", exact: true }).click();
			await expect(details).toHaveCount(0);
			await expect(panel.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(
				`${original} edited`,
			);
			await expect(table.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(
				`${original} edited`,
			);
			await dialog.getByRole("button", { name: "Edit entry", exact: true }).first().click();
			await details.getByRole("textbox", { name: /^Title/ }).fill(original);
			await details.getByRole("button", { name: "Save", exact: true }).click();
			await expect(details).toHaveCount(0);
			await expect(table.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(original);
			await expect(panel.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(original);
			await dialog.getByRole("button", { name: "Edit entry", exact: true }).first().click();
			await expect(details.getByRole("textbox", { name: /^Title/ })).toHaveValue(original);
		}
		if (process.env.CMS_TEST_ENTRY_DIALOG_SCREENSHOT)
			await page.screenshot({
				path: process.env.CMS_TEST_ENTRY_DIALOG_SCREENSHOT,
			});
		await details.getByRole("button", { name: "Cancel", exact: true }).click();
		await expect(details).toHaveCount(0);
		await expect(table.getByRole("textbox", { name: "Title", exact: true }).first()).toBeEnabled();
		await dialog.getByRole("button", { name: "New entry", exact: true }).click();
		await expect(table).toBeVisible();
		await expect(details.getByRole("textbox", { name: /^Title/ })).toHaveValue("");
		if (process.env.CMS_TEST_EDIT_ENTRY === "1") {
			const newTitle = `CMS dialog entry ${Date.now()}`;
			await details.getByRole("textbox", { name: /^Title/ }).fill(newTitle);
			await details.getByRole("button", { name: "Save", exact: true }).click();
			await expect(details).toHaveCount(0);
			await expect(table.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(newTitle);
			await expect(panel.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(newTitle);
			const newRow = table
				.getByRole("row")
				.filter({ has: dialog.getByRole("textbox", { name: "Title", exact: true }) })
				.first();
			await newRow.getByRole("button", { name: "Delete", exact: true }).click();
			await newRow.getByRole("button", { name: "Click again to delete", exact: true }).click();
			await expect(table.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(original);
			await expect(panel.getByRole("textbox", { name: "Title", exact: true }).first()).toHaveValue(original);
		} else {
			await details.getByRole("button", { name: "Cancel", exact: true }).click();
		}
		await page.getByRole("button", { name: "Close", exact: true }).click();
		if (process.env.CMS_TEST_EDIT_ENTRY === "1") {
			const newTitle = `CMS browser entry ${Date.now()}`;
			await panel.getByRole("button", { name: "New entry", exact: true }).click();
			await panelEditor.getByRole("textbox", { name: /^Title/ }).fill(newTitle);
			await panelEditor.getByRole("button", { name: "Save", exact: true }).click();
			const title = panel.getByRole("textbox", { name: "Title", exact: true }).first();
			await expect(title).toHaveValue(newTitle);
			await panel.getByRole("button", { name: "Edit entry", exact: true }).first().click();
			await panelEditor.getByRole("textbox", { name: /^Title/ }).fill(`${newTitle} saved`);
			await panelEditor.getByRole("button", { name: "Save", exact: true }).click();
			await expect(title).toHaveValue(`${newTitle} saved`);
			const newRow = panel
				.getByRole("row")
				.filter({ has: panel.getByRole("textbox", { name: "Title", exact: true }) })
				.first();
			await newRow.getByRole("button", { name: "Delete", exact: true }).click();
			await newRow.getByRole("button", { name: "Click again to delete", exact: true }).click();
			await expect(title).toHaveValue(original);
		}
	}

	await panel.getByText("This page", { exact: true }).click();
	await panel.getByText("Page connection", { exact: true }).waitFor();
	const heading = page.locator("h3[data-block-id]").first();
	if (await heading.count()) {
		await heading.click({ force: true });
		await panel.getByText("Connect a field", { exact: true }).waitFor();
		await panel.getByRole("combobox", { name: "Block property", exact: true }).waitFor();
	}
	await page.screenshot({
		path: process.env.CMS_TEST_SCREENSHOT || "/tmp/cms-browser-check.png",
	});
	assert.deepEqual(errors, []);
	console.log(
		"CMS browser checks passed: collection navigation, entry form, mapped DocType restrictions, and persistent CMS panel during canvas selection.",
	);
} finally {
	await browser.close();
}
