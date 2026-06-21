"""
Default offerings keyed by motivation tier.
Mirrors frontend/src/data/offerings.ts logic.
"""

from .athletes_data import get_athlete

# Price tiers by motivation
PRICE_TIERS = {
    "ambition":    {"sub": 14.99, "custom": 299},
    "unity":       {"sub": 9.99,  "custom": 149},
    "inspiration": {"sub": 12.99, "custom": 499},
    "legacy":      {"sub": 19.99, "custom": 999},
}

# IOC Worldwide Partners mapped to motivation-engagement archetypes
ARCHETYPE_SPONSORS = {
    "ambition-social":      "Coca-Cola",
    "ambition-competitive": "Visa",
    "ambition-reflective":  "Intel",
    "unity-social":         "Samsung",
    "unity-competitive":    "Airbnb",
    "unity-reflective":     "Toyota",
    "inspiration-social":   "Alibaba",
    "inspiration-competitive": "Omega",
    "inspiration-reflective":  "Panasonic",
    "legacy-social":        "Bridgestone",
    "legacy-competitive":   "P&G",
    "legacy-reflective":    "Allianz",
}


def get_offerings(athlete_id: str) -> list[dict]:
    athlete = get_athlete(athlete_id)
    if not athlete:
        return []

    motivation = athlete["motivation"]
    engagement = athlete["engagement"]
    name = athlete["name"]
    first = name.split()[0]
    sport = athlete["sport"]
    archetype_key = f"{motivation}-{engagement}"
    sponsor = ARCHETYPE_SPONSORS.get(archetype_key, "Official Partner")
    tier = PRICE_TIERS.get(motivation, PRICE_TIERS["unity"])

    return [
        {
            "id": f"{athlete_id}_sub",
            "type": "subscription",
            "title": f"{first}'s Inner Circle",
            "description": (
                f"Monthly access to {first}'s personal training diary, mindset sessions, "
                f"and exclusive Q&A live streams. Built for {sport} fans who want to go deeper."
            ),
            "price": tier["sub"],
            "period": "month",
        },
        {
            "id": f"{athlete_id}_custom",
            "type": "custom",
            "title": f"Train a Day with {first}",
            "description": (
                f"A limited co-branded experience where you join {first} for a virtual training "
                f"session, sponsor-exclusive merch, and a signed certificate."
            ),
            "price": tier["custom"],
            "sponsor": sponsor,
            "sponsor_label": f"Presented by {sponsor}",
            "slots_available": 5,
        },
    ]
