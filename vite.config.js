/**
 * The build for this extension. See `samples/animate/README.md` for the why.
 *
 * `builderUrl` is the origin the editor is opened on. It has no default: any
 * other origin loads a second SDK instance, whose frames never connect. Change
 * it if your bench serves Builder somewhere else.
 */

import vue from "@vitejs/plugin-vue";
import path from "node:path";
import builderExtension from "frappe-builder-extension-sdk/vite";
import tailwindcss from "tailwindcss";
import IconsEsbuild from "unplugin-icons/esbuild";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: [
			// An extension builds to one file, so a font it imports becomes base64,
			// once for every @font-face rule that names it. frappe-ui's Inter
			// stylesheet names two variable fonts six times each, which is 4.5 MB.
			//
			// The frame runs inside Builder, which loads Inter already, so dropping
			// the stylesheet costs nothing on screen.
			//
			// A pattern, because `frappe-ui/style.css` imports it by relative path.
			{ find: /^.*fonts\/Inter\/inter\.css$/, replacement: path.resolve("./src/no-fonts.css") },
		],
	},
	css: { postcss: { plugins: [tailwindcss({ config: "./tailwind.config.js" })] } },
	plugins: [Icons({ compiler: "vue3" }), vue(), builderExtension({ builderUrl: "http://builder.localhost:8080" })],
	optimizeDeps: {
		// The SDK's Vue helpers must use the SDK instance that Builder's frame
		// connected. A prebundled copy carries a second instance, which never connects.
		// esbuild cannot resolve the "#molecules/..." package imports inside the
		// editor entry, so the dev server serves it as source, as Rollup does
		exclude: ["frappe-builder-extension-sdk/vue", "frappe-ui/editor"],
		// frappe-ui ships source, and several of its dependencies are CommonJS. A
		// frame importing one of those unbundled fails on a missing named export
		include: [
			"frappe-ui > debug",
			"engine.io-client",
			"highlight.js/lib/core",
		],
		esbuildOptions: { plugins: [IconsEsbuild({ compiler: "vue3" })] },
	},
});
