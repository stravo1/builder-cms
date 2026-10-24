import { vi } from "vitest";
vi.mock("frappe-ui", () => ({
	call: vi.fn(),
	frappeRequest: vi.fn(),
	upload: vi.fn(),
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
