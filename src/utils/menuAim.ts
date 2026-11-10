export interface MenuPoint { x: number; y: number }
export interface MenuRect { left: number; right: number; top: number; bottom: number }

/** Whether movement is entering the triangle between the previous point and the submenu. */
export function isMovingTowardSubmenu(previous: MenuPoint, current: MenuPoint, submenu: MenuRect): boolean {
  const opensLeft = submenu.right <= previous.x;
  const opensRight = submenu.left >= previous.x;
  if (!opensLeft && !opensRight) return false;
  const edge = opensLeft ? submenu.right : submenu.left;
  const dx = current.x - previous.x;
  if (opensLeft ? dx >= -1 : dx <= 1) return false;
  const distance = edge - previous.x;
  const progress = dx / distance;
  if (progress <= 0 || progress > 1.2) return false;
  const tolerance = 16;
  const top = previous.y + (submenu.top - tolerance - previous.y) * progress;
  const bottom = previous.y + (submenu.bottom + tolerance - previous.y) * progress;
  return current.y >= Math.min(top, bottom) && current.y <= Math.max(top, bottom);
}

/** Protect an open Naive UI submenu while the pointer crosses adjacent rows. */
export function createMenuAim() {
  let history: MenuPoint[] = [];
  let pending: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let replaying = false;
  let leavingSubmenu: HTMLElement | null = null;
  function cancel() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = null;
    leavingSubmenu = null;
  }
  function track(event: MouseEvent) {
    history.push({ x: event.clientX, y: event.clientY });
    if (history.length > 4) history.shift();
    if (pending && event.target instanceof Element && !pending.contains(event.target)) cancel();
    if (leavingSubmenu && event.target instanceof Node && leavingSubmenu.contains(event.target)) cancel();
  }
  function guard(event: MouseEvent) {
    if (replaying || !(event.currentTarget instanceof HTMLElement)) return;
    const candidate = event.currentTarget;
    if (event.target instanceof Element && event.target.closest('.n-dropdown-option') !== candidate) return;
    const menu = candidate.closest('.menu-aim-menu');
    if (!menu || candidate.closest('.n-dropdown-menu') !== menu) return;
    const activeBody = Array.from(menu.querySelectorAll<HTMLElement>('.n-dropdown-option-body--pending'))
      .find((body) => body.closest('.n-dropdown-menu') === menu);
    const active = activeBody?.parentElement;
    if (!active || active === candidate) { cancel(); return; }
    const submenu = active.querySelector<HTMLElement>('.n-dropdown-menu');
    if (!submenu) { cancel(); return; }
    const rect = submenu.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const current = { x: event.clientX, y: event.clientY };
    const previous = history[0];
    if (!previous || !isMovingTowardSubmenu(previous, current, rect)) { cancel(); return; }
    event.stopPropagation();
    if (pending === candidate) return;
    cancel();
    pending = candidate;
    timer = setTimeout(() => {
      const target = pending;
      cancel();
      if (!target?.isConnected) return;
      replaying = true;
      target.querySelector<HTMLElement>('.n-dropdown-option-body')?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: current.x, clientY: current.y }));
      replaying = false;
    }, 300);
  }
  // Naive UI closes on mouseleave into a divider or the gap beside the menu,
  // before the neighbouring row can apply its own intent protection.
  function guardLeave(event: MouseEvent) {
    if (replaying || !(event.currentTarget instanceof HTMLElement)) return;
    const active = event.currentTarget;
    if (event.target instanceof Element && event.target.closest('.n-dropdown-option') !== active) return;
    const menu = active.closest('.menu-aim-menu');
    if (!menu || active.closest('.n-dropdown-menu') !== menu) return;
    const body = active.querySelector<HTMLElement>(':scope > .n-dropdown-option-body--pending');
    const submenu = active.querySelector<HTMLElement>('.n-dropdown-menu');
    const previous = history[0];
    if (!body || !submenu || !previous) return;
    const rect = submenu.getBoundingClientRect();
    const current = { x: event.clientX, y: event.clientY };
    if (!rect.width || !rect.height || !isMovingTowardSubmenu(previous, current, rect)) return;
    if (event.relatedTarget instanceof Node && submenu.contains(event.relatedTarget)) return;
    event.stopPropagation();
    cancel();
    leavingSubmenu = submenu;
    const relatedTarget = event.relatedTarget;
    timer = setTimeout(() => {
      cancel();
      if (!body.isConnected) return;
      replaying = true;
      body.dispatchEvent(new MouseEvent('mouseleave', { clientX: current.x, clientY: current.y, relatedTarget }));
      replaying = false;
    }, 300);
  }
  function start() { history = []; document.addEventListener('mousemove', track, true); }
  function stop() { cancel(); history = []; document.removeEventListener('mousemove', track, true); }
  return { start, stop, guard, guardLeave };
}

/** Shared NDropdown hooks, including each nested submenu. */
export function menuAimProps(aim: ReturnType<typeof createMenuAim>) {
  return {
    menuProps: () => ({ class: "menu-aim-menu" }),
    nodeProps: () => ({
      onMouseenterCapture: aim.guard,
      onMousemoveCapture: aim.guard,
      onMouseleaveCapture: aim.guardLeave,
    }) as unknown as Record<string, string>,
  };
}
