import { defineComponent, h } from "vue";

// A dynamic "button" tag would resolve Builder's globally registered Button component.
export default defineComponent({
	inheritAttrs: false,
	setup(_props, { attrs, slots }) {
		return () =>
			h(
				"button",
				{
					type: "button",
					...attrs,
					disabled: attrs["data-disabled"] !== undefined,
				},
				slots.default?.(),
			);
	},
});
