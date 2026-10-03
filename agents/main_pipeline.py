from __future__ import annotations

import argparse

from config import AUTO_APPROVE_PUBLISH, PIPELINE_BATCH_LIMIT
from collector import fetch_articles
from manager import deduplicate_and_merge
from publisher import publish_draft
from writer import process_raw_articles


def run_pipeline(
    publish: bool = False,
    *,
    sync_web: bool = False,
    push_brain: bool = False,
    web_pipeline: bool = False,
) -> None:
    print("=== Phase 1: Collect SCM News ===")
    raw_file = fetch_articles()

    print("\n=== Phase 2: Generate Myanmar Business Drafts ===")
    process_raw_articles(raw_file=raw_file, limit=PIPELINE_BATCH_LIMIT)

    print("\n=== Phase 3: Deduplicate, Merge, and Version Drafts ===")
    ready_drafts = deduplicate_and_merge()

    print("\n=== Phase 4: Approval-Gated Publishing ===")
    if publish:
        for draft_path in ready_drafts:
            publish_draft(draft_path, approved=AUTO_APPROVE_PUBLISH)
    else:
        print("Publishing skipped. Run publisher.py with --approve for a selected draft.")

    if sync_web or push_brain or web_pipeline:
        from bridge import LogixaWebBridge

        bridge = LogixaWebBridge()
        if web_pipeline:
            print("\n=== Web integration: full preview pipeline ===")
            result = bridge.run_pipeline_preview()
            print(json_preview(result))
        else:
            if sync_web:
                print("\n=== Web integration: sync RSS feeds to sources ===")
                print(json_preview(bridge.sync_feeds()))
            if push_brain:
                print("\n=== Web integration: push CLI drafts to brain queue ===")
                print(json_preview(bridge.import_drafts(limit=PIPELINE_BATCH_LIMIT)))

    print("\nPipeline completed.")


def json_preview(payload: object) -> str:
    import json

    return json.dumps(payload, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Logixa Flow agents pipeline")
    parser.add_argument("--publish", action="store_true", help="Publish approved drafts (off by default)")
    parser.add_argument("--sync-web", action="store_true", help="Sync default RSS feeds into web intelligence sources")
    parser.add_argument("--push-brain", action="store_true", help="Import recent CLI drafts into web brain queue")
    parser.add_argument(
        "--web-pipeline",
        action="store_true",
        help="Call web integration API: sync feeds + import drafts + agent preview (no publish)",
    )
    args = parser.parse_args()
    run_pipeline(
        publish=args.publish,
        sync_web=args.sync_web,
        push_brain=args.push_brain,
        web_pipeline=args.web_pipeline,
    )
