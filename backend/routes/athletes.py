import json
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

from services.business_metrics import compute_business_metrics
from services.athlete_labels import label_for

router = APIRouter(prefix="/api/athletes", tags=["athletes"])

_FULL_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
_LEGACY_PATH = Path(__file__).parent.parent / "data" / "athletes_data.py"

_cache: list[dict] | None = None
_cache_mtime: float = 0.0   # mtime of JSON when cache was last built


SPORT_NORMALIZE = {
    # Milan 2026 raw category names
    "Short-track speed skaters": "Short Track Speed Skating",
    "Skeleton racers": "Skeleton",
    "Ski mountaineers": "Ski Mountaineering",
    "Aerials": "Freestyle Skiing",
    "Moguls": "Freestyle Skiing",
    "Dual Moguls": "Freestyle Skiing",
    "Half-pipe": "Freestyle Skiing",
    "Ski Cross": "Freestyle Skiing",
    "Ski Halfpipe": "Freestyle Skiing",
    "Snowboard Cross": "Snowboarding",
    "Snowboard Halfpipe": "Snowboarding",
    "Shooters": "Shooting",
    # Paris 2024 cleanup
    "Artistic swimmers": "Artistic Swimming",
    "Breaking": "Breakdancing",
    "Bmx": "BMX",
    "Bmx Racing": "BMX",
    "Bmx Freestyle": "BMX",
    "Beach Volleyball": "Beach Volleyball",
    "Beach": "",           # too ambiguous — drop
    "Sprint": "",          # too generic — drop
    "Men'S Tournament": "", # drop
    "Women'S Tournament": "", # drop
    "Jumping": "",         # too generic — drop
    "Dressage": "Equestrian",
    "Eventing": "Equestrian",
    # Drop non-sport entries
    "Administration": "",
    "Unknown": "",
}


def _normalize_sport(s: str) -> str:
    s = (s or "").strip()
    return SPORT_NORMALIZE.get(s, s)


# Trailing Wikipedia disambiguators like "(runner)", "(swimmer)",
# "(footballer, born 1996)" — a trailing parenthetical containing a lowercase
# letter or digit. Uppercase-only groups (e.g. "(II)") are kept.
_DISAMBIG_RE = re.compile(r"\s*\([^)]*?[a-z0-9][^)]*\)\s*$")

# Signature of UTF-8 bytes that were decoded as cp1252/latin-1 (classic mojibake).
_MOJI_SIG = re.compile(r"Ã.|Â.|Å.|Ä.|â€")


def _fix_mojibake(s: str) -> str:
    """Repair UTF-8 that was decoded as cp1252/latin-1 (e.g. 'CÃ©sar' -> 'César').

    Self-validating and iterative: re-encodes via cp1252 (falling back to
    latin-1) and decodes as UTF-8, only keeping the result when the round-trip
    succeeds. Loops to undo multi-layer mojibake. Already-correct names carry no
    signature, or fail the round-trip, so they are left untouched.
    """
    for _ in range(3):
        if not _MOJI_SIG.search(s):
            break
        cand = None
        for enc in ("cp1252", "latin-1"):
            try:
                cand = s.encode(enc).decode("utf-8")
                break
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
        if cand is None or cand == s:
            break
        s = cand
    return s


def _clean_name(name: str) -> str:
    if not name:
        return name
    name = _fix_mojibake(name)
    name = _DISAMBIG_RE.sub("", name).strip()
    return name


def _looks_like_athlete(a: dict) -> bool:
    name = a.get("name", "")
    t = name.lower()
    if name.startswith("List of "):
        return False
    bad = (" season", " career", " tour", " campaign", " squad", " roster", " at the")
    if any(s in t for s in bad):
        return False
    if t[:4].isdigit():
        return False
    return True


def _load() -> list[dict]:
    global _cache, _cache_mtime
    # Auto-invalidate when the JSON file is newer than the cached version
    current_mtime = _FULL_PATH.stat().st_mtime if _FULL_PATH.exists() else 0.0
    if _cache is not None and current_mtime == _cache_mtime:
        return _cache
    if _FULL_PATH.exists():
        try:
            data = json.loads(_FULL_PATH.read_text(encoding="utf-8"))
            cleaned = []
            for a in data:
                if not _looks_like_athlete(a):
                    continue
                # Normalize sport name in place; drop athletes with empty-normalized sport
                norm = _normalize_sport(a.get("sport", ""))
                if norm == "" and a.get("sport"):
                    # Sport was explicitly dropped (Administration, etc.) — skip this record
                    continue
                if norm:
                    a["sport"] = norm
                # Repair encoding + strip Wikipedia disambiguators on the display name
                if a.get("name"):
                    a["name"] = _clean_name(a["name"])
                cleaned.append(a)
            _cache = cleaned
            _cache_mtime = current_mtime
            return _cache
        except Exception:
            pass
    from data.athletes_data import ATHLETES as LEGACY
    _cache = list(LEGACY.values())
    return _cache


def reload_cache():
    global _cache, _cache_mtime
    _cache = None
    _cache_mtime = 0.0


@router.get("/reload-cache")
def force_reload_cache():
    """Force reload of athlete data from disk. Useful after enrichment scripts."""
    reload_cache()
    data = _load()
    with_photo = sum(1 for a in data if a.get("thumbnail"))
    return {"status": "reloaded", "total": len(data), "with_thumbnail": with_photo}


@router.get("")
def list_athletes(
    games: str | None = Query(None, description="Filter by games key, e.g. 'paris_2024'"),
    sport: str | None = None,
    country: str | None = None,
    min_stars: float | None = None,
    medalist_only: bool = False,
    label: str | None = Query(None, description="Filter by fan archetype key, e.g. 'grinder' (see services/athlete_labels.py)"),
    search: str | None = Query(None, description="Substring match on name/country/sport"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    data = _load()

    # Filters
    if games:
        data = [a for a in data if games in (a.get("games") or [])]
    if sport:
        data = [a for a in data if a.get("sport", "").lower() == sport.lower()]
    if country:
        data = [a for a in data if a.get("country", "").lower() == country.lower()]
    if min_stars is not None:
        data = [a for a in data if a.get("stars", 0) >= min_stars]
    if medalist_only:
        data = [a for a in data if a.get("is_medalist")]
    if label:
        # Filter across the WHOLE dataset (before pagination) so every archetype
        # is populated and "Load more" returns a full page of matches.
        data = [a for a in data if label_for(a) == label]
    if search:
        q = search.lower()
        data = [a for a in data
                if q in a.get("name", "").lower()
                or q in a.get("country", "").lower()
                or q in a.get("sport", "").lower()]

    total = len(data)
    page = data[offset:offset + limit]
    # Attach the canonical marketability score + deal tier (computed by the single
    # source of truth, business_metrics) so the roster list, Campaign Builder, and
    # the athlete detail page all rank and label tiers identically. We also surface
    # which sponsorship categories are still open, so the campaign brief's category
    # can actually influence ranking.
    items = []
    for a in page:
        bm = compute_business_metrics(a)
        items.append({
            **a,
            "label":                label_for(a),
            "marketability_score":  bm["marketability_score"],
            "deal_tier":            bm["deal_tier"],
            "tier_color":           bm["tier_color"],
            "available_categories": [c["category"] for c in bm["category_availability"] if c["available"]],
        })
    return {"total": total, "offset": offset, "limit": limit, "items": items}


@router.get("/sports")
def list_sports(games: str | None = None):
    data = _load()
    if games:
        data = [a for a in data if games in (a.get("games") or [])]
    sports = sorted({a.get("sport", "") for a in data if a.get("sport")})
    return {"sports": sports}


@router.get("/countries")
def list_countries(games: str | None = None):
    data = _load()
    if games:
        data = [a for a in data if games in (a.get("games") or [])]
    countries = sorted({a.get("country", "") for a in data if a.get("country")})
    return {"countries": countries}


@router.get("/{athlete_id}")
def get_athlete(athlete_id: str):
    data = _load()
    for a in data:
        if a.get("id") == athlete_id:
            return a
    # Try legacy lookup
    try:
        from data.athletes_data import ATHLETES as LEGACY
        if athlete_id in LEGACY:
            return LEGACY[athlete_id]
    except Exception:
        pass
    raise HTTPException(404, f"Athlete '{athlete_id}' not found")


@router.get("/{athlete_id}/business")
def get_athlete_business_metrics(athlete_id: str):
    """
    Returns sponsorship/partnership metrics for an athlete.
    Visible only in Business mode — not exposed in Fan or Athlete mode.
    """
    from services.business_metrics import compute_business_metrics
    data = _load()
    for a in data:
        if a.get("id") == athlete_id:
            return {**a, "business_metrics": compute_business_metrics(a)}
    raise HTTPException(404, f"Athlete '{athlete_id}' not found")


@router.get("/{athlete_id}/story")
def get_athlete_story(athlete_id: str, refresh: bool = False):
    """
    Returns a one-paragraph AI-generated bio grounded in Wikipedia + latest news.
    ?refresh=true re-fetches news AND regenerates the story.
    """
    from services.athlete_story import get_story

    data = _load()
    athlete = next((a for a in data if a.get("id") == athlete_id), None)
    if not athlete:
        try:
            from data.athletes_data import ATHLETES as LEGACY
            athlete = LEGACY.get(athlete_id)
        except Exception:
            pass
    if not athlete:
        raise HTTPException(404, f"Athlete '{athlete_id}' not found")

    result = get_story(athlete, force_refresh=refresh)
    return {
        "athlete_id": athlete_id,
        "story": result.get("story"),
        "archetype": result.get("archetype"),
    }
