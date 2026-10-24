import { expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { optimizeDeps, resolveConfig } from "vite";

it("scans the dev entry without bundling the editor's shared modules", async () => {
	const root = fileURLToPath(new URL("..", import.meta.url));
	const cacheDir = await mkdtemp(path.join(tmpdir(), "cms-sdk-deps-"));
	try {
		const config = await resolveConfig(
			{ root, configFile: path.join(root, "vite.config.js"), cacheDir, logLevel: "silent" },
			"serve",
		);
		const metadata = await optimizeDeps(config, true);
		for (const name of ["builder", "vue", "pinia", "frappe-ui"])
			expect(metadata.optimized).not.toHaveProperty(name);
	} finally {
		await rm(cacheDir, { recursive: true, force: true });
	}
}, 15000);
