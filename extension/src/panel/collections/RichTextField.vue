<template>
	<div class="flex flex-col gap-1.5">
		<FormLabel v-if="label" :label="label" />
		<Editor ref="editor" v-model="model" :extensions="extensions">
			<div class="overflow-hidden rounded-1 border border-outline-gray-2 bg-surface-base">
				<EditorFixedMenu :items="toolbar" class="overflow-x-auto border-b border-outline-gray-2" />
				<EditorContent
					role="textbox"
					:aria-label="label || 'Rich text'"
					aria-multiline="true"
					class="prose-sm min-h-24 max-w-none px-2 py-1.5"
				/>
			</div>
		</Editor>
	</div>
</template>

<script setup>
import { ref } from "vue";
import {
	Bold,
	BulletList,
	Editor,
	EditorContent,
	EditorFixedMenu,
	HeadingGroup,
	InsertLink,
	Italic,
	OrderedList,
	RichTextKit,
	Separator,
} from "frappe-ui/editor";
import { FormLabel } from "frappe-ui";

defineProps({ label: { type: String, default: "" } });
const model = defineModel();
const editor = ref(null);
defineExpose({ focus: () => editor.value?.editor?.commands.focus() });

const extensions = [RichTextKit];
const toolbar = [HeadingGroup, Separator, Bold, Italic, Separator, BulletList, OrderedList, InsertLink];
</script>
