from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace

from app.routers.usage import admin_usage_trend


class _Query:
    def __init__(self, rows):
        self.rows = rows

    def order_by(self, *_args):
        return self

    def all(self):
        return self.rows


class _DB:
    def __init__(self, rows):
        self.rows = rows

    def query(self, *_args):
        return _Query(self.rows)


def test_admin_usage_trend_aggregates_decimal_costs_without_type_error():
    rows = [
        SimpleNamespace(
            created_at=datetime(2026, 11, 12, 1, tzinfo=timezone.utc),
            tokens_used=120,
            cost=Decimal("0.125"),
        ),
        SimpleNamespace(
            created_at=datetime(2026, 11, 12, 9, tzinfo=timezone.utc),
            tokens_used=80,
            cost=Decimal("0.375"),
        ),
        SimpleNamespace(
            created_at=datetime(2026, 11, 13, 1, tzinfo=timezone.utc),
            tokens_used=10,
            cost=None,
        ),
    ]

    result = admin_usage_trend(start=None, end=None, db=_DB(rows), _={})

    assert result == {
        "daily": [
            {"date": "2026-11-12", "tokens": 200, "cost": 0.5, "calls": 2},
            {"date": "2026-11-13", "tokens": 10, "cost": 0.0, "calls": 1},
        ]
    }


def test_admin_usage_trend_applies_date_filters_after_aggregation():
    rows = [
        SimpleNamespace(
            created_at=datetime(2026, 11, 12, 1, tzinfo=timezone.utc),
            tokens_used=120,
            cost=Decimal("0.125"),
        ),
        SimpleNamespace(
            created_at=datetime(2026, 11, 13, 1, tzinfo=timezone.utc),
            tokens_used=10,
            cost=Decimal("0.25"),
        ),
    ]

    result = admin_usage_trend(
        start="2026-11-13", end="2026-11-13", db=_DB(rows), _={}
    )

    assert result["daily"] == [
        {"date": "2026-11-13", "tokens": 10, "cost": 0.25, "calls": 1}
    ]
