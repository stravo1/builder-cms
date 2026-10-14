import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.CMS_TEST_ORIGIN || "http://builder.localhost:8080";
const devServer = process.env.CMS_TEST_DEV_SERVER || "http://127.0.0.1:5173";
const pageName = process.env.CMS_TEST_PAGE;
const password = process.env.CMS_TEST_PASSWORD;
if (!pageName || !password)
	throw new Error("Set CMS_TEST_PAGE and CMS_TEST_PASSWORD. The page must be an unpublished test page.");

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];

try {
	await page.goto(`${origin}/builder`);
	await page.getByRole("textbox", { name: "Email", exact: true }).fill(process.env.CMS_TEST_USER || "Administrator");
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
			document.querySelector("div.flex.min-h-full.flex-col.items-center").querySelectorAll("button").length > count,
		tabCount,
	);
	await sidebar.getByRole("button").last().click();
	const panel = page.locator("iframe:visible").contentFrame();
	await panel.getByRole("button", { name: "New", exact: true }).waitFor();

	const mapped = process.env.CMS_TEST_MAPPED_COLLECTION;
	if (mapped) {
		await panel.getByRole("button", { name: new RegExp(`^${mapped}`) }).click();
		await panel.getByRole("button", { name: "Table view", exact: true }).click();
		const dialog = page.getByRole("dialog").locator("iframe").contentFrame();
		await dialog.getByText("Edit the simple fields here. Open a row in Desk for the rest.", { exact: true }).waitFor();
		assert.equal(await dialog.getByRole("button", { name: "Delete", exact: true }).count(), 0);
		await page.getByRole("button", { name: "Close", exact: true }).click();
		await panel.getByRole("radio", { name: "Settings", exact: true }).click();
		assert.equal(await panel.getByText("Fields", { exact: true }).count(), 0);
		await panel.getByRole("button", { name: "Back", exact: true }).click();
	}

	const owned = process.env.CMS_TEST_OWNED_COLLECTION;
	if (owned) {
		await panel.getByRole("button", { name: new RegExp(`^${owned}`) }).click();
		await panel.getByRole("button", { name: "New entry", exact: true }).click();
		const dialog = page.getByRole("dialog").locator("iframe").contentFrame();
		await dialog.getByRole("textbox", { name: /^Title/ }).waitFor();
		await dialog.getByRole("button", { name: "Create entry", exact: true }).waitFor();
		await page.getByRole("button", { name: "Close", exact: true }).click();
	}

	await panel.getByText("This page", { exact: true }).click();
	await panel.getByText("Page connection", { exact: true }).waitFor();
	const heading = page.locator("h3[data-block-id]").first();
	if (await heading.count()) {
		await heading.click({ force: true });
		await panel.getByText("Connect a field", { exact: true }).waitFor();
		await panel.getByRole("combobox", { name: "Block property", exact: true }).waitFor();
	}
	await page.screenshot({ path: process.env.CMS_TEST_SCREENSHOT || "/tmp/cms-browser-check.png" });
	assert.deepEqual(errors, []);
	console.log(
		"CMS browser checks passed: collection navigation, entry form, mapped DocType restrictions, and persistent CMS panel during canvas selection.",
	);
} finally {
	await browser.close();
}
