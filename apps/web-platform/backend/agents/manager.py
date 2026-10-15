from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from pathlib import Path

from config import DRAFTS_DIR, MIN_SIMILARITY_TO_MERGE, PROCESSED_DIR


@dataclass
class ManagedDraft:
    path: Path
    payload: dict


def load_drafts(directory: Path = DRAFTS_DIR) -> list[ManagedDraft]:
    drafts: list[ManagedDraft] = []
    for path in sorted(directory.glob("*.json")):
        try:
            drafts.append(ManagedDraft(path=path, payload=json.loads(path.read_text(encoding="utf-8"))))
        except json.JSONDecodeError:
            print(f"Skipping invalid draft: {path}")
    return drafts


def similarity(left: str, right: str) -> float:
    return SequenceMatcher(None, left.lower(), right.lower()).ratio()


def merge_content(primary: dict, duplicate: dict) -> dict:
    primary_text = primary.get("content_markdown", "")
    duplicate_text = duplicate.get("content_markdown", "")
    if duplicate_text and duplicate_text not in primary_text:
        primary["content_markdown"] = (
            primary_text.rstrip()
            + "\n\nAnalysis (ထပ်ဆောင်းအချက်): ဆက်စပ်သတင်းတစ်ခုမှ ထပ်မံတွေ့ရသော အချက်အလက်များကိုလည်း ထည့်သွင်းစဉ်းစားထားသည်။"
        )
    primary.setdefault("merged_source_urls", [])
    primary["merged_source_urls"].append(duplicate.get("source_url"))
    primary["updated_at"] = datetime.now(UTC).isoformat()
    return primary


def create_version_snapshot(path: Path) -> Path:
    version_dir = path.parent / ".versions" / path.stem
    version_dir.mkdir(parents=True, exist_ok=True)
    snapshot = version_dir / f"{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}.json"
    shutil.copy2(path, snapshot)
    return snapshot


def rollback_draft(draft_path: Path, version_path: Path) -> Path:
    if not draft_path.exists():
        raise FileNotFoundError(f"Draft not found: {draft_path}")
    if not version_path.exists():
        raise FileNotFoundError(f"Version not found: {version_path}")
    create_version_snapshot(draft_path)
    shutil.copy2(version_path, draft_path)
    return draft_path


def deduplicate_and_merge(directory: Path = DRAFTS_DIR) -> list[Path]:
    drafts = load_drafts(directory)
    kept: list[ManagedDraft] = []
    duplicate_paths: list[Path] = []

    for draft in drafts:
        title = draft.payload.get("title", "")
        body = draft.payload.get("content_markdown", "")
        matched: ManagedDraft | None = None
        for existing in kept:
            score = max(
                similarity(title, existing.payload.get("title", "")),
                similarity(body[:900], existing.payload.get("content_markdown", "")[:900]),
            )
            if score >= MIN_SIMILARITY_TO_MERGE:
                matched = existing
                break
        if matched:
            create_version_snapshot(matched.path)
            matched.payload = merge_content(matched.payload, draft.payload)
            matched.path.write_text(json.dumps(matched.payload, ensure_ascii=False, indent=2), encoding="utf-8")
            duplicate_archive = PROCESSED_DIR / "duplicates"
            duplicate_archive.mkdir(parents=True, exist_ok=True)
            destination = duplicate_archive / draft.path.name
            shutil.move(str(draft.path), destination)
            duplicate_paths.append(destination)
        else:
            kept.append(draft)

    print(f"Managed {len(kept)} drafts; archived {len(duplicate_paths)} duplicates.")
    return [item.path for item in kept]


def archive_draft(draft_path: Path) -> Path:
    if not draft_path.exists():
        raise FileNotFoundError(f"Draft not found: {draft_path}")
    archive_dir = PROCESSED_DIR / "published" / datetime.now(UTC).strftime("%Y-%m")
    archive_dir.mkdir(parents=True, exist_ok=True)
    destination = archive_dir / draft_path.name
    shutil.move(str(draft_path), destination)
    return destination


if __name__ == "__main__":
    deduplicate_and_merge()
