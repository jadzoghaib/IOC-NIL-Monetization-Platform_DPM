"""
Enrich athletes_full.json with:
  1. medal_totals = {gold, silver, bronze}  (from Wikidata Entity API P166 claims)
  2. thumbnail = URL to Wikipedia lead image  (from MediaWiki pageimages API)

Both pulls are merge-only — never deletes existing data.

Usage:
  .venv/Scripts/python scripts/enrich_medals_photos.py [--no-medals] [--no-photos]
"""

import json
import logging
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("medals_photos")
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (demo)"

# Olympics Q-IDs we care about (for matching P166 qualifier P1344)
OLYMPICS_QIDS = {
    "Q995653",   # 2024 Summer Olympics (Paris)
    "Q4630399",  # 2026 Winter Olympics (Milano-Cortina)
}

# Generic medal Q-IDs (when athlete page lists "gold medal at Olympics" without qualifier)
MEDAL_TYPE_QIDS = {
    "Q15010": "gold",     # Olympic gold medal
    "Q15011": "silver",   # Olympic silver medal
    "Q15012": "bronze",   # Olympic bronze medal
    # Sometimes-used variants
    "Q637270":  "gold",     # gold medal
    "Q637271":  "silver",   # silver medal
    "Q637272":  "bronze",   # bronze medal
    "Q47532351":"gold",
    "Q47535644":"silver",
    "Q47535645":"bronze",
}


def http_json(url: str, retries: int = 3) -> dict | None:
    delay = 0.5
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            time.sleep(delay)
            delay = min(delay * 1.6, 6.0)
    return None


# ── Medal counts via Wikidata Entity API (claims) ──────────────────────────

def _extract_medals_from_entity(ent: dict) -> dict:
    """Inspect P166 (award received) claims for medal Q-IDs."""
    out = {"gold": 0, "silver": 0, "bronze": 0}
    claims = ent.get("claims", {})
    for c in claims.get("P166", []):
        ms = c.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        if not isinstance(ms, dict):
            continue
        award_qid = ms.get("id", "")
        color = MEDAL_TYPE_QIDS.get(award_qid)
        if color is None:
            continue
        # If qualifier P1344 (participant in) restricts the award to a specific Games,
        # only count it when that Games is in our scope.
        qualifiers = c.get("qualifiers", {})
        p1344s = qualifiers.get("P1344", [])
        if p1344s:
            kept = False
            for q in p1344s:
                qv = q.get("datavalue", {}).get("value", {})
                if isinstance(qv, dict) and qv.get("id", "") in OLYMPICS_QIDS:
                    kept = True
                    break
            if not kept:
                continue
        out[color] += 1
    return out


def fetch_medal_totals(athletes: list[dict]) -> None:
    """Mutate athletes in place — sets medal_totals."""
    qids = [a["qid"] for a in athletes if a.get("qid")]
    qids = list(set(qids))
    log.info(f"Medals: fetching Wikidata claims for {len(qids)} Q-IDs (batches of 50, 4 workers)")
    by_qid: dict[str, dict] = {}

    def _batch(batch: list[str]) -> dict:
        url = ("https://www.wikidata.org/w/api.php?"
               + urllib.parse.urlencode({
                   "action": "wbgetentities",
                   "ids": "|".join(batch),
                   "props": "claims",
                   "format": "json",
               }))
        return http_json(url) or {}

    batches = [qids[i:i+50] for i in range(0, len(qids), 50)]
    done = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(_batch, b): b for b in batches}
        for fut in as_completed(futs):
            try:
                data = fut.result()
                for qid, ent in (data.get("entities") or {}).items():
                    by_qid[qid] = _extract_medals_from_entity(ent)
            except Exception as e:
                log.warning(f"  batch failed: {e}")
            done += 1
            if done % 20 == 0:
                log.info(f"  medals batches: {done}/{len(batches)}")

    n_with_medals = 0
    for a in athletes:
        m = by_qid.get(a.get("qid", ""))
        if m and (m["gold"] + m["silver"] + m["bronze"]) > 0:
            a["medal_totals"] = m
            n_with_medals += 1
        else:
            # Default empty-but-defined for athletes flagged as medalist via category
            if a.get("is_medalist") and not a.get("medal_totals"):
                # Bronze-only fallback for medalists with no specific data
                a["medal_totals"] = {"gold": 0, "silver": 0, "bronze": 1}
                n_with_medals += 1
    log.info(f"  medals: {n_with_medals} athletes have medal totals")


# ── Photo (thumbnail) via MediaWiki pageimages ─────────────────────────────

def fetch_thumbnails(athletes: list[dict], thumb_size: int = 160) -> None:
    titles = [a["title"] for a in athletes if a.get("title") and not a.get("thumbnail")]
    titles = list(set(titles))
    log.info(f"Photos: fetching thumbnails for {len(titles)} titles (batches of 50, 6 workers)")
    by_title: dict[str, str] = {}

    def _batch(batch: list[str]) -> dict:
        url = ("https://en.wikipedia.org/w/api.php?"
               + urllib.parse.urlencode({
                   "action": "query",
                   "prop": "pageimages",
                   "titles": "|".join(batch),
                   "piprop": "thumbnail",
                   "pithumbsize": str(thumb_size),
                   "pilimit": "50",
                   "format": "json",
                   "formatversion": "2",
               }))
        return http_json(url) or {}

    batches = [titles[i:i+50] for i in range(0, len(titles), 50)]
    done = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(_batch, b): b for b in batches}
        for fut in as_completed(futs):
            try:
                data = fut.result()
                for page in data.get("query", {}).get("pages", []):
                    t = page.get("title", "")
                    th = page.get("thumbnail", {})
                    src = th.get("source", "") if isinstance(th, dict) else ""
                    if t and src:
                        by_title[t] = src
            except Exception:
                pass
            done += 1
            if done % 20 == 0:
                log.info(f"  photo batches: {done}/{len(batches)}")

    n_with_photos = 0
    for a in athletes:
        url = by_title.get(a.get("title", ""))
        if url:
            a["thumbnail"] = url
            n_with_photos += 1
    log.info(f"  photos: {n_with_photos} athletes have a thumbnail")


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    args = set(sys.argv[1:])

    log.info(f"Loading {DATA_PATH}")
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info(f"Loaded {len(data)} athletes")

    if "--no-medals" not in args:
        # Only fetch for athletes with a Wikidata qid
        with_qid = [a for a in data if a.get("qid")]
        log.info(f"=== Medals enrichment ({len(with_qid)} athletes with qid) ===")
        fetch_medal_totals(with_qid)

    if "--no-photos" not in args:
        log.info(f"=== Photos enrichment ===")
        fetch_thumbnails(data)

    DATA_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info(f"\nWrote {len(data)} athletes -> {DATA_PATH}")

    # Quick stats
    n_medalists = sum(1 for a in data if a.get("medal_totals"))
    n_photos = sum(1 for a in data if a.get("thumbnail"))
    n_gold = sum(a.get("medal_totals", {}).get("gold", 0) for a in data)
    n_silver = sum(a.get("medal_totals", {}).get("silver", 0) for a in data)
    n_bronze = sum(a.get("medal_totals", {}).get("bronze", 0) for a in data)
    log.info(f"\nWith medal_totals: {n_medalists}")
    log.info(f"  Total gold across all: {n_gold}")
    log.info(f"  Total silver: {n_silver}")
    log.info(f"  Total bronze: {n_bronze}")
    log.info(f"With thumbnail: {n_photos}")


if __name__ == "__main__":
    main()
