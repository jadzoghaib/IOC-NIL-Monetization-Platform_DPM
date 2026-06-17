import json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
DATA = Path(__file__).parent.parent / "data" / "athletes_full.json"
data = json.loads(DATA.read_text(encoding="utf-8"))
print(f"Total: {len(data)}")
lebanese = [a for a in data if a.get("country") == "Lebanon"]
print(f"Lebanese: {len(lebanese)}")
for a in lebanese:
    games = ",".join(a.get("games") or [])
    print(f"  - {a['name']} | {a.get('sport','?')} | {games} | stars={a.get('stars',0)}")
