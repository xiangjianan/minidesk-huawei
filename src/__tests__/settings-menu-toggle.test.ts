import { mount } from "@vue/test-utils";
import { NDropdown } from "naive-ui";
import { expect, it } from "vitest";
import SettingsMenu from "../components/SettingsMenu.vue";

it("closes settings on a second click without a persistent library focus background", async () => {
  const wrapper = mount(SettingsMenu, {
    props: { appVersion: "1.0.0", updateAvailable: false, companionGifTheme: "cat" },
  });
  try {
    const button = wrapper.get(".settings-btn");
    const dropdown = wrapper.findAllComponents(NDropdown).at(-1)!;
    expect(button.element.tagName).toBe("BUTTON");
    expect(button.classes()).not.toContain("n-button");
    await button.trigger("click");
    expect(dropdown.props("show")).toBe(true);
    await button.trigger("click");
    expect(dropdown.props("show")).toBe(false);
    expect(button.classes()).not.toContain("n-button--focus");
  } finally {
    wrapper.unmount();
  }
});

it("closes settings when a sortable notebook tab is pressed", async () => {
  const wrapper = mount(SettingsMenu, {
    attachTo: document.body,
    props: { appVersion: "1.0.0", updateAvailable: false, companionGifTheme: "cat" },
  });
  const tab = document.createElement("button");
  tab.className = "space-tab";
  tab.setAttribute("role", "tab");
  document.body.appendChild(tab);
  try {
    await wrapper.get(".settings-btn").trigger("click");
    const dropdown = wrapper.findAllComponents(NDropdown).at(-1)!;
    expect(dropdown.props("show")).toBe(true);
    tab.addEventListener("pointerdown", (event) => event.preventDefault());
    tab.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
    await wrapper.vm.$nextTick();
    expect(dropdown.props("show")).toBe(false);
  } finally {
    tab.remove();
    wrapper.unmount();
  }
});
