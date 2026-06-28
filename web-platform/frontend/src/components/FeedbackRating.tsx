"use client";

import { useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "./api";

interface FeedbackRatingProps {
  runId: number;
  token: string;
}

export default function FeedbackRating({ runId, token }: FeedbackRatingProps) {
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitRating(value: "positive" | "negative") {
    if (rating !== null || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await adminFetch("/api/admin/agent/feedback", token, {
        method: "POST",
        body: JSON.stringify({ run_id: runId, rating: value }),
      });

      setRating(value);
      toast.success("Thanks for your feedback!");
    } catch {
      toast.error("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabled = isSubmitting || rating !== null;

  return (
    <div className="feedback-rating">
      <p className="feedback-label">Was this response helpful?</p>
      <div className="feedback-buttons">
        <button
          type="button"
          onClick={() => submitRating("negative")}
          disabled={disabled}
          className={`feedback-button thumbs-down ${rating === "negative" ? "active" : ""}`}
          title="Not helpful"
          aria-pressed={rating === "negative"}
        >
          <span className="text-xl">👎</span>
        </button>
        <button
          type="button"
          onClick={() => submitRating("positive")}
          disabled={disabled}
          className={`feedback-button thumbs-up ${rating === "positive" ? "active" : ""}`}
          title="Helpful"
          aria-pressed={rating === "positive"}
        >
          <span className="text-xl">👍</span>
        </button>
      </div>
    </div>
  );
}
