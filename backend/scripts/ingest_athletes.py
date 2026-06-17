"""
Ingest all athletes from Paris 2024 + Milano-Cortina 2026 via Wikipedia MediaWiki API.

Strategy (because Wikidata SPARQL is currently rate-limiting):
  1. Walk subcategories of "Competitors at the {2024 Summer | 2026 Winter} Olympics"
  2. Each subcategory name encodes the sport (e.g. "Breakdancers at the 2024 Summer Olympics")
  3. For each sport subcategory, list all member articles (= athletes)
  4. Fetch Wikidata Q-IDs via pageprops (batched, 50 titles/req)
  5. Fetch country + gender via Wikidata Entity API (batched, 50 Q-IDs/req)
  6. Identify medalists by walking "Medalists at the ..." subcategories
  7. Fetch 60-day pageviews per athlete (star-power signal)
  8. Compute 5-star rating from medals + pageviews

Output: backend/data/athletes_full.json
"""

import json
import logging
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("ingest")
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore

OUT_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (demo; https://example.com)"

GAMES = {
    "paris_2024": {
        "label": "Paris 2024",
        "category": "Competitors at the 2024 Summer Olympics",
        "medal_root": "Medalists at the 2024 Summer Olympics",
        "flag": "🇫🇷",
        "season": "summer",
    },
    "milan_2026": {
        "label": "Milano-Cortina 2026",
        "category": "Competitors at the 2026 Winter Olympics",
        "medal_root": "Medalists at the 2026 Winter Olympics",
        "flag": "🇮🇹",
        "season": "winter",
    },
}


# ── HTTP helpers ─────────────────────────────────────────────────────────────

def http_json(url: str, retries: int = 3) -> dict | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt == retries - 1:
                log.debug(f"HTTP failed after {retries}: {url[:80]}: {e}")
            time.sleep(0.5 * (attempt + 1))
    return None


def mw(params: dict) -> dict:
    params = {**params, "format": "json", "formatversion": "2"}
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    return http_json(url) or {}


# ── Category traversal ──────────────────────────────────────────────────────

def list_category(title: str, cmtype: str = "page|subcat") -> list[dict]:
    """Returns ALL members of a category (paginated). cmtype filters page vs subcat."""
    out = []
    cont = None
    while True:
        params = {
            "action": "query", "list": "categorymembers",
            "cmtitle": title, "cmlimit": "500", "cmtype": cmtype,
        }
        if cont:
            params["cmcontinue"] = cont
        data = mw(params)
        out.extend(data.get("query", {}).get("categorymembers", []))
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            break
        time.sleep(0.05)
    return out


def parse_sport_from_category(cat_title: str, season: str) -> str:
    """
    'Category:Breakdancers at the 2024 Summer Olympics' -> 'Breakdancing'
    'Category:Athletes (track and field) at the 2024 Summer Olympics' -> 'Athletics (track and field)'
    """
    name = cat_title.replace("Category:", "")
    # Strip "at the {YEAR} {Summer|Winter} Olympics"
    name = re.sub(r"\s+at the \d{4} (Summer|Winter) Olympics$", "", name)
    # Singularize common patterns
    swaps = {
        "Archers": "Archery",
        "Athletes (track and field)": "Athletics",
        "Badminton players": "Badminton",
        "Basketball players": "Basketball",
        "Boxers": "Boxing",
        "Breakdancers": "Breakdancing",
        "Canoeists": "Canoeing",
        "Cyclists": "Cycling",
        "Divers": "Diving",
        "Equestrians": "Equestrian",
        "Fencers": "Fencing",
        "Field hockey players": "Field Hockey",
        "Footballers": "Football",
        "Golfers": "Golf",
        "Gymnasts": "Gymnastics",
        "Handball players": "Handball",
        "Judoka": "Judo",
        "Modern pentathletes": "Modern Pentathlon",
        "Rowers": "Rowing",
        "Rugby sevens players": "Rugby Sevens",
        "Sailors": "Sailing",
        "Sport shooters": "Shooting",
        "Skateboarders": "Skateboarding",
        "Sport climbers": "Sport Climbing",
        "Surfers": "Surfing",
        "Swimmers": "Swimming",
        "Synchronized swimmers": "Artistic Swimming",
        "Table tennis players": "Table Tennis",
        "Taekwondo practitioners": "Taekwondo",
        "Tennis players": "Tennis",
        "Triathletes": "Triathlon",
        "Volleyball players": "Volleyball",
        "Beach volleyball players": "Beach Volleyball",
        "Water polo players": "Water Polo",
        "Weightlifters": "Weightlifting",
        "Wrestlers": "Wrestling",
        # Winter
        "Alpine skiers": "Alpine Skiing",
        "Biathletes": "Biathlon",
        "Bobsledders": "Bobsleigh",
        "Cross-country skiers": "Cross-Country Skiing",
        "Curlers": "Curling",
        "Figure skaters": "Figure Skating",
        "Freestyle skiers": "Freestyle Skiing",
        "Ice hockey players": "Ice Hockey",
        "Lugers": "Luge",
        "Nordic combined skiers": "Nordic Combined",
        "Short track speed skaters": "Short Track Speed Skating",
        "Skeleton athletes": "Skeleton",
        "Ski jumpers": "Ski Jumping",
        "Snowboarders": "Snowboarding",
        "Speed skaters": "Speed Skating",
    }
    return swaps.get(name, name)


def _looks_like_athlete_page(title: str) -> bool:
    """Filter out season recaps, lists, careers, tours that get bucketed in sport categories."""
    t = title.lower()
    if title.startswith("List of "):
        return False
    bad_suffixes = (" season", " career", " tour", " campaign", " grand prix",
                    " olympic team", " at the", " squad", " roster")
    if any(s in t for s in bad_suffixes):
        return False
    if t.startswith(("20", "19", "18")) and any(c.isdigit() for c in t[:5]):
        # Year-prefixed pages are usually event/season pages
        return False
    return True


def is_sport_category(cat_title: str) -> bool:
    """Heuristic: sport categories don't start with 'Lists of', 'Medalists at', etc."""
    name = cat_title.replace("Category:", "")
    skip_prefixes = (
        "Lists of", "Medalists at", "Olympic", "Doping",
        "Flagbearers", "Officials", "Competitors at the",
    )
    return not any(name.startswith(p) for p in skip_prefixes)


# ── Athlete enumeration per Games ────────────────────────────────────────────

def gather_athletes(games_key: str, meta: dict) -> list[dict]:
    """Walk all sport subcats and collect athletes with their sport."""
    log.info(f"\n=== {meta['label']}: enumerating sport subcategories ===")
    parent = "Category:" + meta["category"]
    subcats = list_category(parent, cmtype="subcat")
    sport_subcats = [s for s in subcats if is_sport_category(s["title"])]
    log.info(f"Found {len(sport_subcats)} sport subcategories")

    seen: dict[str, dict] = {}  # title -> athlete dict
    for i, sc in enumerate(sport_subcats):
        sport = parse_sport_from_category(sc["title"], meta["season"])
        log.info(f"  [{i+1}/{len(sport_subcats)}] {sport}: fetching members...")
        members = list_category(sc["title"], cmtype="page")
        for m in members:
            if m.get("ns") != 0:
                continue
            title = m["title"]
            if not _looks_like_athlete_page(title):
                continue
            if title not in seen:
                seen[title] = {"title": title, "sport": sport, "games": [games_key]}
            else:
                if games_key not in seen[title]["games"]:
                    seen[title]["games"].append(games_key)
        time.sleep(0.05)

    log.info(f"Total athlete pages for {meta['label']}: {len(seen)}")
    return list(seen.values())


# ── Medal enumeration ────────────────────────────────────────────────────────

def gather_medalists(games_key: str, meta: dict) -> set[str]:
    """
    Get the flat list of medalists from 'Medalists at the {year} {Summer|Winter} Olympics'.
    Wikipedia's category structure does not split by gold/silver/bronze at the games level,
    so we just flag who is a medalist. Granular medal counts would require Wikidata SPARQL
    (currently in outage) or scraping the per-country medalist lists.
    """
    log.info(f"\n=== {meta['label']}: enumerating medalists ===")
    root = "Category:" + meta["medal_root"]
    members = list_category(root, cmtype="page")
    medalists = {m["title"] for m in members if m.get("ns") == 0}
    # Skip "List of ..." / "20XX Carlos Alcaraz tennis season" type pages
    medalists = {t for t in medalists
                 if not t.startswith("List of ") and " season" not in t.lower()}
    log.info(f"Medalists at {meta['label']}: {len(medalists)}")
    return medalists


# ── Wikidata Q-ID lookup (batched via Wikipedia pageprops) ───────────────────

def fetch_qids_and_country(titles: list[dict]) -> None:
    """
    Mutates titles in place, adding 'qid' (Wikidata QID) via pageprops batched 50/req.
    """
    title_list = list({t["title"] for t in titles})
    log.info(f"Fetching Q-IDs for {len(title_list)} unique titles in batches of 50...")
    qid_by_title: dict[str, str] = {}

    for i in range(0, len(title_list), 50):
        batch = title_list[i:i + 50]
        params = {
            "action": "query", "prop": "pageprops",
            "titles": "|".join(batch), "ppprop": "wikibase_item",
        }
        data = mw(params)
        for page in data.get("query", {}).get("pages", []):
            t = page.get("title", "")
            qid = page.get("pageprops", {}).get("wikibase_item", "")
            if t and qid:
                qid_by_title[t] = qid
        if i % 500 == 0 and i > 0:
            log.info(f"  Q-IDs: {i}/{len(title_list)}")
        time.sleep(0.05)

    log.info(f"Got {len(qid_by_title)} Q-IDs (some pages have no wikidata link)")
    for t in titles:
        t["qid"] = qid_by_title.get(t["title"], "")


# ── Wikidata Entity API: country + gender (no SPARQL) ────────────────────────

def fetch_country_gender(athletes: list[dict]) -> None:
    """
    Use Wikidata Entity API (different from SPARQL) to get P27 (country) + P21 (gender).
    Batched 50 Q-IDs per request.
    """
    qids = list({a["qid"] for a in athletes if a.get("qid")})
    log.info(f"Fetching country+gender for {len(qids)} Q-IDs from Wikidata Entity API...")

    by_qid: dict[str, dict] = {}
    for i in range(0, len(qids), 50):
        batch = qids[i:i + 50]
        url = (
            "https://www.wikidata.org/w/api.php?"
            + urllib.parse.urlencode({
                "action": "wbgetentities",
                "ids": "|".join(batch),
                "props": "claims|labels",
                "languages": "en",
                "format": "json",
            })
        )
        data = http_json(url)
        if not data:
            time.sleep(1)
            continue
        for qid, ent in (data.get("entities") or {}).items():
            claims = ent.get("claims", {})
            country_qid = ""
            for c in claims.get("P27", []):
                v = c.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                if isinstance(v, dict):
                    country_qid = v.get("id", "")
                    break
            gender_qid = ""
            for c in claims.get("P21", []):
                v = c.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                if isinstance(v, dict):
                    gender_qid = v.get("id", "")
                    break
            by_qid[qid] = {"country_qid": country_qid, "gender_qid": gender_qid}
        if i % 500 == 0 and i > 0:
            log.info(f"  entities: {i}/{len(qids)}")
        time.sleep(0.1)

    # Now resolve country labels: collect unique country Q-IDs and label them
    country_qids = list({v["country_qid"] for v in by_qid.values() if v["country_qid"]})
    log.info(f"Resolving {len(country_qids)} unique country labels...")
    country_label: dict[str, str] = {}
    for i in range(0, len(country_qids), 50):
        batch = country_qids[i:i + 50]
        url = (
            "https://www.wikidata.org/w/api.php?"
            + urllib.parse.urlencode({
                "action": "wbgetentities", "ids": "|".join(batch),
                "props": "labels", "languages": "en", "format": "json",
            })
        )
        data = http_json(url)
        if not data:
            continue
        for qid, ent in (data.get("entities") or {}).items():
            lbl = ent.get("labels", {}).get("en", {}).get("value", "")
            if lbl:
                country_label[qid] = lbl
        time.sleep(0.1)

    for a in athletes:
        info = by_qid.get(a.get("qid", ""), {})
        a["country_qid"] = info.get("country_qid", "")
        a["country"] = country_label.get(info.get("country_qid", ""), "")
        a["gender_qid"] = info.get("gender_qid", "")
        a["gender"] = "Female" if info.get("gender_qid") == "Q6581072" else "Male" if info.get("gender_qid") == "Q6581097" else ""


# ── Pageviews (60-day total) ────────────────────────────────────────────────

def fetch_pageviews(athletes: list[dict], days: int = 60, max_lookups: int = 0) -> None:
    """Parallel pageview fetcher (32 concurrent threads — Wikimedia tolerates this)."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    end = datetime.utcnow().strftime("%Y%m%d")
    start = (datetime.utcnow() - timedelta(days=days)).strftime("%Y%m%d")
    base = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title}/daily/{s}/{e}"

    targets = athletes
    if max_lookups:
        targets = athletes[:max_lookups]

    log.info(f"Fetching {days}-day pageviews for {len(targets)} athletes (parallel, 32 threads)...")

    def _one(a: dict) -> tuple[str, int]:
        title = a.get("title", "")
        if not title:
            return title, 0
        url = base.format(title=urllib.parse.quote(title.replace(" ", "_"), safe=""), s=start, e=end)
        data = http_json(url, retries=2)
        views = sum(item.get("views", 0) for item in (data or {}).get("items", []))
        return title, views

    by_title: dict[str, int] = {}
    done = 0
    with ThreadPoolExecutor(max_workers=32) as ex:
        futures = {ex.submit(_one, a): a for a in targets}
        for fut in as_completed(futures):
            try:
                t, v = fut.result()
                by_title[t] = v
            except Exception:
                pass
            done += 1
            if done % 500 == 0:
                log.info(f"  pageviews: {done}/{len(targets)}")

    for a in targets:
        a["pageviews_60d"] = by_title.get(a.get("title", ""), 0)


# ── Country -> flag emoji ────────────────────────────────────────────────────

COUNTRY_FLAG = {
    "United States": "🇺🇸", "United States of America": "🇺🇸",
    "France": "🇫🇷", "Italy": "🇮🇹", "Germany": "🇩🇪",
    "United Kingdom": "🇬🇧", "Great Britain": "🇬🇧",
    "Australia": "🇦🇺", "Canada": "🇨🇦", "Japan": "🇯🇵",
    "China": "🇨🇳", "South Korea": "🇰🇷", "Korea": "🇰🇷",
    "Spain": "🇪🇸", "Sweden": "🇸🇪", "Norway": "🇳🇴",
    "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "Switzerland": "🇨🇭",
    "Austria": "🇦🇹", "Brazil": "🇧🇷", "Argentina": "🇦🇷",
    "Mexico": "🇲🇽", "Jamaica": "🇯🇲", "Kenya": "🇰🇪",
    "Ethiopia": "🇪🇹", "South Africa": "🇿🇦", "Nigeria": "🇳🇬",
    "Egypt": "🇪🇬", "Morocco": "🇲🇦", "Algeria": "🇩🇿",
    "India": "🇮🇳", "Pakistan": "🇵🇰", "Indonesia": "🇮🇩",
    "Thailand": "🇹🇭", "Vietnam": "🇻🇳", "Philippines": "🇵🇭",
    "Russia": "🇷🇺", "Ukraine": "🇺🇦", "Poland": "🇵🇱",
    "Czech Republic": "🇨🇿", "Czechia": "🇨🇿", "Hungary": "🇭🇺", "Greece": "🇬🇷",
    "Turkey": "🇹🇷", "Iran": "🇮🇷", "Israel": "🇮🇱",
    "Saudi Arabia": "🇸🇦", "United Arab Emirates": "🇦🇪",
    "Lebanon": "🇱🇧", "Tunisia": "🇹🇳",
    "New Zealand": "🇳🇿", "Ireland": "🇮🇪", "Portugal": "🇵🇹",
    "Denmark": "🇩🇰", "Finland": "🇫🇮", "Iceland": "🇮🇸",
    "Croatia": "🇭🇷", "Serbia": "🇷🇸", "Slovakia": "🇸🇰",
    "Slovenia": "🇸🇮", "Romania": "🇷🇴", "Bulgaria": "🇧🇬",
    "Cuba": "🇨🇺", "Venezuela": "🇻🇪", "Colombia": "🇨🇴",
    "Chile": "🇨🇱", "Peru": "🇵🇪", "Ecuador": "🇪🇨",
    "Puerto Rico": "🇵🇷", "Dominican Republic": "🇩🇴",
    "Uzbekistan": "🇺🇿", "Kazakhstan": "🇰🇿", "Mongolia": "🇲🇳",
    "Refugee Olympic Team": "🏳️", "Individual Neutral Athletes": "🏳️",
}


# ── Star rating ──────────────────────────────────────────────────────────────

def compute_stars(is_medalist: bool, n_medal_games: int, pageviews: int) -> float:
    """
    is_medalist:    won a medal in any included Games.
    n_medal_games:  count of distinct Games where they medaled (1 or 2).
    pageviews:      60-day Wikipedia traffic.
    """
    medal_score = 4.0 if is_medalist else 0.0
    medal_score += 1.5 * max(0, n_medal_games - 1)  # multi-Games medalist bonus
    pv_score = math.log10(pageviews + 1) if pageviews > 0 else 0  # 1 -> 0, 1k -> 3, 100k -> 5
    raw = medal_score + pv_score * 1.2
    # Map raw to 1-5 stars (raw range typically 0 - 11)
    if raw >= 9:    return 5.0
    if raw >= 7:    return 4.5
    if raw >= 5.5:  return 4.0
    if raw >= 4.2:  return 3.5
    if raw >= 3.0:  return 3.0
    if raw >= 2.0:  return 2.5
    if raw >= 1.0:  return 2.0
    if raw > 0:     return 1.5
    return 1.0


# ── Main ─────────────────────────────────────────────────────────────────────

def run(skip_pageviews: bool = False, max_pageview_lookups: int = 0,
        skip_wikidata: bool = False):
    all_athletes: dict[str, dict] = {}  # keyed by Wikipedia title

    for games_key, meta in GAMES.items():
        athletes = gather_athletes(games_key, meta)
        medalists = gather_medalists(games_key, meta)

        for a in athletes:
            t = a["title"]
            is_medalist = t in medalists
            if t in all_athletes:
                if games_key not in all_athletes[t]["games"]:
                    all_athletes[t]["games"].append(games_key)
                if is_medalist:
                    all_athletes[t]["medalist_in"].append(games_key)
            else:
                all_athletes[t] = {
                    "title": t,
                    "name": t,
                    "sport": a["sport"],
                    "games": list(a["games"]),
                    "medalist_in": [games_key] if is_medalist else [],
                }

    log.info(f"\n=== Total unique athletes: {len(all_athletes)} ===")

    # Wikidata enrichment
    athletes_list = list(all_athletes.values())
    if not skip_wikidata:
        fetch_qids_and_country(athletes_list)
        fetch_country_gender(athletes_list)
    else:
        for a in athletes_list:
            a["qid"] = ""
            a["country"] = ""
            a["country_qid"] = ""
            a["gender"] = ""

    # Pageviews
    if not skip_pageviews:
        fetch_pageviews(athletes_list, max_lookups=max_pageview_lookups)
    else:
        for a in athletes_list:
            a["pageviews_60d"] = 0

    # Compute final fields
    for a in athletes_list:
        is_medalist = bool(a.get("medalist_in"))
        n_medal_games = len(a.get("medalist_in", []))
        a["is_medalist"] = is_medalist
        a["stars"] = compute_stars(is_medalist, n_medal_games, a.get("pageviews_60d", 0))
        a["flag"] = COUNTRY_FLAG.get(a.get("country", ""), "🏳️")
        slug = re.sub(r"[^a-z0-9]+", "_", a["title"].lower()).strip("_")
        a["id"] = slug
        a["wikipedia_url"] = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(a['title'].replace(' ', '_'))}"

    # Sort by star rating desc, then name
    athletes_list.sort(key=lambda x: (-x["stars"], x["name"]))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(athletes_list, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info(f"\nWrote {len(athletes_list)} athletes -> {OUT_PATH}")

    # Summary
    by_stars: dict[float, int] = {}
    for a in athletes_list:
        by_stars[a["stars"]] = by_stars.get(a["stars"], 0) + 1
    log.info("Star distribution:")
    for s in sorted(by_stars.keys(), reverse=True):
        log.info(f"  {s} ★  -> {by_stars[s]:>5}")


if __name__ == "__main__":
    args = sys.argv[1:]
    skip_pv = "--no-pageviews" in args
    skip_wd = "--no-wikidata" in args
    max_pv = 0
    for a in args:
        if a.startswith("--max-pageviews="):
            max_pv = int(a.split("=", 1)[1])
    run(skip_pageviews=skip_pv, max_pageview_lookups=max_pv, skip_wikidata=skip_wd)
