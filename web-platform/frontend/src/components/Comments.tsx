"use client";
import { useState } from "react";
import { adminFetch } from "./api";
import { toast } from "sonner";

export default function Comments({ postId }: { postId: number }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("logixa_token");
      if (!token) throw new Error("Login required");
      await adminFetch("/api/comments", token, {
        method: "POST",
        body: JSON.stringify({ text, post_id: postId }),
      });
      toast.success("Comment posted");
      setText("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Comment failed (possibly inappropriate language)";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-semibold mb-3">Comments</h3>
      <textarea
        className="w-full p-3 border rounded-lg"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts..."
      />
      <button
        className="mt-2 px-4 py-2 bg-cyan text-white rounded-lg"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Posting..." : "Post Comment"}
      </button>
    </div>
  );
}
