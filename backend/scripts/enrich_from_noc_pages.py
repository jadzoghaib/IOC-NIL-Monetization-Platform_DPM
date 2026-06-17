"""
Enrich athletes_full.json by walking each NOC's country page on Wikipedia.

Why: The category-based ingestion (ingest_athletes.py) misses athletes who don't
have a substantial Wikipedia article — common for small NOCs in Winter sports.
Country pages like "Lebanon at the 2026 Winter Olympics" are the authoritative
roster source.

Strategy:
  1. For each Games, list members of "Category:Nations at the {YEAR} {Season} Olympics"
  2. For each country page, parse wikitext section-by-section
  3. Extract [[Person Name]] wikilinks under sport sections (== Heading ==)
  4. Filter out non-athlete links (other countries, sport events, dates, refs)
  5. Merge into athletes_full.json — fills in missing country/sport, adds new athletes

Run: .venv/Scripts/python scripts/enrich_from_noc_pages.py
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
log = logging.getLogger("enrich")
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (demo)"

GAMES = {
    "paris_2024": {
        "noc_category": "Category:Nations at the 2024 Summer Olympics",
        "page_suffix": " at the 2024 Summer Olympics",
        "season": "summer",
    },
    "milan_2026": {
        "noc_category": "Category:Nations at the 2026 Winter Olympics",
        "page_suffix": " at the 2026 Winter Olympics",
        "season": "winter",
    },
}

# Country flag mapping (extends what's in ingest_athletes.py)
COUNTRY_FLAG = {
    "United States": "🇺🇸", "France": "🇫🇷", "Italy": "🇮🇹", "Germany": "🇩🇪",
    "United Kingdom": "🇬🇧", "Great Britain": "🇬🇧", "Australia": "🇦🇺",
    "Canada": "🇨🇦", "Japan": "🇯🇵", "China": "🇨🇳", "South Korea": "🇰🇷",
    "Spain": "🇪🇸", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Netherlands": "🇳🇱",
    "Belgium": "🇧🇪", "Switzerland": "🇨🇭", "Austria": "🇦🇹", "Brazil": "🇧🇷",
    "Argentina": "🇦🇷", "Mexico": "🇲🇽", "Jamaica": "🇯🇲", "Kenya": "🇰🇪",
    "Ethiopia": "🇪🇹", "South Africa": "🇿🇦", "Nigeria": "🇳🇬",
    "Egypt": "🇪🇬", "Morocco": "🇲🇦", "Algeria": "🇩🇿", "Lebanon": "🇱🇧",
    "Syria": "🇸🇾", "Jordan": "🇯🇴", "India": "🇮🇳", "Pakistan": "🇵🇰",
    "Indonesia": "🇮🇩", "Thailand": "🇹🇭", "Vietnam": "🇻🇳", "Philippines": "🇵🇭",
    "Russia": "🇷🇺", "Ukraine": "🇺🇦", "Poland": "🇵🇱", "Czech Republic": "🇨🇿",
    "Hungary": "🇭🇺", "Greece": "🇬🇷", "Turkey": "🇹🇷", "Iran": "🇮🇷",
    "Israel": "🇮🇱", "Saudi Arabia": "🇸🇦", "United Arab Emirates": "🇦🇪",
    "Tunisia": "🇹🇳", "Iraq": "🇮🇶", "Kuwait": "🇰🇼", "Qatar": "🇶🇦",
    "New Zealand": "🇳🇿", "Ireland": "🇮🇪", "Portugal": "🇵🇹",
    "Denmark": "🇩🇰", "Finland": "🇫🇮", "Iceland": "🇮🇸", "Croatia": "🇭🇷",
    "Serbia": "🇷🇸", "Slovakia": "🇸🇰", "Slovenia": "🇸🇮", "Romania": "🇷🇴",
    "Bulgaria": "🇧🇬", "Cuba": "🇨🇺", "Venezuela": "🇻🇪", "Colombia": "🇨🇴",
    "Chile": "🇨🇱", "Peru": "🇵🇪", "Ecuador": "🇪🇨", "Puerto Rico": "🇵🇷",
    "Dominican Republic": "🇩🇴", "Uzbekistan": "🇺🇿", "Kazakhstan": "🇰🇿",
    "Mongolia": "🇲🇳", "Refugee Olympic Team": "🏳️", "Albania": "🇦🇱",
    "Andorra": "🇦🇩", "Armenia": "🇦🇲", "Azerbaijan": "🇦🇿", "Belarus": "🇧🇾",
    "Bolivia": "🇧🇴", "Bosnia and Herzegovina": "🇧🇦", "Cyprus": "🇨🇾",
    "Estonia": "🇪🇪", "Georgia": "🇬🇪", "Kyrgyzstan": "🇰🇬", "Latvia": "🇱🇻",
    "Liechtenstein": "🇱🇮", "Lithuania": "🇱🇹", "Luxembourg": "🇱🇺",
    "Malta": "🇲🇹", "Moldova": "🇲🇩", "Monaco": "🇲🇨", "Montenegro": "🇲🇪",
    "North Macedonia": "🇲🇰", "San Marino": "🇸🇲", "Taiwan": "🇹🇼",
    "Chinese Taipei": "🇹🇼", "Hong Kong": "🇭🇰", "Singapore": "🇸🇬",
    "Malaysia": "🇲🇾", "Madagascar": "🇲🇬", "Iceland": "🇮🇸",
    "Trinidad and Tobago": "🇹🇹", "Bahamas": "🇧🇸", "Barbados": "🇧🇧",
    "Costa Rica": "🇨🇷", "Panama": "🇵🇦", "Uruguay": "🇺🇾", "Paraguay": "🇵🇾",
    "Bhutan": "🇧🇹", "Nepal": "🇳🇵", "Sri Lanka": "🇱🇰", "Bangladesh": "🇧🇩",
    "Myanmar": "🇲🇲", "Cambodia": "🇰🇭", "Laos": "🇱🇦",
}


def http_json(url: str, retries: int = 2) -> dict | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT, "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            time.sleep(0.5)
    return None


def mw(params: dict) -> dict:
    p = {**params, "format": "json", "formatversion": "2"}
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(p)
    return http_json(url) or {}


def list_category(title: str, cmtype: str = "") -> list[dict]:
    """List members. cmtype="" means no filter (avoids a Wikipedia 429 quirk)."""
    out = []
    cont = None
    while True:
        params = {"action": "query", "list": "categorymembers",
                  "cmtitle": title, "cmlimit": "500"}
        if cmtype:
            params["cmtype"] = cmtype
        if cont:
            params["cmcontinue"] = cont
        data = mw(params)
        members = data.get("query", {}).get("categorymembers", [])
        # Post-filter to pages only (ns=0)
        members = [m for m in members if m.get("ns", 0) == 0]
        out.extend(members)
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            break
        time.sleep(0.05)
    return out


def fetch_wikitext(page_title: str) -> str:
    data = mw({"action": "parse", "page": page_title, "prop": "wikitext", "redirects": "1"})
    return data.get("parse", {}).get("wikitext", "")


# ── Parsing ──────────────────────────────────────────────────────────────────

WIKILINK_RE = re.compile(r"\[\[([^\]\|]+?)(?:\|[^\]]+)?\]\]")
SECTION_RE = re.compile(r"^==+\s*([^=].*?)\s*==+\s*$", re.MULTILINE)

NON_ATHLETE_PATTERNS = [
    r"\bat the\b", r"\bOlympic", r"\bWinter\b", r"\bSummer\b",
    r"^\d{4}\b", r"\bMedal\b", r"\bSki\b at\b", r"\bski[ie]?ng\b",
    r"\bCommittee\b", r"\bMilan\b", r"\bCortina\b", r"\bParis\b",
    r"\bFlag of\b", r"\bWorld Cup\b", r"\bChampionship", r"\bFederation\b",
    r"\bnational\b", r"\bTeam\b$", r"\bCup\b$", r"\bRound\b",
    r"\bQualif", r"\bReferee\b", r"\bCoach\b", r"\bDoping\b",
    r"–\b", r"\bSlalom\b", r"\bDownhill\b", r"\bGiant\b", r"\bSuper-G\b",
    r"\bRelay\b", r"\bSprint\b$", r"\bDistance\b$", r"\bMass start\b",
    r"\bSkiathlon\b", r"\bPursuit\b$",
    # Institutions, news outlets, references
    r"\bArmed Forces\b", r"\bAssociated Press\b", r"\bUSA Today\b",
    r"\bDiario\b", r"\bReuters\b", r"\bAFP\b", r"\bAgency\b",
    r"\bBroadcasting\b", r"\bMagazine\b", r"\bGazette\b",
    r"\bMinistry\b", r"\bDepartment\b", r"\bEmbassy\b",
    r"\bUniversity\b", r"\bAcademy\b", r"\bClub\b$",
]
NON_ATHLETE_RE = re.compile("|".join(NON_ATHLETE_PATTERNS), re.IGNORECASE)


def is_likely_athlete_link(link: str) -> bool:
    """Heuristic filter: keep only links that look like person names."""
    if not link or len(link) < 3 or len(link) > 80:
        return False
    if NON_ATHLETE_RE.search(link):
        return False
    if "(" in link and ")" in link:
        # "John Smith (skier)" is OK; "(country)" or "(disambiguation)" is not
        inner = link[link.index("(") + 1 : link.rindex(")")].lower()
        if any(b in inner for b in ("country", "disambig", "season", "team", "company")):
            return False
    # Must look like a person name (letters, spaces, accents, optional disambiguator)
    name = re.sub(r"\s*\(.*?\)\s*", "", link).strip()
    if not re.match(r"^[A-Za-zÀ-ÿĀ-žА-я\s\-'\.]+$", name):
        return False
    # At least 2 words for a person name
    words = name.split()
    if len(words) < 2:
        return False
    return True


def normalize_sport(heading: str) -> str:
    """Map section heading to a clean sport name."""
    h = heading.strip()
    # Strip parentheticals and trailing references
    h = re.sub(r"\s*\([^)]*\)$", "", h).strip()
    swaps = {
        "Alpine skiing": "Alpine Skiing",
        "Cross-country skiing": "Cross-Country Skiing",
        "Figure skating": "Figure Skating",
        "Ice hockey": "Ice Hockey",
        "Short-track speed skating": "Short Track Speed Skating",
        "Speed skating": "Speed Skating",
        "Ski jumping": "Ski Jumping",
        "Nordic combined": "Nordic Combined",
        "Freestyle skiing": "Freestyle Skiing",
        "Track and field": "Athletics",
        "Track & field": "Athletics",
        "Athletics (track and field)": "Athletics",
        "Artistic swimming": "Artistic Swimming",
        "Beach volleyball": "Beach Volleyball",
        "Field hockey": "Field Hockey",
        "Modern pentathlon": "Modern Pentathlon",
        "Rhythmic gymnastics": "Rhythmic Gymnastics",
        "Rugby sevens": "Rugby Sevens",
        "Sport climbing": "Sport Climbing",
        "Table tennis": "Table Tennis",
        "Trampoline": "Gymnastics",
        "Water polo": "Water Polo",
        "Sailing": "Sailing", "Surfing": "Surfing", "Skateboarding": "Skateboarding",
    }
    return swaps.get(h, h.title())


# Section names that aren't sports
NON_SPORT_SECTIONS = {
    "competitors", "medalists", "see also", "references", "notes",
    "external links", "background", "summary", "results",
    "delegation", "officials",
}


def parse_country_page(country: str, wikitext: str) -> list[dict]:
    """
    Returns list of {name, country, sport} extracted from the country roster page.
    Three-pass extraction:
      1. Infobox keys (flagbearer_open, flagbearer_close)
      2. Lead paragraphs (text before first section)
      3. Per-section sport-tagged extraction
    """
    if not wikitext:
        return []

    out: list[dict] = []
    seen: set[str] = set()

    # Pass 1 — infobox flagbearers
    for key in ("flagbearer_open", "flagbearer_close", "flagbearer"):
        m = re.search(rf"\|\s*{key}\s*=\s*\[\[([^\]\|]+)(?:\|[^\]]*)?\]\]", wikitext)
        if m:
            link = m.group(1).strip()
            if "#" in link:
                link = link.split("#", 1)[0]
            if is_likely_athlete_link(link) and link not in seen:
                seen.add(link)
                out.append({"name": link, "country": country, "sport": "Unknown"})

    # Pass 2 — lead paragraphs (before first ==Section== heading)
    matches = list(SECTION_RE.finditer(wikitext))
    if matches:
        lead = wikitext[:matches[0].start()]
    else:
        lead = wikitext

    for link_match in WIKILINK_RE.finditer(lead):
        link = link_match.group(1).strip()
        if "#" in link:
            link = link.split("#", 1)[0]
        if not is_likely_athlete_link(link):
            continue
        if link in seen:
            continue
        seen.add(link)
        out.append({"name": link, "country": country, "sport": "Unknown"})

    # Pass 3 — per-section, sport tagged from heading
    sections = []
    for i, m in enumerate(matches):
        section_title = m.group(1).strip()
        section_start = m.end()
        section_end = matches[i + 1].start() if i + 1 < len(matches) else len(wikitext)
        sections.append((section_title, wikitext[section_start:section_end]))

    for title, body in sections:
        title_lower = title.lower()
        if title_lower in NON_SPORT_SECTIONS:
            continue
        sport = normalize_sport(title)
        for link_match in WIKILINK_RE.finditer(body):
            link = link_match.group(1).strip()
            if "#" in link:
                link = link.split("#", 1)[0]
            if not is_likely_athlete_link(link):
                continue
            if link in seen:
                # Already added (likely with sport=Unknown). Upgrade sport if known.
                for entry in out:
                    if entry["name"] == link and entry["sport"] == "Unknown":
                        entry["sport"] = sport
                        break
                continue
            seen.add(link)
            out.append({"name": link, "country": country, "sport": sport})

    return out


# ── Pipeline ─────────────────────────────────────────────────────────────────

def extract_country_from_page_title(page_title: str, suffix: str) -> str:
    return page_title.removesuffix(suffix).strip()


def main():
    if not DATA_PATH.exists():
        log.error(f"Need {DATA_PATH} to exist (run ingest_athletes.py first)")
        sys.exit(1)

    log.info(f"Loading existing data from {DATA_PATH}")
    existing = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    by_title = {a["title"]: a for a in existing}
    log.info(f"Existing athletes: {len(existing)}")

    new_count = 0
    enriched_count = 0

    for games_key, meta in GAMES.items():
        log.info(f"\n=== {games_key}: walking {meta['noc_category']} ===")
        # Cool-down between Games to avoid Wikipedia category-list rate limit
        for retry in range(5):
            noc_pages = list_category(meta["noc_category"])
            if noc_pages:
                break
            log.warning(f"  Empty result for {meta['noc_category']} (attempt {retry+1}/5) — sleeping 8s")
            time.sleep(8)
        log.info(f"NOC pages: {len(noc_pages)}")

        # Parallel wikitext fetch
        def fetch_one(page) -> tuple[str, str, str]:
            country = extract_country_from_page_title(page["title"], meta["page_suffix"])
            wt = fetch_wikitext(page["title"])
            return country, page["title"], wt

        log.info("Fetching wikitexts in parallel ...")
        results = []
        with ThreadPoolExecutor(max_workers=12) as ex:
            futures = {ex.submit(fetch_one, p): p for p in noc_pages}
            for i, fut in enumerate(as_completed(futures)):
                try:
                    results.append(fut.result())
                except Exception:
                    pass
                if (i + 1) % 20 == 0:
                    log.info(f"  fetched {i+1}/{len(noc_pages)}")

        log.info(f"Parsing {len(results)} country pages ...")
        for country, page_title, wikitext in results:
            athletes = parse_country_page(country, wikitext)
            if not athletes:
                continue
            for ath in athletes:
                title = ath["name"]
                if title in by_title:
                    rec = by_title[title]
                    if not rec.get("country"):
                        rec["country"] = country
                    if not rec.get("flag") or rec.get("flag") == "🏳️":
                        rec["flag"] = COUNTRY_FLAG.get(country, "🏳️")
                    if not rec.get("sport") or rec.get("sport") == "Unknown":
                        rec["sport"] = ath["sport"]
                    if games_key not in (rec.get("games") or []):
                        rec.setdefault("games", []).append(games_key)
                    enriched_count += 1
                else:
                    # New athlete found only via NOC roster
                    slug = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")
                    by_title[title] = {
                        "id": slug,
                        "title": title,
                        "name": title,
                        "qid": "",
                        "country": country,
                        "country_qid": "",
                        "flag": COUNTRY_FLAG.get(country, "🏳️"),
                        "gender": "",
                        "sport": ath["sport"],
                        "games": [games_key],
                        "medalist_in": [],
                        "is_medalist": False,
                        "pageviews_60d": 0,
                        "stars": 2.0,  # bumped from 1.0 to acknowledge they competed
                        "wikipedia_url": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
                    }
                    new_count += 1

    final = list(by_title.values())
    final.sort(key=lambda x: (-x.get("stars", 0), x.get("name", "")))

    log.info(f"\n=== Results ===")
    log.info(f"Enriched existing: {enriched_count}")
    log.info(f"New athletes added: {new_count}")
    log.info(f"Total: {len(final)}")

    DATA_PATH.write_text(
        json.dumps(final, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info(f"Wrote -> {DATA_PATH}")

    # Spot-check Lebanon
    lebanese = [a for a in final if a.get("country") == "Lebanon"]
    log.info(f"\nLebanese athletes: {len(lebanese)}")
    for a in lebanese[:20]:
        games = ",".join(a.get("games", []))
        log.info(f"  - {a['name']} ({a['sport']}) [{games}]")


if __name__ == "__main__":
    main()
