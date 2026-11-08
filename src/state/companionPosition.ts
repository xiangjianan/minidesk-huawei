/** A device-local preference, independent of workspace exports and sync. */
export const COMPANION_POSITION_KEY = "mini-desk-companion-position-v1";
export type CompanionOffset = { right: number; bottom: number };

export function clampCompanionOffset(position: CompanionOffset, width: number, height: number, size = 50): CompanionOffset {
  const margin = 8;
  return {
    right: Math.max(margin, Math.min(position.right, Math.max(margin, width - size - margin))),
    bottom: Math.max(margin, Math.min(position.bottom, Math.max(margin, height - size - margin))),
  };
}

export function readCompanionOffset(): CompanionOffset | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(COMPANION_POSITION_KEY) ?? "null");
    if (!value || typeof value !== "object") return null;
    const { right, bottom } = value as Record<string, unknown>;
    if (typeof right !== "number" || !Number.isFinite(right) || typeof bottom !== "number" || !Number.isFinite(bottom)) return null;
    return { right, bottom };
  } catch { return null; }
}

export function saveCompanionOffset(position: CompanionOffset): void {
  try { localStorage.setItem(COMPANION_POSITION_KEY, JSON.stringify(position)); } catch { /* Position remains usable for this session. */ }
}
