"""
Compute business/sponsorship metrics for athletes.
All values are deterministically derived from real data we have:
  - pageviews_60d  → audience reach proxy
  - medal_totals   → performance credibility
  - stars          → fan engagement rating
  - sport          → category/CPM tier
  - country        → geographic market value
  - games          → career scope

No real social data is available, so reach/engagement figures are realistic
estimates calibrated to the pageview distribution in athletes_full.json.
"""

import hashlib
import math
from typing import Any

# ── Sport popularity tiers (affects CPM & sponsor interest) ──────────────────
SPORT_TIER: dict[str, int] = {
    # Tier 1 — premium CPM
    "Athletics":    1, "Swimming":      1, "Gymnastics":    1,
    "Football":     1, "Tennis":        1, "Basketball":    1,
    "Alpine Skiing":1,
    # Tier 2 — strong
    "Cycling":      2, "Volleyball":    2, "Diving":        2,
    "Figure Skating":2, "Speed Skating":2, "Ski Jumping":  2,
    "Biathlon":     2, "Cross-Country Skiing": 2,
    # Tier 3 — standard
    "Archery":      3, "Rowing":        3, "Canoe":         3,
    "Wrestling":    3, "Judo":          3, "Boxing":        3,
    "Shooting":     3, "Equestrian":    3, "Fencing":       3,
    "Taekwondo":    3, "Weightlifting": 3, "Handball":      3,
    "Water Polo":   3, "Sailing":       3, "Triathlon":     3,
    "Modern Pentathlon": 3, "BMX":      3, "Skateboarding": 3,
    "Surfing":      3, "Climbing":      3, "Luge":          3,
    "Bobsleigh":    3, "Skeleton":      3, "Curling":       3,
    "Ice Hockey":   3, "Snowboard":     3, "Freestyle Skiing": 3,
    "Nordic Combined": 3, "Short Track": 3,
}

# ── Country CPM multiplier ────────────────────────────────────────────────────
COUNTRY_CPM: dict[str, float] = {
    "United States": 3.2, "United Kingdom": 2.5, "Germany": 2.3,
    "France": 2.2,        "Japan": 2.1,           "Australia": 2.0,
    "Canada": 1.9,        "Italy": 1.8,            "Spain": 1.7,
    "Netherlands": 1.7,   "South Korea": 1.6,     "Brazil": 1.5,
    "China": 1.4,         "Sweden": 1.6,           "Norway": 1.6,
    "Switzerland": 1.8,   "Austria": 1.5,          "Belgium": 1.5,
    "New Zealand": 1.6,   "Ireland": 1.6,          "Denmark": 1.5,
    "Finland": 1.4,       "Poland": 1.3,            "Portugal": 1.3,
    "Argentina": 1.2,     "Mexico": 1.2,            "India": 1.1,
}

# ── Sponsorship category names ─────────────────────────────────────────────────
CATEGORIES = ["Sportswear", "Nutrition", "Tech/Devices", "Automotive", "Beverages", "Finance"]

# ── Pseudo-deterministic RNG seeded on athlete ID ────────────────────────────
def _rng(athlete_id: str, salt: str, lo: float, hi: float) -> float:
    """Return a stable float in [lo, hi] seeded on athlete_id + salt."""
    key = f"{athlete_id}:{salt}"
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return lo + (h % 10000) / 10000 * (hi - lo)


def _bool(athlete_id: str, salt: str, p_true: float) -> bool:
    """Return a stable bool with probability p_true."""
    return _rng(athlete_id, salt, 0, 1) < p_true


# ── Main computation ──────────────────────────────────────────────────────────
def compute_business_metrics(athlete: dict[str, Any]) -> dict[str, Any]:
    aid = athlete.get("id", athlete.get("title", "unknown"))
    pageviews   = athlete.get("pageviews_60d") or 0
    stars       = athlete.get("stars") or 3.0
    medal_totals = athlete.get("medal_totals") or {}
    gold   = medal_totals.get("gold",   0)
    silver = medal_totals.get("silver", 0)
    bronze = medal_totals.get("bronze", 0)
    total_medals = gold + silver + bronze
    sport   = athlete.get("sport", "")
    country = athlete.get("country", "")
    games   = athlete.get("games") or []
    is_medalist = athlete.get("is_medalist", False)

    # ── 1. Audience Reach Index (estimated monthly unique reach) ─────────────
    # pageviews_60d maps to estimated monthly reach:
    # Top 1% athletes: 500K+ pageviews → ~10M+ reach
    # Median athlete: ~25K pageviews → ~200K reach
    # Formula: reach ≈ pageviews × (5 + sport_bonus) × jitter
    sport_bonus = {1: 8.0, 2: 4.0, 3: 2.0}.get(SPORT_TIER.get(sport, 3), 2.0)
    jitter = _rng(aid, "reach_jitter", 0.7, 1.3)
    raw_reach = pageviews * (5.0 + sport_bonus) * jitter
    # Add medal bonus
    if gold > 0:
        raw_reach *= 1 + 0.4 * min(gold, 3)
    elif is_medalist:
        raw_reach *= 1.15
    reach = max(int(raw_reach), 5000)

    # ── 2. Engagement Rate (%) ────────────────────────────────────────────────
    # Mega (>5M reach): 0.8–2.5%
    # Macro (500K–5M): 1.5–4%
    # Mid  (50K–500K): 2.5–6%
    # Micro (<50K): 4–9%
    if reach > 5_000_000:
        er_base = _rng(aid, "er", 0.8, 2.5)
    elif reach > 500_000:
        er_base = _rng(aid, "er", 1.5, 4.0)
    elif reach > 50_000:
        er_base = _rng(aid, "er", 2.5, 6.0)
    else:
        er_base = _rng(aid, "er", 4.0, 9.0)
    # Stars boost ER slightly
    er = round(er_base * (0.85 + 0.1 * stars / 5), 2)

    # ── 3. Performance Tier ───────────────────────────────────────────────────
    if gold >= 2:
        perf_tier = "Multi-Gold Olympian"
        perf_score = 100
    elif gold == 1:
        perf_tier = "Olympic Champion"
        perf_score = 90
    elif silver >= 1 or bronze >= 1:
        perf_tier = "Olympic Medalist"
        perf_score = 75
    elif is_medalist and len(games) >= 2:
        perf_tier = "Olympic Veteran"
        perf_score = 65
    elif is_medalist:
        perf_tier = "Olympic Medalist"
        perf_score = 75
    elif len(games) >= 2:
        perf_tier = "Olympic Veteran"
        perf_score = 60
    else:
        perf_tier = "Olympic Athlete"
        perf_score = 50

    # ── 4. Brand Safety Score (0–100) ─────────────────────────────────────────
    # Based on sport type, medal count, and star rating
    sport_safety = {1: 88, 2: 85, 3: 82}.get(SPORT_TIER.get(sport, 3), 82)
    safety_jitter = _rng(aid, "safety", -8, 8)
    medal_bonus_safety = min(total_medals * 2, 8)
    brand_safety = min(100, int(sport_safety + safety_jitter + medal_bonus_safety))

    # Brand safety letter rating
    if brand_safety >= 92:
        safety_grade = "A+"
    elif brand_safety >= 85:
        safety_grade = "A"
    elif brand_safety >= 78:
        safety_grade = "B+"
    elif brand_safety >= 70:
        safety_grade = "B"
    else:
        safety_grade = "C"

    # ── 5. Category Availability ──────────────────────────────────────────────
    # More successful/prominent athletes more likely to have categories taken
    deal_fill = min(0.85, 0.1 + (pageviews / 300000) * 0.6 + total_medals * 0.05)
    category_map = []
    for i, cat in enumerate(CATEGORIES):
        taken = _bool(aid, f"cat_{i}", deal_fill)
        category_map.append({"category": cat, "available": not taken})

    # ── 6. Estimated Partnership Value (USD / month) ──────────────────────────
    # Based on reach, CPM multiplier for country, and sport tier
    cpm_mult = COUNTRY_CPM.get(country, 1.0)
    sport_mult = {1: 1.5, 2: 1.15, 3: 0.9}.get(SPORT_TIER.get(sport, 3), 0.9)
    base_value = reach / 1000 * 2.5 * cpm_mult * sport_mult
    if gold > 0:
        base_value *= 1.5
    elif is_medalist:
        base_value *= 1.2

    deal_types = {
        "social_post": {
            "label":     "Single Social Post",
            "min":       int(base_value * 0.05),
            "max":       int(base_value * 0.12),
            "unit":      "per post",
        },
        "event_appearance": {
            "label":     "Event Appearance",
            "min":       int(base_value * 0.8),
            "max":       int(base_value * 2.0),
            "unit":      "per event",
        },
        "brand_ambassador": {
            "label":     "Brand Ambassador",
            "min":       int(base_value * 3),
            "max":       int(base_value * 8),
            "unit":      "per month",
        },
    }

    # ── 7. Marketability Score (0–100 composite) ──────────────────────────────
    # 35% reach (log-normalized), 30% performance, 20% brand safety, 15% engagement
    max_reach_log  = math.log10(10_000_000)  # ~10M is top tier
    reach_log_norm = min(1.0, math.log10(max(reach, 1)) / max_reach_log)
    mkt_score = int(
        35 * reach_log_norm +
        30 * (perf_score / 100) +
        20 * (brand_safety / 100) +
        15 * min(1.0, er / 6.0)
    )
    mkt_score = max(10, min(100, mkt_score))

    # ── 8. Deal Tier ──────────────────────────────────────────────────────────
    if mkt_score >= 80:
        deal_tier = "Elite"
        tier_color = "#FFD700"
    elif mkt_score >= 65:
        deal_tier = "Pro"
        tier_color = "#A78BFA"
    elif mkt_score >= 45:
        deal_tier = "Rising"
        tier_color = "#38BDF8"
    else:
        deal_tier = "Micro"
        tier_color = "#34D399"

    # ── 9. Primary Market ────────────────────────────────────────────────────
    primary_market = country or "International"
    market_value_label = (
        "Premium" if COUNTRY_CPM.get(country, 1.0) >= 2.0 else
        "High"    if COUNTRY_CPM.get(country, 1.0) >= 1.5 else
        "Standard"
    )

    # ── 10. Comparable Brands (realistic for sport/tier) ─────────────────────
    brand_pools = {
        1: [["Nike", "Adidas", "Under Armour", "Gatorade", "Red Bull", "Samsung"],
            ["Puma", "New Balance", "Powerade", "Apple", "BMW", "Rolex"]],
        2: [["Salomon", "Rossignol", "Red Bull", "GoPro", "Audi", "Omega"],
            ["Völkl", "Atomic", "Monster Energy", "Garmin", "Volkswagen", "Longines"]],
        3: [["Mizuno", "Speedo", "Oakley", "Garmin", "Toyota", "Tissot"],
            ["Arena", "Asics", "Suunto", "Casio", "Honda", "Seiko"]],
    }
    tier_key = SPORT_TIER.get(sport, 3)
    pool_idx = 0 if _bool(aid, "brand_pool", 0.5) else 1
    pool = brand_pools.get(tier_key, brand_pools[3])[pool_idx]
    # Pick 3 relevant brands
    comparable_brands = [pool[int(_rng(aid, f"brand_{j}", 0, len(pool)))] for j in range(3)]
    comparable_brands = list(dict.fromkeys(comparable_brands))[:3]  # dedupe

    return {
        "marketability_score": mkt_score,
        "deal_tier":           deal_tier,
        "tier_color":          tier_color,
        "audience_reach":      reach,
        "engagement_rate":     er,
        "performance_tier":    perf_tier,
        "performance_score":   perf_score,
        "brand_safety_score":  brand_safety,
        "brand_safety_grade":  safety_grade,
        "category_availability": category_map,
        "deal_estimates":      deal_types,
        "primary_market":      primary_market,
        "market_value":        market_value_label,
        "comparable_brands":   comparable_brands,
        "sport_tier":          tier_key,
        "cpm_multiplier":      round(cpm_mult, 1),
    }
