"""Tests for the connection-driven fan matching (routes/matching.py).

Uses a tiny synthetic athlete pool (monkeypatched in for `_load`) so the tests
are fast and deterministic rather than loading the full ~11k-athlete JSON.
"""
import pytest

import routes.matching as matching
from routes.matching import match, MatchProfile


SAMPLE = [
    {"id": "a1", "name": "Home Hero",    "country": "France", "sport": "Athletics",
     "is_medalist": True,  "stars": 4.0, "pageviews_60d": 80000,  "games": ["paris_2024"]},
    {"id": "a2", "name": "Far Star",     "country": "Japan",  "sport": "Swimming",
     "is_medalist": True,  "stars": 5.0, "pageviews_60d": 200000, "games": ["paris_2024"]},
    {"id": "a3", "name": "Local Rower",  "country": "France", "sport": "Rowing",
     "is_medalist": False, "stars": 2.0, "pageviews_60d": 3000,   "games": ["paris_2024"]},
    {"id": "a4", "name": "Winter Skier", "country": "France", "sport": "Alpine Skiing",
     "is_medalist": True,  "stars": 4.5, "pageviews_60d": 90000,  "games": ["milan_2026"]},
]


@pytest.fixture(autouse=True)
def _patch_pool(monkeypatch):
    monkeypatch.setattr(matching, "_load", lambda: [dict(a) for a in SAMPLE])


def test_country_match_dominates_ranking():
    res = match(MatchProfile(country="France", games="paris_2024"))
    top = res["matches"][0]["athlete"]
    # The +50 country weight should put a French athlete on top of the higher-star
    # Japanese one, and both French athletes should count in the diagnostics.
    assert top["country"] == "France"
    assert res["diagnostics"]["from_your_country"] == 2  # a1 + a3 (a4 is Milan → filtered)


def test_sport_alias_maps_track_to_athletics():
    res = match(MatchProfile(childhood_sports=["Track"], games="paris_2024"))
    reasons = {m["athlete"]["id"]: [r["label"] for r in m["reasons"]] for m in res["matches"]}
    assert any("your sport" in lbl for lbl in reasons.get("a1", []))


def test_personality_grind_adds_distinct_bonus():
    base = match(MatchProfile(games="paris_2024"))
    grind = match(MatchProfile(personality="grind", games="paris_2024"))
    base_a1  = next(m for m in base["matches"]  if m["athlete"]["id"] == "a1")["score"]
    grind_a1 = next(m for m in grind["matches"] if m["athlete"]["id"] == "a1")["score"]
    assert grind_a1 == base_a1 + 6  # a1 is a medalist → grind bonus applies


def test_games_filter_excludes_other_games():
    res = match(MatchProfile(games="milan_2026"))
    ids = {m["athlete"]["id"] for m in res["matches"]}
    assert ids == {"a4"}
