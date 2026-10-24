<template>
	<Dialog v-model:open="open" size="lg" :title="TITLES[step]" :dismissible="!isRunning">
		<div v-if="step === 'source'" class="flex flex-col gap-4">
			<RadioGroup v-model="source" padded>
				<Radio
					value="new"
					label="Create a new page"
					:description="`A draft page at /${collection.collectionPageRoute}, with the collection's fields.`" />
				<Radio
					value="existing"
					label="Use an existing page"
					description="A page you designed moves to this URL and shows each entry." />
			</RadioGroup>
			<div v-if="isNew && moveLines.length" class="flex flex-col gap-1">
				<p v-for="line in moveLines" :key="line" class="cms-hint">{{ line }}</p>
			</div>
		</div>
		<div v-else-if="step === 'content'" class="flex flex-col gap-4">
			<Combobox v-model="pageName" label="Page" :options="pageOptions" placeholder="Choose a page…">
				<!-- the list grows to its widest row, so the title and the route each stop short of the field's width -->
				<template #item-label="{ item }">
					<span class="block max-w-[calc(var(--reka-combobox-trigger-width)_-_14rem)] truncate">
						{{ item.label }}
					</span>
				</template>
				<template #item-suffix="{ item }">
					<span class="block max-w-40 truncate text-sm text-ink-gray-5">{{ item.route }}</span>
				</template>
			</Combobox>
			<div class="flex flex-col gap-1.5">
				<FormLabel label="Content" />
				<TabButtons v-model="content" :options="CONTENT_OPTIONS" />
			</div>
			<div v-if="content === 'fields'" class="flex flex-col gap-1.5">
				<FormLabel label="Fields" />
				<MultiSelect v-model="chosen" class="w-full" :options="fieldOptions" placeholder="Choose fields…" />
			</div>
			<p v-else class="cms-hint">
				Binds each block whose name or text matches a field, such as a heading "Title".
			</p>
			<div v-if="moveLines.length" class="flex flex-col gap-1">
				<p v-for="line in moveLines" :key="line" class="cms-hint">{{ line }}</p>
			</div>
		</div>
		<p v-if="error" role="alert" class="cms-error mt-3">{{ error }}</p>
		<template #actions="{ close }">
			<div class="flex w-full justify-between gap-2">
				<Button v-if="step === 'content'" label="Back" :disabled="isRunning" @click="step = 'source'" />
				<span v-else />
				<div class="flex gap-2">
					<Button label="Cancel" :disabled="isRunning" @click="close" />
					<Button
						variant="solid"
						:label="primaryLabel"
						:disabled="!canContinue"
						:loading="isRunning"
						@click="next" />
				</div>
			</div>
		</template>
	</Dialog>
</template>

<script setup>
import { Button, Combobox, Dialog, FormLabel, MultiSelect, Radio, RadioGroup, TabButtons } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { createCollectionPage, getCollectionPageChange, useCollectionPage } from "../../cms/pageActions.js";
import { getDocuments } from "../../data/documents.js";
import { useEditorContext } from "../../editor/context.js";
import { useTask } from "../useTask.js";

const TITLES = { source: "Set up the collection page", content: "Choose the page and its content" };
const CONTENT_OPTIONS = [
	{ label: "Insert fields", value: "fields" },
	{ label: "Match blocks", value: "guess" },
];
const props = defineProps({ collection: { type: Object, required: true } });
/** `done` gets how many blocks a guess bound, and whether it was a guess. */
const emit = defineEmits(["done"]);
const open = defineModel("open", { type: Boolean, default: false });
const context = useEditorContext();
const { isRunning, error, run } = useTask();
const step = ref("source");
const source = ref("new");
const pages = shallowRef([]);
const pageName = ref("");
const content = ref("fields");
const fields = shallowRef([]);
const chosen = ref([]);
// the route and the pages on it now, read when the dialog opens
const change = shallowRef(null);

const isNew = computed(() => source.value === "new");
const primaryLabel = computed(() => {
	if (isNew.value) return "Create page";
	return step.value === "content" ? "Use page" : "Continue";
});
const chosenPage = computed(() => (isNew.value ? null : pages.value.find((each) => each.name === pageName.value)));
/** The chosen page, and each other page on the route: where each moves. */
const moveLines = computed(() => {
	if (!change.value) return [];
	const { route, moves } = change.value;
	const page = chosenPage.value;
	return [
		...(page && page.route !== route ? [`"${page.page_title}" moves to /${route}.`] : []),
		...moves.filter((move) => move.name !== page?.name).map((move) => `"${move.title}" moves to /${move.route}.`),
	];
});
const canContinue = computed(
	() => step.value !== "content" || (pageName.value && (content.value === "guess" || chosen.value.length)),
);
const pageOptions = computed(() =>
	pages.value.map((each) => ({ label: each.page_title, route: `/${each.route}`, value: each.name })),
);
const fieldOptions = computed(() =>
	fields.value.map((field) => ({ label: field.label || field.fieldname, value: field.fieldname })),
);

watch(open, (isOpen) => {
	if (!isOpen) return;
	step.value = "source";
	source.value = "new";
	change.value = null;
	error.value = "";
	run(async () => (change.value = await getCollectionPageChange(props.collection, null)));
});

const finish = async (action, isGuess = false) => {
	const done = await run(async () => ({ bound: await action() }), "Collection page set");
	if (!done) return;
	open.value = false;
	emit("done", { bound: done.bound, isGuess });
};

const loadPages = async () => {
	const [list, all] = await Promise.all([
		getDocuments("Builder Page", {
			fields: ["name", "page_title", "route"],
			orderBy: "modified desc",
			pageLength: 500,
		}),
		props.collection.getFields(),
	]);
	pages.value = list;
	fields.value = all.filter((field) => field.fieldtype !== "Check");
	chosen.value = props.collection.getDisplayFields(all).map((field) => field.fieldname);
	pageName.value = context.page?.name || "";
	step.value = "content";
};

const useChosenPage = () => {
	const isGuess = content.value === "guess";
	const picked = fields.value.filter((field) => chosen.value.includes(field.fieldname));
	const options = isGuess ? { guess: true } : { fields: picked };
	return finish(() => useCollectionPage(props.collection, chosenPage.value.name, options), isGuess);
};

const next = () => {
	if (isNew.value) return finish(() => createCollectionPage(props.collection));
	return step.value === "content" ? useChosenPage() : run(loadPages);
};
</script>
