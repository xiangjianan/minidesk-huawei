import { defineComponent, h, onBeforeUnmount, onUpdated, TransitionGroup, withMemo } from "vue";
import type { PropType, VNode } from "vue";

export function createTodoLeaveHooks() {
  const lists = new Map<HTMLElement, { count: number; minHeight: string; height: string }>();
  const rows = new Map<HTMLElement, { list: HTMLElement; top: string }>();
  const animations = new Map<HTMLElement, Animation>();
  const previousHeights = new Map<HTMLElement, number>();
  const hiddenRows = new Map<HTMLElement, string>();
  function animateHeight(list: HTMLElement, fromHeight: number, toHeight: number) {
    if (list.closest(".is-sort-committing")) return;
    if (Math.abs(fromHeight - toHeight) < 0.5 || !list.animate || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const animation = list.animate(
      [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
      { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
    animations.set(list, animation);
    void animation.finished.catch(() => {}).then(() => {
      if (animations.get(list) === animation) animations.delete(list);
    });
  }
  function finish(element: Element) {
    const row = element as HTMLElement;
    if (hiddenRows.has(row)) {
      row.style.visibility = hiddenRows.get(row)!;
      hiddenRows.delete(row);
    }
    const entry = rows.get(row);
    if (!entry) return;
    row.style.top = entry.top;
    rows.delete(row);
    const state = lists.get(entry.list)!;
    if (--state.count === 0) {
      const fromHeight = entry.list.getBoundingClientRect().height;
      entry.list.style.minHeight = state.minHeight;
      entry.list.style.height = state.height;
      lists.delete(entry.list);
      const toHeight = entry.list.getBoundingClientRect().height;
      animateHeight(entry.list, fromHeight, toHeight);
    }
  }
  return {
    beforeUpdate(list: HTMLElement) {
      previousHeights.set(list, list.getBoundingClientRect().height);
      animations.get(list)?.cancel();
      animations.delete(list);
    },
    afterUpdate(list: HTMLElement) {
      const height = previousHeights.get(list);
      previousHeights.delete(list);
      // Removals keep their space until the row fade completes; additions can
      // grow immediately, using the height captured before Vue inserts them.
      if (height !== undefined && !lists.has(list)) {
        animateHeight(list, height, list.getBoundingClientRect().height);
      }
    },
    onBeforeLeave(element: Element) {
      const row = element as HTMLElement;
      if (row.closest(".is-sort-committing")) {
        hiddenRows.set(row, row.style.visibility);
        row.style.visibility = "hidden";
        return;
      }
      // Hidden empty-state markers have no layout to preserve. Holding their
      // zero height delays the first insertion until the leave fade finishes.
      if (row.classList.contains("todo-empty-hint") && window.getComputedStyle(row).display === "none") return;
      const list = row.parentElement;
      if (!list || rows.has(row)) return;
      // Read before Vue applies absolute positioning to the leaving row.
      const top = row.offsetTop;
      let state = lists.get(list);
      if (!state) {
        const height = previousHeights.get(list) ?? list.getBoundingClientRect().height;
        animations.get(list)?.cancel();
        animations.delete(list);
        state = { count: 0, minHeight: list.style.minHeight, height: list.style.height };
        lists.set(list, state);
        list.style.minHeight = `${height}px`;
        // A single-row list can be shorter than its empty placeholder. Pin
        // both bounds so that placeholder cannot expand it during the fade.
        list.style.height = `${height}px`;
      }
      state.count++;
      rows.set(row, { list, top: row.style.top });
      row.style.top = `${top}px`;
    },
    onAfterLeave: finish,
    onLeaveCancelled: finish,
    dispose() {
      for (const animation of animations.values()) animation.cancel();
      animations.clear();
      for (const [list, state] of lists) {
        list.style.minHeight = state.minHeight;
        list.style.height = state.height;
      }
      for (const [row, entry] of rows) row.style.top = entry.top;
      for (const [row, visibility] of hiddenRows) row.style.visibility = visibility;
      hiddenRows.clear();
      lists.clear();
      rows.clear();
      previousHeights.clear();
    },
  };
}

/** Each list owns its cache. A nested v-memo inside the panel's v-for shares
 * one compiler cache slot, so different lists invalidate one another and make
 * TransitionGroup measure every row even when only the columns change.
 */
export default defineComponent({
  name: "TodoRowsTransition",
  inheritAttrs: false,
  props: {
    memo: { type: Array as PropType<unknown[]>, required: true },
  },
  setup(props, { attrs, slots }) {
    const cache: VNode[] = [];
    const { dispose, beforeUpdate, afterUpdate, ...leaveHooks } = createTodoLeaveHooks();
    let listElement: HTMLElement | undefined;
    let previousTops = new Map<Element, number>();
    const moveAnimations = new Map<Element, Animation>();
    onBeforeUnmount(() => {
      dispose();
      for (const animation of moveAnimations.values()) animation.cancel();
    });
    onUpdated(() => {
      if (!listElement) return;
      afterUpdate(listElement);
      if (!listElement.closest(".is-sort-committing") && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        for (const row of listElement.children) {
          const previous = previousTops.get(row);
          if (previous === undefined || !(row instanceof HTMLElement)) continue;
          const dy = previous - row.offsetTop;
          if (!dy || !row.animate) continue;
          moveAnimations.get(row)?.cancel();
          const animation = row.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
            { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" },
          );
          moveAnimations.set(row, animation);
          void animation.finished.catch(() => {}).then(() => {
            if (moveAnimations.get(row) === animation) moveAnimations.delete(row);
          });
        }
      }
      previousTops.clear();
    });
    return () => withMemo(props.memo, () => {
      if (listElement) {
        beforeUpdate(listElement);
        previousTops = new Map(Array.from(listElement.children, (row) => [row, (row as HTMLElement).offsetTop]));
      }
      const children = slots.default?.() ?? [];
      return h(TransitionGroup, {
        ...attrs, ...leaveHooks, moveClass: "todo-vertical-move",
        ref: (instance: unknown) => { listElement = (instance as { $el?: HTMLElement } | null)?.$el; },
      }, { default: () => children });
    }, cache, 0);
  },
});
