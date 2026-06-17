"""
Enrich athletes_full.json with medal_totals = {gold, silver, bronze}
by walking Wikipedia medal subcategories for Paris 2024 and Milan 2026.

Strategy:
  - "Medalists at the 2024 Summer Olympics" has subcats like
    "Athletics at the 2024 Summer Olympics" which has subcats like
    "Gold medalists at the 2024 Summer Olympics in athletics"
  - Faster: directly check "2024 Summer Olympics gold medalists",
    "2024 Summer Olympics silver medalists", "2024 Summer Olympics bronze medalists"
    which Wikipedia maintains as categories.

Usage:
  .venv/Scripts/python scripts/enrich_medal_counts.py
"""

import json
import logging
import time
import urllib.parse
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("medal_counts")

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (demo)"

MEDAL_CATEGORIES = {
    "paris_2024": {
        "gold":   "Category:2024 Summer Olympics gold medalists",
        "silver": "Category:2024 Summer Olympics silver medalists",
        "bronze": "Category:2024 Summer Olympics bronze medalists",
    },
    "milan_2026": {
        "gold":   "Category:2026 Winter Olympics gold medalists",
        "silver": "Category:2026 Winter Olympics silver medalists",
        "bronze": "Category:2026 Winter Olympics bronze medalists",
    },
}


def mw_request(params: dict) -> dict:
    """Make a Wikipedia API request with retry."""
    params = {**params, "format": "json", "formatversion": "2"}
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            wait = (attempt + 1) * 2
            log.warning(f"  Request failed (attempt {attempt+1}): {e} — retrying in {wait}s")
            time.sleep(wait)
    return {}


def get_category_members(category_title: str) -> set[str]:
    """Return all page titles in a category (paginated)."""
    members = set()
    cmcontinue = None
    page_num = 0
    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category_title,
            "cmlimit": "500",
            "cmtype": "page",
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue

        data = mw_request(params)
        batch = data.get("query", {}).get("categorymembers", [])
        for m in batch:
            members.add(m["title"])

        page_num += 1
        cmcontinue = data.get("continue", {}).get("cmcontinue")
        if not cmcontinue:
            break
        time.sleep(0.3)

    return members


def main():
    log.info(f"Loading {DATA_PATH}")
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info(f"Loaded {len(data)} athletes")

    # Build title → athlete index
    title_index: dict[str, list[int]] = {}
    for i, a in enumerate(data):
        title = a.get("title", "").strip()
        if title:
            title_index.setdefault(title, []).append(i)

    log.info(f"Title index: {len(title_index)} unique titles")

    # Reset medal_totals for athletes that had the fallback bronze-only value
    # (where gold=0, silver=0, bronze=1 — was the fallback, not real data)
    reset_count = 0
    for a in data:
        mt = a.get("medal_totals")
        if mt and mt.get("gold", 0) == 0 and mt.get("silver", 0) == 0 and mt.get("bronze", 0) == 1:
            del a["medal_totals"]
            reset_count += 1
    log.info(f"Reset {reset_count} fallback bronze-only medal_totals")

    # For each games × medal color, fetch category and assign counts
    for games_key, cats in MEDAL_CATEGORIES.items():
        log.info(f"\n=== {games_key} ===")
        for color, cat_title in cats.items():
            log.info(f"  Fetching {cat_title} ...")
            titles = get_category_members(cat_title)
            log.info(f"    → {len(titles)} titles in category")

            matched = 0
            for title in titles:
                idxs = title_index.get(title, [])
                for i in idxs:
                    a = data[i]
                    # Only count if this athlete competed in this games
                    if games_key not in (a.get("games") or []):
                        continue
                    mt = a.setdefault("medal_totals", {"gold": 0, "silver": 0, "bronze": 0})
                    mt[color] = mt.get(color, 0) + 1
                    matched += 1

            log.info(f"    → matched {matched} athlete-records for {color}")
            time.sleep(0.5)  # be polite to Wikipedia

    # Summary stats
    with_any = sum(1 for a in data if a.get("medal_totals") and
                   sum(a["medal_totals"].values()) > 0)
    total_g = sum(a.get("medal_totals", {}).get("gold", 0) for a in data)
    total_s = sum(a.get("medal_totals", {}).get("silver", 0) for a in data)
    total_b = sum(a.get("medal_totals", {}).get("bronze", 0) for a in data)
    log.info(f"\nAthletes with medal_totals: {with_any}")
    log.info(f"  Gold: {total_g}  Silver: {total_s}  Bronze: {total_b}")

    # Write back
    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"Wrote {len(data)} athletes → {DATA_PATH}")


if __name__ == "__main__":
    main()
