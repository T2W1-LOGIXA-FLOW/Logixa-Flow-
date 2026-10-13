from datetime import datetime, timezone

import pytest

from app.routers.agent import _post_category_for_brain
from app.schemas import AiMemoryOut


def test_brain_output_preserves_internal_category_labels() -> None:
    now = datetime.now(timezone.utc)
    item = AiMemoryOut(
        id=123,
        category="Logixa Flow Insight",
        source_title="Example source",
        source_url=None,
        prompt="Review this source",
        content="A sufficiently long internal draft content body.",
        summary="Internal summary",
        status="pending",
        is_public=False,
        post_slug=None,
        confidence_score=0.5,
        hallucination_score=0.2,
        created_at=now,
        updated_at=now,
    )

    assert item.category == "Logixa Flow Insight"


@pytest.mark.parametrize(
    ("brain_category", "expected"),
    [
        ("Supply Chain", "Supply Chain"),
        ("Supply Chain Insight", "Supply Chain"),
        ("Logixa Flow Insight", "Supply Chain"),
        ("Logistics Insight", "Logistics"),
        ("Procurement Intelligence", "Procurement"),
        ("Operations Excellence Brief", "Operations Excellence"),
        ("Logixa Flow Daily Brief", "News"),
        (None, "Supply Chain"),
    ],
)
def test_brain_category_maps_to_public_post_taxonomy(
    brain_category: str | None, expected: str
) -> None:
    assert _post_category_for_brain(brain_category) == expected
