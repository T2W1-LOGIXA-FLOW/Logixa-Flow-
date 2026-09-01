import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import RichTextEditor from "./RichTextEditor";

describe("RichTextEditor", () => {
  it("renders the editor and sanitizes user content", async () => {
    document.execCommand = vi.fn();
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RichTextEditor value="<script>alert(1)</script><p>Safe text</p>" onChange={onChange} />);

    const editor = screen.getByRole("textbox", { name: /insight rich text content/i });
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveTextContent("Safe text");
    expect(editor).not.toHaveTextContent("<script>");

    await user.clear(editor);
    await user.type(editor, "Hello world");

    expect(onChange).toHaveBeenCalled();
  });
});
