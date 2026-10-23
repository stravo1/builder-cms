import frappeUIPreset from "frappe-ui/tailwind";

export default {
	presets: [frappeUIPreset],
	corePlugins: { preflight: false },
	content: [
		"./src/**/*.{vue,js}",
		"./node_modules/frappe-ui/src/molecules/editor/**/*.{vue,ts}",
	],
	// The editor loads this stylesheet after its own. Unscoped, a class such as `rounded-4`
	// would come later than the editor's `rounded-tr-none` and win on the editor's own buttons.
	important: "[data-cms]",
};
