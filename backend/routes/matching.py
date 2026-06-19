"""
Connection-driven matching: rank athletes against a user profile.

Weights (additive score):
  +50  athlete.country == user.country
  +25  athlete.country == user.current_country (if different)
  +20  athlete.sport in user.childhood_sports
  +15  athlete.is_medalist (recognizable)
  +stars * 2  (so 5★ = +10, 1★ = +2)
  +5  story_type match
  +6  personality match — hype→viral athlete, grind→medalist/veteran; +3 mix

Returns top matches with explanations of WHY they matched.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from routes.athletes import _load

router = APIRouter(prefix="/api/match", tags=["match"])


class MatchProfile(BaseModel):
    games: str | None = None  # paris_2024 | milan_2026
    country: str | None = None
    current_country: str | None = None
    childhood_sports: list[str] = Field(default_factory=list)  # display names like "Football"
    story_type: str | None = None  # underdog | dominance | culture | mental_health
    personality: str | None = None  # hype | grind | mix
    limit: int = 12


# Map quiz chip labels (and common variants) to athlete sport names
# (athlete.sport is whatever Wikipedia uses, e.g. "Athletics", "Football", "Cycling")
SPORT_ALIAS = {
    "football":     ["Football"],
    "soccer":       ["Football"],
    "basketball":   ["Basketball"],
    "swimming":     ["Swimming", "Artistic Swimming"],
    "tennis":       ["Tennis", "Table Tennis"],
    "track":        ["Athletics"],
    "running":      ["Athletics"],
    "athletics":    ["Athletics"],
    "martial arts": ["Judo", "Taekwondo", "Wrestling", "Boxing", "Karate"],
    "gymnastics":   ["Gymnastics", "Rhythmic Gymnastics", "Trampoline"],
    "cycling":      ["Cycling"],
    "volleyball":   ["Volleyball", "Beach Volleyball"],
    "skiing":       ["Alpine Skiing", "Cross-Country Skiing", "Freestyle Skiing", "Ski Jumping", "Nordic Combined"],
    "snowboarding": ["Snowboarding"],
    "skating":      ["Figure Skating", "Speed Skating", "Short Track Speed Skating"],
}


def expand_sports(user_sports: list[str]) -> set[str]:
    """Map user-selected chip labels to athlete sport names."""
    out: set[str] = set()
    for s in user_sports:
        key = s.lower().strip()
        if key in SPORT_ALIAS:
            out.update(SPORT_ALIAS[key])
        else:
            # User typed a custom sport — try direct match
            out.add(s.strip())
    return out


@router.post("")
def match(profile: MatchProfile):
    pool = _load()
    if profile.games:
        pool = [a for a in pool if profile.games in (a.get("games") or [])]

    user_sports = expand_sports(profile.childhood_sports)
    home_country = (profile.country or "").strip()
    current = (profile.current_country or "").strip()

    scored: list[dict] = []
    for a in pool:
        score = 0.0
        reasons: list[dict] = []

        athlete_country = (a.get("country") or "").strip()
        athlete_sport = (a.get("sport") or "").strip()

        if home_country and athlete_country.lower() == home_country.lower():
            score += 50
            reasons.append({"icon": "🏠", "label": f"From {home_country}, like you"})

        if current and current.lower() != home_country.lower():
            if athlete_country.lower() == current.lower():
                score += 25
                reasons.append({"icon": "📍", "label": f"From {current}, where you live"})

        if user_sports and athlete_sport in user_sports:
            score += 20
            reasons.append({"icon": "🏃", "label": f"Plays {athlete_sport}, your sport"})

        if a.get("is_medalist"):
            score += 15
            reasons.append({"icon": "🏅", "label": "Medalist at this Games"})

        if a.get("is_flagbearer_open") or a.get("is_flagbearer_close"):
            score += 10
            which = ("Opening" if a.get("is_flagbearer_open") else "Closing")
            reasons.append({"icon": "🚩", "label": f"{which} ceremony flagbearer"})

        stars = a.get("stars", 1.0)
        score += stars * 2

        # Story type bonuses
        st = profile.story_type
        pageviews = a.get("pageviews_60d", 0) or 0
        if st == "underdog" and not a.get("is_medalist") and pageviews > 5000:
            score += 5
            reasons.append({"icon": "🔥", "label": "Viral underdog — story you love"})
        elif st == "dominance" and a.get("is_medalist") and stars >= 4.5:
            score += 5
            reasons.append({"icon": "👑", "label": "Pure dominance — story you love"})
        elif st == "culture" and home_country and athlete_country.lower() == home_country.lower():
            score += 5
            reasons.append({"icon": "🌍", "label": "Cultural pride from your country"})
        elif st == "mental_health" and pageviews > 20000:
            score += 3  # weaker signal — needs LLM detection later

        # Personality fit — distinct, explainable bonuses per archetype rather than
        # a flat boost, so hype / grind / mix actually change the ranking.
        pers = profile.personality
        n_games = len(a.get("games") or [])
        if pers == "hype" and pageviews > 50000:
            score += 6
            reasons.append({"icon": "🔥", "label": "High-energy star you'd hype"})
        elif pers == "grind" and (a.get("is_medalist") or n_games >= 2):
            score += 6
            reasons.append({"icon": "💪", "label": "Earned-it grinder, your type"})
        elif pers == "mix" and stars >= 3:
            score += 3
            reasons.append({"icon": "⚡", "label": "Balanced all-rounder"})

        scored.append({
            "athlete": a,
            "score": round(score, 2),
            "reasons": reasons[:4],  # cap at 4 chips per match
            "stars": stars,
        })

    # Sort by score desc, then stars desc, then name
    scored.sort(key=lambda x: (-x["score"], -x["stars"], x["athlete"].get("name", "")))

    top = scored[:profile.limit]

    # Diagnostic counts
    n_country = sum(1 for s in scored if any(r["icon"] == "🏠" for r in s["reasons"]))
    n_sport = sum(1 for s in scored if any(r["icon"] == "🏃" for r in s["reasons"]))

    return {
        "matches": top,
        "diagnostics": {
            "pool_size": len(pool),
            "from_your_country": n_country,
            "your_sport": n_sport,
        },
    }
