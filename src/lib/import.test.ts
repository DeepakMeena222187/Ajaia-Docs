import { describe, expect, it } from "vitest";
import { markdownToTipTapDocument, validateImportFile } from "./import";

describe("import validation and markdown conversion", () => {
  it("rejects unsupported, empty, and oversized files", () => {
    const unsupported = new File(["hello"], "notes.csv", { type: "text/csv" });
    expect(validateImportFile(unsupported).valid).toBe(false);

    const empty = new File([""], "empty.txt", { type: "text/plain" });
    expect(validateImportFile(empty).valid).toBe(false);

    const tooLarge = new File([new Uint8Array(1024 * 1024 + 1)], "large.md", { type: "text/markdown" });
    expect(validateImportFile(tooLarge).valid).toBe(false);

    const valid = new File(["# Title\n\nHello world"], "notes.md", { type: "text/markdown" });
    expect(validateImportFile(valid).valid).toBe(true);
  });

  it("converts markdown headings and paragraphs into TipTap-compatible content", () => {
    const doc = markdownToTipTapDocument("# Title\n\nThis is a paragraph.\n\n- item one\n- item two");

    expect(doc.type).toBe("doc");
    expect(doc.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "heading", attrs: { level: 1 } }),
        expect.objectContaining({ type: "paragraph" }),
        expect.objectContaining({ type: "bulletList" }),
      ])
    );
  });
});
