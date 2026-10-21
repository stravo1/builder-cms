import vue from "@vitejs/plugin-vue";
import builderExtension from "frappe-builder-extension-sdk/vite";
import tailwindcss from "tailwindcss";
import IconsEsbuild from "unplugin-icons/esbuild";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
	css: { postcss: { plugins: [tailwindcss({ config: "./tailwind.config.js" })] } },
	plugins: [
		Icons({ compiler: "vue3" }),
		vue(),
		builderExtension({ builderUrl: "http://builder.localhost:8080" }),
	],
	optimizeDeps: {
		exclude: ["frappe-ui/editor"],
		include: ["frappe-ui > debug", "engine.io-client", "highlight.js/lib/core"],
		esbuildOptions: {
			plugins: [
				{
					name: "builder-internal-modules",
					setup(build) {
						build.onResolve({ filter: /^builder\/internal\// }, ({ path }) => ({ path, external: true }));
					},
				},
				IconsEsbuild({ compiler: "vue3" }),
			],
		},
	},
});
