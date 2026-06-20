"""
athlete_labels.py — fan-connection archetype for every athlete.

This is the SINGLE SOURCE OF TRUTH for the eight "why would a fan feel something
for this person?" labels shown on the Discover grid and athlete profile. The
frontend (src/lib/athleteLabel.ts) mirrors this logic exactly, but the backend
owns it so the Discover filter can run across the WHOLE dataset (not just the
loaded page) — otherwise rare categories like "Hometown Hero" or "The Grinder"
look empty and "Load more" appears to add one athlete at a time.

Every signal used here is derived from the Wikipedia / Wikidata ingest:
  - medal_totals (gold/silver/bronze)  → Wikipedia "Medalists at the …" category
  - is_flagbearer_open/close           → NOC page parsing
  - games (list)                       → which Olympics the athlete appears in
  - pageviews_60d                      → Wikipedia page attention (buzz proxy)
  - stars                              → derived fan rating (medals + pageviews)
  - country                            → Wikidata nationality

Each athlete gets exactly ONE label: the first rule that matches, top to bottom.
The order encodes priority (a strong, rare signal beats a common one) so the
classification is deterministic and explainable.
"""
from typing import Any

# Eight labels, in priority order. Keep in sync with ATHLETE_LABELS in
# src/lib/athleteLabel.ts.
LABEL_KEYS = [
    "legend", "champion", "hometown", "fan_favorite",
    "grinder", "one_to_watch", "underdog", "trailblazer",
]

# Strong Olympic nations. A no-medal athlete from one of these has a real
# competitive footing (an Underdog with a genuine shot); a no-medal athlete from
# outside it, with little buzz, is a Trailblazer representing a country with no
# established pipeline.
POWERHOUSE = {
    "United States", "China", "United Kingdom", "Great Britain", "France", "Germany",
    "Japan", "Australia", "Italy", "Netherlands", "Canada", "South Korea", "Brazil",
    "Spain", "Hungary", "Sweden", "Norway", "Austria", "Switzerland", "New Zealand",
    "Poland", "Czech Republic", "Finland", "Denmark", "Belgium", "Croatia",
    "Jamaica", "Kenya", "Ethiopia", "Cuba", "Ukraine",
}


def label_for(a: dict[str, Any]) -> str:
    """Return the single fan-archetype key for an athlete. See module docstring."""
    mt = a.get("medal_totals") or {}
    gold = mt.get("gold", 0) or 0
    total_medals = gold + (mt.get("silver", 0) or 0) + (mt.get("bronze", 0) or 0)
    games = len(a.get("games") or []) or 1
    flag = bool(a.get("is_flagbearer_open") or a.get("is_flagbearer_close"))
    stars = a.get("stars") or 3
    pv = a.get("pageviews_60d") or 0
    country = a.get("country") or ""
    powerhouse = country in POWERHOUSE

    # ── Achievement royalty (rare, top status) ────────────────────────────────
    if gold >= 2:
        return "legend"        # 2+ Olympic golds — historic greatness
    if gold == 1:
        return "champion"      # reigning Olympic champion

    # ── National identity ─────────────────────────────────────────────────────
    if flag:
        return "hometown"      # carried their nation's flag — a country behind them

    # ── Podium, beloved (silver/bronze, no gold) ──────────────────────────────
    if total_medals > 0:
        return "fan_favorite"  # an Olympic medallist fans rally behind

    # ── Buzz / trajectory — high momentum, no medal yet ──────────────────────
    if stars >= 4 or pv >= 40000:
        return "one_to_watch"  # strong attention signal

    # ── Recognized career without a breakthrough ──────────────────────────────
    # stars >= 3 = above the baseline Wikipedia/Wikidata score — indicates
    # an established athlete with a real career footprint, still grinding.
    if stars >= 3:
        return "grinder"

    # ── Competitive long shot from an established nation ──────────────────────
    if powerhouse:
        return "underdog"      # trained in a strong national pipeline, unproven at Olympic level

    # ── Pioneer — representing where there's no pipeline ──────────────────────
    return "trailblazer"
