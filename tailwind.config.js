import frappeUIPreset, { content as frappeUIContent } from "frappe-ui/tailwind";

export default {
	presets: [frappeUIPreset],
	content: ["./src/**/*.{vue,js}", ...frappeUIContent],
};
