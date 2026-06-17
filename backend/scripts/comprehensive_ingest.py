"""
Comprehensive NOC-page-driven re-ingest.

Walks every country page for Paris 2024 + Milano-Cortina 2026 sequentially
(no bursts → no Wikipedia rate limits) and extracts rich data per athlete:

  - name, country, sport, games
  - events: ["Men's slalom", "Men's giant slalom"]
  - is_flagbearer_open, is_flagbearer_close
  - is_medalist (from "Medalists at the X" category, fetched once per Games)
  - source: "noc_page"  (vs "category" for the original sport-cat ingest)

Then merges with the existing athletes_full.json — preserving Wikidata
fields (qid, gender) and pageviews_60d. Recomputes stars.

Run: .venv/Scripts/python scripts/comprehensive_ingest.py
"""

import json
import logging
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("comp")
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (demo)"

GAMES = {
    "paris_2024": {
        "label": "Paris 2024",
        "noc_category": "Category:Nations at the 2024 Summer Olympics",
        "page_suffix": " at the 2024 Summer Olympics",
        "medalist_cat": "Category:Medalists at the 2024 Summer Olympics",
        "season": "summer",
        "flag": "🇫🇷",
    },
    "milan_2026": {
        "label": "Milano-Cortina 2026",
        "noc_category": "Category:Nations at the 2026 Winter Olympics",
        "page_suffix": " at the 2026 Winter Olympics",
        "medalist_cat": "Category:Medalists at the 2026 Winter Olympics",
        "season": "winter",
        "flag": "🇮🇹",
    },
}


# ── HTTP plumbing ──────────────────────────────────────────────────────────

def http_json(url: str, retries: int = 5) -> dict | None:
    delay = 0.4
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                log.debug(f"  429 — backing off {delay:.1f}s")
            else:
                log.debug(f"  HTTP {e.code}")
            time.sleep(delay)
            delay = min(delay * 1.7, 8.0)
        except Exception as e:
            time.sleep(delay)
            delay = min(delay * 1.7, 8.0)
    return None


def mw(params: dict) -> dict:
    p = {**params, "format": "json", "formatversion": "2"}
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(p)
    return http_json(url) or {}


def list_category(title: str) -> list[dict]:
    out = []
    cont = None
    while True:
        params = {"action": "query", "list": "categorymembers",
                  "cmtitle": title, "cmlimit": "500"}
        if cont:
            params["cmcontinue"] = cont
        data = mw(params)
        members = data.get("query", {}).get("categorymembers", [])
        out.extend([m for m in members if m.get("ns", 0) == 0])
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            break
        time.sleep(0.1)
    return out


def fetch_wikitext(page_title: str, retries: int = 3) -> str:
    for i in range(retries):
        data = mw({"action": "parse", "page": page_title,
                   "prop": "wikitext", "redirects": "1"})
        wt = data.get("parse", {}).get("wikitext", "")
        if wt:
            return wt
        time.sleep(0.6 * (i + 1))
    return ""


# ── Parsing ────────────────────────────────────────────────────────────────

WIKILINK_RE = re.compile(r"\[\[([^\]\|]+?)(?:\|([^\]]+))?\]\]")
SECTION_RE = re.compile(r"^(==+)\s*([^=].*?)\s*\1\s*$", re.MULTILINE)
TABLE_RE = re.compile(r"\{\|.*?\n\|\}", re.DOTALL)

NON_ATHLETE_PATTERNS = [
    r"\bat the\b", r"\bOlympic", r"\bWinter\b", r"\bSummer\b",
    r"^\d{4}\b", r"\bMedal\b", r"\bski[ie]?ng\b at\b",
    r"\bCommittee\b", r"\bMilan\b", r"\bCortina\b", r"\bParis\b",
    r"\bFlag of\b", r"\bWorld Cup\b", r"\bChampionship", r"\bFederation\b",
    r"\bnational\b\s+(team|federation|squad)", r"\bTeam\b$", r"\bCup\b$",
    r"\bRound\b", r"\bQualif", r"\bReferee\b", r"\bCoach\b", r"\bDoping\b",
    r"\bSlalom\b", r"\bDownhill\b", r"\bSuper-G\b", r"\bRelay\b",
    r"\bSprint\b$", r"\bDistance\b$", r"\bMass start\b",
    r"\bSkiathlon\b", r"\bPursuit\b$",
    r"\bArmed Forces\b", r"\bAssociated Press\b", r"\bUSA Today\b",
    r"\bDiario\b", r"\bReuters\b", r"\bAFP\b", r"\bNews\b",
    r"\bBroadcasting\b", r"\bMagazine\b", r"\bGazette\b",
    r"\bMinistry\b", r"\bDepartment\b", r"\bEmbassy\b",
    r"\bUniversity\b", r"\bAcademy\b", r"\bClub\b$",
    r"\bRegion\b", r"\bDistrict\b", r"\bProvince\b",
]
NON_ATHLETE_RE = re.compile("|".join(NON_ATHLETE_PATTERNS), re.IGNORECASE)


def is_athlete_name(s: str) -> bool:
    if not s or len(s) < 3 or len(s) > 80:
        return False
    if NON_ATHLETE_RE.search(s):
        return False
    if "(" in s and ")" in s:
        inner = s[s.index("(") + 1: s.rindex(")")].lower()
        if any(b in inner for b in ("country", "disambig", "team", "company",
                                    "magazine", "newspaper", "season")):
            return False
    name = re.sub(r"\s*\([^)]*\)\s*", "", s).strip()
    if not re.match(r"^[A-Za-zÀ-ÿĀ-žА-я\s\-'\.]+$", name):
        return False
    if len(name.split()) < 2:
        return False
    return True


SPORT_SWAPS = {
    "Alpine skiing": "Alpine Skiing",
    "Cross-country skiing": "Cross-Country Skiing",
    "Figure skating": "Figure Skating",
    "Ice hockey": "Ice Hockey",
    "Short-track speed skating": "Short Track Speed Skating",
    "Short track speed skating": "Short Track Speed Skating",
    "Speed skating": "Speed Skating",
    "Ski jumping": "Ski Jumping",
    "Nordic combined": "Nordic Combined",
    "Freestyle skiing": "Freestyle Skiing",
    "Track and field": "Athletics",
    "Athletics (track and field)": "Athletics",
    "Artistic swimming": "Artistic Swimming",
    "Beach volleyball": "Beach Volleyball",
    "Field hockey": "Field Hockey",
    "Modern pentathlon": "Modern Pentathlon",
    "Rhythmic gymnastics": "Rhythmic Gymnastics",
    "Rugby sevens": "Rugby Sevens",
    "Sport climbing": "Sport Climbing",
    "Table tennis": "Table Tennis",
    "Trampoline gymnastics": "Gymnastics",
    "Trampoline": "Gymnastics",
    "Water polo": "Water Polo",
    "BMX racing": "Cycling",
    "BMX freestyle": "Cycling",
    "Mountain biking": "Cycling",
    "Road cycling": "Cycling",
    "Track cycling": "Cycling",
    "Open water swimming": "Swimming",
    "Marathon swimming": "Swimming",
    "Synchronized swimming": "Artistic Swimming",
    "Sport shooting": "Shooting",
}

NON_SPORT_SECTIONS = {
    "competitors", "medalists", "see also", "references", "notes",
    "external links", "background", "summary", "results", "delegation",
    "officials", "general", "highlights", "by event", "ceremonies",
    "host city contracts", "broadcasting rights", "marketing",
    "commemorative coins",
}


def normalize_sport(heading: str) -> str:
    h = re.sub(r"\s*\([^)]*\)$", "", heading).strip()
    return SPORT_SWAPS.get(h, h.title())


# ── Structured page parser ─────────────────────────────────────────────────

def split_sections(wikitext: str) -> list[tuple[int, str, str]]:
    """Returns [(level, title, body)] for each section."""
    matches = list(SECTION_RE.finditer(wikitext))
    if not matches:
        return [(0, "", wikitext)]
    sections = []
    # Lead before first heading
    if matches[0].start() > 0:
        sections.append((0, "_lead", wikitext[:matches[0].start()]))
    for i, m in enumerate(matches):
        level = len(m.group(1))
        title = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(wikitext)
        sections.append((level, title, wikitext[start:end]))
    return sections


def extract_athletes_from_block(
    text: str, country: str, sport: str, games_key: str,
    out: dict, current_event: str | None = None,
) -> None:
    """Find wikilinks in a chunk of wikitext, treating likely-athlete ones as records."""
    for m in WIKILINK_RE.finditer(text):
        link = m.group(1).strip()
        if "#" in link:
            link = link.split("#", 1)[0]
        if not is_athlete_name(link):
            continue
        rec = out.get(link)
        if rec is None:
            rec = {
                "name": link,
                "country": country,
                "sport": sport,
                "games_key": games_key,
                "events": [],
                "is_flagbearer_open": False,
                "is_flagbearer_close": False,
                "source": "noc_page",
            }
            out[link] = rec
        else:
            # Already exists. Upgrade sport if currently Unknown.
            if rec["sport"] in ("Unknown", "") and sport not in ("Unknown", ""):
                rec["sport"] = sport
        if current_event and current_event not in rec["events"]:
            rec["events"].append(current_event)


def parse_country_page(country: str, wikitext: str, games_key: str) -> dict:
    """Returns {athlete_name: rich_record}."""
    if not wikitext:
        return {}

    out: dict[str, dict] = {}

    # Pass 1 — infobox flagbearers
    for key in ("flagbearer_open", "flagbearer_close", "flagbearer",
                "flagbearer_open_1", "flagbearer_open_2",
                "flagbearer_close_1", "flagbearer_close_2"):
        m = re.search(
            rf"\|\s*{key}\s*=\s*\[\[([^\]\|]+?)(?:\|[^\]]*)?\]\]",
            wikitext,
        )
        if not m:
            continue
        name = m.group(1).strip()
        if not is_athlete_name(name):
            continue
        rec = out.get(name) or {
            "name": name, "country": country, "sport": "Unknown",
            "games_key": games_key, "events": [],
            "is_flagbearer_open": False, "is_flagbearer_close": False,
            "source": "noc_page",
        }
        if "open" in key:
            rec["is_flagbearer_open"] = True
        elif "close" in key:
            rec["is_flagbearer_close"] = True
        else:
            rec["is_flagbearer_open"] = True
        out[name] = rec

    # Pass 2/3 — section tree
    sections = split_sections(wikitext)
    for level, title, body in sections:
        # Skip non-sport lookup sections
        title_lower = title.lower()
        if title_lower in NON_SPORT_SECTIONS:
            continue
        if title == "_lead":
            extract_athletes_from_block(body, country, "Unknown", games_key, out)
            continue
        if level <= 2:
            sport = normalize_sport(title)
        else:
            sport = "Unknown"  # sub-section, sport unknown
            # Try to find parent sport context (best-effort)
        # In this section's body, look for sub-event headings
        sub_sections = SECTION_RE.findall(body)  # not used directly; we walk again
        # Walk inner sections (level+1) to capture event names
        inner = list(SECTION_RE.finditer(body))
        if inner:
            # Lead before first sub-heading
            if inner[0].start() > 0:
                extract_athletes_from_block(body[:inner[0].start()], country, sport, games_key, out)
            for i, m in enumerate(inner):
                event_title = m.group(2).strip()
                start = m.end()
                end = inner[i + 1].start() if i + 1 < len(inner) else len(body)
                event_block = body[start:end]
                event_clean = re.sub(r"\s*\([^)]*\)$", "", event_title).strip()
                # skip if subsection heading is a generic word
                if event_clean.lower() in NON_SPORT_SECTIONS:
                    extract_athletes_from_block(event_block, country, sport, games_key, out)
                    continue
                extract_athletes_from_block(
                    event_block, country, sport, games_key, out,
                    current_event=event_clean,
                )
        else:
            extract_athletes_from_block(body, country, sport, games_key, out)

    return out


# ── Country flag map ───────────────────────────────────────────────────────

COUNTRY_FLAG = {
    "United States": "🇺🇸", "France": "🇫🇷", "Italy": "🇮🇹", "Germany": "🇩🇪",
    "United Kingdom": "🇬🇧", "Great Britain": "🇬🇧", "Australia": "🇦🇺",
    "Canada": "🇨🇦", "Japan": "🇯🇵", "China": "🇨🇳", "South Korea": "🇰🇷",
    "Spain": "🇪🇸", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Netherlands": "🇳🇱",
    "Belgium": "🇧🇪", "Switzerland": "🇨🇭", "Austria": "🇦🇹", "Brazil": "🇧🇷",
    "Argentina": "🇦🇷", "Mexico": "🇲🇽", "Jamaica": "🇯🇲", "Kenya": "🇰🇪",
    "Ethiopia": "🇪🇹", "South Africa": "🇿🇦", "Nigeria": "🇳🇬", "Egypt": "🇪🇬",
    "Morocco": "🇲🇦", "Algeria": "🇩🇿", "Lebanon": "🇱🇧", "Syria": "🇸🇾",
    "Jordan": "🇯🇴", "Iraq": "🇮🇶", "Kuwait": "🇰🇼", "Qatar": "🇶🇦",
    "India": "🇮🇳", "Pakistan": "🇵🇰", "Indonesia": "🇮🇩", "Thailand": "🇹🇭",
    "Vietnam": "🇻🇳", "Philippines": "🇵🇭", "Russia": "🇷🇺", "Ukraine": "🇺🇦",
    "Poland": "🇵🇱", "Czech Republic": "🇨🇿", "Czechia": "🇨🇿", "Hungary": "🇭🇺",
    "Greece": "🇬🇷", "Turkey": "🇹🇷", "Iran": "🇮🇷", "Israel": "🇮🇱",
    "Saudi Arabia": "🇸🇦", "United Arab Emirates": "🇦🇪", "Tunisia": "🇹🇳",
    "New Zealand": "🇳🇿", "Ireland": "🇮🇪", "Portugal": "🇵🇹", "Denmark": "🇩🇰",
    "Finland": "🇫🇮", "Iceland": "🇮🇸", "Croatia": "🇭🇷", "Serbia": "🇷🇸",
    "Slovakia": "🇸🇰", "Slovenia": "🇸🇮", "Romania": "🇷🇴", "Bulgaria": "🇧🇬",
    "Cuba": "🇨🇺", "Venezuela": "🇻🇪", "Colombia": "🇨🇴", "Chile": "🇨🇱",
    "Peru": "🇵🇪", "Ecuador": "🇪🇨", "Puerto Rico": "🇵🇷", "Dominican Republic": "🇩🇴",
    "Uzbekistan": "🇺🇿", "Kazakhstan": "🇰🇿", "Mongolia": "🇲🇳",
    "Refugee Olympic Team": "🏳️", "Individual Neutral Athletes": "🏳️",
    "Albania": "🇦🇱", "Andorra": "🇦🇩", "Armenia": "🇦🇲", "Azerbaijan": "🇦🇿",
    "Belarus": "🇧🇾", "Bolivia": "🇧🇴", "Bosnia and Herzegovina": "🇧🇦",
    "Cyprus": "🇨🇾", "Estonia": "🇪🇪", "Georgia": "🇬🇪", "Kyrgyzstan": "🇰🇬",
    "Latvia": "🇱🇻", "Liechtenstein": "🇱🇮", "Lithuania": "🇱🇹",
    "Luxembourg": "🇱🇺", "Malta": "🇲🇹", "Moldova": "🇲🇩", "Monaco": "🇲🇨",
    "Montenegro": "🇲🇪", "North Macedonia": "🇲🇰", "San Marino": "🇸🇲",
    "Taiwan": "🇹🇼", "Chinese Taipei": "🇹🇼", "Hong Kong": "🇭🇰",
    "Singapore": "🇸🇬", "Malaysia": "🇲🇾", "Madagascar": "🇲🇬",
    "Trinidad and Tobago": "🇹🇹", "Bahamas": "🇧🇸", "Barbados": "🇧🇧",
    "Costa Rica": "🇨🇷", "Panama": "🇵🇦", "Uruguay": "🇺🇾", "Paraguay": "🇵🇾",
    "Bhutan": "🇧🇹", "Nepal": "🇳🇵", "Sri Lanka": "🇱🇰", "Bangladesh": "🇧🇩",
    "Myanmar": "🇲🇲", "Cambodia": "🇰🇭", "Laos": "🇱🇦", "Afghanistan": "🇦🇫",
    "Bahrain": "🇧🇭", "Oman": "🇴🇲", "Yemen": "🇾🇪", "Palestine": "🇵🇸",
    "North Korea": "🇰🇵", "Brunei": "🇧🇳", "Maldives": "🇲🇻",
    "Timor-Leste": "🇹🇱", "Tajikistan": "🇹🇯", "Turkmenistan": "🇹🇲",
    "Antigua and Barbuda": "🇦🇬", "Aruba": "🇦🇼", "Belize": "🇧🇿",
    "Bermuda": "🇧🇲", "British Virgin Islands": "🇻🇬", "Cayman Islands": "🇰🇾",
    "Dominica": "🇩🇲", "Grenada": "🇬🇩", "Guatemala": "🇬🇹", "Guyana": "🇬🇾",
    "Haiti": "🇭🇹", "Honduras": "🇭🇳", "Nicaragua": "🇳🇮",
    "Saint Kitts and Nevis": "🇰🇳", "Saint Lucia": "🇱🇨",
    "Saint Vincent and the Grenadines": "🇻🇨", "Suriname": "🇸🇷",
    "El Salvador": "🇸🇻", "Virgin Islands": "🇻🇮",
    "Angola": "🇦🇴", "Benin": "🇧🇯", "Botswana": "🇧🇼", "Burkina Faso": "🇧🇫",
    "Burundi": "🇧🇮", "Cameroon": "🇨🇲", "Cape Verde": "🇨🇻",
    "Central African Republic": "🇨🇫", "Chad": "🇹🇩", "Comoros": "🇰🇲",
    "Congo": "🇨🇬", "Democratic Republic of the Congo": "🇨🇩", "Djibouti": "🇩🇯",
    "Equatorial Guinea": "🇬🇶", "Eritrea": "🇪🇷", "Eswatini": "🇸🇿",
    "Gabon": "🇬🇦", "The Gambia": "🇬🇲", "Ghana": "🇬🇭", "Guinea": "🇬🇳",
    "Guinea-Bissau": "🇬🇼", "Ivory Coast": "🇨🇮", "Lesotho": "🇱🇸",
    "Liberia": "🇱🇷", "Libya": "🇱🇾", "Malawi": "🇲🇼", "Mali": "🇲🇱",
    "Mauritania": "🇲🇷", "Mauritius": "🇲🇺", "Mozambique": "🇲🇿",
    "Namibia": "🇳🇦", "Niger": "🇳🇪", "Rwanda": "🇷🇼",
    "São Tomé and Príncipe": "🇸🇹", "Senegal": "🇸🇳", "Seychelles": "🇸🇨",
    "Sierra Leone": "🇸🇱", "Somalia": "🇸🇴", "South Sudan": "🇸🇸",
    "Sudan": "🇸🇩", "Tanzania": "🇹🇿", "Togo": "🇹🇬", "Uganda": "🇺🇬",
    "Zambia": "🇿🇲", "Zimbabwe": "🇿🇼", "American Samoa": "🇦🇸",
    "Cook Islands": "🇨🇰", "Fiji": "🇫🇯", "Guam": "🇬🇺", "Kiribati": "🇰🇮",
    "Marshall Islands": "🇲🇭", "Federated States of Micronesia": "🇫🇲",
    "Nauru": "🇳🇷", "Palau": "🇵🇼", "Papua New Guinea": "🇵🇬", "Samoa": "🇼🇸",
    "Solomon Islands": "🇸🇧", "Tonga": "🇹🇴", "Tuvalu": "🇹🇻", "Vanuatu": "🇻🇺",
}


# ── Pageviews + stars ──────────────────────────────────────────────────────

def fetch_pageviews_parallel(athletes: list[dict], days: int = 60) -> None:
    end = datetime.utcnow().strftime("%Y%m%d")
    start = (datetime.utcnow() - timedelta(days=days)).strftime("%Y%m%d")
    base = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
            "en.wikipedia/all-access/all-agents/{title}/daily/{s}/{e}")

    def one(a: dict) -> tuple[str, int]:
        t = a.get("title", "")
        if not t:
            return t, 0
        url = base.format(title=urllib.parse.quote(t.replace(" ", "_"), safe=""),
                          s=start, e=end)
        d = http_json(url, retries=2)
        return t, sum(item.get("views", 0) for item in (d or {}).get("items", []))

    by_t: dict[str, int] = {}
    done = 0
    log.info(f"Pageviews: parallel fetch ({len(athletes)} athletes, 24 threads) ...")
    with ThreadPoolExecutor(max_workers=24) as ex:
        futs = {ex.submit(one, a): a for a in athletes}
        for fut in as_completed(futs):
            try:
                t, v = fut.result()
                by_t[t] = v
            except Exception:
                pass
            done += 1
            if done % 1000 == 0:
                log.info(f"  pageviews: {done}/{len(athletes)}")

    for a in athletes:
        a["pageviews_60d"] = by_t.get(a.get("title", ""), 0)


def compute_stars(is_medalist: bool, n_medal_games: int, pageviews: int,
                  is_flagbearer: bool) -> float:
    medal_score = 4.0 if is_medalist else 0.0
    medal_score += 1.5 * max(0, n_medal_games - 1)
    flag_bonus = 1.0 if is_flagbearer else 0.0
    pv = math.log10(pageviews + 1) if pageviews > 0 else 0
    raw = medal_score + flag_bonus + pv * 1.2
    if raw >= 9:    return 5.0
    if raw >= 7:    return 4.5
    if raw >= 5.5:  return 4.0
    if raw >= 4.2:  return 3.5
    if raw >= 3.0:  return 3.0
    if raw >= 2.0:  return 2.5
    if raw >= 1.0:  return 2.0
    if raw > 0:     return 1.5
    return 1.0


# ── Main pipeline ──────────────────────────────────────────────────────────

def main():
    # Load existing data — we'll preserve qid, gender, country_qid, pageviews_60d
    existing: list[dict] = []
    if DATA_PATH.exists():
        try:
            existing = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        except Exception:
            existing = []
    by_title_existing = {a.get("title", a.get("name", "")): a for a in existing}
    log.info(f"Loaded {len(existing)} existing athletes (will preserve qid/gender/pageviews)")

    fresh_records: dict[str, dict] = {}  # title -> rich record

    for games_key, meta in GAMES.items():
        log.info(f"\n=== {meta['label']}: walking NOC pages ===")

        # Fetch NOC list with retry
        noc_pages: list[dict] = []
        for retry in range(6):
            noc_pages = list_category(meta["noc_category"])
            if noc_pages:
                break
            log.warning(f"  empty NOC list (retry {retry+1}/6) — sleeping 8s")
            time.sleep(8)
        log.info(f"  {len(noc_pages)} NOC pages")

        # Fetch medalist set
        log.info(f"  fetching medalist set ...")
        for retry in range(4):
            medalists_raw = list_category(meta["medalist_cat"])
            if medalists_raw:
                break
            time.sleep(4)
        medalist_titles = {
            m["title"] for m in medalists_raw if m.get("ns") == 0
            and not m["title"].startswith("List of ")
            and " season" not in m["title"].lower()
        }
        log.info(f"  {len(medalist_titles)} medalists")

        # Parallel walk — 8 workers is the sweet spot per Wikipedia
        log.info(f"  fetching wikitexts (8 workers) ...")
        wikitexts: dict[str, tuple[str, str]] = {}  # title -> (country, wikitext)

        def fetch_one(page: dict):
            title = page["title"]
            country = title.removesuffix(meta["page_suffix"]).strip()
            wt = fetch_wikitext(title, retries=4)
            return title, country, wt

        done = 0
        with ThreadPoolExecutor(max_workers=8) as ex:
            futs = {ex.submit(fetch_one, p): p for p in noc_pages}
            for fut in as_completed(futs):
                try:
                    title, country, wt = fut.result()
                    if wt:
                        wikitexts[title] = (country, wt)
                    else:
                        log.warning(f"    ! empty wikitext for {title}")
                except Exception as e:
                    log.warning(f"    ! exception: {e}")
                done += 1
                if done % 30 == 0:
                    log.info(f"    fetched {done}/{len(noc_pages)}")

        log.info(f"  fetched {len(wikitexts)}/{len(noc_pages)} pages — parsing ...")

        for title, (country, wt) in wikitexts.items():
            page_records = parse_country_page(country, wt, games_key)
            for name, rec in page_records.items():
                rec["country"] = country
                rec["games_key"] = games_key
                rec["is_medalist_in_games"] = name in medalist_titles
                existing_rec = fresh_records.get(name)
                if existing_rec:
                    games_list = existing_rec.setdefault("_games_list", [existing_rec["games_key"]])
                    if games_key not in games_list:
                        games_list.append(games_key)
                    for e in rec["events"]:
                        if e not in existing_rec["events"]:
                            existing_rec["events"].append(e)
                    if rec["is_flagbearer_open"]:
                        existing_rec["is_flagbearer_open"] = True
                    if rec["is_flagbearer_close"]:
                        existing_rec["is_flagbearer_close"] = True
                    if rec["is_medalist_in_games"]:
                        med_list = existing_rec.setdefault("_medalist_in_games", [])
                        if games_key not in med_list:
                            med_list.append(games_key)
                else:
                    rec["_games_list"] = [games_key]
                    rec["_medalist_in_games"] = [games_key] if rec.get("is_medalist_in_games") else []
                    fresh_records[name] = rec

        # Cool-down between Games
        time.sleep(5)

    log.info(f"\nFresh records gathered: {len(fresh_records)}")

    # Build final list
    final: list[dict] = []
    for name, rec in fresh_records.items():
        existing_rec = by_title_existing.get(name, {})
        slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        is_medalist = bool(rec.get("_medalist_in_games"))
        n_medal_games = len(rec.get("_medalist_in_games") or [])
        is_flagbearer = rec["is_flagbearer_open"] or rec["is_flagbearer_close"]

        final.append({
            "id": existing_rec.get("id") or slug,
            "title": name,
            "name": name,
            "qid": existing_rec.get("qid", ""),
            "country": rec["country"],
            "country_qid": existing_rec.get("country_qid", ""),
            "flag": COUNTRY_FLAG.get(rec["country"], "🏳️"),
            "gender": existing_rec.get("gender", ""),
            "sport": rec["sport"] if rec["sport"] != "Unknown"
                     else (existing_rec.get("sport") or "Unknown"),
            "events": rec["events"],
            "games": rec["_games_list"],
            "medalist_in": rec["_medalist_in_games"],
            "is_medalist": is_medalist,
            "is_flagbearer_open": rec["is_flagbearer_open"],
            "is_flagbearer_close": rec["is_flagbearer_close"],
            "pageviews_60d": existing_rec.get("pageviews_60d", 0),
            "stars": 1.0,  # filled below
            "wikipedia_url": (f"https://en.wikipedia.org/wiki/"
                              f"{urllib.parse.quote(name.replace(' ', '_'))}"),
        })

    # Refresh pageviews ONLY for athletes with no value yet (new ones from NOC pages)
    needs_pv = [a for a in final if a["pageviews_60d"] == 0]
    if needs_pv:
        log.info(f"Fetching pageviews for {len(needs_pv)} new/missing entries ...")
        fetch_pageviews_parallel(needs_pv)

    # Compute stars
    for a in final:
        a["stars"] = compute_stars(
            a["is_medalist"],
            len(a["medalist_in"]),
            a["pageviews_60d"],
            a["is_flagbearer_open"] or a["is_flagbearer_close"],
        )

    # Sort by stars desc, then name
    final.sort(key=lambda x: (-x["stars"], x["name"]))

    DATA_PATH.write_text(
        json.dumps(final, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info(f"\nWrote {len(final)} athletes -> {DATA_PATH}")

    # Summary
    by_stars: dict[float, int] = {}
    for a in final:
        by_stars[a["stars"]] = by_stars.get(a["stars"], 0) + 1
    log.info("\nStar distribution:")
    for s in sorted(by_stars.keys(), reverse=True):
        log.info(f"  {s} ★  -> {by_stars[s]:>5}")

    n_flag = sum(1 for a in final if a["is_flagbearer_open"] or a["is_flagbearer_close"])
    n_evt = sum(1 for a in final if a["events"])
    log.info(f"Flagbearers: {n_flag}")
    log.info(f"Athletes with events: {n_evt}")

    # Lebanon spot-check
    leb = [a for a in final if a["country"] == "Lebanon"]
    log.info(f"\nLebanese athletes: {len(leb)}")
    for a in leb:
        flags = []
        if a["is_flagbearer_open"]: flags.append("FB-open")
        if a["is_flagbearer_close"]: flags.append("FB-close")
        evt_str = ", ".join(a["events"][:2]) if a["events"] else "—"
        log.info(f"  - {a['name']:<25} | {a['sport']:<25} | {','.join(a['games'])} | events: {evt_str} | {' '.join(flags)}")


if __name__ == "__main__":
    main()
