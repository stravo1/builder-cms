<template>
	<section
		class="flex flex-col gap-3 border-t border-outline-gray-1 pt-4 first:border-t-0 first:pt-0"
	>
		<div class="flex items-start justify-between gap-2">
			<div>
				<span class="cms-section-label">Collection page</span>
				<p class="cms-hint mt-1">
					{{
						page
							? "One design, used for every entry."
							: "Select the body of a page, then choose this collection in its CMS section."
					}}
				</p>
			</div>
			<Button
				v-if="!page && access.can_manage"
				variant="subtle"
				label="Create page"
				:loading="isRunning"
				@click="create"
			/>
		</div>
		<div v-if="page" class="flex h-7 items-center gap-2 px-2">
			<span class="lucide-file-text size-4 shrink-0 text-ink-gray-6" aria-hidden="true" />
			<span class="min-w-0 flex-1 truncate text-sm text-ink-gray-8">{{
				page.page_title
			}}</span>
			<span class="max-w-40 shrink-0 truncate text-sm text-ink-gray-5"
				>/{{ page.route }}</span
			>
			<Button
				v-if="context.page?.name !== page.name"
				variant="ghost"
				size="sm"
				icon="lucide-arrow-up-right"
				tooltip="Open page"
				aria-label="Open page"
				@click="emit('open', page.name)"
			/>
		</div>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</section>
</template>

<script setup>
import { Button } from "frappe-ui";
import { shallowRef, watch } from "vue";
import { createCollectionPage } from "../../cms/pageActions.js";
import { getDocument } from "../../data/documents.js";
import { useEditorContext } from "../../editor/context.js";
import { useAccess } from "../useAccess.js";
import { useTask } from "../useTask.js";

const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["open"]);
const access = useAccess();
const context = useEditorContext();
const { isRunning, error, run } = useTask();
const page = shallowRef(null);

const load = () =>
	run(async () => {
		const name = props.collection.collectionPage;
		page.value = name ? await getDocument("Builder Page", name) : null;
	});
watch(() => props.collection.collectionPage, load, { immediate: true });

const create = () => run(() => createCollectionPage(props.collection), "Collection page created");
</script>
