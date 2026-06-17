"""
Athlete news service — two-strategy pipeline:
  1. DuckDuckGo news scrape + Groq filter (when DDG is accessible)
  2. Groq-generated personal stories (fallback, always works)

Results are cached 24h in data/athlete_news_cache.json.
"""

import json
import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

_CACHE_PATH = Path(__file__).parent.parent / "data" / "athlete_news_cache.json"
_CACHE_TTL = 86_400 * 7      # 7 days — news stays relevant longer
_GROQ_MODEL = "llama-3.3-70b-versatile"
_DDG_LIMIT  = 8
_MIN_SCORE  = 0.45

# Domains that are social-media profiles, not articles — drop before Groq sees them
_BLOCKED_DOMAINS = {
    "tiktok.com", "instagram.com", "facebook.com", "twitter.com", "x.com",
    "threads.net", "snapchat.com", "youtube.com", "reddit.com",
    "linkedin.com", "pinterest.com", "tumblr.com", "twitch.tv",
}

# ── Cache helpers ─────────────────────────────────────────────────────────────

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
        _CACHE_PATH.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        logger.warning(f"Could not save news cache: {e}")


def _is_stale(entry: dict) -> bool:
    return time.time() - entry.get("fetched_at", 0) > _CACHE_TTL


# ── Groq client helper ────────────────────────────────────────────────────────

def _groq_client():
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=api_key)
    except ImportError:
        return None


# ── Strategy 1: DDG news scrape + Groq filter ─────────────────────────────────

def _build_queries(name: str, sport: str, country: str = "") -> list[str]:
    """Queries tuned to surface real journalism, not social media profiles."""
    base = [
        f'"{name}" athlete interview story 2024 OR 2025 OR 2026',
        f'"{name}" {sport} Olympic career journey',
        f'"{name}" {country} athlete profile training'.strip(),
    ]
    return base


def _is_blocked(url: str) -> bool:
    """True if the URL is a social-media profile page, not an article."""
    if not url:
        return True
    try:
        domain = url.split("/")[2].lstrip("www.")
        return any(domain == b or domain.endswith("." + b) for b in _BLOCKED_DOMAINS)
    except Exception:
        return False


def _fetch_ddg_news(query: str, limit: int = _DDG_LIMIT) -> list[dict]:
    try:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            from ddgs import DDGS  # type: ignore
        with DDGS() as d:
            results = d.news(query, max_results=limit)
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", r.get("link", "")),
                    "summary": r.get("body", r.get("snippet", "")),
                    "source": r.get("source", ""),
                    "published": r.get("date", ""),
                }
                for r in (results or [])
            ]
    except Exception as e:
        logger.debug(f"DDG news failed for '{query}': {e}")
        return []


def _fetch_ddg_text(query: str, limit: int = _DDG_LIMIT) -> list[dict]:
    try:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            from ddgs import DDGS  # type: ignore
        with DDGS() as d:
            results = d.text(query, max_results=limit)
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("href", r.get("url", "")),
                    "summary": r.get("body", ""),
                    "source": r.get("href", "").split("/")[2] if r.get("href") else "",
                    "published": "",
                }
                for r in (results or [])
            ]
    except Exception as e:
        logger.debug(f"DDG text failed for '{query}': {e}")
        return []


def _scrape_and_filter(name: str, sport: str, country: str = "") -> list[dict]:
    """DDG → domain-block → Groq filter pipeline. Returns [] if DDG unavailable."""
    seen_urls: set[str] = set()
    raw: list[dict] = []

    for i, query in enumerate(_build_queries(name, sport, country)):
        if i > 0:
            time.sleep(1.5)
        articles = _fetch_ddg_news(query, _DDG_LIMIT)
        if not articles:
            articles = _fetch_ddg_text(query, _DDG_LIMIT)
        for a in articles:
            url = a.get("url", "")
            if not url or url in seen_urls or _is_blocked(url):
                continue
            seen_urls.add(url)
            raw.append(a)

    if not raw:
        logger.debug(f"DDG returned no usable articles for {name}")
        return []

    client = _groq_client()
    if not client:
        return raw[:8]

    batch = raw[:20]
    payload = [
        {
            "id": j,
            "title": a.get("title", ""),
            "summary": a.get("summary", "")[:300],
            "url": a.get("url", ""),
        }
        for j, a in enumerate(batch)
    ]

    filter_prompt = f"""You are filtering search results for an Olympic athlete fan platform about "{name}" ({sport}).

Score each result. Return ONLY a JSON array, no markdown fences:
[{{"id": 0, "personal_story": 0.8, "is_article": 1.0, "relevance": 0.9, "marketability": 0.7}}, ...]

Scoring rules:
- personal_story (0-1): reveals character, background, struggles, comeback, family, motivation, humanitarian work
- is_article (0-1): 1.0 = real journalism/interview/profile; 0.0 = social media post, fan page, stats table, results page, Wikipedia stub, betting site
- relevance (0-1): actually about THIS athlete (not just mentions their name)
- marketability (0-1): positive, brand-safe, inspiring — NOT injury reports, doping, controversy, race results

KEEP if (personal_story + is_article + relevance + marketability) / 4 >= {_MIN_SCORE}
DISCARD: any result from tiktok, instagram, twitter, youtube, reddit; race results; medal tables; betting odds.

Results:
{json.dumps(payload, ensure_ascii=False)}"""

    try:
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[{"role": "user", "content": filter_prompt}],
            temperature=0.1,
            max_tokens=600,
        )
        raw_txt = resp.choices[0].message.content.strip()
        if raw_txt.startswith("```"):
            raw_txt = "\n".join(raw_txt.split("\n")[1:])
            if raw_txt.startswith("json"):
                raw_txt = raw_txt[4:]
            raw_txt = raw_txt.rsplit("```", 1)[0]
        scores = json.loads(raw_txt)
        kept = []
        for s in scores:
            idx = s.get("id", -1)
            if 0 <= idx < len(batch):
                avg = (
                    s.get("personal_story", 0)
                    + s.get("is_article", 0)
                    + s.get("relevance", 0)
                    + s.get("marketability", 0)
                ) / 4
                if avg >= _MIN_SCORE:
                    kept.append({**batch[idx], "_score": round(avg, 3)})
        result = sorted(kept, key=lambda x: x.get("_score", 0), reverse=True)[:8]
        logger.info(f"News filter: {len(batch)} raw → {len(result)} kept for {name}")
        return result
    except Exception as e:
        logger.warning(f"Groq filter failed: {e} — returning raw")
        return raw[:8]


# ── Strategy 2: Groq-generated stories ────────────────────────────────────────

_GENERATE_PROMPT = """You are a sports journalist writing for an Olympic fan platform.
Generate {count} short, inspiring news-style article summaries about {name}, the {country} {sport} athlete.

Focus ONLY on personal stories: upbringing, family, mental health journey, training philosophy,
personal values, motivation, cultural identity, challenges overcome. NO race results, NO medal counts.

Return ONLY a JSON array, no markdown fences:
[
  {{
    "title": "Compelling article headline (max 12 words)",
    "summary": "2-3 sentence summary revealing something personal about the athlete (max 60 words)",
    "source": "Publication name (e.g. Sports Illustrated, BBC Sport, ESPN)",
    "published": "{date}",
    "url": "https://example.com/placeholder"
  }}
]

Make each summary feel real, warm, and human. Vary the angle: childhood, family, mental health,
culture, motivation, turning point, training ritual, etc."""


def _generate_stories(name: str, country: str, sport: str, count: int = 5) -> list[dict]:
    """Use Groq to generate realistic personal story summaries."""
    client = _groq_client()
    if not client:
        logger.warning("No Groq client — cannot generate stories")
        return []

    today = datetime.now().strftime("%Y-%m-%d")
    prompt = _GENERATE_PROMPT.format(
        count=count, name=name, country=country, sport=sport, date=today
    )

    try:
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1200,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        stories = json.loads(raw)
        # Tag as generated
        for s in stories:
            s.setdefault("_generated", True)
            s.setdefault("_score", 0.85)
        logger.info(f"Generated {len(stories)} stories for {name} via Groq")
        return stories
    except Exception as e:
        logger.error(f"Groq generation failed for {name}: {e}")
        return []


# ── Public API ────────────────────────────────────────────────────────────────

def fetch_athlete_news(
    athlete_id: str,
    name: str,
    sport: str,
    country: str = "",
    force_refresh: bool = False,
    max_articles: int = 8,
) -> dict:
    """
    Returns {"articles": [...], "fetched_at": float, "stale": bool, "source": str}.
    Pipeline: DDG scrape → Groq filter → Groq generation fallback → cached → empty.
    """
    cache = _load_cache()
    entry = cache.get(athlete_id)

    if entry and not force_refresh and not _is_stale(entry):
        return {**entry, "stale": False, "source": "cache"}

    articles: list[dict] = []

    # Strategy 1: DDG scrape + Groq filter
    try:
        articles = _scrape_and_filter(name, sport, country=country)
    except Exception as e:
        logger.warning(f"Scrape/filter pipeline failed for {name}: {e}")

    # Strategy 2: Groq generation fallback
    if not articles:
        try:
            articles = _generate_stories(name, country or "International", sport, count=5)
        except Exception as e:
            logger.error(f"Groq generation failed for {name}: {e}")

    articles = articles[:max_articles]
    new_entry = {"articles": articles, "fetched_at": time.time()}
    cache[athlete_id] = new_entry
    _save_cache(cache)
    source = "generated" if articles and articles[0].get("_generated") else "scraped"
    return {**new_entry, "stale": False, "source": source}


def refresh_all_stale(athletes: list[dict]) -> int:
    """Refresh stale entries. Called by scheduler. Returns count refreshed."""
    cache = _load_cache()
    count = 0
    for a in athletes:
        aid = a["id"]
        entry = cache.get(aid)
        if not entry or _is_stale(entry):
            result = fetch_athlete_news(
                aid, a["name"], a["sport"],
                country=a.get("country", ""),
                force_refresh=True,
            )
            if result.get("articles"):
                count += 1
    return count
