import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import DialogInputContextMenu from "../components/DialogInputContextMenu.vue";
import TextPanel from "../components/TextPanel.vue";

const clipboard = { writeText: vi.fn().mockResolvedValue(undefined), readText: vi.fn().mockResolvedValue("XYZ") };
Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });

afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("dialog input context menu", () => {
  it("lets a notebook inside a dialog open its own full context menu", async () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);
    const generic = mount(DialogInputContextMenu, { props: { copyLabel: "复制", pasteLabel: "粘贴" }, global: { stubs: { ContextMenu: true } } });
    const notebook = mount(TextPanel, { attachTo: dialog, props: { titleId: "note", title: "记事本", lines: [] }, global: { stubs: { ContextMenu: true } } });
    await notebook.get("textarea").trigger("contextmenu");
    expect(generic.findComponent({ name: "ContextMenu" }).exists()).toBe(false);
    const options = notebook.getComponent({ name: "ContextMenu" }).props("options");
    expect(options.map((option: { key: string }) => option.key)).toEqual(expect.arrayContaining(["copy", "paste"]));
    expect(options.map((option: { key: string }) => option.key)).not.toContain("smart-paste");
    notebook.unmount();
    generic.unmount();
  });
  it("copies the selection and pastes over it while notifying the input", async () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.innerHTML = '<input value="hello" maxlength="6">';
    document.body.append(dialog);
    const input = dialog.querySelector("input")!;
    const onInput = vi.fn();
    input.addEventListener("input", onInput);
    const wrapper = mount(DialogInputContextMenu, { props: { copyLabel: "复制", pasteLabel: "粘贴" }, global: { stubs: { ContextMenu: true } } });
    input.setSelectionRange(1, 4);
    input.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 20 }));
    await nextTick();
    const context = wrapper.getComponent({ name: "ContextMenu" });
    expect(context.props("options")).toEqual([
      { key: "copy", label: "复制", icon: expect.any(Function), disabled: false },
      { key: "paste", label: "粘贴", icon: expect.any(Function), disabled: false },
    ]);
    context.vm.$emit("select", "copy");
    await vi.waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith("ell"));
    input.setSelectionRange(1, 4);
    input.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    await nextTick();
    wrapper.getComponent({ name: "ContextMenu" }).vm.$emit("select", "paste");
    await vi.waitFor(() => expect(input.value).toBe("hXYZo"));
    expect(onInput).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("does not open for fields outside a dialog and disables copy without a selection", async () => {
    const input = document.createElement("input");
    document.body.append(input);
    const wrapper = mount(DialogInputContextMenu, { props: { copyLabel: "Copy", pasteLabel: "Paste" }, global: { stubs: { ContextMenu: true } } });
    input.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    await nextTick();
    expect(wrapper.findComponent({ name: "ContextMenu" }).exists()).toBe(false);
    const dialog = document.createElement("div");
    dialog.className = "n-modal";
    dialog.append(input);
    document.body.append(dialog);
    input.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    await nextTick();
    expect(wrapper.getComponent({ name: "ContextMenu" }).props("options")[0]).toMatchObject({ disabled: true });
    wrapper.unmount();
  });
});
