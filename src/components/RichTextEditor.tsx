"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  disabled?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: (() => {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object" && parsed.type === "doc") {
          return parsed;
        }
      } catch {
        // Invalid JSON, use default
      }
      return { type: "doc", content: [{ type: "paragraph" }] };
    })(),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editable: !disabled,
  });

  useEffect(() => {
    if (editor && disabled !== editor.isEditable) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="border border-gray-200 rounded bg-white">
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <ToolbarButton
            command={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive("paragraph")}
            title="Paragraph"
            disabled={disabled}
          >
            ¶
          </ToolbarButton>
          <ToolbarButton
            command={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
            disabled={disabled}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            command={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
            disabled={disabled}
          >
            H2
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1"></div>

          <ToolbarButton
            command={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
            disabled={disabled}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            command={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
            disabled={disabled}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            command={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline (Ctrl+U)"
            disabled={disabled}
          >
            <u>U</u>
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1"></div>

          <ToolbarButton
            command={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
            disabled={disabled}
          >
            •
          </ToolbarButton>
          <ToolbarButton
            command={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Ordered List"
            disabled={disabled}
          >
            1.
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1"></div>

          <ToolbarButton
            command={() => editor.chain().focus().undo().run()}
            title="Undo (Ctrl+Z)"
            disabled={disabled || !editor.can().undo()}
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            command={() => editor.chain().focus().redo().run()}
            title="Redo (Ctrl+Y)"
            disabled={disabled || !editor.can().redo()}
          >
            ↷
          </ToolbarButton>
        </div>

        <div className="prose prose-sm max-w-none p-4 focus-within:outline-none">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  command: () => void;
  isActive?: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({
  command,
  isActive = false,
  title,
  disabled = false,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={command}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`px-2 py-1 rounded text-sm font-medium transition ${
        isActive
          ? "bg-blue-500 text-white"
          : "bg-white text-gray-700 hover:bg-gray-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}
