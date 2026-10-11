from types import SimpleNamespace

from app.routers.agent import build_steps, generate_local_brief


def test_build_steps_sanitizes_objective_without_name_error() -> None:
    steps = build_steps("Assess supplier lead-time risk", [])

    assert steps[0] == ("planner", "Objective parsed: Assess supplier lead-time risk")
    assert len(steps) == 5


def test_local_brief_escapes_untrusted_html() -> None:
    source = SimpleNamespace(
        category="<img src=x onerror=alert(1)>",
        title="<script>alert(1)</script>",
        notes="<svg onload=alert(1)>source note</svg>",
    )

    brief = generate_local_brief("<script>alert(1)</script>", [source])

    assert "<script>" not in brief["content"]
    assert "<img" not in brief["content"]
    assert "<svg" not in brief["content"]
    assert "&lt;script&gt;" in brief["content"]
    assert "&lt;svg" in brief["content"]
