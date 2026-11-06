import { describe, expect, it } from "vitest";
import { defaultWorkspace } from "../state/defaults";
import { mergeImportedWorkspace } from "../state/workspaceImport";

describe("workspace import merge", () => {
  it("adds new items, skips identical items and preserves conflicting local data and settings", () => {
    const target = defaultWorkspace("target");
    target.quickButtons = [{ id: "same", title: "Local", value: "local", type: "text", hidden: false }];
    target.spaces[0].lines = [{ text: "local note", indent: 0 }];
    const source = defaultWorkspace("source");
    source.quickButtons = [{ id: "same", title: "Remote", value: "remote", type: "text", hidden: false }, { id: "new", title: "New", value: "new", type: "text", hidden: false }];
    source.spaces[0].lines = [{ text: "remote note", indent: 0 }];
    source.todos.morning = [{ id: "todo", text: "task", done: false }];
    const preview = mergeImportedWorkspace(target, source, ["notes", "tasks", "workspace"], "zh");
    expect(preview.conflicts).toBe(2);
    expect(preview.workspace.quickButtons.map((item) => item.title)).toEqual(["Local", "New"]);
    expect(preview.workspace.spaces[0].lines[0].text).toBe("local note");
    expect(target.quickButtons).toHaveLength(1);
    const repeat = mergeImportedWorkspace(preview.workspace, source, ["notes", "tasks", "workspace"], "zh");
    expect(repeat.added).toBe(0);
    expect(repeat.skipped).toBeGreaterThanOrEqual(2);
    const copies = mergeImportedWorkspace(preview.workspace, source, ["notes", "tasks", "workspace"], "zh", true);
    expect(copies.workspace.quickButtons.map((item) => item.title)).toEqual(["Local", "New", "Remote"]);
    expect(copies.workspace.spaces[1].lines[0].text).toBe("remote note");
    expect(mergeImportedWorkspace(copies.workspace, source, ["notes", "tasks", "workspace"], "zh", true).added).toBe(0);
  });

  it("limits changes to selected areas and isolates image payloads", () => {
    const target = defaultWorkspace("target");
    target.images = [{ id: "same", src: "data:image/png;base64,local", payloadId: "same-key", createdAt: 1 }];
    const source = defaultWorkspace("source");
    source.images = [{ id: "same", src: "data:image/png;base64,remote", payloadId: "same-key", createdAt: 1 }, { id: "new", src: "data:image/png;base64,new", payloadId: "same-key", createdAt: 2 }];
    source.todos.morning = [{ id: "new-task", text: "not selected", done: false }];
    const result = mergeImportedWorkspace(target, source, ["assets"], "zh", true);
    expect(result.conflicts).toBe(1);
    expect(result.workspace.todos.morning).toEqual([]);
    expect(result.imagesToPersist).toHaveLength(2);
    expect(result.imagesToPersist.every((image) => image.payloadId !== "same-key")).toBe(true);
    expect(mergeImportedWorkspace(result.workspace, source, ["assets"], "zh", true).added).toBe(0);
  });
});
