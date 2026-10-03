from __future__ import annotations

import json
import re
from pathlib import Path

import requests

from config import BACKEND_URL, agent_service_headers
from manager import archive_draft


def markdown_to_html(markdown: str) -> str:
    html_lines: list[str] = []
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("### "):
            html_lines.append(f"<h1>{line[4:]}</h1>")
        elif line.startswith("Hook:"):
            html_lines.append(f"<p><strong>Hook:</strong>{line[5:]}</p>")
        elif line.startswith("Analysis"):
            label, _, content = line.partition(":")
            html_lines.append(f"<h2>{label}</h2><p>{content.strip()}</p>")
        elif line.startswith("Actionable Insight"):
            label, _, content = line.partition(":")
            html_lines.append(f"<h2>{label}</h2><p>{content.strip()}</p>")
        else:
            html_lines.append(f"<p>{line}</p>")
    return "\n".join(html_lines)


def build_payload(draft: dict, publish: bool = True) -> dict:
    return {
        "title": draft["title"],
        "slug": draft["slug"],
        "type": "news",
        "category": draft.get("category", "Supply Chain"),
        "excerpt": re.sub(r"\s+", " ", draft.get("content_markdown", ""))[:220],
        "content_html": markdown_to_html(draft["content_markdown"]),
        "image_url": draft.get("image_url"),
        "source_url": draft.get("source_url"),
        "is_published": publish,
        "status": "published" if publish else "draft",
    }


def publish_post(post_data: dict) -> dict:
    base_slug = post_data["slug"]
    for suffix in range(1, 51):
        payload = post_data.copy()
        payload["slug"] = base_slug if suffix == 1 else f"{base_slug}-{suffix}"
        response = requests.post(
            f"{BACKEND_URL}/api/posts",
            json=payload,
            headers=agent_service_headers(),
            timeout=30,
        )
        if response.status_code != 409:
            response.raise_for_status()
            return response.json()
    raise RuntimeError(f"Could not publish draft with a unique slug based on {base_slug!r}")


def publish_draft(draft_path: Path, approved: bool = False, archive: bool = True) -> dict | None:
    if not approved:
        print(f"Approval required before publishing: {draft_path}")
        return None
    draft = json.loads(draft_path.read_text(encoding="utf-8"))
    result = publish_post(build_payload(draft, publish=True))
    if archive:
        archive_draft(draft_path)
    print(f"Published: {result.get('slug')}")
    return result


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Publish an approved Logixa Flow draft.")
    parser.add_argument("draft", type=Path)
    parser.add_argument("--approve", action="store_true")
    args = parser.parse_args()
    publish_draft(args.draft, approved=args.approve)
