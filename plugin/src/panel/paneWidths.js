import { reactive } from "vue";

// outlives each view, so a collection opened next keeps the width the user dragged to
export const paneWidths = reactive({ collections: 256, entry: 448 });
