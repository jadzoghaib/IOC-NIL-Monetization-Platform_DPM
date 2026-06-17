"""
APScheduler background job — refreshes athlete news cache daily.
Uses a module-level flag to prevent duplicate schedulers on FastAPI restarts.
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None
_started = False


def start_scheduler(athletes: list[dict]) -> None:
    global _scheduler, _started
    if _started:
        return

    from services.athlete_news import refresh_all_stale

    def _job():
        try:
            n = refresh_all_stale(athletes)
            logger.info(f"[scheduler] Refreshed {n} athlete news entries")
        except Exception as e:
            logger.error(f"[scheduler] News refresh failed: {e}")

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        _job,
        trigger="interval",
        hours=24,
        id="athlete_news_refresh",
        misfire_grace_time=300,
        replace_existing=True,
    )
    # First run after 30 seconds
    from datetime import datetime, timedelta
    _scheduler.add_job(
        _job,
        trigger="date",
        run_date=datetime.now() + timedelta(seconds=30),
        id="athlete_news_first_run",
        replace_existing=True,
    )
    _scheduler.start()
    _started = True
    logger.info("[scheduler] Athlete news scheduler started (30s delay, then every 24h)")


def stop_scheduler() -> None:
    global _scheduler, _started
    if _scheduler and _started:
        _scheduler.shutdown(wait=False)
        _started = False
