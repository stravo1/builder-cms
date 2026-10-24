/**
 * The text to show for a failure. A server error's `message` is the method and
 * exception type, so its `messages` (what `frappe.throw` said) come first.
 */
export const getErrorMessage = (cause) => {
	const messages = (cause?.messages || []).map((message) => String(message).replace(/<[^>]*>/g, ""));
	return messages.filter(Boolean).join(" ") || cause?.message || String(cause);
};
