from fastapi import APIRouter, HTTPException
from routes.athletes import _load
from services.athlete_news import fetch_athlete_news

router = APIRouter(prefix="/api/news", tags=["news"])


def _find(athlete_id: str) -> dict | None:
    for a in _load():
        if a.get("id") == athlete_id:
            return a
    try:
        from data.athletes_data import ATHLETES as LEGACY
        return LEGACY.get(athlete_id)
    except Exception:
        return None


@router.get("/{athlete_id}")
def get_athlete_news(athlete_id: str):
    a = _find(athlete_id)
    if not a:
        raise HTTPException(404, f"Athlete '{athlete_id}' not found")
    return fetch_athlete_news(
        athlete_id, a.get("name", ""), a.get("sport", ""),
        country=a.get("country", ""),
    )


@router.post("/{athlete_id}/refresh")
def refresh_athlete_news(athlete_id: str):
    a = _find(athlete_id)
    if not a:
        raise HTTPException(404, f"Athlete '{athlete_id}' not found")
    # Refresh news first
    result = fetch_athlete_news(
        athlete_id, a.get("name", ""), a.get("sport", ""),
        country=a.get("country", ""), force_refresh=True,
    )
    # Invalidate story cache so next profile load re-generates with fresh news
    try:
        from services.athlete_story import invalidate_story
        invalidate_story(athlete_id)
    except Exception:
        pass
    return result
