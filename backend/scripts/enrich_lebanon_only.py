"""One-shot: ensure Lebanon athletes are properly enriched in athletes_full.json."""
import sys, json, re, urllib.parse, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from enrich_from_noc_pages import (
    fetch_wikitext, parse_country_page, COUNTRY_FLAG,
)
sys.stdout.reconfigure(encoding="utf-8")

DATA = Path(__file__).parent.parent / "data" / "athletes_full.json"
data = json.loads(DATA.read_text(encoding="utf-8"))
by_title = {a["title"]: a for a in data}

PAGES = [
    ("Lebanon", "Lebanon at the 2024 Summer Olympics", "paris_2024"),
    ("Lebanon", "Lebanon at the 2026 Winter Olympics", "milan_2026"),
]

added = 0
enriched = 0
for country, page, games in PAGES:
    print(f"Fetching {page} ...")
    for retry in range(5):
        wt = fetch_wikitext(page)
        if wt:
            break
        print(f"  empty, retry {retry+1}/5")
        time.sleep(5)
    if not wt:
        print(f"  ! could not fetch")
        continue

    athletes = parse_country_page(country, wt)
    print(f"  parsed: {len(athletes)} athlete candidates")
    for a in athletes:
        title = a["name"]
        if title in by_title:
            rec = by_title[title]
            if not rec.get("country"):
                rec["country"] = country
            if not rec.get("flag") or rec.get("flag") == "🏳️":
                rec["flag"] = COUNTRY_FLAG.get(country, "🏳️")
            if not rec.get("sport") or rec.get("sport") in ("Unknown", ""):
                rec["sport"] = a["sport"]
            if games not in (rec.get("games") or []):
                rec.setdefault("games", []).append(games)
            enriched += 1
        else:
            slug = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")
            by_title[title] = {
                "id": slug, "title": title, "name": title, "qid": "",
                "country": country, "country_qid": "",
                "flag": COUNTRY_FLAG.get(country, "🏳️"),
                "gender": "", "sport": a["sport"],
                "games": [games], "medalist_in": [], "is_medalist": False,
                "pageviews_60d": 0, "stars": 2.0,
                "wikipedia_url": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
            }
            added += 1
            print(f"  + ADDED: {title} ({a['sport']})")

final = list(by_title.values())
final.sort(key=lambda x: (-x.get("stars", 0), x.get("name", "")))
DATA.write_text(json.dumps(final, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\nEnriched: {enriched}, added: {added}, total: {len(final)}")

print("\nLebanese athletes:")
for a in final:
    if a.get("country") == "Lebanon":
        print(f"  - {a['name']} | {a.get('sport')} | {','.join(a.get('games',[]))}")
