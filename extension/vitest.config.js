import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [Icons({ compiler: "vue3" }), vue()],
	resolve: {
		alias: [
			{
				find: /^builder$/,
				replacement: fileURLToPath(new URL("./tests/fixtures/builder.js", import.meta.url)),
			},
			{
				find: "builder/internal/router",
				replacement: fileURLToPath(new URL("./tests/fixtures/router.js", import.meta.url)),
			},
		],
	},
	test: {
		include: ["tests/**/*.test.js"],
		setupFiles: ["./tests/setup.js"],
		testTransformMode: { web: ["**/tests/tableCheckbox.test.js"] },
	},
});
