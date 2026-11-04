import { afterEach, expect, it, vi } from "vitest";
import { useImageTransform } from "../composables/useImageTransform";

afterEach(() => vi.unstubAllGlobals());

it("sets the default image width in screen pixels and keeps it through zoom", () => {
  vi.stubGlobal("devicePixelRatio", 2);
  const transform = useImageTransform();
  const image = document.createElement("img");
  Object.defineProperty(image, "naturalWidth", { value: 1200 });
  transform.onImageLoad({ currentTarget: image } as unknown as Event);

  expect(transform.activeImageStyle.value["--preview-natural-width"]).toBe("600px");
  transform.adjustZoom(1);
  transform.resetTransform();
  expect(transform.activeImageStyle.value["--preview-natural-width"]).toBe("600px");
});
