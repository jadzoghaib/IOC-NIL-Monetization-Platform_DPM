"""
Enrich athletes_full.json with medal_totals = {gold, silver, bronze}
using Wikidata Entity API (wbgetentities) — no SPARQL needed.

Strategy:
  1. Fetch all medalist athletes' P1344 claims with P166 (medal) qualifiers
  2. Collect all unique event QIDs referenced in those claims
  3. Batch-fetch event labels to determine which games they belong to
     (label contains "2024 Summer Olympics" → paris_2024, etc.)
  4. Assign medals

This bypasses the WDQS outage entirely.

Usage:
  .venv/Scripts/python scripts/enrich_medals_v3.py
"""

import json
import logging
import time
import urllib.parse
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")
log = logging.getLogger("medal_v3")

DATA_PATH = Path(__file__).parent.parent / "data" / "athletes_full.json"
USER_AGENT = "MyMatchOlympics/1.0 (jadzoghaib@hotmail.com)"
BATCH_SIZE = 50

# If a games event label contains any of these → games_key
GAMES_LABEL_MAP = {
    "2024 Summer Olympics": "paris_2024",
    "2024 Summer Olympic":  "paris_2024",
    "Paris 2024":            "paris_2024",
    "2026 Winter Olympics":  "milan_2026",
    "2026 Winter Olympic":   "milan_2026",
    "Milan 2026":            "milan_2026",
    "Milano Cortina 2026":   "milan_2026",
}

# Direct QID matches (games-level) as fallback
GAMES_QIDS = {"Q995653": "paris_2024", "Q4630399": "milan_2026"}

# Medal QIDs → color  (verified against Wikidata labels)
MEDAL_QIDS = {
    # Olympic-specific medals
    "Q15243387": "gold",    # Olympic gold medal   ✓ confirmed
    "Q15889641": "silver",  # Olympic silver medal ✓ confirmed
    "Q15889643": "bronze",  # Olympic bronze medal ✓ confirmed
    # Generic medals (used by some athlete records)
    "Q406039":   "gold",    # gold medal   ✓ confirmed
    "Q847956":   "silver",  # silver medal ✓ confirmed
    "Q873364":   "bronze",  # bronze medal ✓ confirmed
}


def mw_fetch(url: str, retries: int = 5) -> dict:
    delay = 1.0
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            wait = delay * (attempt + 1)
            log.warning(f"  Attempt {attempt+1} failed: {e} — retrying in {wait:.0f}s")
            time.sleep(wait)
    return {}


def batch_fetch_entities(qids: list[str], props: str = "claims") -> dict:
    params = {
        "action": "wbgetentities",
        "ids": "|".join(qids),
        "props": props,
        "format": "json",
        "formatversion": "2",
    }
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(params)
    return mw_fetch(url)


def classify_event_qid(qid: str, label: str) -> str | None:
    """Return games_key for a QID/label, or None if not an Olympic event we care about."""
    # Direct games QID match
    if qid in GAMES_QIDS:
        return GAMES_QIDS[qid]
    # Label match
    for pattern, games_key in GAMES_LABEL_MAP.items():
        if pattern.lower() in label.lower():
            return games_key
    return None


def main():
    log.info(f"Loading {DATA_PATH}")
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info(f"Loaded {len(data)} athletes")

    # Only process medalists with QIDs
    medalist_indices: dict[str, list[int]] = {}  # qid → [index in data]
    for i, a in enumerate(data):
        if a.get("is_medalist") and a.get("qid"):
            qid = a["qid"].strip()
            if qid:
                medalist_indices.setdefault(qid, []).append(i)

    all_medalist_qids = list(medalist_indices.keys())
    log.info(f"Medalists with QID: {len(all_medalist_qids)}")

    # Reset old fallback bronze-only values
    reset_count = 0
    for a in data:
        mt = a.get("medal_totals")
        if mt and mt.get("gold", -1) == 0 and mt.get("silver", -1) == 0 and mt.get("bronze", -1) == 1:
            del a["medal_totals"]
            reset_count += 1
    if reset_count:
        log.info(f"Reset {reset_count} fallback bronze-only medal_totals")

    # ── Pass 1: Collect all (athlete_qid, event_qid, medal_color) triples ────────
    log.info("\n── Pass 1: Fetching athlete P1344/P166 claims ──")
    raw_medals: list[tuple[str, str, str]] = []   # (athlete_qid, event_qid, medal_color)
    event_qids_needed: set[str] = set()

    batches = [all_medalist_qids[i:i+BATCH_SIZE] for i in range(0, len(all_medalist_qids), BATCH_SIZE)]
    for batch_num, batch in enumerate(batches, 1):
        entity_data = batch_fetch_entities(batch, props="claims")
        entities = entity_data.get("entities", {})
        for qid, entity in entities.items():
            if entity.get("missing"):
                continue
            for claim in entity.get("claims", {}).get("P1344", []):
                mainsnak = claim.get("mainsnak", {})
                if mainsnak.get("snaktype") != "value":
                    continue
                event_qid = mainsnak.get("datavalue", {}).get("value", {}).get("id", "")
                if not event_qid:
                    continue
                for qual in claim.get("qualifiers", {}).get("P166", []):
                    if qual.get("snaktype") != "value":
                        continue
                    medal_qid = qual.get("datavalue", {}).get("value", {}).get("id", "")
                    color = MEDAL_QIDS.get(medal_qid)
                    if color:
                        raw_medals.append((qid, event_qid, color))
                        event_qids_needed.add(event_qid)

        if batch_num % 10 == 0:
            log.info(f"  Batch {batch_num}/{len(batches)}: {len(raw_medals)} raw medal triples, {len(event_qids_needed)} unique event QIDs")
        time.sleep(0.3)

    log.info(f"Pass 1 done: {len(raw_medals)} raw medal triples, {len(event_qids_needed)} event QIDs to classify")

    # ── Pass 2: Classify event QIDs by label ─────────────────────────────────────
    log.info("\n── Pass 2: Fetching event labels ──")
    event_labels: dict[str, str] = {}  # qid → label
    event_qid_list = list(event_qids_needed)
    label_batches = [event_qid_list[i:i+BATCH_SIZE] for i in range(0, len(event_qid_list), BATCH_SIZE)]

    for batch_num, batch in enumerate(label_batches, 1):
        entity_data = batch_fetch_entities(batch, props="labels")
        entities = entity_data.get("entities", {})
        for qid, entity in entities.items():
            if entity.get("missing"):
                event_labels[qid] = ""
                continue
            labels = entity.get("labels", {})
            label_en = labels.get("en", {}).get("value", "")
            event_labels[qid] = label_en
        if batch_num % 5 == 0:
            log.info(f"  Label batch {batch_num}/{len(label_batches)}")
        time.sleep(0.3)

    # Classify events
    event_to_games: dict[str, str | None] = {}
    for qid, label in event_labels.items():
        event_to_games[qid] = classify_event_qid(qid, label)

    # Log some samples
    olympic_events = {q: g for q, g in event_to_games.items() if g}
    log.info(f"Events classified as Olympic: {len(olympic_events)}")
    for q, g in list(olympic_events.items())[:5]:
        log.info(f"  {q} ({event_labels.get(q,'?')[:60]}) → {g}")

    # ── Pass 3: Assign medals to athletes ────────────────────────────────────────
    log.info("\n── Pass 3: Assigning medals ──")
    total_matched = 0
    for athlete_qid, event_qid, color in raw_medals:
        games_key = event_to_games.get(event_qid)
        if not games_key:
            continue

        indices = medalist_indices.get(athlete_qid, [])
        for i in indices:
            a = data[i]
            athlete_games = a.get("games") or []
            if games_key not in athlete_games:
                continue
            mt = a.setdefault("medal_totals", {"gold": 0, "silver": 0, "bronze": 0})
            mt[color] = mt.get(color, 0) + 1
            total_matched += 1

    # Summary
    with_any = sum(1 for a in data if a.get("medal_totals") and sum(a["medal_totals"].values()) > 0)
    total_g = sum(a.get("medal_totals", {}).get("gold",   0) for a in data)
    total_s = sum(a.get("medal_totals", {}).get("silver", 0) for a in data)
    total_b = sum(a.get("medal_totals", {}).get("bronze", 0) for a in data)

    log.info(f"\n=== Results ===")
    log.info(f"Athletes with medal_totals: {with_any}")
    log.info(f"  Gold: {total_g}  Silver: {total_s}  Bronze: {total_b}")
    log.info(f"  Total records assigned: {total_matched}")

    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"Wrote {len(data)} athletes → {DATA_PATH}")

    # Spot-checks
    for name in ["Duplantis", "Biles", "Dressel", "Brignone", "Marchand"]:
        match = next((a for a in data if name in a.get("name", "")), None)
        if match:
            log.info(f"  {match['name']}: medal_totals={match.get('medal_totals')}")


if __name__ == "__main__":
    main()
