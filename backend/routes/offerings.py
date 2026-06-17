from fastapi import APIRouter, HTTPException
from routes.athletes import _load

router = APIRouter(prefix="/api/offerings", tags=["offerings"])

# IOC Worldwide Partners - we map these by sport when no archetype is known
DEFAULT_SPONSORS = [
    "Coca-Cola", "Visa", "Samsung", "Toyota", "Omega",
    "Panasonic", "P&G", "Bridgestone", "Allianz", "Airbnb",
    "Intel", "Alibaba",
]


def _stable_sponsor(athlete_id: str) -> str:
    h = sum(ord(c) for c in athlete_id) % len(DEFAULT_SPONSORS)
    return DEFAULT_SPONSORS[h]


@router.get("/{athlete_id}")
def list_offerings(athlete_id: str):
    a = next((x for x in _load() if x.get("id") == athlete_id), None)
    if not a:
        try:
            from data.athletes_data import ATHLETES as LEGACY
            from data.offerings_data import get_offerings as legacy_offerings
            if athlete_id in LEGACY:
                return legacy_offerings(athlete_id)
        except Exception:
            pass
        raise HTTPException(404, f"Athlete '{athlete_id}' not found")

    name = a.get("name", "Athlete")
    first = name.split()[0] if name else "Champion"
    sport = a.get("sport", "their sport")
    stars = a.get("stars", 1.0)
    sponsor = _stable_sponsor(athlete_id)

    # Price scales with star rating (more in-demand = higher price)
    sub_price = round(7.99 + stars * 2.50, 2)
    custom_price = round(99 + stars * 80)

    return [
        {
            "id": f"{athlete_id}_sub",
            "type": "subscription",
            "title": f"{first}'s Inner Circle",
            "description": (
                f"Monthly access to {first}'s personal training diary, mindset notes, "
                f"and exclusive Q&A live streams for {sport} fans."
            ),
            "price": sub_price,
            "period": "month",
        },
        {
            "id": f"{athlete_id}_custom",
            "type": "custom",
            "title": f"Train a Day with {first}",
            "description": (
                f"A limited co-branded experience: virtual training session, "
                f"sponsor-exclusive merch, and a signed certificate."
            ),
            "price": custom_price,
            "sponsor": sponsor,
            "sponsorLabel": f"Presented by {sponsor}",
            "slotsAvailable": 5,
        },
    ]
