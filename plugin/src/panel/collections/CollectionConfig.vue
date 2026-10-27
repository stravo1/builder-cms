<template>
	<div class="flex flex-col gap-5 px-3 py-6 [container-type:inline-size]">
		<div class="cms-settings-grid">
			<div v-if="access.can_manage" class="flex flex-col gap-5 [grid-area:content]">
				<section v-if="collection.isOwned" class="flex flex-col gap-1">
					<div class="flex items-center gap-2">
						<span class="cms-section-label mr-auto">Fields</span>
						<!-- only once a new field has a name, so a collection with nothing to save shows no button -->
						<Button
							v-if="hasNewFields"
							type="submit"
							form="cms-new-fields"
							variant="ghost"
							size="sm"
							icon="lucide-check"
							label="Save fields"
							tooltip="Save fields"
							:loading="isRunning"
						/>
						<Button
							variant="ghost"
							size="sm"
							icon="lucide-plus"
							label="Add field"
							@click="newFields.unshift(blankField())"
						/>
					</div>
					<!-- new rows go at the top, where the + button is -->
					<form
						id="cms-new-fields"
						class="flex flex-col gap-2"
						@submit.prevent="addFields"
					>
						<FieldRows v-model="newFields" />
					</form>
					<FieldList
						:fields="collectionFields"
						removable
						:disabled="isRunning"
						@remove="removeField"
					/>
				</section>
				<section v-if="!collection.isOwned" class="flex flex-col gap-1">
					<div class="flex items-center justify-between gap-2">
						<span class="cms-section-label">{{ collection.doctype }}</span>
						<Button
							variant="ghost"
							size="sm"
							icon="lucide-external-link"
							tooltip="Open in Desk"
							aria-label="Open in Desk"
							@click="openUrl(collection.getDeskUrl())"
						/>
					</div>
					<div class="flex h-7 items-center justify-between gap-2 text-sm">
						<span class="text-ink-gray-8">Slug field</span>
						<span class="truncate text-ink-gray-5">{{ collection.slugField }}</span>
					</div>
					<div class="flex h-7 items-center justify-between gap-2 text-sm">
						<span class="text-ink-gray-8">Published field</span>
						<span class="truncate text-ink-gray-5">{{
							collection.publishedField || "None"
						}}</span>
					</div>
					<p v-if="!collection.publishedField" class="cms-hint">
						All entries are public.
					</p>
				</section>
			</div>
			<div class="flex flex-col gap-5 [grid-area:pages]">
				<form
					v-if="access.can_manage"
					class="flex flex-col gap-1.5"
					@submit.prevent="saveUrl"
				>
					<FormLabel label="URL" />
					<div class="flex gap-2">
						<FormControl v-model="url" class="flex-1" aria-label="URL" />
						<Button
							type="submit"
							variant="subtle"
							icon="lucide-check"
							aria-label="Save URL"
							tooltip="Save URL"
							:disabled="normalizeUrl(url || '/') === collection.url"
							:loading="isRunning"
						/>
					</div>
					<p class="cms-hint">Entries live at {{ normalizeUrl(url || "/") }}/:slug.</p>
				</form>
				<CollectionPageSetup
					:collection="collection"
					@open="(name) => emit('open', name)"
				/>
			</div>
			<div v-if="access.can_manage" class="flex flex-col gap-5 [grid-area:admin]">
				<section
					v-if="collection.isOwned && access.is_manager"
					class="border-t border-outline-gray-1 pt-4"
				>
					<RoleAccess
						:saved="collection.roles"
						:on-save="saveRoles"
						hint="Extra roles that can edit its entries. CMS roles always can."
					/>
				</section>
				<section class="flex flex-col gap-2 border-t border-outline-gray-1 pt-4">
					<span class="cms-section-label">
						{{ collection.isOwned ? "Delete collection" : "Disconnect DocType" }}
					</span>
					<p class="cms-hint">
						{{
							collection.isOwned
								? "Its entries cannot be restored. Blocks that show them go empty."
								: `${collection.doctype} and its records stay. Blocks that show them go empty.`
						}}
					</p>
					<Button
						class="self-start"
						theme="red"
						:variant="armed ? 'solid' : 'subtle'"
						:label="
							armed
								? 'Click again to confirm'
								: collection.isOwned
								? 'Delete collection'
								: 'Disconnect'
						"
						:loading="isRunning"
						@click="remove"
					/>
				</section>
			</div>
		</div>
		<p v-if="error" role="alert" class="cms-error">{{ error }}</p>
	</div>
</template>

<script setup>
import { Button, FormControl, FormLabel } from "frappe-ui";
import { computed, ref, shallowRef, watch } from "vue";
import { blankField } from "../../cms/collection.js";
import { normalizeUrl } from "../../cms/routes.js";
import { openUrl } from "../../editor/windows.js";
import { useAccess } from "../useAccess.js";
import { useArmedClick } from "../useArmedClick.js";
import { useTask } from "../useTask.js";
import RoleAccess from "../RoleAccess.vue";
import CollectionPageSetup from "./CollectionPageSetup.vue";
import FieldList from "./FieldList.vue";
import FieldRows from "./FieldRows.vue";

const props = defineProps({ collection: { type: Object, required: true } });
const emit = defineEmits(["deleted", "open"]);

const url = ref(props.collection.url);
/** The rows of the new fields form. The collection's own fields are `collectionFields`. */
const newFields = ref([]);
const collectionFields = shallowRef([]);
const { isRunning, error, run } = useTask();
const access = useAccess();

const hasNewFields = computed(() => newFields.value.some((field) => field.label.trim()));

const loadFields = () =>
	run(async () => (collectionFields.value = await props.collection.getFields()));

const removeField = async (field) => {
	await run(async () => {
		await props.collection.removeField(field.fieldname);
		return true;
	}, "Field removed");
	const fields = await props.collection.getFields();
	collectionFields.value = fields;
};

const saveRoles = async (roles) => {
	await props.collection.saveRoles(roles);
	return props.collection.roles;
};

const saveUrl = () => run(() => props.collection.changeUrl(url.value), "URL saved");

const addFields = async () => {
	const named = newFields.value.filter((field) => field.label.trim());
	const added = await run(
		async () => (await props.collection.addFields(named), true),
		"Fields added"
	);
	if (!added) return;
	newFields.value = [];
	await loadFields();
};

// the frame cannot open a confirm() dialog, so a delete takes two clicks
const { armed, confirm } = useArmedClick();
const remove = async () => {
	if (!confirm()) return;
	const message = props.collection.isOwned ? "Collection deleted" : "DocType disconnected";
	if (await run(async () => (await props.collection.delete(), true), message)) emit("deleted");
};

// access arrives after mount, and a user who cannot manage sees only the collection page
watch(
	() => access.value.can_manage,
	(canManage) => canManage && loadFields(),
	{ immediate: true }
);
</script>
