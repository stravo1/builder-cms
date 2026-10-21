import frappeUIPreset from "frappe-ui/tailwind";

export default {
	presets: [frappeUIPreset],
	corePlugins: { preflight: false },
	content: ["./src/**/*.{vue,js}", "./node_modules/frappe-ui/src/molecules/editor/**/*.{vue,ts}"],
};
