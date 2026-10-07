from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from html import unescape
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import feedparser

from config import RAW_DIR, RSS_FEEDS


@dataclass(frozen=True)
class RawArticle:
    id: str
    title: str
    summary: str
    link: str
    published: str | None
    source_feed: str
    collected_at: str


def clean_html(value: str | None) -> str:
    if not value:
        return ""
    text = re.sub(r"<[^>]+>", " ", unescape(value))
    return re.sub(r"\s+", " ", text).strip()


def canonicalize_url(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if "url" in query and parsed.hostname and (
        parsed.hostname == "google.com" or parsed.hostname.endswith(".google.com")
    ):
        candidate = unquote(query["url"][0])
        candidate_parsed = urlparse(candidate)
        if candidate_parsed.scheme in {"http", "https"} and candidate_parsed.netloc:
            return candidate_parsed._replace(fragment="").geturl()
    return parsed._replace(fragment="").geturl()


def hash_url(url: str) -> str:
    return hashlib.sha256(canonicalize_url(url).encode("utf-8")).hexdigest()[:24]


def fetch_articles(feeds: list[str] | None = None, output_dir: Path = RAW_DIR) -> Path:
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    collected_at = datetime.now(UTC).isoformat()
    seen: set[str] = set()
    articles: list[RawArticle] = []

    for feed_url in feeds or RSS_FEEDS:
        parsed_feed = feedparser.parse(feed_url)
        for entry in parsed_feed.entries:
            link = canonicalize_url(entry.get("link", ""))
            if not link:
                continue
            article_id = hash_url(link)
            if article_id in seen:
                continue
            seen.add(article_id)
            articles.append(
                RawArticle(
                    id=article_id,
                    title=clean_html(entry.get("title")),
                    summary=clean_html(entry.get("summary") or entry.get("description")),
                    link=link,
                    published=entry.get("published") or entry.get("updated"),
                    source_feed=feed_url,
                    collected_at=collected_at,
                )
            )

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{today}.jsonl"
    with output_path.open("w", encoding="utf-8") as handle:
        for article in articles:
            handle.write(json.dumps(asdict(article), ensure_ascii=False) + "\n")

    print(f"Collected {len(articles)} unique articles -> {output_path}")
    return output_path


if __name__ == "__main__":
    fetch_articles()
