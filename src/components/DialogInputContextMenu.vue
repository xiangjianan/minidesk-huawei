<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import ContextMenu from "./ContextMenu.vue";
import { renderIcon, CopyActionIcon as CopyOutline, PasteActionIcon as ClipboardOutline } from "../utils/dropdownIcons";
import { copyTextToClipboard, readClipboardText } from "../utils/clipboard";
import { createExclusiveContextMenu } from "../utils/contextMenu";

const props = defineProps<{ copyLabel: string; pasteLabel: string }>();
type Field = HTMLInputElement | HTMLTextAreaElement;
type Menu = { x: number; y: number; field: Field; start: number; end: number; value: string };
const menu = ref<Menu | null>(null);
const exclusiveMenu = createExclusiveContextMenu(() => { menu.value = null; });
const options = computed(() => [
  { key: "copy", label: props.copyLabel, icon: renderIcon(CopyOutline), disabled: !menu.value || menu.value.start === menu.value.end || (menu.value.field instanceof HTMLInputElement && menu.value.field.type === "password") },
  { key: "paste", label: props.pasteLabel, icon: renderIcon(ClipboardOutline), disabled: !menu.value || menu.value.field.readOnly || menu.value.field.disabled || !navigator.clipboard?.readText },
]);

function open(event: MouseEvent): void {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || !field.closest(".n-modal, [role='dialog']")) return;
  if (field instanceof HTMLInputElement && !["text", "search", "url", "tel", "password"].includes(field.type)) return;
  event.preventDefault();
  event.stopPropagation();
  exclusiveMenu.notifyOpen(event);
  menu.value = { x: event.clientX, y: event.clientY, field, start: field.selectionStart ?? 0, end: field.selectionEnd ?? 0, value: field.value };
}

async function select(key: string): Promise<void> {
  const current = menu.value;
  menu.value = null;
  if (!current) return;
  const { field, start, end, value } = current;
  if (key === "copy") {
    await copyTextToClipboard(value.slice(start, end));
    if (field.isConnected) { field.focus(); field.setSelectionRange(start, end); }
  } else if (key === "paste" && !field.readOnly && !field.disabled) {
    const text = await readClipboardText();
    if (text === undefined || !field.isConnected || field.value !== value) return;
    const max = field.maxLength;
    const inserted = max >= 0 ? text.slice(0, Math.max(0, max - (value.length - (end - start)))) : text;
    field.focus();
    field.setRangeText(inserted, start, end, "end");
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
function closeOnEscape(event: KeyboardEvent): void {
  if (event.key === "Escape" && menu.value) { event.stopPropagation(); menu.value = null; }
}
onMounted(() => {
  exclusiveMenu.mount();
  document.addEventListener("contextmenu", open, true);
  document.addEventListener("keydown", closeOnEscape, true);
});
onUnmounted(() => {
  exclusiveMenu.unmount();
  document.removeEventListener("contextmenu", open, true);
  document.removeEventListener("keydown", closeOnEscape, true);
});
</script>

<template>
  <ContextMenu v-if="menu" :x="menu.x" :y="menu.y" :options="options" @select="select" @clickoutside="exclusiveMenu.handleClickOutside" />
</template>
