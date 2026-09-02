export const MAX_IMPORT_SIZE_BYTES = 1024 * 1024;

export type ImportValidation = {
  valid: boolean;
  title: string;
  error?: string;
};

export function validateImportFile(file: File): ImportValidation {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension !== "txt" && extension !== "md") {
    return {
      valid: false,
      title: file.name.replace(/\.[^.]+$/, "") || "Imported Document",
      error: "Unsupported file type. Please upload a .txt or .md file.",
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      title: file.name.replace(/\.[^.]+$/, "") || "Imported Document",
      error: "The selected file is empty.",
    };
  }

  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return {
      valid: false,
      title: file.name.replace(/\.[^.]+$/, "") || "Imported Document",
      error: "The selected file is larger than 1 MB.",
    };
  }

  return {
    valid: true,
    title: file.name.replace(/\.[^.]+$/, "") || "Imported Document",
  };
}

export function parseInlineMarkdown(text: string) {
  if (!text) {
    return [{ type: "text", text: "" }];
  }

  const result: Array<{ type: "text"; text: string; marks?: Array<{ type: "bold" | "italic" }> }> = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    const innerText = token.replace(/^\*\*|^__|^\*|^_/, "").replace(/\*\*$|__$|\*$|_$/, "");
    const markType = token.startsWith("**") || token.startsWith("__") ? "bold" : "italic";

    result.push({
      type: "text",
      text: innerText,
      marks: [{ type: markType }],
    });

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", text: text.slice(lastIndex) });
  }

  return result;
}

export function markdownToTipTapDocument(rawText: string) {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    throw new Error("File is empty.");
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const content: Array<Record<string, unknown>> = [];

  for (const block of blocks) {
    const headingMatch = block.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6);
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInlineMarkdown(headingMatch[2]),
      });
      continue;
    }

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const bulletList = lines.every((line) => /^[-*]\s+/.test(line));
    const orderedList = lines.every((line) => /^\d+\.\s+/.test(line));

    if (bulletList) {
      content.push({
        type: "bulletList",
        content: lines.map((line) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkdown(line.replace(/^[-*]\s+/, "")),
            },
          ],
        })),
      });
      continue;
    }

    if (orderedList) {
      content.push({
        type: "orderedList",
        content: lines.map((line) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkdown(line.replace(/^\d+\.\s+/, "")),
            },
          ],
        })),
      });
      continue;
    }

    const text = lines.join(" ").replace(/\s+/g, " ").trim();
    if (!text) {
      continue;
    }

    content.push({
      type: "paragraph",
      content: parseInlineMarkdown(text),
    });
  }

  if (content.length === 0) {
    throw new Error("No readable content was found in the file.");
  }

  return { type: "doc", content };
}
