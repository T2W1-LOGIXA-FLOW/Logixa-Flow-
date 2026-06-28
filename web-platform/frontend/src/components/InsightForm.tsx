"use client";

import { useState } from "react";
import { toast } from "sonner";

import { adminFetch } from "./api";
import RichTextEditor from "./RichTextEditor";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export default function InsightForm({
  token,
}: {
  token: string;
}) {
  const [contentHtml, setContentHtml] = useState("<p>Write the insight here...</p>");

  async function submit(formElement: HTMLFormElement, status: "draft" | "published") {
    toast.loading(status === "draft" ? "Saving draft..." : "Publishing insight...");
    const form = new FormData(formElement);
    let imageUrl = "";
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      const uploadForm = new FormData();
      uploadForm.set("file", file);
      const upload = await adminFetch("/api/uploads", token, { method: "POST", body: uploadForm });
      imageUrl = (await upload.json()).url;
    }
    const title = String(form.get("title"));
    const payload = {
      title,
      slug: slugify(String(form.get("slug")) || title),
      type: String(form.get("type") || "analysis"),
      category: String(form.get("category") || "Supply Chain"),
      excerpt: String(form.get("excerpt") || ""),
      image_url: imageUrl || null,
      content_html: contentHtml,
      status,
      is_published: status === "published",
    };
    await adminFetch("/api/posts", token, { method: "POST", body: JSON.stringify(payload) });
    formElement.reset();
    setContentHtml("<p>Write the insight here...</p>");
    toast.success(status === "draft" ? "Draft saved." : "Insight published.");
  }

  return (
    <form
      className="admin-panel cms-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget, "draft");
      }}
    >
      <p className="eyebrow">CMS</p>
      <h2>Create Insight</h2>
      <label>
        Title
        <input name="title" required minLength={3} />
      </label>
      <label>
        Slug
        <input name="slug" placeholder="optional, auto-generated from title" />
      </label>
      <label>
        Type
        <select name="type" defaultValue="analysis">
          <option value="news">News</option>
          <option value="education">Education</option>
          <option value="analysis">Analysis</option>
        </select>
      </label>
      <label>
        Category
        <select name="category" defaultValue="Supply Chain">
          <option value="Supply Chain">Supply Chain</option>
          <option value="Logistics">Logistics</option>
          <option value="Procurement">Procurement</option>
          <option value="Operations Excellence">Operations Excellence</option>
          <option value="News">News</option>
        </select>
      </label>
      <label>
        Excerpt
        <textarea name="excerpt" rows={3} />
      </label>
      <label>
        Featured Photo
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </label>
      <label>
        Content
        <RichTextEditor value={contentHtml} onChange={setContentHtml} />
      </label>
      <div className="dual-action-row">
        <button className="ghost-button" type="submit">
          Save as Draft
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={(event) => {
            if (event.currentTarget.form?.reportValidity()) {
              submit(event.currentTarget.form, "published");
            }
          }}
        >
          Publish Now
        </button>
      </div>
    </form>
  );
}
