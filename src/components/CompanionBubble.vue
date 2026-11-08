<script setup lang="ts">
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { Component, VNode } from "vue";
import { LogoGithub } from "@vicons/ionicons5";
import { Undo2 } from "lucide-vue-next";
import { CloseOutline, EyeOffOutline } from "@vicons/ionicons5";
import { NButton, NDropdown, NIcon, NPopover } from "naive-ui";
import type { DropdownOption } from "naive-ui";
import type { AppLanguage, CompanionGifTheme } from "../types";
import { DEFAULT_COMPANION_GIF_THEME, getCompanionGifSrc, getCompanionNotificationIconSrc } from "../state/companionGifThemes";
import { getUiText } from "../state/i18n";
import { ensureBubbleKaomoji } from "../state/messages";
import { clampCompanionOffset, readCompanionOffset, saveCompanionOffset, type CompanionOffset } from "../state/companionPosition";
import { organizeContextMenu, CONTEXT_MENU_Z_INDEX, createExclusiveContextMenu } from "../utils/contextMenu";

const props = withDefaults(defineProps<{
  visible: boolean;
  dismissing?: boolean;
  message: string;
  sequence?: number;
  linkText?: string;
  linkHref?: string;
  signatureText?: string;
  confirm?: boolean;
  confirmDanger?: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmHint?: string;
  secondaryText?: string;
  actionText?: string;
  clearSignal?: number;
  persistent?: boolean;
  theme?: "light" | "dark";
  language?: AppLanguage;
  gifTheme?: CompanionGifTheme;
  customGifLightSrc?: string;
  customGifDarkSrc?: string;
  position?: {
    right: string;
    bottom?: string;
    top?: string;
  };
}>(), {
  language: "zh",
});

const emit = defineEmits<{
  yes: [];
  no: [];
  secondary: [];
  action: [];
  pause: [];
  resume: [];
  gifThemeChange: [theme: string];
  gifClick: [];
}>();

const POPOVER_DELAY_MS = 200;
const POPOVER_HIDE_CONTENT_MS = 260;
const GIF_MAX_VISIBLE_MS = 10000;
const GIF_FADE_MS = 260;
const delayedPopoverVisible = ref(false);
const retainingPopoverContent = ref(false);
const gifVisible = ref(false);
const gifFading = ref(false);
const renderedMessage = ref("");
const renderedLinkText = ref("");
const renderedLinkHref = ref("");
const renderedSignatureText = ref("");
const renderedConfirm = ref(false);
const renderedConfirmDanger = ref(false);
const renderedConfirmText = ref("");
const renderedCancelText = ref("");
const renderedConfirmHint = ref("");
const renderedSecondaryText = ref("");
const renderedActionText = ref("");
const popoverTimer = ref<number | undefined>();
const contentTimer = ref<number | undefined>();
const replacementTimer = ref<number | undefined>();
const replacingPopover = ref(false);
let renderedSequence = props.sequence;
const gifTimer = ref<number | undefined>();
const gifFadeTimer = ref<number | undefined>();
const gifRemainingMs = ref(GIF_MAX_VISIBLE_MS);
const gifTimerStartedAt = ref(0);
const hoveringCompanion = ref(false);
const surfaceRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const popoverInstance = ref<{ syncPosition?: () => void } | null>(null);
const savedOffset = ref<CompanionOffset | null>(readCompanionOffset());
const draggedOffset = ref<CompanionOffset | null>(null);
const viewport = ref({ width: window.innerWidth, height: window.innerHeight });
let drag: { pointerId: number; startX: number; startY: number; right: number; bottom: number; moved: boolean; temporary: boolean } | null = null;
let suppressGifClick = false;

const uiText = computed(() => getUiText(props.language));

const gifMenu = ref<{ x: number; y: number } | null>(null);
const exclusiveMenu = createExclusiveContextMenu(() => { gifMenu.value = null; });
let windowMousemoveActive = false;

function renderGifMenuIcon(icon: Component): () => VNode {
  return () => h(NIcon, { size: 16 }, { default: () => h(icon) });
}

const gifMenuOptions = computed<DropdownOption[]>(() => [
  { label: uiText.value.settings.gifQuietMode, key: "hide", icon: renderGifMenuIcon(EyeOffOutline) },
]);

function openGifMenu(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  exclusiveMenu.notifyOpen(event, { replacingExistingMenu: Boolean(gifMenu.value) });
  gifMenu.value = { x: event.clientX, y: event.clientY };
}

function onSurfaceContextmenu(event: MouseEvent): void {
  // 确认在场时禁用右键菜单：此刻选「不显示」会把待处理的二次确认一并杀掉。
  // 「不显示」安静模式下的静态 logo 是品牌形象不是伴宠：右键「不显示」无意义，不出菜单。
  if (!shouldRenderGif.value || props.confirm || activeGifTheme.value === "none") return;
  openGifMenu(event);
}

/** 点击 GIF：普通消息气泡在场时轮换弹出该区域的 Tips；二次确认框保持原流程不响应。 */
function handleGifClick(): void {
  if (suppressGifClick) { suppressGifClick = false; return; }
  if (props.confirm) return;
  emit("gifClick");
}

function handleGifMenuSelect(key: string): void {
  gifMenu.value = null;
  if (key === "hide") {
    emit("gifThemeChange", "none");
  }
}

const placementStyle = computed(() => {
  const offset = draggedOffset.value ?? (!props.confirm && !props.position ? savedOffset.value : null);
  if (offset) {
    const bounded = clampCompanionOffset(offset, viewport.value.width, viewport.value.height);
    return { right: `${bounded.right}px`, bottom: `${bounded.bottom}px`, top: "auto" };
  }
  if (!props.position) return undefined;
  return { right: props.position.right, bottom: props.position.bottom, top: props.position.top };
});

watch(placementStyle, () => { void nextTick(() => popoverInstance.value?.syncPosition?.()); }, { flush: "post" });
watch(() => [props.sequence, props.confirm, props.visible] as const, ([sequence, confirm, visible], [oldSequence, oldConfirm]) => {
  if (!visible || (confirm && !oldConfirm) || (sequence !== oldSequence && !oldConfirm)) draggedOffset.value = null;
});

function onDragStart(event: PointerEvent): void {
  if (event.button !== 0 || !surfaceRef.value) return;
  const rect = surfaceRef.value.getBoundingClientRect();
  drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
    right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom,
    moved: false, temporary: Boolean(props.confirm || props.position) };
  suppressGifClick = false;
  window.addEventListener("pointermove", onDragMove, { passive: false });
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", onDragCancel);
}
function onDragMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  event.preventDefault();
  draggedOffset.value = clampCompanionOffset({ right: drag.right - dx, bottom: drag.bottom - dy }, window.innerWidth, window.innerHeight);
}
function stopDragging(): void {
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragEnd);
  window.removeEventListener("pointercancel", onDragCancel);
  drag = null;
}
function onDragEnd(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (drag.moved && draggedOffset.value) {
    suppressGifClick = true;
    window.setTimeout(() => { suppressGifClick = false; }, 0);
    if (!drag.temporary) {
      savedOffset.value = draggedOffset.value;
      saveCompanionOffset(draggedOffset.value);
    }
  }
  stopDragging();
  if (!isPointInsideElement(event.clientX, event.clientY, surfaceRef.value) && !isPointInsideElement(event.clientX, event.clientY, popoverRef.value)) handleCompanionMouseleave();
}
function onDragCancel(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  draggedOffset.value = null;
  stopDragging();
}
function onViewportResize(): void {
  viewport.value = { width: window.innerWidth, height: window.innerHeight };
}


const activeGifTheme = computed(() => props.gifTheme ?? DEFAULT_COMPANION_GIF_THEME);
const hasPopoverPayload = computed(() => Boolean(props.message || props.confirm || props.linkText || props.signatureText));
const gifSrc = computed(() => {
  const src = getCompanionGifSrc(activeGifTheme.value, props.theme ?? "light", {
    light: props.customGifLightSrc,
    dark: props.customGifDarkSrc,
  });
  if (src) return src;
  // 没有主题图（「不显示」安静模式 / 自定义缺当前主题源）但气泡有内容时，
  // 用 MiniDesk 静态 logo（像素猫通知图标，随明暗主题切换）当伴宠形象：
  // 安静模式选的是「不养常驻伴宠」，气泡弹出时配品牌静态图而非动画 GIF，
  // 消息气泡（显式 Tips/关于）与二次确认框统一同一形象；纯伴宠可见性
  // （无气泡内容）保持隐藏。
  return hasPopoverPayload.value ? getCompanionNotificationIconSrc(DEFAULT_COMPANION_GIF_THEME, props.theme ?? "light") : "";
});
const shouldRenderGif = computed(() => Boolean(gifSrc.value));
const surfaceVisible = computed(() => {
  if (!props.visible) return false;
  if (shouldRenderGif.value) return gifVisible.value || gifFading.value;
  return hasPopoverPayload.value || retainingPopoverContent.value;
});
const popoverVisible = computed(() => {
  if (!props.visible || !hasPopoverPayload.value) return false;
  return shouldRenderGif.value ? gifVisible.value : true;
});
const visiblePopover = computed(() => (delayedPopoverVisible.value && popoverVisible.value) || retainingPopoverContent.value);
const popoverContentVisible = computed(() => visiblePopover.value || retainingPopoverContent.value);
const popoverKey = computed(() => `${props.position?.right ?? "default"}:${props.position?.bottom ?? "default"}`);

function syncRenderedContent(): void {
  renderedMessage.value = ensureBubbleKaomoji(props.message);
  renderedLinkText.value = props.linkText ?? "";
  renderedLinkHref.value = props.linkHref ?? "";
  renderedSignatureText.value = props.signatureText ?? "";
  renderedConfirm.value = Boolean(props.confirm);
  renderedConfirmDanger.value = Boolean(props.confirmDanger);
  renderedConfirmText.value = props.confirmText ?? uiText.value.common.yes;
  renderedCancelText.value = props.cancelText ?? uiText.value.common.no;
  renderedConfirmHint.value = props.confirmHint ?? "";
  renderedSecondaryText.value = props.secondaryText ?? "";
  renderedActionText.value = props.actionText ?? "";
}

watch(
  popoverVisible,
  (visible) => {
    window.clearTimeout(popoverTimer.value);
    popoverTimer.value = undefined;
    window.clearTimeout(contentTimer.value);
    if (!visible) {
      delayedPopoverVisible.value = false;
      retainingPopoverContent.value = Boolean(renderedMessage.value || renderedConfirm.value || renderedActionText.value);
      contentTimer.value = window.setTimeout(() => {
        retainingPopoverContent.value = false;
        renderedMessage.value = "";
        renderedLinkText.value = "";
        renderedLinkHref.value = "";
        renderedSignatureText.value = "";
        renderedConfirm.value = false;
        renderedConfirmDanger.value = false;
        renderedConfirmText.value = uiText.value.common.yes;
        renderedCancelText.value = uiText.value.common.no;
        renderedConfirmHint.value = "";
        renderedSecondaryText.value = "";
        renderedActionText.value = "";
      }, POPOVER_HIDE_CONTENT_MS);
      return;
    }
    syncRenderedContent();
    retainingPopoverContent.value = false;
    popoverTimer.value = window.setTimeout(() => {
      popoverTimer.value = undefined;
      delayedPopoverVisible.value = true;
    }, POPOVER_DELAY_MS);
  },
  { immediate: true },
);

watch(
  () =>
    [
      props.visible,
      props.dismissing,
      props.sequence,
      props.message,
      props.linkText,
      props.linkHref,
      props.signatureText,
      props.confirm,
      props.confirmDanger,
      props.persistent,
      props.theme,
      props.language,
      props.gifTheme,
      props.customGifLightSrc,
      props.customGifDarkSrc,
      props.position?.right,
      props.position?.bottom,
      props.position?.top,
    ] as const,
  ([visible]) => {
    window.clearTimeout(gifTimer.value);
    window.clearTimeout(gifFadeTimer.value);
    gifTimer.value = undefined;
    gifFadeTimer.value = undefined;
    gifRemainingMs.value = GIF_MAX_VISIBLE_MS;
    gifTimerStartedAt.value = 0;
    if (props.dismissing && visible) {
      gifVisible.value = false;
      gifFading.value = true;
      return;
    }
    if (!visible || !shouldRenderGif.value) {
      hoveringCompanion.value = false;
      gifVisible.value = false;
      gifFading.value = false;
      return;
    }
    gifVisible.value = true;
    gifFading.value = false;
    // A pending confirm must stay on screen until answered: like `persistent`,
    // it never expires on the GIF window, otherwise the confirm popover (and the
    // GIF it anchors to) fades away while `pendingConfirm` is still set.
    if (props.persistent || props.confirm) return;
    if (!hoveringCompanion.value) startGifTimer(GIF_MAX_VISIBLE_MS);
  },
  { immediate: true },
);

watch(
  () => [props.message, props.linkText, props.linkHref, props.confirm, props.confirmDanger, props.confirmText, props.cancelText, props.confirmHint, props.secondaryText, props.actionText, props.language] as const,
  () => {
    if (!popoverVisible.value || props.sequence !== renderedSequence) return;
    // The clearSignal watch can strand `delayedPopoverVisible` at false while
    // `popoverVisible` stays bridged true: focus fires hideBubbleMessage (bumps
    // clearSignal) and a same-tick tip re-show, so popoverVisible never makes
    // an F→T transition and its T-branch never restarts the delay timer. Any
    // NEW content arriving in that state — a confirm, a toast — would render
    // invisibly. Heal it here: fresh content while shown re-arms the entrance
    // delay instead of staying silenced.
    if (!delayedPopoverVisible.value && popoverTimer.value === undefined) {
      popoverTimer.value = window.setTimeout(() => {
        popoverTimer.value = undefined;
        delayedPopoverVisible.value = true;
      }, POPOVER_DELAY_MS);
    }
    syncRenderedContent();
  },
);

watch(
  () => props.sequence,
  (sequence) => {
    window.clearTimeout(replacementTimer.value);
    if (!popoverVisible.value || !delayedPopoverVisible.value || props.confirm || renderedConfirm.value) {
      renderedSequence = sequence;
      replacingPopover.value = false;
      syncRenderedContent();
      return;
    }
    replacingPopover.value = true;
    replacementTimer.value = window.setTimeout(() => {
      renderedSequence = sequence;
      syncRenderedContent();
      replacingPopover.value = false;
      replacementTimer.value = undefined;
    }, 180);
  },
);

watch(
  () => props.clearSignal,
  () => {
    window.clearTimeout(popoverTimer.value);
    popoverTimer.value = undefined;
    window.clearTimeout(contentTimer.value);
    delayedPopoverVisible.value = false;
    retainingPopoverContent.value = false;
    renderedMessage.value = "";
    renderedLinkText.value = "";
    renderedLinkHref.value = "";
    renderedSignatureText.value = "";
    renderedConfirm.value = false;
    renderedConfirmDanger.value = false;
    renderedConfirmText.value = uiText.value.common.yes;
    renderedCancelText.value = uiText.value.common.no;
    renderedActionText.value = "";
  },
);

onMounted(() => {
  exclusiveMenu.mount();
  window.addEventListener("keydown", handleConfirmKeydown, { capture: true });
  window.addEventListener("click", handleConfirmOutsideClick, { capture: true });
  window.addEventListener("resize", onViewportResize);
});

onUnmounted(() => {
  exclusiveMenu.unmount();
  window.removeEventListener("keydown", handleConfirmKeydown, { capture: true });
  window.removeEventListener("click", handleConfirmOutsideClick, { capture: true });
  stopWindowMousemoveTracking();
  stopDragging();
  window.removeEventListener("resize", onViewportResize);
  window.clearTimeout(popoverTimer.value);
  window.clearTimeout(contentTimer.value);
  window.clearTimeout(replacementTimer.value);
  window.clearTimeout(gifTimer.value);
  window.clearTimeout(gifFadeTimer.value);
});

function handleConfirmOutsideClick(event: MouseEvent): void {
  if (suppressGifClick && event.target instanceof Node && !surfaceRef.value?.contains(event.target)) {
    suppressGifClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (!props.confirm || !(event.target instanceof Node)) return;
  if (surfaceRef.value?.contains(event.target) || popoverRef.value?.contains(event.target)) return;
  emit("no");
}

function handleConfirmKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter") return;
  // Gate on the logical confirm state, not the popover's 200ms entrance animation
  // (visiblePopover). A confirm is pending the moment `requestConfirmation` runs, so a
  // fast Enter right after the trigger (e.g. Delete) must confirm immediately — otherwise
  // it falls through to inline handlers (like the image preview's Enter-to-edit).
  if (!props.confirm) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) return;
  event.preventDefault();
  event.stopPropagation();
  emit("yes");
}

function startGifTimer(duration: number): void {
  window.clearTimeout(gifTimer.value);
  gifRemainingMs.value = duration;
  gifTimerStartedAt.value = Date.now();
  gifTimer.value = window.setTimeout(finishGifTimer, duration);
}

function finishGifTimer(): void {
  gifTimer.value = undefined;
  gifRemainingMs.value = 0;
  gifTimerStartedAt.value = 0;
  gifVisible.value = false;
  gifFading.value = true;
  gifFadeTimer.value = window.setTimeout(() => {
    gifFading.value = false;
  }, GIF_FADE_MS);
}

function pauseGifTimer(): void {
  if (props.persistent || !gifVisible.value || !gifTimer.value) return;
  window.clearTimeout(gifTimer.value);
  gifTimer.value = undefined;
  const elapsed = Date.now() - gifTimerStartedAt.value;
  gifRemainingMs.value = Math.max(0, gifRemainingMs.value - elapsed);
  gifTimerStartedAt.value = 0;
}

function resumeGifTimer(): void {
  if (props.persistent || props.confirm || !gifVisible.value || gifFading.value || gifTimer.value) return;
  if (gifRemainingMs.value <= 0) {
    finishGifTimer();
    return;
  }
  startGifTimer(gifRemainingMs.value);
}

function handleCompanionMouseenter(): void {
  if (hoveringCompanion.value) return;
  hoveringCompanion.value = true;
  startWindowMousemoveTracking();
  pauseGifTimer();
  emit("pause");
}

function handleCompanionMouseleave(): void {
  if (!hoveringCompanion.value || drag?.moved) return;
  hoveringCompanion.value = false;
  stopWindowMousemoveTracking();
  resumeGifTimer();
  emit("resume");
}

function handleCompanionMousemove(): void {
  handleCompanionMouseenter();
}

function handleWindowMousemove(event: MouseEvent): void {
  if (!hoveringCompanion.value || drag?.moved) return;
  if (isPointInsideElement(event.clientX, event.clientY, surfaceRef.value)) return;
  if (isPointInsideElement(event.clientX, event.clientY, popoverRef.value)) return;
  handleCompanionMouseleave();
}

function startWindowMousemoveTracking(): void {
  if (windowMousemoveActive) return;
  windowMousemoveActive = true;
  window.addEventListener("mousemove", handleWindowMousemove);
}

function stopWindowMousemoveTracking(): void {
  if (!windowMousemoveActive) return;
  windowMousemoveActive = false;
  window.removeEventListener("mousemove", handleWindowMousemove);
}

function isPointInsideElement(x: number, y: number, element: HTMLElement | null): boolean {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
</script>

<template>
  <Transition name="companion-surface">
  <div
    v-if="surfaceVisible"
    ref="surfaceRef"
    class="focus-companion"
    :class="{ 'is-visible': gifVisible || (!shouldRenderGif && popoverVisible), 'is-fading': gifFading, 'is-dismissing': dismissing && retainingPopoverContent && !popoverVisible }"
    :style="placementStyle"
    data-testid="companion-bubble"
    :aria-hidden="!surfaceVisible"
    @mouseenter="handleCompanionMouseenter"
    @mousemove="handleCompanionMousemove"
    @mouseleave="handleCompanionMouseleave"
    @contextmenu="onSurfaceContextmenu"
  >
    <NPopover
      ref="popoverInstance"
      :key="popoverKey"
      trigger="manual"
      placement="top-end"
      :show="visiblePopover"
      :show-arrow="true"
      :arrow-point-to-center="true"
      :animated="false"
      :z-index="CONTEXT_MENU_Z_INDEX"
      :class="['companion-popover-shell', { 'is-popover-fading': retainingPopoverContent || replacingPopover, 'is-replacing': replacingPopover, 'is-confirm-danger': renderedConfirm && renderedConfirmDanger }]"
      arrow-class="companion-popover-arrow"
      :style="{ maxWidth: '240px', '--n-box-shadow': 'none' }"
    >
      <template #trigger>
        <Transition name="companion-gif-fade" mode="out-in" type="transition">
          <img
            v-if="shouldRenderGif"
            :src="gifSrc"
            class="focus-companion-gif"
            data-testid="companion-gif"
            width="50"
            height="50"
            alt=""
            role="button"
            tabindex="0"
            draggable="false"
            @pointerdown="onDragStart"
            :aria-label="uiText.app.gifTipsAction"
            @click="handleGifClick"
            @keydown.enter.prevent="handleGifClick"
            @keydown.space.prevent="handleGifClick"
          />
          <span v-else class="companion-popover-anchor" aria-hidden="true" />
        </Transition>
      </template>

      <div class="companion-message-stack">
      <Transition name="companion-message" appear>
      <div
        v-if="popoverContentVisible"
        ref="popoverRef"
        class="companion-popover"
        role="status"
        aria-live="polite"
        data-testid="companion-confirm"
        @mouseenter="handleCompanionMouseenter"
        @mousemove="handleCompanionMousemove"
        @mouseleave="handleCompanionMouseleave"
      >
        <span v-if="renderedMessage">{{ renderedMessage }}<button v-if="!renderedConfirm && renderedActionText" type="button" class="companion-undo-button" data-testid="companion-action" :aria-label="renderedActionText" :title="renderedActionText" @click="emit('action')"><Undo2 :size="13" :stroke-width="1.5" aria-hidden="true" /></button></span>
        <p v-if="renderedConfirmHint" class="companion-confirm-hint">{{ renderedConfirmHint }}</p>
        <div v-if="renderedLinkText || renderedSignatureText" class="companion-meta-row">
          <a
            v-if="renderedLinkText && renderedLinkHref"
            class="companion-link"
            :href="renderedLinkHref"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="companion-link"
          >
            <NIcon class="companion-link-icon" :component="LogoGithub" />
            {{ renderedLinkText }}
            <span
              v-if="renderedSignatureText"
              class="companion-signature"
              data-testid="companion-signature"
            >
              {{ renderedSignatureText }}
            </span>
          </a>
        </div>
        <div v-if="renderedConfirm" class="companion-actions">
          <NButton size="tiny" class="companion-action-button" :class="{ 'is-danger': renderedConfirmDanger }" data-testid="companion-yes" @click="emit('yes')">{{ renderedConfirmText }}</NButton>
          <NButton v-if="renderedSecondaryText" size="tiny" class="companion-action-button" data-testid="companion-secondary" @click="emit('secondary')">{{ renderedSecondaryText }}</NButton>
          <NButton size="tiny" class="companion-action-button" data-testid="companion-no" @click="emit('no')">{{ renderedCancelText }}</NButton>
        </div>
      </div>
      </Transition>
      </div>
    </NPopover>
    <NDropdown
      v-if="gifMenu"
      placement="bottom-start"
      trigger="manual"
      :show="true"
      :x="gifMenu.x"
      :y="gifMenu.y"
      :z-index="CONTEXT_MENU_Z_INDEX"
      :options="organizeContextMenu(gifMenuOptions)"
      @select="handleGifMenuSelect"
      @clickoutside="exclusiveMenu.handleClickOutside"
    >
      <span class="dropdown-anchor" :style="{ left: `${gifMenu.x}px`, top: `${gifMenu.y}px` }" aria-hidden="true" />
    </NDropdown>
  </div>
  </Transition>
</template>
