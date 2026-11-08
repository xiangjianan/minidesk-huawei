import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompanionBubble from "../components/CompanionBubble.vue";
import { COMPANION_POSITION_KEY } from "../state/companionPosition";
import { popoverStub } from "./helpers/stubs";

function mountBubble(confirm = false, position?: { right: string; top: string; bottom: string }) {
  const wrapper = mount(CompanionBubble, { attachTo: document.body, props: { visible: true, message: "提示", confirm, position }, global: { stubs: { NPopover: popoverStub } } });
  vi.spyOn(wrapper.get('[data-testid="companion-bubble"]').element, "getBoundingClientRect").mockReturnValue({ left: 500, top: 300, right: 550, bottom: 350, width: 50, height: 50 } as DOMRect);
  return wrapper;
}
function pointer(target: EventTarget, type: string, x: number, y: number) {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y }));
}
afterEach(() => { localStorage.removeItem(COMPANION_POSITION_KEY); document.body.innerHTML = ""; vi.restoreAllMocks(); });

describe("companion dragging", () => {
  it("stores ordinary bubble placement and restores it on a new instance", async () => {
    const wrapper = mountBubble();
    pointer(wrapper.get('[data-testid="companion-gif"]').element, "pointerdown", 520, 320);
    pointer(window, "pointermove", 420, 220);
    pointer(window, "pointerup", 420, 220);
    await wrapper.vm.$nextTick();
    const expected = { right: window.innerWidth - 550 + 100, bottom: window.innerHeight - 350 + 100 };
    expect(JSON.parse(localStorage.getItem(COMPANION_POSITION_KEY)!)).toEqual(expected);
    expect(wrapper.get('[data-testid="companion-bubble"]').attributes("style")).toContain(`right: ${expected.right}px`);
    wrapper.unmount();
    const next = mountBubble();
    expect(next.get('[data-testid="companion-bubble"]').attributes("style")).toContain(`right: ${expected.right}px`);
    next.unmount();
  });

  it("moves a confirmation temporarily without overwriting the saved position", async () => {
    localStorage.setItem(COMPANION_POSITION_KEY, JSON.stringify({ right: 80, bottom: 90 }));
    const wrapper = mountBubble(true, { right: "100px", top: "300px", bottom: "auto" });
    pointer(wrapper.get('[data-testid="companion-gif"]').element, "pointerdown", 520, 320);
    pointer(window, "pointermove", 420, 220);
    pointer(window, "pointerup", 420, 220);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="companion-bubble"]').attributes("style")).toContain(`right: ${window.innerWidth - 450}px`);
    expect(JSON.parse(localStorage.getItem(COMPANION_POSITION_KEY)!)).toEqual({ right: 80, bottom: 90 });
    await wrapper.setProps({ confirm: false, position: undefined, sequence: 2 });
    await wrapper.setProps({ sequence: 3 });
    expect(wrapper.get('[data-testid="companion-bubble"]').attributes("style")).toContain("right: 80px");
    wrapper.unmount();
  });

  it("keeps a click without movement as a click and clamps a dragged GIF to the viewport", async () => {
    const wrapper = mountBubble();
    const gif = wrapper.get('[data-testid="companion-gif"]');
    pointer(gif.element, "pointerdown", 520, 320);
    pointer(window, "pointerup", 520, 320);
    await gif.trigger("click");
    expect(wrapper.emitted("gifClick")).toHaveLength(1);
    pointer(gif.element, "pointerdown", 520, 320);
    pointer(window, "pointermove", -5000, -5000);
    pointer(window, "pointerup", -5000, -5000);
    const position = JSON.parse(localStorage.getItem(COMPANION_POSITION_KEY)!);
    expect(position).toEqual({ right: window.innerWidth - 58, bottom: window.innerHeight - 58 });
    wrapper.unmount();
  });
});
