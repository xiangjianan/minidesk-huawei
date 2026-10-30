import type { AppLanguage } from "../types";

/**
 * A curated quick-launch preset for the "app" quick-button type. Selecting one
 * auto-fills the button title and URL scheme; users may also type any custom
 * scheme. Whether a preset actually launches depends on the app being installed
 * and having registered its scheme with the OS.
 */
export interface QuickAppPreset {
  title: { zh: string; en: string };
  scheme: string;
  /** Short hint shown in parentheses in the picker: what (if anything) to append
      after the scheme. Omit when no deep link is known. */
  hint?: { zh: string; en: string };
}

export const QUICK_APP_PRESETS: readonly QuickAppPreset[] = [
  { title: { zh: "WeLink", en: "WeLink" }, scheme: "im:", hint: { zh: "工号", en: "employee ID" } },
  { title: { zh: "VS Code", en: "VS Code" }, scheme: "vscode://", hint: { zh: "file/路径", en: "file/path" } },
  { title: { zh: "Outlook 邮件", en: "Outlook Mail" }, scheme: "ms-outlook://" },
];

/** Resolve a preset's display title for the active language. */
export function getQuickAppPresetTitle(preset: QuickAppPreset, language: AppLanguage): string {
  return preset.title[language] ?? preset.title.zh;
}

/** Resolve the short append-hint for the active language ("" when none). */
export function getQuickAppPresetHint(preset: QuickAppPreset, language: AppLanguage): string {
  return preset.hint ? (preset.hint[language] ?? preset.hint.zh) : "";
}

/** Match a preset, retaining Shortcuts selection after a name is appended. */
export function findQuickAppPresetByScheme(scheme: string): QuickAppPreset | undefined {
  const trimmed = scheme.trim();
  return QUICK_APP_PRESETS.find((preset) => preset.scheme === trimmed
    || (preset.scheme === "shortcuts://run-shortcut?name=" && /^shortcuts:\/\/run-shortcut\?name=/i.test(trimmed)));
}

/** Read the decoded shortcut name without including other launch parameters. */
export function getQuickShortcutName(scheme: string): string {
  try {
    const url = new URL(scheme.trim());
    if (url.protocol !== "shortcuts:" || url.hostname !== "run-shortcut") return "";
    return url.searchParams.get("name")?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Schemes that execute script or read local/user resources when activated via
 * an anchor click. They must never be launchable from a quick button, because
 * imported workspace files can plant them (stored XSS).
 */
const DANGEROUS_QUICK_APP_SCHEMES = new Set([
  "javascript",
  "data",
  "vbscript",
  "blob",
  "file",
  "filesystem",
  "view-source",
  "about",
  "chrome",
  "chrome-extension",
  "moz-extension",
  "edge",
  "resource",
  "jar",
  "ws",
  "wss",
]);

/** Extract the scheme token of a URL-like value ("" when none), ignoring the
    whitespace browsers strip inside anchors (a classic filter bypass: an anchor
    with href "jav\tascript:x" navigates to "javascript:x"). */
function getUrlScheme(value: string): string {
  const sanitized = value.replace(/[\t\n\r]/g, "").trim();
  const match = /^[a-z][a-z0-9+.\-]*:/i.exec(sanitized);
  return match ? match[0].slice(0, -1).toLowerCase() : "";
}

/** A custom URL scheme looks like `name://` or `name:` (not a plain web URL,
    not a web URL, and not a scheme that executes script or reads local files). */
export function isQuickAppScheme(value: string): boolean {
  const scheme = getUrlScheme(value);
  return scheme !== "" && scheme !== "http" && scheme !== "https" && !DANGEROUS_QUICK_APP_SCHEMES.has(scheme);
}
