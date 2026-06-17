"""
My Match — Olympics Edition
A values-driven fan engagement platform for the Olympic Games.
Matches fans to Olympic athletes based on psychographic archetypes.
"""

import random
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

st.set_page_config(
    page_title="My Match · Olympics",
    page_icon="🏅",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Custom CSS ──────────────────────────────────────────────────────────────

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

.hero-title {
    font-size: 3.2rem; font-weight: 900; line-height: 1.1;
    background: linear-gradient(135deg, #FFD700 0%, #FF6B35 50%, #FF4757 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin-bottom: 0.2rem;
}
.hero-sub {
    font-size: 1.15rem; color: #AAA; margin-bottom: 2rem;
}
.quiz-question {
    font-size: 1.45rem; font-weight: 700; color: #FFF;
    line-height: 1.35; margin-bottom: 1.4rem;
}
.option-btn {
    display: block; width: 100%; text-align: left;
    background: #1A1A25; border: 1.5px solid #2A2A3A;
    color: #DDD; padding: 0.85rem 1.2rem; border-radius: 10px;
    font-size: 0.97rem; cursor: pointer; margin-bottom: 0.6rem;
    transition: all 0.18s ease;
}
.option-btn:hover { border-color: #FFD700; color: #FFD700; background: #1F1F30; }
.archetype-card {
    border-radius: 16px; padding: 2rem;
    border: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 1.5rem;
}
.athlete-card {
    background: #13131A; border-radius: 12px; padding: 1.25rem;
    border: 1px solid #222230; margin-bottom: 0.8rem;
}
.stat-pill {
    display: inline-block; background: rgba(255,215,0,0.12);
    color: #FFD700; border-radius: 20px; padding: 0.25rem 0.75rem;
    font-size: 0.8rem; font-weight: 600; margin-right: 0.4rem; margin-bottom: 0.4rem;
}
.sponsor-badge {
    border-radius: 12px; padding: 1.2rem 1.5rem;
    border: 1px solid rgba(255,215,0,0.3); background: rgba(255,215,0,0.05);
}
.progress-dots { display: flex; gap: 6px; margin-bottom: 1.8rem; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-active { background: #FFD700; }
.dot-done { background: #FFD70066; }
.dot-pending { background: #333; }
.insight-card {
    background: #13131A; border-radius: 12px; padding: 1.3rem;
    border-left: 4px solid #FFD700; margin-bottom: 1rem;
}
.big-stat { font-size: 2.8rem; font-weight: 900; color: #FFD700; line-height: 1; }
.big-stat-label { font-size: 0.85rem; color: #888; margin-top: 0.2rem; }
</style>
""", unsafe_allow_html=True)

# ── DATA ─────────────────────────────────────────────────────────────────────

MOTIVATION_QS = [
    {
        "question": "What draws you to the Olympics most?",
        "options": {
            "Watching athletes push the absolute limits of human performance": "ambition",
            "Feeling the whole world united around something bigger than sport": "unity",
            "Stories of athletes who overcame everything to get here": "inspiration",
            "Honoring the traditions and history that make the Games timeless": "legacy",
        },
    },
    {
        "question": "Your Olympics feels most meaningful when…",
        "options": {
            "A world record falls and history is rewritten in real time": "ambition",
            "Your country's flag is raised and the anthem fills the stadium": "unity",
            "An underdog no one believed in shocks the world on the biggest stage": "inspiration",
            "You watch an event you grew up watching with people you love": "legacy",
        },
    },
    {
        "question": "At a watch party, what makes you most emotional?",
        "options": {
            "A jaw-dropping performance that defies everything we thought possible": "ambition",
            "Seeing fans from rival nations cheering side by side": "unity",
            "An athlete crying on the podium after years of unseen struggle": "inspiration",
            "A veteran athlete competing in what might be their final Games": "legacy",
        },
    },
    {
        "question": "After the closing ceremony, what do you remember most?",
        "options": {
            "The records broken and the performances that redefined excellence": "ambition",
            "The moments when sport dissolved every border in the room": "unity",
            "The athlete who proved everyone wrong — including themselves": "inspiration",
            "The rituals, pageantry, and threads that connect each Games to the last": "legacy",
        },
    },
]

ENGAGEMENT_QS = [
    {
        "question": "How do you typically watch the Olympics?",
        "options": {
            "Hosting or joining a big viewing party — the bigger, the better": "social",
            "Tracking medal counts, running predictions, winning every bracket": "competitive",
            "Quietly, completely absorbed — every detail and story matters": "reflective",
        },
    },
    {
        "question": "Your favorite kind of Olympic moment is…",
        "options": {
            "Something so wild you immediately share it with everyone": "social",
            "The final hundredth of a second in a photo-finish race": "competitive",
            "A quiet, private moment of triumph caught on camera": "reflective",
        },
    },
    {
        "question": "When the Olympics ends, you…",
        "options": {
            "Are already planning watch parties and countdowns for the next Games": "social",
            "Debate which athlete had the greatest Games in Olympic history": "competitive",
            "Sit with what you witnessed — it takes a few days to fully process": "reflective",
        },
    },
]

# 12 archetypes: 4 motivations × 3 engagement styles
ARCHETYPES = {
    ("ambition", "social"): {
        "name": "The Hype Champion",
        "emoji": "🏆",
        "color": "#FFD700",
        "tagline": "First to celebrate, loudest in the room, infectious energy",
        "description": (
            "You're drawn to peak performance and you want the whole world to feel it with you. "
            "When an athlete breaks a barrier, you're already screenshotting, texting, and pulling "
            "everyone around you into the moment. You don't just watch greatness — you amplify it."
        ),
        "data_insight": "68% of fans in your archetype cite 'viral moments' as their primary reason to tune in live vs. on-demand.",
        "sports": ["Track & Field", "Swimming", "Gymnastics"],
        "athletes": [
            {
                "name": "Noah Lyles",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "100m Sprint",
                "story": "Lyles ran 9.79 in Paris — and immediately turned to the cameras. His pre-race theatrics and post-race celebrations make every final feel like a main event. Follow him for the sport, stay for the show.",
            },
            {
                "name": "Sha'Carri Richardson",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "100m Sprint",
                "story": "Long nails, orange hair, and a runway stride. Richardson made her Olympic comeback iconic before the gun even fired. She races the way she lives — unapologetically loud.",
            },
            {
                "name": "Gianmarco Tamberi",
                "country": "Italy",
                "flag": "🇮🇹",
                "sport": "High Jump",
                "story": "Tamberi shared his Tokyo gold with Qatar's Barshim in one of the most wholesome moments in Olympic history — then arrived in Paris as defending champion with the same theatrical energy.",
            },
            {
                "name": "Letsile Tebogo",
                "country": "Botswana",
                "flag": "🇧🇼",
                "sport": "200m Sprint",
                "story": "At 21, Tebogo ran 19.46 to become Botswana's first Olympic athletics gold medalist. He celebrates like a teenager who just won a neighborhood race — pure, unfiltered joy.",
            },
        ],
    },
    ("ambition", "competitive"): {
        "name": "The Gold Chaser",
        "emoji": "⏱️",
        "color": "#FF6B35",
        "tagline": "Records exist to be broken. You have the receipts.",
        "description": (
            "You track split times between events. You have the world rankings memorized. "
            "When a record falls, you already knew it was coming — and you have opinions about "
            "the margin. For you the Olympics is the ultimate performance benchmark, and you "
            "hold every athlete to the highest possible standard."
        ),
        "data_insight": "Fans in your archetype spend 3.2× more time on sports-data apps during Olympic weeks than any other segment.",
        "sports": ["Swimming", "Track & Field", "Cycling"],
        "athletes": [
            {
                "name": "Léon Marchand",
                "country": "France",
                "flag": "🇫🇷",
                "sport": "Swimming",
                "story": "Four individual gold medals in Paris on home soil. Marchand broke Michael Phelps's 400m IM world record in 2023 and then dismantled the competition in his home city. He may be the greatest swimmer alive.",
            },
            {
                "name": "Sydney McLaughlin-Levrone",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "400m Hurdles",
                "story": "McLaughlin has broken the 400m hurdles world record six times. In Paris she ran 50.37 — so fast the broadcast team ran out of superlatives. She competes against the clock more than anyone else in the field.",
            },
            {
                "name": "Mondo Duplantis",
                "country": "Sweden",
                "flag": "🇸🇪",
                "sport": "Pole Vault",
                "story": "Duplantis broke the world record 10 times between Tokyo and Paris. His hobby is apparently setting a new ceiling for human possibility every few months. In Paris he won gold and then cleared 6.25m just because he could.",
            },
            {
                "name": "Pan Zhanle",
                "country": "China",
                "flag": "🇨🇳",
                "sport": "100m Freestyle",
                "story": "Pan shattered the 100m freestyle world record in Paris with 46.40 — obliterating the previous mark by almost half a second. A performance so dominant it rewrote what experts thought was biomechanically possible.",
            },
        ],
    },
    ("ambition", "reflective"): {
        "name": "The Precision Seeker",
        "emoji": "🎯",
        "color": "#4ECDC4",
        "tagline": "You see the details no one else notices. That's your superpower.",
        "description": (
            "You're not just watching the result — you're watching the technique, the mental "
            "game, the micro-adjustments mid-competition. You appreciate mastery at its deepest "
            "level. The Olympics, for you, is a masterclass in human potential that you sit with "
            "long after the medal ceremony ends."
        ),
        "data_insight": "72% of fans in your archetype say they watch Olympic events multiple times to fully absorb what they witnessed.",
        "sports": ["Gymnastics", "Swimming", "Marathon"],
        "athletes": [
            {
                "name": "Simone Biles",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "Gymnastics",
                "story": "Biles has skills named after her that other gymnasts won't attempt. Her Paris comeback — three golds and a silver — was technically the greatest gymnastics performance in Olympic history. She chose her mental health, then returned and raised the ceiling.",
            },
            {
                "name": "Eliud Kipchoge",
                "country": "Kenya",
                "flag": "🇰🇪",
                "sport": "Marathon",
                "story": "Kipchoge ran sub-2 hours in a non-competitive setting and holds the Olympic marathon record. He talks about running like a philosopher talks about existence. When he didn't medal in Paris, he congratulated the winner as if passing a torch.",
            },
            {
                "name": "Katie Ledecky",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "Swimming",
                "story": "Nine Olympic golds and counting. Ledecky's stroke is textbook, her pacing is algorithmic, and her dominance in distance freestyle has lasted over a decade. She is the standard against which future generations will be measured.",
            },
            {
                "name": "Neeraj Chopra",
                "country": "India",
                "flag": "🇮🇳",
                "sport": "Javelin",
                "story": "Chopra became India's first Olympic athletics gold medalist in Tokyo with a throw of 87.58m, then won silver in Paris at 89.45m. His technical precision with the javelin — and his humility about it — make him the quiet master of his event.",
            },
        ],
    },
    ("unity", "social"): {
        "name": "The Flag Waver",
        "emoji": "🏳️",
        "color": "#FF4757",
        "tagline": "Your flag, your people, your proudest moment.",
        "description": (
            "Nothing moves you like seeing your nation — or a small nation claiming its first "
            "gold — take the Olympic stage. You share the wins, gather the community, and "
            "believe sport is one of the few things that can genuinely unite people across "
            "every dividing line. The Olympics are your Super Bowl, World Cup, and national "
            "holiday rolled into one."
        ),
        "data_insight": "Fans in your archetype are 4.1× more likely to attend an Olympic event in person when their country is competing.",
        "sports": ["Gymnastics", "Athletics", "Swimming"],
        "athletes": [
            {
                "name": "Rebeca Andrade",
                "country": "Brazil",
                "flag": "🇧🇷",
                "sport": "Gymnastics",
                "story": "Andrade won four medals in Paris — the most of any athlete at the Games — and became Brazil's most decorated Olympian ever. The Favela kid who grew up training without mats is now the face of an entire country's Olympic dream.",
            },
            {
                "name": "Carlos Yulo",
                "country": "Philippines",
                "flag": "🇵🇭",
                "sport": "Gymnastics",
                "story": "Two gold medals in Paris made Yulo the Philippines' first-ever Olympic gymnastics champion. The country gave him land, cars, and a lifetime of free food. He turned a nation of 115 million into gymnastics fans overnight.",
            },
            {
                "name": "Julien Alfred",
                "country": "St. Lucia",
                "flag": "🇱🇨",
                "sport": "100m Sprint",
                "story": "Alfred became the first St. Lucian to win an Olympic gold medal with a time of 10.72. The island nation of 180,000 people erupted. She trains in Texas and runs for a dot on a map that now feels enormous.",
            },
            {
                "name": "Tatjana Smith",
                "country": "South Africa",
                "flag": "🇿🇦",
                "sport": "Breaststroke",
                "story": "Smith won gold in Paris in the 100m breaststroke and silver in the 200m — South Africa's first swimming golds in over two decades. Her country watched at 2am local time and celebrated until dawn.",
            },
        ],
    },
    ("unity", "competitive"): {
        "name": "The Team Rally",
        "emoji": "🤝",
        "color": "#2ED573",
        "tagline": "Your country's medal count is personal. Very personal.",
        "description": (
            "You track every event that could add to your nation's total. You know which sports "
            "your country historically dominates and you feel every podium finish viscerally. "
            "You want to see your people win, and you're competitive about it. The Olympics "
            "isn't just sport — it's national pride on the world's biggest scoreboard."
        ),
        "data_insight": "Fans in your archetype watch 34% more events during the Olympics than average, especially events where their country has a medal favorite.",
        "sports": ["Athletics", "Swimming", "Cycling"],
        "athletes": [
            {
                "name": "Elaine Thompson-Herah",
                "country": "Jamaica",
                "flag": "🇯🇲",
                "sport": "100m & 200m Sprint",
                "story": "Thompson-Herah completed the sprint double in Tokyo with an Olympic record of 10.61 — the fastest any woman has run the 100m at the Games. Jamaica celebrated with the kind of intensity only a country that treats sprinting as a national religion can.",
            },
            {
                "name": "Faith Kipyegon",
                "country": "Kenya",
                "flag": "🇰🇪",
                "sport": "1500m",
                "story": "Three-time Olympic 1500m champion. Kipyegon runs like someone who decided winning once wasn't a story worth telling. Kenya built an entire tradition of middle-distance greatness, and she is its undisputed standard-bearer.",
            },
            {
                "name": "Marileidy Paulino",
                "country": "Dominican Republic",
                "flag": "🇩🇴",
                "sport": "400m",
                "story": "Paulino defended her World 400m title and won gold in Paris, cementing herself as the most dominant 400m runner of her era. The Dominican Republic does not have many Olympic traditions — she is creating one.",
            },
            {
                "name": "Shaunae Miller-Uibo",
                "country": "Bahamas",
                "flag": "🇧🇸",
                "sport": "400m",
                "story": "Olympic champion in 2016 and 2020 with a famous dive at the line in Rio. Miller-Uibo runs for a country of 400,000 that punches so far above its weight in sprinting it has become an international story in itself.",
            },
        ],
    },
    ("unity", "reflective"): {
        "name": "The Storyteller",
        "emoji": "📖",
        "color": "#A29BFE",
        "tagline": "The athlete's journey matters more than the result.",
        "description": (
            "You're the one who stays up watching the post-event interview instead of flipping "
            "channels. You want to understand where these athletes came from — the struggles, "
            "the setbacks, the sacrifices of the people behind them. Sport, for you, is the "
            "most universal language, and Olympic athletes are its greatest narrators."
        ),
        "data_insight": "Fans in your archetype are 2.9× more likely to follow athletes on social media after learning their personal story.",
        "sports": ["Marathon", "Athletics", "Tennis"],
        "athletes": [
            {
                "name": "Sifan Hassan",
                "country": "Netherlands",
                "flag": "🇳🇱",
                "sport": "Marathon",
                "story": "Hassan fled Ethiopia as a teenager, lived in a refugee camp in Djibouti, and arrived in the Netherlands speaking no Dutch. In Paris she won marathon gold. Her story is not an underdog story — it is something larger: a reminder of what humans carry and what they are capable of.",
            },
            {
                "name": "Zheng Qinwen",
                "country": "China",
                "flag": "🇨🇳",
                "sport": "Tennis",
                "story": "Zheng won China's first-ever Olympic tennis gold in Paris, defeating the world No. 2 in the final. She trains with unusual intensity — reportedly hitting 1,000 forehands per practice session. She told reporters she played for her late grandmother.",
            },
            {
                "name": "Jasmine Camacho-Quinn",
                "country": "Puerto Rico",
                "flag": "🇵🇷",
                "sport": "100m Hurdles",
                "story": "Camacho-Quinn won Olympic gold in Tokyo and silver in Paris representing a territory — not a country — that nonetheless has one of the proudest Olympic traditions in the Americas. She inspires an island with complicated politics through something uncomplicated: speed.",
            },
            {
                "name": "Kishane Thompson",
                "country": "Jamaica",
                "flag": "🇯🇲",
                "sport": "100m Sprint",
                "story": "Thompson ran the fastest 100m in the world in 2024 (9.77) but finished second to Lyles in Paris by five-thousandths of a second. His quiet dignity after one of the narrowest losses in Olympic history made him a fan favorite across every country.",
            },
        ],
    },
    ("inspiration", "social"): {
        "name": "The Dream Amplifier",
        "emoji": "✨",
        "color": "#FD79A8",
        "tagline": "You take what you witness and make sure everyone else sees it too.",
        "description": (
            "When something beautiful happens in sport, you don't keep it to yourself. "
            "You're the friend who sends the clip, writes the caption, and turns a personal "
            "moment into a shared one. You believe inspiration is contagious — and you're "
            "patient zero every single time."
        ),
        "data_insight": "Fans in your archetype generate 5.7× more Olympic-related social content than the average viewer during Games weeks.",
        "sports": ["Gymnastics", "Athletics", "Track & Field"],
        "athletes": [
            {
                "name": "Dina Asher-Smith",
                "country": "Great Britain",
                "flag": "🇬🇧",
                "sport": "100m & 200m Sprint",
                "story": "Asher-Smith is the fastest British woman in history and one of the most articulate athlete advocates for women's sport in the world. She posts, speaks, and competes with equal eloquence. Her platform matters as much as her times.",
            },
            {
                "name": "Tara Davis-Woodhall",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "Long Jump",
                "story": "Davis-Woodhall won Olympic gold in Paris with a massive smile and one of the most exuberant celebrations in the history of the event. She shares everything — the work, the nerves, the glory — and makes fans feel like they're part of the journey.",
            },
            {
                "name": "Erriyon Knighton",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "200m Sprint",
                "story": "Knighton was 18 when he broke Usain Bolt's 200m world age record. He runs for a generation that grew up posting everything — and he gives them something worth posting about every single time he steps on a track.",
            },
            {
                "name": "Athing Mu",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "800m",
                "story": "Mu won Olympic 800m gold in Tokyo at age 19 with the front-running style of someone who decided tactics were for people less confident than her. She is open about faith, family, and her journey — and her fanbase reflects it.",
            },
        ],
    },
    ("inspiration", "competitive"): {
        "name": "The Underdog Chaser",
        "emoji": "🔥",
        "color": "#FDCB6E",
        "tagline": "You live for the moment no one saw coming.",
        "description": (
            "The favorites bore you — you're here for the athlete who wasn't supposed to be "
            "here. You know all the upsets, all the photo-finishes, all the backstories that "
            "made a result feel impossible. You're not watching sport; you're watching "
            "probability get embarrassed in real time."
        ),
        "data_insight": "Fans in your archetype have 2.4× higher recall of specific upset victories than of expected champion performances.",
        "sports": ["Athletics", "Swimming", "Combat Sports"],
        "athletes": [
            {
                "name": "Marcell Jacobs",
                "country": "Italy",
                "flag": "🇮🇹",
                "sport": "100m Sprint",
                "story": "Nobody predicted Jacobs would win the 100m in Tokyo — not even him. The Italian sprinter who was virtually unknown outside Europe crossed the line in 9.80 and became Olympic champion in the event vacated by Bolt. He wept. So did Italy.",
            },
            {
                "name": "Ariarne Titmus",
                "country": "Australia",
                "flag": "🇦🇺",
                "sport": "Swimming",
                "story": "Titmus did the unthinkable: she dethroned Katie Ledecky — the greatest women's distance swimmer of all time — in the 400m freestyle in Tokyo. The reaction of her coach in the stands became one of the most GIF'd moments in Olympic history.",
            },
            {
                "name": "Mutaz Essa Barshim",
                "country": "Qatar",
                "flag": "🇶🇦",
                "sport": "High Jump",
                "story": "Barshim looked at Tamberi in Tokyo and asked the official 'Can we have two golds?' — then shared the podium with his training partner. It was the most beloved moment of the Tokyo Games. In Paris he returned to defend his legacy.",
            },
            {
                "name": "Karsten Warholm",
                "country": "Norway",
                "flag": "🇳🇴",
                "sport": "400m Hurdles",
                "story": "Warholm ran 45.94 in Tokyo — the first man under 46 seconds in history — then tore off his bib and roared at the crowd. His world record still looks like a typo. A Scandinavian country became a sprint hurdles nation overnight.",
            },
        ],
    },
    ("inspiration", "reflective"): {
        "name": "The Quiet Believer",
        "emoji": "🕊️",
        "color": "#74B9FF",
        "tagline": "You don't need noise to feel everything.",
        "description": (
            "You sit with what you see. An athlete's triumph doesn't need your instant reaction "
            "— it needs your full attention. You're moved by the smallest moments: a glance, a "
            "gesture, a private exhale after years of work finally paying off. You believe the "
            "Olympics shows what people are capable of when nothing is given to them."
        ),
        "data_insight": "Fans in your archetype report the highest emotional connection to athletes across all 12 archetypes — and the longest post-Games inspiration windows.",
        "sports": ["Swimming", "Marathon", "Field Events"],
        "athletes": [
            {
                "name": "Caeleb Dressel",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "Swimming",
                "story": "Dressel won five golds in Tokyo and then disappeared — stepping away from swimming for his mental health. He returned to competition quietly, without fanfare, and competed in Paris. His journey is one of the most honest in modern sports.",
            },
            {
                "name": "Sarah Sjöström",
                "country": "Sweden",
                "flag": "🇸🇪",
                "sport": "Swimming",
                "story": "Sjöström broke her elbow in a freak fall and returned to compete at the Tokyo Olympics months later, winning a relay gold. In Paris she won four medals including two individual golds at age 30. She recovers, rebuilds, and wins — quietly, every time.",
            },
            {
                "name": "Miltiadis Tentoglou",
                "country": "Greece",
                "flag": "🇬🇷",
                "sport": "Long Jump",
                "story": "Tentoglou won Tokyo gold on his final jump — an extraordinary clutch performance — then defended it in Paris. He rarely celebrates elaborately. The jump speaks. Greece, the birthplace of the Olympics, has its first long jump champion in over a century.",
            },
            {
                "name": "Anderson Peters",
                "country": "Grenada",
                "flag": "🇬🇩",
                "sport": "Javelin",
                "story": "Peters has won two World Championship javelin titles representing Grenada — a Caribbean island of 113,000. He competes with a focus that looks meditative. His quiet pursuit of excellence from a tiny nation is an argument for the Olympic ideal.",
            },
        ],
    },
    ("legacy", "social"): {
        "name": "The Ceremony Lover",
        "emoji": "🔦",
        "color": "#E17055",
        "tagline": "The flame, the rings, the anthem — you feel it all.",
        "description": (
            "You're there for the opening ceremony. You stay for the closing. The rituals and "
            "pageantry of the Olympics matter as much to you as the competition. You want "
            "everyone around you to feel the weight of what they're watching — and you make "
            "sure they do. The Olympics is civilization's greatest shared event, and you "
            "are its most faithful ambassador."
        ),
        "data_insight": "Fans in your archetype are 3.8× more likely to watch Olympic ceremonies live than on replay, and 2.1× more likely to attend viewing events.",
        "sports": ["Athletics", "Swimming", "Rowing"],
        "athletes": [
            {
                "name": "Emma McKeon",
                "country": "Australia",
                "flag": "🇦🇺",
                "sport": "Swimming",
                "story": "McKeon won four golds and three bronzes in Tokyo — the most medals by any athlete at those Games. She walked into the Paris Games as a legend and delivered again. Australian swimming has a tradition of greatness; McKeon is its current peak.",
            },
            {
                "name": "Adam Peaty",
                "country": "Great Britain",
                "flag": "🇬🇧",
                "sport": "Breaststroke",
                "story": "Peaty was unbeaten in the 100m breaststroke for seven years, held the world record, and then almost lost the Olympic title in Tokyo by a whisker — and came back in Paris to prove legends don't disappear. He's as much about ceremony as competition.",
            },
            {
                "name": "Torri Huske",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "Swimming",
                "story": "Huske won four gold medals in Paris and became the face of a new generation of American swimming. She walks onto a pool deck the way you'd expect someone who grew up watching the Olympics on television to walk onto a pool deck — with total awareness of the moment.",
            },
            {
                "name": "Tobi Amusan",
                "country": "Nigeria",
                "flag": "🇳🇬",
                "sport": "100m Hurdles",
                "story": "Amusan ran 12.12 at the World Championships — the fastest 100m hurdles in history. She competes at every major event as a standard-bearer for African women in the sprints. Her Olympic journey is about planting a flag for a generation that will follow her.",
            },
        ],
    },
    ("legacy", "competitive"): {
        "name": "The History Buff",
        "emoji": "📜",
        "color": "#6C5CE7",
        "tagline": "Every result belongs in context. You know the context.",
        "description": (
            "You don't just watch the race — you know how today's performance compares to "
            "Mexico City, Munich, Seoul, and Sydney. You can name the past champions. You "
            "understand what it means when a record stands for decades. Olympic history is "
            "not trivia for you — it's the lens through which sport becomes meaningful."
        ),
        "data_insight": "Fans in your archetype spend 2.7× more time researching Olympic history between Games than any other segment.",
        "sports": ["Athletics", "Swimming", "Gymnastics"],
        "athletes": [
            {
                "name": "Allyson Felix",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "Track & Field",
                "story": "Felix retired as the most decorated US track and field Olympian in history: 11 medals across five Games. She ran her final Olympic 400m in Tokyo as a mother and advocate. Her career spans a generation of the sport.",
            },
            {
                "name": "Shelly-Ann Fraser-Pryce",
                "country": "Jamaica",
                "flag": "🇯🇲",
                "sport": "100m Sprint",
                "story": "Fraser-Pryce has won the 100m at three of the last five Games and is the only woman to break 10.6 seconds multiple times. She competes with the confidence of someone who knows exactly what chapter of history they're writing.",
            },
            {
                "name": "Ahmed Hafnaoui",
                "country": "Tunisia",
                "flag": "🇹🇳",
                "sport": "Swimming",
                "story": "Hafnaoui was seeded last in the 400m freestyle final in Tokyo and won gold with a massive personal best. He became the first African man to win an Olympic swimming gold medal — a result that will be cited for decades.",
            },
            {
                "name": "Botond Kopasz",
                "country": "Hungary",
                "flag": "🇭🇺",
                "sport": "Canoe Sprint",
                "story": "Kopasz is a multi-time World Champion in the C1 1000m — a discipline Hungary has dominated for generations. He competes in a tradition so deep it predates the Cold War-era Olympians who trained in the same boats on the same river.",
            },
        ],
    },
    ("legacy", "reflective"): {
        "name": "The Scholar",
        "emoji": "🏛️",
        "color": "#00CEC9",
        "tagline": "You understand the Olympics because you've studied it.",
        "description": (
            "You read about Jesse Owens and the 1936 Games. You know what the 1968 Black Power "
            "salute meant. You understand why the boycotts of 1980 and 1984 happened. For you, "
            "every Olympic result is a data point in a much longer story about humanity, power, "
            "and what sport reveals about the world it lives in."
        ),
        "data_insight": "Fans in your archetype have the deepest long-term brand loyalty — once they connect with an Olympic story, they carry it for years.",
        "sports": ["Athletics", "Weightlifting", "Throwing Events"],
        "athletes": [
            {
                "name": "Sandra Perković",
                "country": "Croatia",
                "flag": "🇭🇷",
                "sport": "Discus Throw",
                "story": "Six consecutive World Championship gold medals, two Olympic golds. Perković is one of the most dominant field athletes in history, operating in an event most viewers walk past. She's studied the discus throw the way academics study texts.",
            },
            {
                "name": "Anita Włodarczyk",
                "country": "Poland",
                "flag": "🇵🇱",
                "sport": "Hammer Throw",
                "story": "Three Olympic gold medals and the world record. Włodarczyk has broken the hammer throw world record nine times. She competes in a discipline most people forget exists — and is categorically the greatest to ever do it.",
            },
            {
                "name": "Gretchen Walsh",
                "country": "USA",
                "flag": "🇺🇸",
                "sport": "Swimming",
                "story": "Walsh broke the 100m butterfly world record in the Paris Olympic semi-finals — then finished second in the final behind her own team-mate. Her relationship with excellence is complicated and fascinating, which is exactly why scholars love her.",
            },
            {
                "name": "Marcel Nguyen",
                "country": "Germany",
                "flag": "🇩🇪",
                "sport": "Gymnastics",
                "story": "Nguyen won two silvers at London 2012 — one of Germany's best gymnastics results in decades — then kept competing through 2024, rebuilding through injuries to represent a country with a proud but fading gymnastics heritage.",
            },
        ],
    },
}

ARCHETYPE_SPONSORS = {
    ("ambition", "social"): {
        "brand": "Coca-Cola",
        "tier": "IOC Worldwide Olympic Partner (since 1928)",
        "activation": "Celebrate Every Win campaign — shareable moments, community viewing hubs",
        "fan_reward": "Exclusive 'Victory Moments' AR filter pack and a personalized digital fan card",
        "referral_reward": "For every 3 friends you refer — a limited-edition collectible bottle featuring your matched athlete",
    },
    ("ambition", "competitive"): {
        "brand": "Omega",
        "tier": "Official Olympic Timekeeper (since 1932)",
        "activation": "Record Pulse — real-time performance tracking and predictive alerts",
        "fan_reward": "Access to Omega's live split-time data dashboard for every tracked Olympic event",
        "referral_reward": "For every 5 friends — an exclusive Omega 'Olympic Moment' timepiece replica print",
    },
    ("ambition", "reflective"): {
        "brand": "Intel",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "True View — 360° replay technology that lets fans relive every decisive moment",
        "fan_reward": "Early access to Intel's AI-powered performance analysis tool for Paris 2024 events",
        "referral_reward": "For every 3 friends — a personalized athlete biomechanics data report",
    },
    ("unity", "social"): {
        "brand": "Visa",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Team Visa Everywhere — fans as part of the global Olympic community",
        "fan_reward": "A digital 'Fan Passport' stamped with every event you engage with",
        "referral_reward": "For every 5 friends — access to exclusive Team Visa athlete behind-the-scenes content",
    },
    ("unity", "competitive"): {
        "brand": "Samsung",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Galaxy Olympic Challenge — medal count prediction leagues with real prizes",
        "fan_reward": "A personalized Olympic scorecard dashboard built on Samsung Galaxy tech",
        "referral_reward": "For every 3 friends — entry into the Samsung Olympic superfan sweepstakes",
    },
    ("unity", "reflective"): {
        "brand": "Alibaba",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Cloud Stories — athlete journey documentaries powered by Alibaba Cloud",
        "fan_reward": "Curated documentary playlist of your matched athlete's road to the Games",
        "referral_reward": "For every 5 friends — a personalized Olympic story archive of your Games moments",
    },
    ("inspiration", "social"): {
        "brand": "P&G",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Thank You, Mom — expanding to Thank You, Everyone who believed",
        "fan_reward": "A digital 'Who Made You' tribute card to share with your biggest supporters",
        "referral_reward": "For every 3 friends — a personalized P&G athlete inspiration video for someone you choose",
    },
    ("inspiration", "competitive"): {
        "brand": "Toyota",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Start Your Impossible — the underdog challenge series",
        "fan_reward": "Access to Toyota's 'Impossible Moments' interactive vault of the greatest upsets",
        "referral_reward": "For every 5 friends — entry into Toyota's 'Your Impossible' fan story campaign",
    },
    ("inspiration", "reflective"): {
        "brand": "Airbnb",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Made Possible by Hosts — the people behind the athletes",
        "fan_reward": "A curated 'Athlete's Journey' experience guide for the host city of your choice",
        "referral_reward": "For every 3 friends — a travel credit toward an Olympic host city experience",
    },
    ("legacy", "social"): {
        "brand": "Panasonic",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Every Moment, Together — shared-screen Olympic viewing technology",
        "fan_reward": "A personalized Olympic highlight reel, professionally produced for your social channels",
        "referral_reward": "For every 5 friends — a limited Panasonic '100 Years of Olympics' commemorative package",
    },
    ("legacy", "competitive"): {
        "brand": "Bridgestone",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "Chase Excellence — the performance heritage series",
        "fan_reward": "Access to the Olympic Results Archive with your personalized highlights and analysis",
        "referral_reward": "For every 3 friends — a custom 'Your Olympic Legacy' data visualization",
    },
    ("legacy", "reflective"): {
        "brand": "Atos",
        "tier": "IOC Worldwide Olympic Partner",
        "activation": "The Memory of the Games — digital preservation of Olympic history",
        "fan_reward": "A personalized Olympic 'Scholar's Library' — curated historical content matched to your archetype",
        "referral_reward": "For every 5 friends — a custom Atos digital Olympics timeline featuring your matched athlete",
    },
}

REFERRAL_TIERS = [
    {"count": 1, "unlock": "Behind-the-scenes training content from your matched athlete's sport"},
    {"count": 3, "unlock": "Your sponsor's personalized fan reward (see your match result)"},
    {"count": 5, "unlock": "Early access to Paris 2024 and LA 2028 exclusive content drops"},
    {"count": 10, "unlock": "VIP Olympic experience package — event tickets or athlete meet-and-greet ballot"},
]

# Survey-style data for the dashboard
SURVEY_DATA = {
    "total_surveyed": 9_412,
    "olympic_fans": 5_187,
    "questions": 44,
    "archetypes": 12,
    "key_stats": [
        ("71%", "feel mainstream sports media doesn't speak to their Olympic experience"),
        ("88%", "say the athletes' personal stories matter as much as the results"),
        ("63%", "make purchase decisions influenced by Olympic sponsor activation"),
        ("79%", "are more likely to watch events featuring athletes they personally follow"),
    ],
}

ARCHETYPE_DIST = {
    "The Hype Champion": 11.2,
    "The Gold Chaser": 9.8,
    "The Precision Seeker": 7.4,
    "The Flag Waver": 14.1,
    "The Team Rally": 10.3,
    "The Storyteller": 8.9,
    "The Dream Amplifier": 9.1,
    "The Underdog Chaser": 7.6,
    "The Quiet Believer": 6.2,
    "The Ceremony Lover": 5.8,
    "The History Buff": 5.1,
    "The Scholar": 4.5,
}

SPORT_AFFINITY = {
    "Track & Field": 82,
    "Swimming": 74,
    "Gymnastics": 69,
    "Marathon": 51,
    "Cycling": 44,
    "Rowing": 38,
    "Field Events": 35,
    "Combat Sports": 33,
    "Canoe/Kayak": 22,
    "Tennis": 61,
}

# ── Session State ─────────────────────────────────────────────────────────────

def init_state():
    defaults = {
        "step": -1,
        "mot_scores": {"ambition": 0, "unity": 0, "inspiration": 0, "legacy": 0},
        "eng_scores": {"social": 0, "competitive": 0, "reflective": 0},
        "motivation": None,
        "engagement": None,
        "player_seed": random.randint(0, 1000),
        "tab": "quiz",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


def reset():
    keys = ["step", "mot_scores", "eng_scores", "motivation", "engagement", "player_seed", "tab"]
    for k in keys:
        if k in st.session_state:
            del st.session_state[k]
    init_state()


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_result_key():
    mot = max(st.session_state.mot_scores, key=st.session_state.mot_scores.get)
    eng = max(st.session_state.eng_scores, key=st.session_state.eng_scores.get)
    return mot, eng


def progress_dots(current_step, total=7):
    dots = []
    for i in range(total):
        if i < current_step:
            cls = "dot dot-done"
        elif i == current_step:
            cls = "dot dot-active"
        else:
            cls = "dot dot-pending"
        dots.append(f'<div class="{cls}"></div>')
    return f'<div class="progress-dots">{"".join(dots)}</div>'


def handle_answer(key, value, step):
    if step < 4:
        st.session_state.mot_scores[value] += 1
    else:
        st.session_state.eng_scores[value] += 1
    st.session_state.step += 1


# ── Screens ───────────────────────────────────────────────────────────────────

def render_intro():
    col1, col2 = st.columns([3, 2], gap="large")
    with col1:
        st.markdown('<p class="hero-title">My Match<br>Olympics</p>', unsafe_allow_html=True)
        st.markdown(
            '<p class="hero-sub">Discover the Olympic athlete who matches your values, '
            "story, and way of seeing sport — in 45 seconds.</p>",
            unsafe_allow_html=True,
        )
        st.markdown("**7 questions · 12 archetypes · 48 athletes · Paris 2024 & beyond**")
        st.markdown("")
        if st.button("Find My Match →", type="primary", use_container_width=False):
            st.session_state.step = 0
            st.rerun()

        st.markdown("---")
        st.markdown("##### Why this matters")
        st.markdown(
            "The Olympics reaches 3.9 billion viewers — yet most fans feel the broadcast "
            "experience doesn't reflect why *they* watch. My Match uses psychographic archetypes "
            "derived from a 9,400-person survey to connect fans with the athletes, stories, "
            "and sponsor experiences built for them specifically."
        )

    with col2:
        fig = go.Figure(
            go.Pie(
                labels=list(ARCHETYPE_DIST.keys()),
                values=list(ARCHETYPE_DIST.values()),
                hole=0.55,
                textinfo="none",
                hovertemplate="<b>%{label}</b><br>%{value}% of fans<extra></extra>",
                marker_colors=[
                    "#FFD700", "#FF6B35", "#4ECDC4", "#FF4757", "#2ED573", "#A29BFE",
                    "#FD79A8", "#FDCB6E", "#74B9FF", "#E17055", "#6C5CE7", "#00CEC9",
                ],
            )
        )
        fig.update_layout(
            showlegend=False,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=20, b=20, l=0, r=0),
            annotations=[
                dict(text="<b>12<br>Archetypes</b>", x=0.5, y=0.5, font_size=14, showarrow=False, font_color="#FFF")
            ],
            height=320,
        )
        st.plotly_chart(fig, use_container_width=True)

        for stat, label in SURVEY_DATA["key_stats"][:2]:
            st.markdown(
                f'<div class="insight-card">'
                f'<div class="big-stat">{stat}</div>'
                f'<div class="big-stat-label">{label}</div>'
                f"</div>",
                unsafe_allow_html=True,
            )


def render_quiz(step):
    all_qs = MOTIVATION_QS + ENGAGEMENT_QS
    q = all_qs[step]

    st.markdown(progress_dots(step), unsafe_allow_html=True)
    st.markdown(f"**Question {step + 1} of 7**")
    st.markdown(f'<p class="quiz-question">{q["question"]}</p>', unsafe_allow_html=True)

    for label, value in q["options"].items():
        if st.button(label, key=f"q{step}_{value}", use_container_width=True):
            handle_answer(q, value, step)
            st.rerun()

    st.markdown("")
    if step > 0:
        if st.button("← Back", key=f"back_{step}"):
            st.session_state.step -= 1
            st.rerun()


def render_results():
    mot, eng = get_result_key()
    archetype = ARCHETYPES[(mot, eng)]
    sponsor = ARCHETYPE_SPONSORS[(mot, eng)]
    seed = st.session_state.player_seed
    athlete = archetype["athletes"][seed % 4]

    color = archetype["color"]

    # Header
    st.markdown(
        f'<div class="archetype-card" style="background: linear-gradient(135deg, {color}18 0%, #13131A 100%); border-color: {color}40;">'
        f'<p style="font-size:0.85rem;color:#888;margin:0;">YOUR OLYMPIC ARCHETYPE</p>'
        f'<h1 style="font-size:2.2rem;font-weight:900;color:{color};margin:0.2rem 0;">'
        f'{archetype["emoji"]} {archetype["name"]}</h1>'
        f'<p style="font-size:1.05rem;color:#CCC;margin:0.3rem 0 0.8rem 0;font-style:italic;">'
        f'"{archetype["tagline"]}"</p>'
        f'<p style="color:#AAA;line-height:1.65;">{archetype["description"]}</p>'
        f'<p style="margin-top:1rem;"><span class="stat-pill">📊 {archetype["data_insight"]}</span></p>'
        f"</div>",
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.markdown("#### 🏅 Your Matched Athlete")
        st.markdown(
            f'<div class="athlete-card" style="border-color:{color}40;">'
            f'<h3 style="margin:0;font-size:1.4rem;">{athlete["flag"]} {athlete["name"]}</h3>'
            f'<p style="color:#888;margin:0.15rem 0 0.7rem 0;font-size:0.85rem;">'
            f'{athlete["country"]} · {athlete["sport"]}</p>'
            f'<p style="color:#CCC;line-height:1.6;font-size:0.95rem;">{athlete["story"]}</p>'
            f"</div>",
            unsafe_allow_html=True,
        )

        st.markdown("##### Other athletes in your archetype")
        others = [a for a in archetype["athletes"] if a["name"] != athlete["name"]]
        for a in others:
            st.markdown(
                f'<div class="athlete-card" style="padding:0.8rem 1rem;">'
                f'<span style="font-weight:600;">{a["flag"]} {a["name"]}</span>'
                f'<span style="color:#666;font-size:0.82rem;margin-left:0.5rem;">· {a["country"]} · {a["sport"]}</span>'
                f"</div>",
                unsafe_allow_html=True,
            )

    with col2:
        st.markdown("#### 🤝 Your Sponsor Match")
        st.markdown(
            f'<div class="sponsor-badge">'
            f'<h3 style="margin:0;font-size:1.3rem;color:#FFD700;">{sponsor["brand"]}</h3>'
            f'<p style="color:#888;font-size:0.8rem;margin:0.1rem 0 0.8rem 0;">{sponsor["tier"]}</p>'
            f'<p style="color:#BBB;font-size:0.9rem;margin-bottom:0.6rem;"><b>Activation:</b> {sponsor["activation"]}</p>'
            f'<p style="color:#BBB;font-size:0.9rem;margin-bottom:0.6rem;"><b>Your reward:</b> {sponsor["fan_reward"]}</p>'
            f'<p style="color:#BBB;font-size:0.9rem;"><b>Refer & unlock:</b> {sponsor["referral_reward"]}</p>'
            f"</div>",
            unsafe_allow_html=True,
        )

        st.markdown("")
        st.markdown("#### 🔗 Referral Unlock Tiers")
        for tier in REFERRAL_TIERS:
            count = tier["count"]
            icon = "🔒" if count > 1 else "✅"
            st.markdown(
                f'<div style="display:flex;align-items:flex-start;gap:0.8rem;margin-bottom:0.5rem;">'
                f'<span style="color:{color};font-weight:700;min-width:40px;">{icon} +{count}</span>'
                f'<span style="color:#AAA;font-size:0.88rem;">{tier["unlock"]}</span>'
                f"</div>",
                unsafe_allow_html=True,
            )

        st.markdown("")
        st.markdown("##### Your sports to watch")
        for sport in archetype["sports"]:
            st.markdown(f"- {sport}")

    st.markdown("---")
    col_r1, col_r2, col_r3 = st.columns(3)
    with col_r1:
        if st.button("🔄 Retake Quiz", use_container_width=True):
            reset()
            st.rerun()
    with col_r2:
        if st.button("📊 See All Archetypes", use_container_width=True):
            st.session_state.tab = "archetypes"
            st.rerun()
    with col_r3:
        if st.button("📈 View Dashboard", use_container_width=True):
            st.session_state.tab = "dashboard"
            st.rerun()


def render_dashboard():
    st.markdown("## 📊 Fan Engagement Dashboard")
    st.markdown(
        f"*{SURVEY_DATA['total_surveyed']:,} fans surveyed · "
        f"{SURVEY_DATA['olympic_fans']:,} Olympic fans · "
        f"{SURVEY_DATA['questions']} questions · {SURVEY_DATA['archetypes']} archetypes*"
    )

    # Key stats row
    cols = st.columns(4)
    for i, (stat, label) in enumerate(SURVEY_DATA["key_stats"]):
        with cols[i]:
            st.markdown(
                f'<div class="insight-card">'
                f'<div class="big-stat">{stat}</div>'
                f'<div class="big-stat-label">{label}</div>'
                f"</div>",
                unsafe_allow_html=True,
            )

    st.markdown("---")
    col1, col2 = st.columns(2, gap="large")

    with col1:
        st.markdown("#### Archetype Distribution")
        names = list(ARCHETYPE_DIST.keys())
        values = list(ARCHETYPE_DIST.values())
        colors = [
            "#FFD700", "#FF6B35", "#4ECDC4", "#FF4757", "#2ED573", "#A29BFE",
            "#FD79A8", "#FDCB6E", "#74B9FF", "#E17055", "#6C5CE7", "#00CEC9",
        ]
        fig = go.Figure(
            go.Bar(
                x=values,
                y=names,
                orientation="h",
                marker_color=colors,
                text=[f"{v}%" for v in values],
                textposition="outside",
                hovertemplate="<b>%{y}</b><br>%{x}% of Olympic fans<extra></extra>",
            )
        )
        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=10, b=10, l=0, r=60),
            xaxis=dict(showgrid=False, showticklabels=False),
            yaxis=dict(color="#CCC", tickfont=dict(size=11)),
            height=420,
            font_color="#CCC",
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown("#### Sport Affinity Index")
        sports = list(SPORT_AFFINITY.keys())
        affinity = list(SPORT_AFFINITY.values())
        fig2 = go.Figure(
            go.Bar(
                x=sports,
                y=affinity,
                marker_color="#FFD700",
                opacity=0.85,
                hovertemplate="<b>%{x}</b><br>Affinity: %{y}/100<extra></extra>",
            )
        )
        fig2.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=10, b=10, l=0, r=0),
            yaxis=dict(color="#CCC", range=[0, 100], title="Affinity Index"),
            xaxis=dict(color="#CCC", tickangle=-35),
            height=420,
            font_color="#CCC",
        )
        st.plotly_chart(fig2, use_container_width=True)

    st.markdown("---")
    st.markdown("#### Business Case — Referral Flywheel Simulation")

    avg_fans_per_archetype = SURVEY_DATA["olympic_fans"] / 12
    avg_referral_rate = 0.28
    tiers = [1, 3, 5, 10]
    rows = []
    for archetype_name, share in ARCHETYPE_DIST.items():
        fan_base = int((share / 100) * SURVEY_DATA["olympic_fans"])
        activated = int(fan_base * 0.15)
        for r in tiers:
            new_fans = int(activated * (avg_referral_rate ** (1 / r)) * r)
            rows.append(
                {
                    "Archetype": archetype_name,
                    "Fan Base": fan_base,
                    "Activated": activated,
                    "Referral Tier": f"+{r} friends",
                    "New Fans Reached": new_fans,
                }
            )

    df = pd.DataFrame(rows)
    totals = df.groupby("Referral Tier")["New Fans Reached"].sum().reset_index()
    totals.columns = ["Tier", "Total New Fans"]

    fig3 = go.Figure(
        go.Bar(
            x=totals["Tier"],
            y=totals["Total New Fans"],
            marker_color=["#FFD700", "#FF6B35", "#2ED573", "#74B9FF"],
            text=[f"{v:,}" for v in totals["Total New Fans"]],
            textposition="outside",
        )
    )
    fig3.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        yaxis=dict(color="#CCC", title="New Fans Reached"),
        xaxis=dict(color="#CCC", title="Referral Tier Unlocked"),
        margin=dict(t=20, b=20),
        height=320,
        font_color="#CCC",
    )
    st.plotly_chart(fig3, use_container_width=True)
    st.caption(
        "Simulation assumes 15% quiz completion → activation, 28% referral conversion rate. "
        "Based on 5,187 Olympic fans in survey sample."
    )


def render_archetypes():
    st.markdown("## 🏅 All 12 Olympic Fan Archetypes")
    st.markdown("Every fan has a unique way of experiencing the Games. Here are all 12 profiles.")
    st.markdown("")

    items = list(ARCHETYPES.items())
    for i in range(0, len(items), 3):
        cols = st.columns(3, gap="medium")
        for j, col in enumerate(cols):
            if i + j >= len(items):
                break
            (mot, eng), arch = items[i + j]
            with col:
                color = arch["color"]
                athletes_preview = " · ".join(
                    f'{a["flag"]} {a["name"].split()[0]}' for a in arch["athletes"][:2]
                )
                st.markdown(
                    f'<div class="archetype-card" style="border-color:{color}40;background:{color}0D;min-height:200px;">'
                    f'<div style="font-size:1.8rem">{arch["emoji"]}</div>'
                    f'<h4 style="color:{color};margin:0.3rem 0 0.2rem 0;">{arch["name"]}</h4>'
                    f'<p style="color:#888;font-size:0.8rem;margin:0 0 0.5rem 0;font-style:italic;">'
                    f'"{arch["tagline"]}"</p>'
                    f'<p style="color:#AAA;font-size:0.82rem;margin-bottom:0.6rem;">'
                    f'<b style="color:#666;">Motivation:</b> {mot.title()} &nbsp;|&nbsp; '
                    f'<b style="color:#666;">Style:</b> {eng.title()}</p>'
                    f'<p style="color:#666;font-size:0.78rem;">{athletes_preview} …</p>'
                    f"</div>",
                    unsafe_allow_html=True,
                )


# ── Main Navigation ───────────────────────────────────────────────────────────

def main():
    init_state()

    step = st.session_state.step
    tab = st.session_state.tab

    # Top nav (shown outside quiz flow)
    if step == -1 or step >= 7:
        st.markdown("")
        nav_col1, nav_col2, nav_col3, nav_col4, nav_col5 = st.columns([2, 1, 1, 1, 1])
        with nav_col1:
            st.markdown("**🏅 My Match · Olympics**")
        with nav_col2:
            if st.button("Home", use_container_width=True):
                reset()
                st.rerun()
        with nav_col3:
            if st.button("Archetypes", use_container_width=True):
                st.session_state.step = 8  # bypass quiz
                st.session_state.tab = "archetypes"
                st.rerun()
        with nav_col4:
            if st.button("Dashboard", use_container_width=True):
                st.session_state.step = 8
                st.session_state.tab = "dashboard"
                st.rerun()
        with nav_col5:
            if st.button("Take Quiz", use_container_width=True, type="primary"):
                reset()
                st.session_state.step = 0
                st.rerun()
        st.markdown("---")

    # Route
    if step == -1:
        render_intro()
    elif 0 <= step < 7:
        render_quiz(step)
    elif step == 7:
        st.session_state.tab = "results"
        st.session_state.step = 8
        render_results()
    else:
        # step >= 8: post-quiz navigation
        current_tab = st.session_state.tab
        if current_tab == "results" or (st.session_state.motivation is None and current_tab not in ("archetypes", "dashboard")):
            if st.session_state.mot_scores != {"ambition": 0, "unity": 0, "inspiration": 0, "legacy": 0}:
                render_results()
            else:
                render_intro()
        elif current_tab == "archetypes":
            render_archetypes()
        elif current_tab == "dashboard":
            render_dashboard()
        else:
            render_intro()


if __name__ == "__main__":
    main()
