import type { Motivation, Engagement } from './athletes'

export interface QuizQuestion {
  question: string
  options: { label: string; value: string }[]
}

export interface Archetype {
  name: string
  emoji: string
  color: string
  tagline: string
  description: string
  dataInsight: string
  sports: string[]
}

export const MOTIVATION_QS: QuizQuestion[] = [
  {
    question: 'What draws you to the Olympics most?',
    options: [
      { label: 'Watching athletes push the absolute limits of human performance', value: 'ambition' },
      { label: 'Feeling the whole world united around something bigger than sport', value: 'unity' },
      { label: 'Stories of athletes who overcame everything to get here', value: 'inspiration' },
      { label: 'Honoring the traditions and history that make the Games timeless', value: 'legacy' },
    ],
  },
  {
    question: 'Your Olympics feels most meaningful when…',
    options: [
      { label: 'A world record falls and history is rewritten in real time', value: 'ambition' },
      { label: "Your country's flag is raised and the anthem fills the stadium", value: 'unity' },
      { label: 'An underdog no one believed in shocks the world on the biggest stage', value: 'inspiration' },
      { label: 'You watch an event you grew up watching with people you love', value: 'legacy' },
    ],
  },
  {
    question: 'At a watch party, what makes you most emotional?',
    options: [
      { label: 'A jaw-dropping performance that defies everything we thought possible', value: 'ambition' },
      { label: 'Seeing fans from rival nations cheering side by side', value: 'unity' },
      { label: 'An athlete crying on the podium after years of unseen struggle', value: 'inspiration' },
      { label: 'A veteran athlete competing in what might be their final Games', value: 'legacy' },
    ],
  },
  {
    question: 'After the closing ceremony, what do you remember most?',
    options: [
      { label: 'The records broken and the performances that redefined excellence', value: 'ambition' },
      { label: 'The moments when sport dissolved every border in the room', value: 'unity' },
      { label: 'The athlete who proved everyone wrong — including themselves', value: 'inspiration' },
      { label: 'The rituals, pageantry, and threads that connect each Games to the last', value: 'legacy' },
    ],
  },
]

export const ENGAGEMENT_QS: QuizQuestion[] = [
  {
    question: 'How do you typically watch the Olympics?',
    options: [
      { label: 'Hosting or joining a big viewing party — the bigger, the better', value: 'social' },
      { label: 'Tracking medal counts, running predictions, winning every bracket', value: 'competitive' },
      { label: 'Quietly, completely absorbed — every detail and story matters', value: 'reflective' },
    ],
  },
  {
    question: 'Your favorite kind of Olympic moment is…',
    options: [
      { label: 'Something so wild you immediately share it with everyone', value: 'social' },
      { label: 'The final hundredth of a second in a photo-finish race', value: 'competitive' },
      { label: 'A quiet, private moment of triumph caught on camera', value: 'reflective' },
    ],
  },
  {
    question: 'When the Olympics ends, you…',
    options: [
      { label: 'Are already planning watch parties for the next Games', value: 'social' },
      { label: 'Debate which athlete had the greatest Games in Olympic history', value: 'competitive' },
      { label: 'Sit with what you witnessed — it takes days to fully process', value: 'reflective' },
    ],
  },
]

export const ARCHETYPES: Record<string, Archetype> = {
  'ambition-social': {
    name: 'The Hype Champion', emoji: '🏆', color: '#FFD700',
    tagline: 'First to celebrate, loudest in the room, infectious energy',
    description: "You're drawn to peak performance and you want the whole world to feel it with you. When an athlete breaks a barrier, you're already screenshotting, texting, and pulling everyone into the moment.",
    dataInsight: '68% of fans in your archetype cite "viral moments" as their primary reason to tune in live vs. on-demand.',
    sports: ['Track & Field', 'Swimming', 'Gymnastics'],
  },
  'ambition-competitive': {
    name: 'The Gold Chaser', emoji: '⏱️', color: '#FF6B35',
    tagline: 'Records exist to be broken. You have the receipts.',
    description: "You track split times between events. You have the world rankings memorized. When a record falls, you already knew it was coming — and you have opinions about the margin.",
    dataInsight: 'Fans in your archetype spend 3.2× more time on sports-data apps during Olympic weeks than any other segment.',
    sports: ['Swimming', 'Track & Field', 'Cycling'],
  },
  'ambition-reflective': {
    name: 'The Precision Seeker', emoji: '🎯', color: '#4ECDC4',
    tagline: 'You see the details no one else notices. That\'s your superpower.',
    description: "You're not just watching the result — you're watching the technique, the mental game, the micro-adjustments mid-competition. The Olympics, for you, is a masterclass in human potential.",
    dataInsight: '72% of fans in your archetype say they watch Olympic events multiple times to fully absorb what they witnessed.',
    sports: ['Gymnastics', 'Swimming', 'Marathon'],
  },
  'unity-social': {
    name: 'The Flag Waver', emoji: '🏳️', color: '#FF4757',
    tagline: 'Your flag, your people, your proudest moment.',
    description: "Nothing moves you like seeing your nation — or a small nation claiming its first gold — take the Olympic stage. You share the wins, gather the community, and believe sport is one of the few things that can genuinely unite people.",
    dataInsight: 'Fans in your archetype are 4.1× more likely to attend an Olympic event in person when their country is competing.',
    sports: ['Gymnastics', 'Athletics', 'Swimming'],
  },
  'unity-competitive': {
    name: 'The Team Rally', emoji: '🤝', color: '#2ED573',
    tagline: 'Your country\'s medal count is personal. Very personal.',
    description: "You track every event that could add to your nation's total. You know which sports your country historically dominates and you feel every podium finish viscerally.",
    dataInsight: 'Fans in your archetype watch 34% more events during the Olympics than average, especially events with a medal favorite.',
    sports: ['Athletics', 'Swimming', 'Cycling'],
  },
  'unity-reflective': {
    name: 'The Storyteller', emoji: '📖', color: '#A29BFE',
    tagline: "The athlete's journey matters more than the result.",
    description: "You're the one who stays up watching the post-event interview instead of flipping channels. You want to understand where these athletes came from — the struggles, the setbacks, the sacrifices.",
    dataInsight: 'Fans in your archetype are 2.9× more likely to follow athletes on social media after learning their personal story.',
    sports: ['Marathon', 'Athletics', 'Tennis'],
  },
  'inspiration-social': {
    name: 'The Dream Amplifier', emoji: '✨', color: '#FD79A8',
    tagline: 'You take what you witness and make sure everyone else sees it too.',
    description: "When something beautiful happens in sport, you don't keep it to yourself. You're the friend who sends the clip, writes the caption, and turns a personal moment into a shared one.",
    dataInsight: 'Fans in your archetype generate 5.7× more Olympic-related social content than the average viewer during Games weeks.',
    sports: ['Gymnastics', 'Athletics', 'Track & Field'],
  },
  'inspiration-competitive': {
    name: 'The Underdog Chaser', emoji: '🔥', color: '#FDCB6E',
    tagline: "You live for the moment no one saw coming.",
    description: "The favorites bore you — you're here for the athlete who wasn't supposed to be here. You know all the upsets, all the photo-finishes, all the backstories that made a result feel impossible.",
    dataInsight: 'Fans in your archetype have 2.4× higher recall of specific upset victories than of expected champion performances.',
    sports: ['Athletics', 'Swimming', 'Combat Sports'],
  },
  'inspiration-reflective': {
    name: 'The Quiet Believer', emoji: '🕊️', color: '#74B9FF',
    tagline: "You don't need noise to feel everything.",
    description: "You sit with what you see. An athlete's triumph doesn't need your instant reaction — it needs your full attention. You're moved by the smallest moments: a glance, a gesture, a private exhale.",
    dataInsight: 'Fans in your archetype report the highest emotional connection to athletes across all 12 archetypes.',
    sports: ['Swimming', 'Marathon', 'Field Events'],
  },
  'legacy-social': {
    name: 'The Ceremony Lover', emoji: '🔦', color: '#E17055',
    tagline: 'The flame, the rings, the anthem — you feel it all.',
    description: "You're there for the opening ceremony. You stay for the closing. The rituals and pageantry of the Olympics matter as much to you as the competition. You want everyone around you to feel the weight of what they're watching.",
    dataInsight: 'Fans in your archetype are 3.8× more likely to watch Olympic ceremonies live than on replay.',
    sports: ['Athletics', 'Swimming', 'Rowing'],
  },
  'legacy-competitive': {
    name: 'The History Buff', emoji: '📜', color: '#6C5CE7',
    tagline: 'Every result belongs in context. You know the context.',
    description: "You don't just watch the race — you know how today's performance compares to Mexico City, Munich, Seoul, and Sydney. Olympic history is not trivia for you — it's the lens through which sport becomes meaningful.",
    dataInsight: 'Fans in your archetype spend 2.7× more time researching Olympic history between Games than any other segment.',
    sports: ['Athletics', 'Swimming', 'Gymnastics'],
  },
  'legacy-reflective': {
    name: 'The Scholar', emoji: '🏛️', color: '#00CEC9',
    tagline: 'You understand the Olympics because you\'ve studied it.',
    description: "You read about Jesse Owens and the 1936 Games. You know what the 1968 Black Power salute meant. Every Olympic result is a data point in a much longer story about humanity, power, and what sport reveals about the world.",
    dataInsight: 'Fans in your archetype have the deepest long-term brand loyalty — once they connect with an Olympic story, they carry it for years.',
    sports: ['Athletics', 'Throwing Events', 'Gymnastics'],
  },
}

export const ARCHETYPE_SPONSORS: Record<string, { brand: string; tier: string; activation: string; fanReward: string; referralReward: string }> = {
  'ambition-social':       { brand: 'Coca-Cola',  tier: 'IOC Worldwide Partner (since 1928)', activation: 'Celebrate Every Win — shareable moments, community viewing hubs', fanReward: 'Exclusive "Victory Moments" AR filter pack + personalized digital fan card', referralReward: 'For every 3 friends — a limited-edition collectible bottle featuring your matched athlete' },
  'ambition-competitive':  { brand: 'Omega',      tier: 'Official Olympic Timekeeper (since 1932)', activation: 'Record Pulse — real-time performance tracking and predictive alerts', fanReward: "Access to Omega's live split-time data dashboard for every tracked Olympic event", referralReward: "For every 5 friends — an exclusive Omega 'Olympic Moment' timepiece replica print" },
  'ambition-reflective':   { brand: 'Intel',      tier: 'IOC Worldwide Partner', activation: 'True View — 360° replay technology that lets fans relive every decisive moment', fanReward: "Early access to Intel's AI-powered performance analysis tool for Paris 2024 events", referralReward: 'For every 3 friends — a personalized athlete biomechanics data report' },
  'unity-social':          { brand: 'Visa',       tier: 'IOC Worldwide Partner', activation: 'Team Visa Everywhere — fans as part of the global Olympic community', fanReward: 'A digital "Fan Passport" stamped with every event you engage with', referralReward: 'For every 5 friends — access to exclusive Team Visa athlete behind-the-scenes content' },
  'unity-competitive':     { brand: 'Samsung',    tier: 'IOC Worldwide Partner', activation: 'Galaxy Olympic Challenge — medal count prediction leagues with real prizes', fanReward: 'A personalized Olympic scorecard dashboard built on Samsung Galaxy tech', referralReward: 'For every 3 friends — entry into the Samsung Olympic superfan sweepstakes' },
  'unity-reflective':      { brand: 'Alibaba',    tier: 'IOC Worldwide Partner', activation: 'Cloud Stories — athlete journey documentaries powered by Alibaba Cloud', fanReward: "Curated documentary playlist of your matched athlete's road to the Games", referralReward: 'For every 5 friends — a personalized Olympic story archive of your Games moments' },
  'inspiration-social':    { brand: 'P&G',        tier: 'IOC Worldwide Partner', activation: 'Thank You, Mom — expanding to Thank You, Everyone who believed', fanReward: 'A digital "Who Made You" tribute card to share with your biggest supporters', referralReward: 'For every 3 friends — a personalized P&G athlete inspiration video for someone you choose' },
  'inspiration-competitive': { brand: 'Toyota',   tier: 'IOC Worldwide Partner', activation: 'Start Your Impossible — the underdog challenge series', fanReward: "Access to Toyota's 'Impossible Moments' interactive vault of the greatest upsets", referralReward: "For every 5 friends — entry into Toyota's 'Your Impossible' fan story campaign" },
  'inspiration-reflective': { brand: 'Airbnb',    tier: 'IOC Worldwide Partner', activation: 'Made Possible by Hosts — the people behind the athletes', fanReward: "A curated 'Athlete's Journey' experience guide for the host city of your choice", referralReward: 'For every 3 friends — a travel credit toward an Olympic host city experience' },
  'legacy-social':         { brand: 'Panasonic',  tier: 'IOC Worldwide Partner', activation: 'Every Moment, Together — shared-screen Olympic viewing technology', fanReward: 'A personalized Olympic highlight reel, professionally produced for your social channels', referralReward: "For every 5 friends — a limited Panasonic '100 Years of Olympics' commemorative package" },
  'legacy-competitive':    { brand: 'Bridgestone', tier: 'IOC Worldwide Partner', activation: 'Chase Excellence — the performance heritage series', fanReward: 'Access to the Olympic Results Archive with your personalized highlights and analysis', referralReward: 'For every 3 friends — a custom "Your Olympic Legacy" data visualization' },
  'legacy-reflective':     { brand: 'Atos',       tier: 'IOC Worldwide Partner', activation: 'The Memory of the Games — digital preservation of Olympic history', fanReward: "A personalized Olympic 'Scholar's Library' — curated historical content matched to your archetype", referralReward: "For every 5 friends — a custom Atos digital Olympics timeline featuring your matched athlete" },
}

export const getArchetypeKey = (m: Motivation, e: Engagement) => `${m}-${e}`

export const ARCHETYPE_DIST: Record<string, number> = {
  'The Hype Champion': 11.2, 'The Gold Chaser': 9.8, 'The Precision Seeker': 7.4,
  'The Flag Waver': 14.1, 'The Team Rally': 10.3, 'The Storyteller': 8.9,
  'The Dream Amplifier': 9.1, 'The Underdog Chaser': 7.6, 'The Quiet Believer': 6.2,
  'The Ceremony Lover': 5.8, 'The History Buff': 5.1, 'The Scholar': 4.5,
}
