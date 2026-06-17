"""
Athlete story service — archetype-aware narrative generation.

Pipeline:
  1. Wikipedia (permanent memory) + DDG news (short-term memory) → raw facts
  2. Groq classifies the athlete into a narrative archetype (comeback, legend finale,
     dominant force, rising star, pioneer, underdog, ambassador)
  3. Groq writes a marketable 2-4 sentence bio in the voice specific to that archetype

The archetype drives tone, language choices, and hook structure — not just the facts.
"""

import gzip
import json
import logging
import os
import time
import urllib.request
from pathlib import Path

logger = logging.getLogger(__name__)

_CACHE_PATH      = Path(__file__).parent.parent / "data" / "athlete_stories_cache.json"
_WIKI_CACHE_PATH = Path(__file__).parent.parent / "data" / "athlete_wiki_cache.json"
_GROQ_MODEL      = "llama-3.3-70b-versatile"


# ── Narrative archetypes ───────────────────────────────────────────────────────

ARCHETYPES = {
    "comeback": {
        "label": "The Comeback",
        "signals": "injury, accident, illness, near-death, long recovery, return to sport after adversity",
        "voice": (
            "Visceral and emotional. Lead with the obstacle, land on the triumph. "
            "Use past tense to anchor the struggle, present tense for what's at stake now. "
            "Language: survive, defy, return, fight. "
            "Hook structure: 'He/she was told [obstacle]. [Time later], [name] [present triumph].'"
        ),
        "example": (
            "'He was told he might never ski again. Seven years later, Samer Tawk stands at the "
            "starting gate of Milano-Cortina — Lebanon's only man on the mountain, and proof that "
            "the human spirit doesn't follow medical charts.'"
        ),
    },
    "legend_finale": {
        "label": "The Legend's Last Stand",
        "signals": (
            "veteran athlete, multiple Olympic medals, likely final or penultimate Games, "
            "career-spanning achievements, retirement approaching, going out in glory"
        ),
        "voice": (
            "Epic and weighty. Honour the arc of the career. Make it cinematic — this is the closing "
            "chapter of a defining story. Language: legacy, one last, history, chapter, era. "
            "Hook structure: 'After [X medals / Y years], [name] has one more story to write.'"
        ),
        "example": (
            "'Four Olympics. Three world records. A sport rewritten in her image. Now, at what may be "
            "her final Games, she arrives not chasing glory — she is the glory, and the only question "
            "is how she chooses to close the book.'"
        ),
    },
    "dominant_force": {
        "label": "The Unstoppable",
        "signals": (
            "world record holder, multiple consecutive gold medals, defined their sport, "
            "near-undefeated, universally acknowledged as the best in the world"
        ),
        "voice": (
            "Declarative and inevitable. No hedging, no 'could' or 'might'. State dominance as fact. "
            "Language: there is no one better, unmatched, the only question, redefined. "
            "Hook structure: 'When [name] [does their sport], the competition is already for second place.'"
        ),
        "example": (
            "'When Armand Duplantis approaches the bar, the medals are already sorted — the only "
            "suspense is which record falls next. He has rewritten the ceiling of pole vault so many "
            "times the sport has stopped updating its record books in pencil.'"
        ),
    },
    "rising_star": {
        "label": "The Arrival",
        "signals": (
            "young athlete, first or second Olympics, recent breakthrough season, "
            "future potential, rapid rise through the ranks"
        ),
        "voice": (
            "Electric and forward-moving. Build anticipation. The story is what's coming, not what's been. "
            "Language: about to, watch, the world will know, never seen anything like. "
            "Hook structure: 'The world is about to meet [name].' or 'Nobody outside [country] knew "
            "her name six months ago.'"
        ),
        "example": (
            "'Six months ago, nobody outside of Saint Lucia knew her name. "
            "Julien Alfred is about to change that — a 100m sprinter arriving at her first Olympics "
            "with a time that would have won gold four years ago.'"
        ),
    },
    "pioneer": {
        "label": "The First",
        "signals": (
            "first athlete from their country in this sport, first woman in their discipline, "
            "breaking barriers, qualifying against the odds for a small or developing nation"
        ),
        "voice": (
            "Historical and collective. This person carries something larger than themselves. "
            "Language: first, before, a nation watches, generations, opened the door. "
            "Hook structure: 'Before [name], no one from [country/group] had ever [achievement].'"
        ),
        "example": (
            "'Before Samer Tawk, Lebanon had never sent a cross-country skier to a Winter Olympics. "
            "He didn't just qualify — he built the road, survived a near-fatal accident on it, "
            "and now arrives in Milano-Cortina as a country's entire winter sports story.'"
        ),
    },
    "underdog": {
        "label": "The Defier",
        "signals": (
            "low world ranking, unexpected qualification, small country, not favoured, "
            "competing against much stronger opponents, the long shot"
        ),
        "voice": (
            "Scrappy and defiant. Celebrate the improbability. The chip on the shoulder is the story. "
            "Language: nobody expected, against the odds, refused, didn't get the memo. "
            "Hook structure: 'Nobody gave [name] a chance. [Name] didn't disagree — until the day they did.'"
        ),
        "example": (
            "'The qualifying sheet said this race was already decided. Nobody told her. "
            "She trains on a 400m track shared with a football team, coaches herself on YouTube, "
            "and just punched a ticket to the Olympics that the algorithm said was a 0.3% chance.'"
        ),
    },
    "ambassador": {
        "label": "The Mission",
        "signals": (
            "humanitarian work, foundation, activism, using sport for social change, "
            "inspires community beyond sport, represents something larger than victory"
        ),
        "voice": (
            "Warm and purposeful. The medal is the backdrop; the mission is the story. "
            "Language: beyond the podium, believes, built, community, more than. "
            "Hook structure: 'For [name], winning was never really the point.' or "
            "'Between training sessions, [name] runs a [mission].'"
        ),
        "example": (
            "'Between training sessions, she runs a foundation that has put 400 girls through school "
            "in rural Kenya. The Olympic medal, if it comes, will go on the wall of the community "
            "centre she built — a reminder that sport was always the vehicle, never the destination.'"
        ),
    },
}

_ARCHETYPE_MENU = "\n".join(
    f'- {key.upper()}: {v["signals"]}'
    for key, v in ARCHETYPES.items()
)


# ── Cache helpers ──────────────────────────────────────────────────────────────

def _load_cache() -> dict:
    try:
        if _CACHE_PATH.exists():
            return json.loads(_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_cache(cache: dict) -> None:
    try:
        _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        _CACHE_PATH.write_text(
            json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except Exception as e:
        logger.warning(f"Could not save story cache: {e}")


# ── Wikipedia (permanent memory) ───────────────────────────────────────────────

def _load_wiki_cache() -> dict:
    try:
        if _WIKI_CACHE_PATH.exists():
            return json.loads(_WIKI_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_wiki_cache(cache: dict) -> None:
    try:
        _WIKI_CACHE_PATH.write_text(
            json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except Exception:
        pass


def _fetch_wikipedia_extract(athlete_id: str, wikipedia_url: str) -> str | None:
    wiki_cache = _load_wiki_cache()
    if athlete_id in wiki_cache:
        return wiki_cache[athlete_id]
    if not wikipedia_url:
        return None
    try:
        title   = wikipedia_url.rstrip("/").split("/wiki/")[-1]
        api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
        req = urllib.request.Request(
            api_url,
            headers={
                "User-Agent": "MyMatchOlympics/1.0",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
                raw = gzip.decompress(raw)
            extract = json.loads(raw.decode("utf-8")).get("extract", "").strip()
            if extract:
                extract = extract[:700]
                wiki_cache[athlete_id] = extract
                _save_wiki_cache(wiki_cache)
                return extract
    except Exception as e:
        logger.debug(f"Wikipedia fetch failed for {wikipedia_url}: {e}")
    return None


# ── News snippets (short-term memory) ─────────────────────────────────────────

def _get_news_snippets(athlete_id: str, name: str, sport: str, country: str,
                       force_refresh: bool = False) -> tuple[list[str], float]:
    from services.athlete_news import fetch_athlete_news
    result      = fetch_athlete_news(
        athlete_id, name, sport, country=country, force_refresh=force_refresh
    )
    articles    = result.get("articles", [])
    fetched_at  = result.get("fetched_at", 0.0)
    snippets    = []
    for a in articles[:5]:
        title   = a.get("title", "").strip()
        summary = a.get("summary", "").strip()[:200]
        if title and not a.get("_generated"):
            snippets.append(f'• {title}: {summary}' if summary else f'• {title}')
    return snippets, fetched_at


# ── Groq client ────────────────────────────────────────────────────────────────

def _groq_client():
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=api_key)
    except ImportError:
        return None


# ── Prompt builder ─────────────────────────────────────────────────────────────

def _build_prompt(athlete: dict, wiki_extract: str | None,
                  news_snippets: list[str]) -> str:
    name    = athlete.get("name", "Unknown")
    country = athlete.get("country", "")
    sport   = athlete.get("sport", "")
    stars   = athlete.get("stars", 0)
    events  = ", ".join(athlete.get("events", [])[:4]) or "—"
    medals  = athlete.get("medal_totals") or {}
    gold    = medals.get("gold", 0)
    silver  = medals.get("silver", 0)
    bronze  = medals.get("bronze", 0)
    is_medalist = athlete.get("is_medalist", False)
    flagbearer  = athlete.get("is_flagbearer_open") or athlete.get("is_flagbearer_close")

    if gold or silver or bronze:
        parts = []
        if gold:   parts.append(f"{gold} Olympic gold")
        if silver: parts.append(f"{silver} Olympic silver")
        if bronze: parts.append(f"{bronze} Olympic bronze")
        status = ", ".join(parts)
    elif is_medalist:
        status = "Olympic medalist"
    else:
        status = "Olympic competitor (no medals)"

    extras = []
    if flagbearer:    extras.append("chosen as their country's flag bearer")
    if stars >= 4.5:  extras.append("one of the most-followed athletes at these Games")

    wiki_block = f'WIKIPEDIA (historical facts — permanent record):\n"""{wiki_extract}"""' \
        if wiki_extract else "(No Wikipedia article available)"

    news_block = "RECENT NEWS (current context):\n" + "\n".join(news_snippets) \
        if news_snippets else "(No recent news found)"

    archetype_examples = "\n\n".join(
        f'If {key.upper()}: write like — {v["example"]}'
        for key, v in ARCHETYPES.items()
    )

    return f"""You are a sports marketing copywriter crafting the opening line of an athlete's profile
for an Olympic fan engagement platform. Your job is not journalism — it is to make fans feel something
and want to follow this athlete.

═══ STEP 1 — CLASSIFY ═══
Read the facts below and pick the ONE archetype that best fits this athlete's story:

{_ARCHETYPE_MENU}

═══ STEP 2 — WRITE ═══
Using the voice and hook structure for the chosen archetype, write ONE paragraph (2–4 sentences,
max 90 words) about {name}.

RULES — non-negotiable:
• The first sentence must be a HOOK. Make it impossible to stop reading.
• Use SPECIFIC facts from the sources below. Never be vague or generic.
• Match the archetype's language and emotional register exactly.
• Do NOT write like a Wikipedia summary or a press release.
• Forbidden phrases: "poised to", "set to", "looks to", "aims to", "hoping to", "one of the best".
• Write in present tense as if the Games are starting tomorrow.

STYLE EXAMPLES BY ARCHETYPE:
{archetype_examples}

═══ ATHLETE FACTS ═══
Name: {name}
Country: {country}
Sport: {sport}
Events: {events}
Career: {status}
Stars: {stars}/5
{"Notable: " + "; ".join(extras) if extras else ""}

{wiki_block}

{news_block}

═══ OUTPUT FORMAT ═══
Return exactly two lines, nothing else:
ARCHETYPE: [one of: comeback / legend_finale / dominant_force / rising_star / pioneer / underdog / ambassador]
STORY: [the paragraph]"""


# ── Story generation ───────────────────────────────────────────────────────────

def _generate_story(athlete: dict, wiki_extract: str | None,
                    news_snippets: list[str]) -> tuple[str | None, str | None]:
    """Returns (story_text, archetype_key) or (None, None)."""
    client = _groq_client()
    if not client:
        return None, None

    prompt = _build_prompt(athlete, wiki_extract, news_snippets)
    try:
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.82,
            max_tokens=250,
        )
        raw = resp.choices[0].message.content.strip()

        # Parse the two-line format
        archetype_key = None
        story_text    = None
        for line in raw.splitlines():
            line = line.strip()
            if line.upper().startswith("ARCHETYPE:"):
                archetype_key = line.split(":", 1)[1].strip().lower()
            elif line.upper().startswith("STORY:"):
                story_text = line.split(":", 1)[1].strip()

        # Fallback: if formatting broke, just use the whole thing as story
        if not story_text and len(raw) > 30:
            story_text = raw

        if story_text and len(story_text) > 30:
            logger.info(
                f"Story generated for {athlete.get('name')} "
                f"[archetype: {archetype_key}]"
            )
            return story_text, archetype_key

    except Exception as e:
        logger.warning(f"Groq story generation failed for {athlete.get('name')}: {e}")
    return None, None


# ── Public API ─────────────────────────────────────────────────────────────────

def get_story(athlete: dict, force_refresh: bool = False) -> dict:
    """
    Returns {"story": str|None, "archetype": str|None}.
    Cache key includes news timestamp so refreshing news triggers story regeneration.
    """
    athlete_id = athlete.get("id", "")
    if not athlete_id:
        return {"story": None, "archetype": None}

    name    = athlete.get("name", athlete_id)
    sport   = athlete.get("sport", "")
    country = athlete.get("country", "")

    # Short-term memory: news articles
    news_snippets, news_ts = _get_news_snippets(
        athlete_id, name, sport, country, force_refresh=force_refresh
    )

    # Cache key tied to news freshness (hourly granularity)
    story_key = f"{athlete_id}@{int(news_ts // 3600)}"
    cache     = _load_cache()

    if not force_refresh and story_key in cache:
        cached = cache[story_key]
        if isinstance(cached, dict):
            return cached
        # legacy string format
        return {"story": cached, "archetype": None}

    # Permanent memory: Wikipedia
    wiki_extract = _fetch_wikipedia_extract(
        athlete_id, athlete.get("wikipedia_url", "")
    )

    if not wiki_extract and not news_snippets:
        logger.info(f"No context for {name} — skipping generation")
        return {"story": None, "archetype": None}

    story, archetype = _generate_story(athlete, wiki_extract, news_snippets)

    result = {"story": story, "archetype": archetype}
    if story:
        # Remove old cache entries for this athlete
        for k in [k for k in cache if k.startswith(f"{athlete_id}@")]:
            del cache[k]
        cache[story_key] = result
        _save_cache(cache)

    return result


def invalidate_story(athlete_id: str) -> None:
    """Remove cached story for this athlete (called after news refresh)."""
    cache    = _load_cache()
    old_keys = [k for k in cache if k.startswith(f"{athlete_id}@")]
    if old_keys:
        for k in old_keys:
            del cache[k]
        _save_cache(cache)
        logger.info(f"Story invalidated for {athlete_id}")
