"""
Enrich athletes_full.json with medal_totals = {gold, silver, bronze}
using Wikidata SPARQL: query athletes who have P1344 (participated in)
Paris 2024 or Milan 2026 with a P166 (award) qualifier = Olympic gold/silver/bronze medal.

Usage:
  .venv/Scripts/python scripts/enrich_medal_counts_sparql.py
"""

import json
import logging
import time
import urllib.parse
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("medal_sparql")

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (demo)"

# Wikidata Q-IDs for each games
GAMES_QIDS = {
    "paris_2024": "Q995653",
    "milan_2026": "Q4630399",
}

# Medal type Q-IDs → color
MEDAL_QIDS = {
    "Q15010":    "gold",    # Olympic gold medal
    "Q15011":    "silver",  # Olympic silver medal
    "Q15012":    "bronze",  # Olympic bronze medal
    "Q406039":   "gold",    # gold medal (generic)
    "Q847956":   "silver",  # silver medal (generic)
    "Q15243387": "bronze",  # bronze medal (generic)
    "Q637270":   "gold",
    "Q637271":   "silver",
    "Q637272":   "bronze",
    "Q47532351": "gold",
    "Q47535644": "silver",
    "Q47535645": "bronze",
}


def sparql_query(query: str, retries: int = 4) -> list[dict]:
    """Run a SPARQL query against Wikidata and return bindings."""
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode(
        {"query": query, "format": "json"}
    )
    delay = 3.0
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/sparql-results+json",
            })
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read().decode("utf-8"))
                return data.get("results", {}).get("bindings", [])
        except Exception as e:
            log.warning(f"  SPARQL attempt {attempt+1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(delay)
                delay = min(delay * 2, 30)
    return []


def fetch_medals_for_games(games_qid: str) -> dict[str, dict]:
    """
    Returns {athlete_qid: {gold, silver, bronze}} for all athletes
    who have P1344=games_qid with a P166 medal qualifier.
    """
    query = f"""
SELECT ?athlete ?medal WHERE {{
  ?athlete wdt:P1344 wd:{games_qid} .
  ?athlete p:P1344 ?stmt .
  ?stmt ps:P1344 wd:{games_qid} .
  ?stmt pq:P166 ?medal .
  ?athlete wdt:P31 wd:Q5 .
}}
"""
    log.info(f"  Running SPARQL for games {games_qid} ...")
    bindings = sparql_query(query)
    log.info(f"  Got {len(bindings)} rows")

    result: dict[str, dict] = {}
    for row in bindings:
        athlete_uri = row.get("athlete", {}).get("value", "")
        medal_uri   = row.get("medal",   {}).get("value", "")

        # Extract Q-IDs from URIs like http://www.wikidata.org/entity/Q12345
        athlete_qid = athlete_uri.rsplit("/", 1)[-1] if "/" in athlete_uri else athlete_uri
        medal_qid   = medal_uri.rsplit("/", 1)[-1]   if "/" in medal_uri   else medal_uri

        color = MEDAL_QIDS.get(medal_qid)
        if not color:
            continue  # Unknown medal type — skip

        if athlete_qid not in result:
            result[athlete_qid] = {"gold": 0, "silver": 0, "bronze": 0}
        result[athlete_qid][color] += 1

    return result


def main():
    log.info(f"Loading {DATA_PATH}")
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info(f"Loaded {len(data)} athletes")

    # Build QID → athlete indices
    qid_index: dict[str, list[int]] = {}
    for i, a in enumerate(data):
        qid = a.get("qid", "").strip()
        if qid:
            qid_index.setdefault(qid, []).append(i)
    log.info(f"QID index: {len(qid_index)} unique QIDs")

    # Reset fallback bronze-only medal_totals from previous runs
    reset_count = 0
    for a in data:
        mt = a.get("medal_totals")
        if mt and mt.get("gold", -1) == 0 and mt.get("silver", -1) == 0 and mt.get("bronze", -1) == 1:
            del a["medal_totals"]
            reset_count += 1
    if reset_count:
        log.info(f"Reset {reset_count} fallback bronze-only medal_totals")

    total_matched = 0
    for games_key, games_qid in GAMES_QIDS.items():
        log.info(f"\n=== {games_key} ({games_qid}) ===")
        medals_by_qid = fetch_medals_for_games(games_qid)
        log.info(f"  Medal data returned for {len(medals_by_qid)} QIDs")

        matched = 0
        for qid, totals in medals_by_qid.items():
            idxs = qid_index.get(qid, [])
            for i in idxs:
                a = data[i]
                # Only assign if this athlete competed in this games
                if games_key not in (a.get("games") or []):
                    continue
                existing = a.get("medal_totals", {})
                # Merge (in case athlete has medals at multiple games)
                a["medal_totals"] = {
                    "gold":   existing.get("gold", 0)   + totals["gold"],
                    "silver": existing.get("silver", 0) + totals["silver"],
                    "bronze": existing.get("bronze", 0) + totals["bronze"],
                }
                matched += 1
        log.info(f"  Matched {matched} athlete records")
        total_matched += matched

        time.sleep(2)  # Be polite between SPARQL queries

    # Summary
    with_any = sum(1 for a in data if a.get("medal_totals") and sum(a["medal_totals"].values()) > 0)
    total_g = sum(a.get("medal_totals", {}).get("gold", 0) for a in data)
    total_s = sum(a.get("medal_totals", {}).get("silver", 0) for a in data)
    total_b = sum(a.get("medal_totals", {}).get("bronze", 0) for a in data)
    log.info(f"\n=== Results ===")
    log.info(f"Athletes with medal_totals: {with_any}")
    log.info(f"  Gold: {total_g}  Silver: {total_s}  Bronze: {total_b}")
    log.info(f"  Total medal records matched: {total_matched}")

    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"Wrote {len(data)} athletes → {DATA_PATH}")

    # Quick spot-check on Duplantis
    dup = next((a for a in data if "Duplantis" in a.get("name", "")), None)
    if dup:
        log.info(f"\nSpot-check Duplantis: medal_totals={dup.get('medal_totals')}")


if __name__ == "__main__":
    main()
