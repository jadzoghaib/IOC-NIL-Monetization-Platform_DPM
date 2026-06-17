"""
Enrich athletes_full.json with medal_totals = {gold, silver, bronze}
using the Wikidata Entity API (wbgetentities) — NOT the SPARQL endpoint.
This avoids the active WDQS outage.

Fetches P1344 (participated in) claims with P166 (award) qualifiers
for all athletes flagged as is_medalist=True with a known QID.

Usage:
  .venv/Scripts/python scripts/enrich_medals_entity_api.py
"""

import json
import logging
import time
import urllib.parse
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("medal_entity")

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (jadzoghaib@hotmail.com)"
BATCH_SIZE = 50

# Games QIDs we care about
GAMES_QIDS = {"Q995653": "paris_2024", "Q4630399": "milan_2026"}

# Medal QIDs → color
MEDAL_QIDS = {
    "Q15010":    "gold",
    "Q15011":    "silver",
    "Q15012":    "bronze",
    "Q406039":   "gold",
    "Q847956":   "silver",
    "Q15243387": "bronze",
    "Q637270":   "gold",
    "Q637271":   "silver",
    "Q637272":   "bronze",
    "Q47532351": "gold",
    "Q47535644": "silver",
    "Q47535645": "bronze",
}


def fetch_entities(qids: list[str]) -> dict:
    """Fetch entity data for a batch of QIDs via wbgetentities."""
    params = {
        "action": "wbgetentities",
        "ids": "|".join(qids),
        "props": "claims",
        "format": "json",
        "formatversion": "2",
    }
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            wait = (attempt + 1) * 3
            log.warning(f"  Attempt {attempt+1} failed: {e} — retrying in {wait}s")
            time.sleep(wait)
    return {}


def extract_medals(entity_data: dict) -> dict[str, dict]:
    """
    Given the 'entities' dict from wbgetentities, return:
      { qid: { games_key: {gold, silver, bronze} } }
    """
    results = {}
    entities = entity_data.get("entities", {})
    for qid, entity in entities.items():
        if entity.get("missing"):
            continue
        claims = entity.get("claims", {})
        p1344_claims = claims.get("P1344", [])
        for claim in p1344_claims:
            # Get the games QID from mainsnak
            mainsnak = claim.get("mainsnak", {})
            if mainsnak.get("snaktype") != "value":
                continue
            dv = mainsnak.get("datavalue", {})
            games_qid = dv.get("value", {}).get("id", "")
            games_key = GAMES_QIDS.get(games_qid)
            if not games_key:
                continue

            # Get P166 (award) qualifiers
            qualifiers = claim.get("qualifiers", {})
            p166_quals = qualifiers.get("P166", [])
            for qual in p166_quals:
                if qual.get("snaktype") != "value":
                    continue
                medal_qid = qual.get("datavalue", {}).get("value", {}).get("id", "")
                color = MEDAL_QIDS.get(medal_qid)
                if not color:
                    continue
                if qid not in results:
                    results[qid] = {}
                if games_key not in results[qid]:
                    results[qid][games_key] = {"gold": 0, "silver": 0, "bronze": 0}
                results[qid][games_key][color] += 1
    return results


def main():
    log.info(f"Loading {DATA_PATH}")
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info(f"Loaded {len(data)} athletes")

    # Collect medalists with QIDs
    medalist_qids = []
    qid_to_indices: dict[str, list[int]] = {}
    for i, a in enumerate(data):
        if a.get("is_medalist") and a.get("qid"):
            qid = a["qid"].strip()
            if qid and qid not in qid_to_indices:
                medalist_qids.append(qid)
            qid_to_indices.setdefault(qid, []).append(i)

    log.info(f"Medalists with QID: {len(medalist_qids)} unique QIDs")

    # Reset old fallback bronze-only values
    reset_count = 0
    for a in data:
        mt = a.get("medal_totals")
        if mt and mt.get("gold", -1) == 0 and mt.get("silver", -1) == 0 and mt.get("bronze", -1) == 1:
            del a["medal_totals"]
            reset_count += 1
    if reset_count:
        log.info(f"Reset {reset_count} fallback bronze-only medal_totals")

    # Process in batches
    total_matched = 0
    batches = [medalist_qids[i:i+BATCH_SIZE] for i in range(0, len(medalist_qids), BATCH_SIZE)]
    log.info(f"Processing {len(batches)} batches of up to {BATCH_SIZE}")

    for batch_num, batch in enumerate(batches, 1):
        log.info(f"Batch {batch_num}/{len(batches)} ({len(batch)} QIDs)...")
        entity_data = fetch_entities(batch)
        medals_by_qid = extract_medals(entity_data)

        for qid, games_medals in medals_by_qid.items():
            indices = qid_to_indices.get(qid, [])
            for i in indices:
                a = data[i]
                athlete_games = a.get("games") or []
                for games_key, totals in games_medals.items():
                    if games_key not in athlete_games:
                        continue
                    existing = a.get("medal_totals", {})
                    a["medal_totals"] = {
                        "gold":   existing.get("gold",   0) + totals["gold"],
                        "silver": existing.get("silver", 0) + totals["silver"],
                        "bronze": existing.get("bronze", 0) + totals["bronze"],
                    }
                    total_matched += 1

        if batch_num % 10 == 0:
            log.info(f"  Progress: {batch_num}/{len(batches)} batches, {total_matched} matched so far")
        time.sleep(0.4)  # Be polite

    # Summary
    with_any = sum(1 for a in data if a.get("medal_totals") and sum(a["medal_totals"].values()) > 0)
    total_g = sum(a.get("medal_totals", {}).get("gold",   0) for a in data)
    total_s = sum(a.get("medal_totals", {}).get("silver", 0) for a in data)
    total_b = sum(a.get("medal_totals", {}).get("bronze", 0) for a in data)

    log.info(f"\n=== Results ===")
    log.info(f"Athletes with medal_totals: {with_any}")
    log.info(f"  Gold: {total_g}  Silver: {total_s}  Bronze: {total_b}")
    log.info(f"  Total athlete records matched: {total_matched}")

    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"Wrote {len(data)} athletes → {DATA_PATH}")

    # Spot-checks
    for name in ["Duplantis", "Biles", "Dressel", "Brignone"]:
        match = next((a for a in data if name in a.get("name", "")), None)
        if match:
            log.info(f"  {match['name']}: medal_totals={match.get('medal_totals')}")


if __name__ == "__main__":
    main()
