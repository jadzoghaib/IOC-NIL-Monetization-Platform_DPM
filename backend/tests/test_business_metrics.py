"""Tests for the canonical sponsorship metrics (services/business_metrics.py).

The module is md5-seeded on athlete id, so output must be fully deterministic for
a fixed athlete — that determinism is what lets the list endpoint, Campaign
Builder, and the detail page all agree on a tier.
"""
from services.business_metrics import compute_business_metrics


ATHLETE = {
    "id": "fixed-athlete-001",
    "name": "Test Athlete",
    "country": "United States",
    "sport": "Athletics",
    "pageviews_60d": 120000,
    "stars": 4.5,
    "is_medalist": True,
    "medal_totals": {"gold": 1, "silver": 0, "bronze": 1},
    "games": ["paris_2024"],
}


def test_deterministic_for_fixed_id():
    a = compute_business_metrics(dict(ATHLETE))
    b = compute_business_metrics(dict(ATHLETE))
    assert a == b  # same input → byte-identical output (no live randomness)


def test_score_and_tier_in_range():
    m = compute_business_metrics(dict(ATHLETE))
    assert 10 <= m["marketability_score"] <= 100
    assert m["deal_tier"] in {"Elite", "Pro", "Rising", "Micro"}


def test_tier_matches_canonical_thresholds():
    m = compute_business_metrics(dict(ATHLETE))
    s = m["marketability_score"]
    expected = "Elite" if s >= 80 else "Pro" if s >= 65 else "Rising" if s >= 45 else "Micro"
    assert m["deal_tier"] == expected


def test_gold_medalist_outperforms_unknown():
    star = compute_business_metrics(dict(ATHLETE))
    nobody = compute_business_metrics({
        "id": "nobody-002", "name": "Nobody", "country": "India",
        "sport": "Archery", "pageviews_60d": 500, "stars": 1.0,
        "is_medalist": False, "medal_totals": {}, "games": ["paris_2024"],
    })
    assert star["marketability_score"] > nobody["marketability_score"]


def test_available_categories_are_a_subset():
    m = compute_business_metrics(dict(ATHLETE))
    cats = {c["category"] for c in m["category_availability"]}
    available = {c["category"] for c in m["category_availability"] if c["available"]}
    assert available <= cats
