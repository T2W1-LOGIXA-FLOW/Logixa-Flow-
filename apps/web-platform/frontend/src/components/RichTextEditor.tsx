"use client";

import { useRef } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";

const tools = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "UL", command: "insertUnorderedList" },
  { label: "H2", command: "formatBlock", value: "h2" },
  { label: "P", command: "formatBlock", value: "p" },
];

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  function run(command: string, valueArg?: string) {
    document.execCommand(command, false, valueArg);
    onChange(sanitizeHtml(editorRef.current?.innerHTML || ""));
  }

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" aria-label="Rich text formatting">
        {tools.map((tool) => (
          <button key={`${tool.command}-${tool.label}`} type="button" onClick={() => run(tool.command, tool.value)}>
            {tool.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rich-surface"
        contentEditable
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        onInput={(event) => onChange(sanitizeHtml(event.currentTarget.innerHTML))}
        role="textbox"
        aria-label="Insight rich text content"
        suppressContentEditableWarning
      />
    </div>
  );
}
