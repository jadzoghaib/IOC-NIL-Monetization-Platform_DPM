"""
Enrich athletes_full.json with photos from the Olympics.com search API.
No API key required. Uses the typeahead endpoint used by the official site.

Photo URL pattern:
  https://img.olympics.com/images/image/private/t_1-1_300/f_auto/primary/{imageId}

Usage:
  .venv/Scripts/python scripts/enrich_olympics_photos.py [--overwrite]
  --overwrite  : also replace existing Wikipedia thumbnails with Olympics photos
"""

import gzip
import json
import logging
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("olympics_photos")
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.olympics.com/en/athletes/",
    "Origin": "https://www.olympics.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}

THUMB_TRANSFORM = "t_1-1_300/f_auto"   # 300px square, auto-format


# ── Slug helpers ───────────────────────────────────────────────────────────────

def _strip_accents(text: str) -> str:
    """'Noé' → 'Noe', 'Müller' → 'Muller'"""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def name_to_slug(name: str) -> str:
    """'Katarina Johnson-Thompson' → 'katarina-johnson-thompson'"""
    cleaned = _strip_accents(name).lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned)
    return cleaned.strip("-")


def slug_key(s: str) -> str:
    """Canonical slug for loose matching (removes all dashes for comparison)."""
    return s.replace("-", "")


# ── Olympics.com search ────────────────────────────────────────────────────────

def search_olympics(name: str, retries: int = 2) -> list[dict]:
    """Hit the typeahead API and return the list of athlete result dicts."""
    query = urllib.parse.quote(name)
    url = f"https://www.olympics.com/en/api/v2/search/typeahead/type/athletes/query/{query}"
    delay = 1.0
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as r:
                raw = r.read()
                # Handle gzip-compressed responses
                encoding = r.headers.get("Content-Encoding", "")
                if encoding == "gzip" or (raw[:2] == b"\x1f\x8b"):
                    raw = gzip.decompress(raw)
                data = json.loads(raw.decode("utf-8"))
                modules = data.get("modules", [])
                if modules:
                    return modules[0].get("content", [])
                return []
        except Exception as exc:
            if attempt < retries:
                time.sleep(delay)
                delay *= 1.5
            else:
                log.debug(f"  search failed for '{name}': {exc}")
    return []


def result_to_photo_url(result: dict) -> str | None:
    thumb = result.get("thumb", "")
    if not thumb:
        return None
    if "{formatInstructions}" in thumb:
        return thumb.replace("{formatInstructions}", THUMB_TRANSFORM)
    # Already a full URL
    return thumb if thumb.startswith("https://") else None


def find_photo(athlete: dict) -> str | None:
    name = athlete.get("name", "")
    if not name:
        return None

    our_slug = name_to_slug(name)
    our_key  = slug_key(our_slug)

    results = search_olympics(name)
    if not results:
        return None

    # Priority 1: exact slug match
    for r in results:
        if name_to_slug(r.get("slug", "")) == our_slug:
            return result_to_photo_url(r)

    # Priority 2: slug without dashes
    for r in results:
        if slug_key(name_to_slug(r.get("slug", ""))) == our_key:
            return result_to_photo_url(r)

    # Priority 3: title normalised match
    for r in results:
        if slug_key(name_to_slug(r.get("title", ""))) == our_key:
            return result_to_photo_url(r)

    # Priority 4: only one result → trust it
    if len(results) == 1:
        return result_to_photo_url(results[0])

    return None


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    overwrite = "--overwrite" in sys.argv[1:]

    log.info(f"Loading {DATA_PATH}")
    data: list[dict] = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info(f"Loaded {len(data)} athletes")

    if overwrite:
        to_enrich = data
        log.info("--overwrite: enriching ALL athletes")
    else:
        to_enrich = [a for a in data if not a.get("thumbnail")]
        log.info(f"Athletes without photo: {len(to_enrich)}")

    # Sort highest-starred first so the best athletes get photos first
    to_enrich.sort(key=lambda a: a.get("stars", 0), reverse=True)

    updated = 0
    not_found = 0
    total = len(to_enrich)

    def process(athlete: dict) -> tuple[dict, str | None]:
        url = find_photo(athlete)
        time.sleep(0.15)   # ~6 req/s per worker
        return athlete, url

    log.info(f"Starting enrichment: {total} athletes, 8 workers")
    done = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(process, a): a for a in to_enrich}
        for fut in as_completed(futures):
            try:
                athlete, photo_url = fut.result()
                if photo_url:
                    athlete["thumbnail"] = photo_url
                    athlete["thumbnail_source"] = "olympics.com"
                    updated += 1
                else:
                    not_found += 1
            except Exception as exc:
                log.debug(f"  worker error: {exc}")
                not_found += 1
            done += 1
            if done % 200 == 0 or done == total:
                log.info(f"  progress: {done}/{total} | found: {updated} | not found: {not_found}")

    # Write back
    DATA_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    pct = updated / max(total, 1) * 100
    log.info(f"\nDone. {updated}/{total} athletes now have Olympics.com photos ({pct:.0f}%)")
    log.info(f"Total athletes with thumbnail: {sum(1 for a in data if a.get('thumbnail'))}")


if __name__ == "__main__":
    main()
