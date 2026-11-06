import type { AppLanguage, StoredImage, WorkspaceData, ZoneKey } from "../types";
import { createId } from "./storage/shared";
import { getDisplayTodoListTitle } from "./i18n";

export interface ImportMergeResult {
  workspace: WorkspaceData;
  added: number;
  skipped: number;
  conflicts: number;
  imagesToPersist: StoredImage[];
}

/** Build a non-destructive import preview. Existing workspace settings stay intact. */
export function mergeImportedWorkspace(target: WorkspaceData, source: WorkspaceData, zones: readonly ZoneKey[], language: AppLanguage, copyConflicts = false): ImportMergeResult {
  const workspace: WorkspaceData = JSON.parse(JSON.stringify(target)) as WorkspaceData;
  const result: ImportMergeResult = { workspace, added: 0, skipped: 0, conflicts: 0, imagesToPersist: [] };
  const canonical = (value: unknown) => JSON.stringify(value, function (key, entry) {
    return key === "payloadId" && this.src ? undefined : entry;
  });
  const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
  const withoutId = <T extends { id: string }>(item: T) => { const { id: _id, ...rest } = item; return rest; };
  const importItem = <T extends { id: string }>(items: T[], item: T, copy: (item: T) => T = (value) => ({ ...value, id: createId() })): T | undefined => {
    const existing = items.find((value) => value.id === item.id);
    if (existing) {
      if (equal(withoutId(existing), withoutId(item))) { result.skipped++; return; }
      result.conflicts++;
      if (!copyConflicts || items.some((value) => equal(withoutId(value), withoutId(item)))) return;
      const duplicate = copy(item); items.push(duplicate); result.added++; return duplicate;
    }
    const added = JSON.parse(JSON.stringify(item)) as T;
    items.push(added); result.added++; return added;
  };
  const copyImage = (image: StoredImage): StoredImage => ({ ...image, id: createId(), ...(image.src ? { payloadId: createId() } : {}) });
  if (zones.includes("assets")) {
    for (const image of source.images) {
      // A fresh payload key prevents importing an image from overwriting an existing IndexedDB payload.
      const safe = image.src ? { ...image, payloadId: createId() } : image;
      const existing = workspace.images.find((value) => value.id === image.id);
      if (existing && equal(existing, image)) { result.skipped++; continue; }
      if (existing) {
        result.conflicts++;
        if (!copyConflicts || workspace.images.some((value) => equal(withoutId(value), withoutId(image)))) continue;
        const duplicate = copyImage(image); workspace.images.push(duplicate); result.imagesToPersist.push(duplicate); result.added++; continue;
      }
      workspace.images.push(safe); result.imagesToPersist.push(safe); result.added++;
    }
  }
  if (zones.includes("notes")) {
    const tags = new Map<string, string>();
    for (const tag of source.quickTags) {
      let existing = workspace.quickTags.find((value) => value.id === tag.id) ?? workspace.quickTags.find((value) => value.title === tag.title);
      if (!existing) { existing = { ...tag }; workspace.quickTags.push(existing); result.added++; }
      tags.set(tag.id, existing.id);
    }
    for (const button of source.quickButtons) importItem(workspace.quickButtons, { ...button, ...(button.tagId ? { tagId: tags.get(button.tagId) ?? button.tagId } : {}) });
  }
  if (zones.includes("tasks")) {
    for (const list of source.todoLists) {
      let existing = workspace.todoLists.find((value) => value.id === list.id) ?? workspace.todoLists.find((value) => getDisplayTodoListTitle(value, language) === getDisplayTodoListTitle(list, language));
      if (!existing) {
        existing = { ...list }; workspace.todoLists.push(existing); result.added++; workspace.todos[existing.id] = []; workspace.showCompletedTodos[existing.id] = false;
        workspace.todoListOrder = [...(workspace.todoListOrder ?? target.todoLists.map((value) => value.id)), existing.id];
      }
      const destination = workspace.todos[existing.id] ?? (workspace.todos[existing.id] = []);
      for (const todo of source.todos[list.id] ?? []) {
        const added = importItem(destination, todo, (value) => ({ ...value, id: createId() }));
        if (added?.focusImages) {
          added.focusImages = added.focusImages.map((image) => image.src ? { ...image, payloadId: createId() } : image);
          result.imagesToPersist.push(...added.focusImages);
        }
      }
    }
  }
  if (zones.includes("workspace")) {
    const spaces = [...source.spaces];
    if (source.noteLines.length) spaces.push({ id: `legacy-note:${source.id}`, title: language === "en" ? "Imported note" : "导入的便签", lines: source.noteLines });
    for (const space of spaces) {
      if (!space.lines.length) continue;
      const existing = workspace.spaces.find((value) => value.id === space.id);
      const copyTitle = `${space.title} (${language === "en" ? "imported" : "导入"})`;
      if (existing && !equal(withoutId(existing), withoutId(space))) {
        result.conflicts++;
        if (copyConflicts && !workspace.spaces.some((value) => value.title === copyTitle && equal(value.lines, space.lines))) {
          workspace.spaces.push({ ...space, id: createId(), title: copyTitle }); result.added++;
        }
      } else importItem(workspace.spaces, space);
    }
  }
  return result;
}
