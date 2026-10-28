<template>
	<div class="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-gray-2">
		<!-- three columns, like Builder's preview: the devices stay centered beside the close button -->
		<div
			class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-outline-gray-1 bg-surface-base p-2"
		>
			<div class="col-start-2 flex gap-1">
				<Button
					v-for="each in DEVICES"
					:key="each.name"
					:icon="each.icon"
					:aria-label="each.label"
					:tooltip="`${each.label} · ${each.width} × ${each.height}`"
					:variant="device === each ? 'subtle' : 'ghost'"
					@click="device = each"
				/>
			</div>
			<Button
				class="justify-self-end"
				variant="ghost"
				icon="lucide-x"
				aria-label="Close entry"
				@click="emit('close')"
			/>
		</div>
		<div
			ref="stage"
			class="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
		>
			<div v-if="!entryName" class="cms-empty"><p>Save the entry to preview it.</p></div>
			<p v-else-if="error" role="alert" class="cms-error">{{ error }}</p>
			<!-- the page lays out at the device's own width, then shrinks to fit, like the canvas -->
			<div
				v-else-if="frames.length"
				class="relative shrink-0 overflow-hidden rounded bg-white shadow-sm"
				:style="{
					width: `${device.width * scale}px`,
					height: `${device.height * scale}px`,
				}"
			>
				<!-- a newer frame loads hidden behind the shown one, so a save does not flash -->
				<iframe
					v-for="frame in frames"
					:key="frame.id"
					title="Entry preview"
					class="absolute left-0 top-0 origin-top-left border-0"
					:class="{ invisible: frame !== frames[0] }"
					:src="frame.url"
					:style="{
						width: `${device.width}px`,
						height: `${device.height}px`,
						transform: `scale(${scale})`,
					}"
					@load="(event) => showLoaded(frame, event.target)"
				/>
			</div>
		</div>
	</div>
</template>

<script setup>
import { Button } from "frappe-ui";
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from "vue";
import { useTask } from "../useTask.js";

// the widths of Builder's canvas and preview, at a laptop's 16:10, a tablet's 3:4 and a phone's ratio
const DEVICES = [
	{ name: "desktop", label: "Desktop", icon: "lucide-monitor", width: 1400, height: 875 },
	{ name: "tablet", label: "Tablet", icon: "lucide-tablet", width: 800, height: 1066 },
	{ name: "mobile", label: "Mobile", icon: "lucide-smartphone", width: 420, height: 900 },
];

/** The collection page showing the entry's saved values. A new revision reads them again. */
const props = defineProps({
	collection: { type: Object, required: true },
	entryName: { type: String, default: "" },
	revision: { type: Number, default: 0 },
});
const emit = defineEmits(["close"]);
const { error, run } = useTask();
/** The shown frame first, then the frames still loading. */
const frames = shallowRef([]);
let frameCount = 0;
const device = shallowRef(DEVICES[0]);
const stage = ref(null);
const stageSize = reactive({ width: 0, height: 0 });
// fits the whole screen of the device in the stage, and never enlarges it
const scale = computed(
	() =>
		Math.min(
			1,
			stageSize.width / device.value.width,
			stageSize.height / device.value.height
		) || 1
);

const observer = new ResizeObserver(([entry]) => {
	stageSize.width = entry.contentRect.width;
	stageSize.height = entry.contentRect.height;
});
onMounted(() => observer.observe(stage.value));
onBeforeUnmount(() => observer.disconnect());

watch(
	() => [props.entryName, props.revision],
	([entryName]) =>
		run(async () => {
			if (!entryName) return (frames.value = []);
			const entry = await props.collection.getEntry(entryName);
			const colorScheme =
				document.documentElement.dataset.theme === "dark" ? "dark" : "light";
			const url = props.collection.getPreviewUrl(
				entry[props.collection.slugField],
				colorScheme
			);
			frames.value = [...frames.value, { id: ++frameCount, url }];
		}),
	{ immediate: true }
);

/** A loaded frame takes the shown one's scroll and its place. Frames newer than it keep loading. */
const showLoaded = (frame, element) => {
	const shown = frames.value[0];
	frame.element = element;
	if (frame === shown) return;
	element.contentWindow.scrollTo(0, shown.element?.contentWindow.scrollY ?? 0);
	frames.value = frames.value.slice(frames.value.indexOf(frame));
};
</script>
