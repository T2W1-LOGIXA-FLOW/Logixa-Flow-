"use client";

import { useState } from "react";

export default function SocialShare({ path, url, title }: { path?: string; url?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = (() => {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.origin + (path || "");
    // server fallback
    return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000") + (path || "");
  })();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title || "")}&url=${encodeURIComponent(shareUrl)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const mailto = `mailto:?subject=${encodeURIComponent(title || "")}&body=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="social-share flex items-center space-x-2 mt-3">
      <a href={twitter} target="_blank" rel="noreferrer" className="ghost-button" title="Share on Twitter">
        🐦
      </a>
      <a href={linkedin} target="_blank" rel="noreferrer" className="ghost-button" title="Share on LinkedIn">
        💼
      </a>
      <a href={facebook} target="_blank" rel="noreferrer" className="ghost-button" title="Share on Facebook">
        📘
      </a>
      <a href={mailto} className="ghost-button" title="Share via email">
        ✉️
      </a>
      <button type="button" onClick={copyLink} className="ghost-button" title="Copy link">
        {copied ? "Copied" : "🔗"}
      </button>
    </div>
  );
}
