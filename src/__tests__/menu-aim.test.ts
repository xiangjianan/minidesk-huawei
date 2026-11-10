import { afterEach, describe, expect, it, vi } from "vitest";
import { createMenuAim, isMovingTowardSubmenu } from "../utils/menuAim";

describe("submenu intent", () => {
  it("recognizes movement toward either side, but not away or vertically", () => {
    const left = { left: 0, right: 200, top: 50, bottom: 250 };
    const right = { left: 400, right: 600, top: 50, bottom: 250 };
    expect(isMovingTowardSubmenu({ x: 300, y: 100 }, { x: 260, y: 130 }, left)).toBe(true);
    expect(isMovingTowardSubmenu({ x: 300, y: 100 }, { x: 340, y: 130 }, right)).toBe(true);
    expect(isMovingTowardSubmenu({ x: 300, y: 100 }, { x: 310, y: 130 }, left)).toBe(false);
    expect(isMovingTowardSubmenu({ x: 300, y: 100 }, { x: 299, y: 180 }, left)).toBe(false);
    expect(isMovingTowardSubmenu({ x: 300, y: 100 }, { x: 260, y: 250 }, left)).toBe(false);
  });

  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });

  it("holds the existing submenu during diagonal movement and switches after a pause", () => {
    vi.useFakeTimers();
    const aim = createMenuAim();
    const menu = document.createElement("div");
    menu.className = "menu-aim-menu n-dropdown-menu";
    menu.innerHTML = '<div class="n-dropdown-option"><div class="n-dropdown-option-body--pending"></div><div class="n-dropdown-menu"></div></div><div class="n-dropdown-option"><div class="n-dropdown-option-body"></div></div>';
    document.body.append(menu);
    const submenu = menu.querySelectorAll<HTMLElement>(".n-dropdown-menu")[0];
    submenu.getBoundingClientRect = () => ({ left: 0, right: 200, top: 50, bottom: 250, width: 200, height: 200, x: 0, y: 50, toJSON() {} });
    const candidate = menu.children[1] as HTMLElement;
    const body = candidate.firstElementChild as HTMLElement;
    const switchMenu = vi.fn();
    candidate.addEventListener("mousemove", aim.guard, true);
    body.addEventListener("mousemove", switchMenu);
    aim.start();
    menu.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 100 }));
    body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 260, clientY: 130 }));
    expect(switchMenu).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(switchMenu).toHaveBeenCalledTimes(1);
    aim.stop();
  });

  it("cancels a deferred switch when the pointer reaches the submenu", () => {
    vi.useFakeTimers();
    const aim = createMenuAim();
    const menu = document.createElement("div");
    menu.className = "menu-aim-menu n-dropdown-menu";
    menu.innerHTML = '<div class="n-dropdown-option"><div class="n-dropdown-option-body--pending"></div><div class="n-dropdown-menu"></div></div><div class="n-dropdown-option"><div class="n-dropdown-option-body"></div></div>';
    document.body.append(menu);
    const submenu = menu.querySelectorAll<HTMLElement>(".n-dropdown-menu")[0];
    submenu.getBoundingClientRect = () => ({ left: 0, right: 200, top: 50, bottom: 250, width: 200, height: 200, x: 0, y: 50, toJSON() {} });
    const candidate = menu.children[1] as HTMLElement;
    const body = candidate.firstElementChild as HTMLElement;
    const switchMenu = vi.fn();
    candidate.addEventListener("mousemove", aim.guard, true);
    body.addEventListener("mousemove", switchMenu);
    aim.start();
    menu.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 100 }));
    body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 260, clientY: 130 }));
    submenu.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 190, clientY: 150 }));
    vi.advanceTimersByTime(300);
    expect(switchMenu).not.toHaveBeenCalled();
    aim.stop();
  });

  it("keeps the submenu open when leaving its row through the gap", () => {
    vi.useFakeTimers();
    const aim = createMenuAim();
    const menu = document.createElement("div");
    menu.className = "menu-aim-menu n-dropdown-menu";
    menu.innerHTML = '<div class="n-dropdown-option"><div class="n-dropdown-option-body n-dropdown-option-body--pending"></div><div class="n-dropdown-menu"></div></div>';
    const gap = document.createElement("div");
    document.body.append(menu, gap);
    const active = menu.firstElementChild as HTMLElement;
    const body = active.firstElementChild as HTMLElement;
    const submenu = active.querySelector<HTMLElement>(".n-dropdown-menu")!;
    submenu.getBoundingClientRect = () => ({ left: 0, right: 200, top: 50, bottom: 250, width: 200, height: 200, x: 0, y: 50, toJSON() {} });
    const close = vi.fn();
    active.addEventListener("mouseleave", aim.guardLeave, true);
    body.addEventListener("mouseleave", close);
    aim.start();
    body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 100 }));
    body.dispatchEvent(new MouseEvent("mouseleave", { clientX: 260, clientY: 130, relatedTarget: gap }));
    expect(close).not.toHaveBeenCalled();
    submenu.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 190, clientY: 150 }));
    vi.advanceTimersByTime(300);
    expect(close).not.toHaveBeenCalled();
    aim.stop();
  });

  it("closes after leaving toward the gap and stopping outside", () => {
    vi.useFakeTimers();
    const aim = createMenuAim();
    const menu = document.createElement("div");
    menu.className = "menu-aim-menu n-dropdown-menu";
    menu.innerHTML = '<div class="n-dropdown-option"><div class="n-dropdown-option-body n-dropdown-option-body--pending"></div><div class="n-dropdown-menu"></div></div>';
    const gap = document.createElement("div");
    document.body.append(menu, gap);
    const active = menu.firstElementChild as HTMLElement;
    const body = active.firstElementChild as HTMLElement;
    const submenu = active.querySelector<HTMLElement>(".n-dropdown-menu")!;
    submenu.getBoundingClientRect = () => ({ left: 0, right: 200, top: 50, bottom: 250, width: 200, height: 200, x: 0, y: 50, toJSON() {} });
    const close = vi.fn();
    active.addEventListener("mouseleave", aim.guardLeave, true);
    body.addEventListener("mouseleave", close);
    aim.start();
    body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 100 }));
    body.dispatchEvent(new MouseEvent("mouseleave", { clientX: 260, clientY: 130, relatedTarget: gap }));
    vi.advanceTimersByTime(300);
    expect(close).toHaveBeenCalledTimes(1);
    aim.stop();
  });


  it("protects nested submenus without confusing the parent pending row", () => {
    vi.useFakeTimers();
    const aim = createMenuAim();
    const root = document.createElement("div");
    root.className = "menu-aim-menu n-dropdown-menu";
    root.innerHTML = '<div class="n-dropdown-option"><div class="n-dropdown-option-body n-dropdown-option-body--pending"></div><div class="menu-aim-menu n-dropdown-menu"><div class="n-dropdown-option"><div class="n-dropdown-option-body n-dropdown-option-body--pending"></div><div class="menu-aim-menu n-dropdown-menu"></div></div><div class="n-dropdown-option"><div class="n-dropdown-option-body"></div></div></div></div>';
    document.body.append(root);
    const parent = root.firstElementChild as HTMLElement;
    const nested = parent.querySelector<HTMLElement>(".n-dropdown-menu")!;
    const active = nested.firstElementChild as HTMLElement;
    const submenu = active.querySelector<HTMLElement>(".n-dropdown-menu")!;
    submenu.getBoundingClientRect = () => ({ left: 400, right: 600, top: 50, bottom: 250, width: 200, height: 200, x: 400, y: 50, toJSON() {} });
    const candidate = nested.children[1] as HTMLElement;
    const body = candidate.firstElementChild as HTMLElement;
    const switchMenu = vi.fn();
    parent.addEventListener("mousemove", aim.guard, true);
    candidate.addEventListener("mousemove", aim.guard, true);
    body.addEventListener("mousemove", switchMenu);
    aim.start();
    nested.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 100 }));
    body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 340, clientY: 130 }));
    expect(switchMenu).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(switchMenu).toHaveBeenCalledTimes(1);
    aim.stop();
  });

});
