/**
 * Olympic sport pictograms from Wikimedia Commons.
 * Served via Special:FilePath redirect → upload.wikimedia.org (CORS-open).
 * The SVGs are black-on-transparent; apply `filter: invert(1) opacity(0.8)` for dark UI.
 */
const PICTOGRAM_FILES: Record<string, string> = {
  // ── Summer Olympics ──────────────────────────────────────────────────────
  'Archery':               'Archery_pictogram.svg',
  'Artistic Swimming':     'Artistic_swimming_pictogram.svg',
  'Athletics':             'Athletics_pictogram.svg',
  'Badminton':             'Badminton_pictogram.svg',
  'Basketball':            'Basketball_pictogram.svg',
  'Beach Volleyball':      'Beach_volleyball_pictogram.svg',
  'Boxing':                'Boxing_pictogram.svg',
  'BMX':                   'Cycling_BMX_racing_pictogram.svg',
  'Breakdancing':          'Breaking_pictogram.svg',
  'Canoeing':              'Canoe_sprint_pictogram.svg',
  'Cycling':               'Cycling_road_pictogram.svg',
  'Diving':                'Diving_pictogram.svg',
  'Equestrian':            'Equestrian_dressage_pictogram.svg',
  'Fencing':               'Fencing_pictogram.svg',
  'Field Hockey':          'Field_hockey_pictogram.svg',
  'Football':              'Football_pictogram.svg',
  'Golf':                  'Golf_pictogram.svg',
  'Gymnastics':            'Artistic_gymnastics_pictogram.svg',
  'Handball':              'Handball_pictogram.svg',
  'Judo':                  'Judo_pictogram.svg',
  'Modern Pentathlon':     'Modern_pentathlon_pictogram.svg',
  'Rowing':                'Rowing_pictogram.svg',
  'Rugby Sevens':          'Rugby_sevens_pictogram.svg',
  'Sailing':               'Sailing_pictogram.svg',
  'Shooting':              'Shooting_pictogram.svg',
  'Skateboarding':         'Skateboarding_pictogram.svg',
  'Sport Climbing':        'Sport_climbing_pictogram.svg',
  'Surfing':               'Surfing_pictogram.svg',
  'Swimming':              'Swimming_pictogram.svg',
  'Table Tennis':          'Table_tennis_pictogram.svg',
  'Taekwondo':             'Taekwondo_pictogram.svg',
  'Tennis':                'Tennis_pictogram.svg',
  'Triathlon':             'Triathlon_pictogram.svg',
  'Volleyball':            'Volleyball_pictogram.svg',
  'Water Polo':            'Water_polo_pictogram.svg',
  'Weightlifting':         'Weightlifting_pictogram.svg',
  'Wrestling':             'Wrestling_pictogram.svg',

  // ── Winter Olympics ───────────────────────────────────────────────────────
  'Alpine Skiing':              'Alpine_skiing_pictogram.svg',
  'Biathlon':                   'Biathlon_pictogram.svg',
  'Bobsleigh':                  'Bobsleigh_pictogram.svg',
  'Cross-Country Skiing':       'Cross_country_skiing_pictogram.svg',
  'Curling':                    'Curling_pictogram.svg',
  'Figure Skating':             'Figure_skating_pictogram.svg',
  'Freestyle Skiing':           'Freestyle_skiing_pictogram.svg',
  'Ice Hockey':                 'Ice_hockey_pictogram.svg',
  'Luge':                       'Luge_pictogram.svg',
  'Nordic Combined':            'Nordic_combined_pictogram.svg',
  'Short Track Speed Skating':  'Short_track_speed_skating_pictogram.svg',
  'Skeleton':                   'Skeleton_pictogram.svg',
  'Ski Jumping':                'Ski_jumping_pictogram.svg',
  'Ski Mountaineering':         'Ski_mountaineering_pictogram.svg',
  'Snowboarding':               'Snowboard_pictogram.svg',
  'Speed Skating':              'Speed_skating_pictogram.svg',
}

const WIKIMEDIA = 'https://upload.wikimedia.org/wikipedia/commons/thumb'

/** Map of sport → known Wikimedia hash path (computed once) */
const PICTOGRAM_URLS: Record<string, string> = (() => {
  // Use Special:FilePath which is a stable redirect URL — no hash needed
  const base = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
  return Object.fromEntries(
    Object.entries(PICTOGRAM_FILES).map(([sport, file]) => [
      sport,
      `${base}${file}?width=80`,
    ])
  )
})()

/** Returns a Wikimedia Commons pictogram URL for the sport, or null if unknown. */
export function sportPictogramUrl(sport: string): string | null {
  return PICTOGRAM_URLS[sport] ?? null
}

// ── Emoji fallback (kept for non-browser contexts / tooltips) ─────────────────
const EMOJI_FALLBACK: Record<string, string> = {
  'Archery': '🏹', 'Artistic Swimming': '🤽', 'Athletics': '🏃',
  'Badminton': '🏸', 'Basketball': '🏀', 'Boxing': '🥊', 'BMX': '🚵',
  'Breakdancing': '🕺', 'Canoeing': '🛶', 'Cycling': '🚴', 'Diving': '🤿',
  'Equestrian': '🐎', 'Fencing': '🤺', 'Field Hockey': '🏑',
  'Football': '⚽', 'Golf': '⛳', 'Gymnastics': '🤸', 'Handball': '🤾',
  'Judo': '🥋', 'Modern Pentathlon': '🏇', 'Rowing': '🚣',
  'Rugby Sevens': '🏉', 'Sailing': '⛵', 'Shooting': '🎯',
  'Skateboarding': '🛹', 'Sport Climbing': '🧗', 'Surfing': '🏄',
  'Swimming': '🏊', 'Table Tennis': '🏓', 'Taekwondo': '🥋',
  'Tennis': '🎾', 'Triathlon': '🏊', 'Volleyball': '🏐',
  'Water Polo': '🤽', 'Weightlifting': '🏋️', 'Wrestling': '🤼',
  'Alpine Skiing': '⛷️', 'Biathlon': '🎿', 'Bobsleigh': '🛷',
  'Cross-Country Skiing': '🎿', 'Curling': '🥌', 'Figure Skating': '⛸️',
  'Freestyle Skiing': '⛷️', 'Ice Hockey': '🏒', 'Luge': '🛷',
  'Nordic Combined': '🎿', 'Short Track Speed Skating': '⛸️',
  'Skeleton': '🛷', 'Ski Jumping': '🎿', 'Ski Mountaineering': '⛷️',
  'Snowboarding': '🏂', 'Speed Skating': '⛸️',
}

export function sportIcon(sport: string): string {
  return EMOJI_FALLBACK[sport] ?? '🏅'
}

// ── Country flag image URL ─────────────────────────────────────────────────────

/**
 * Extract the ISO 3166-1 alpha-2 code from a flag emoji (e.g. 🇺🇸 → "us").
 * Flag emoji are pairs of Regional Indicator letters: U+1F1E6 = A … U+1F1FF = Z
 */
export function flagEmojiToISO(flag: string): string {
  if (!flag) return ''
  const chars = [...flag]  // split at Unicode code point boundaries
  if (chars.length < 2) return ''
  try {
    const a = chars[0].codePointAt(0)! - 0x1F1E6  // 0 = A, 25 = Z
    const b = chars[1].codePointAt(0)! - 0x1F1E6
    if (a < 0 || a > 25 || b < 0 || b > 25) return ''
    return String.fromCharCode(a + 65, b + 65).toLowerCase()  // "us", "fr", …
  } catch {
    return ''
  }
}

/**
 * Returns a flagcdn.com URL for a flag emoji.
 * e.g. 🇱🇧 → "https://flagcdn.com/w160/lb.png"
 */
export function flagImageUrl(flagEmoji: string, width: 40 | 80 | 160 = 160): string {
  const code = flagEmojiToISO(flagEmoji)
  if (!code) return ''
  return `https://flagcdn.com/w${width}/${code}.png`
}

// ── Country name → ISO 3166-1 alpha-2 (fallback when emoji extraction fails) ──

const COUNTRY_ISO: Record<string, string> = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Andorra': 'ad',
  'Angola': 'ao', 'Argentina': 'ar', 'Armenia': 'am', 'Australia': 'au',
  'Austria': 'at', 'Azerbaijan': 'az', 'Bahrain': 'bh', 'Bangladesh': 'bd',
  'Barbados': 'bb', 'Belarus': 'by', 'Belgium': 'be', 'Benin': 'bj',
  'Bhutan': 'bt', 'Bolivia': 'bo', 'Bosnia and Herzegovina': 'ba',
  'Botswana': 'bw', 'Brazil': 'br', 'Bulgaria': 'bg', 'Burkina Faso': 'bf',
  'Burundi': 'bi', 'Cambodia': 'kh', 'Cameroon': 'cm', 'Canada': 'ca',
  'Cape Verde': 'cv', 'Chad': 'td', 'Chile': 'cl', 'China': 'cn',
  'Chinese Taipei': 'tw', 'Colombia': 'co', 'Comoros': 'km', 'Congo': 'cg',
  "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci', 'Croatia': 'hr', 'Cuba': 'cu',
  'Cyprus': 'cy', 'Czech Republic': 'cz', 'Czechia': 'cz', 'Denmark': 'dk',
  'Djibouti': 'dj', 'Dominican Republic': 'do', 'Ecuador': 'ec',
  'Egypt': 'eg', 'El Salvador': 'sv', 'Eritrea': 'er', 'Estonia': 'ee',
  'Eswatini': 'sz', 'Ethiopia': 'et', 'Fiji': 'fj', 'Finland': 'fi',
  'France': 'fr', 'Gabon': 'ga', 'Gambia': 'gm', 'Georgia': 'ge',
  'Germany': 'de', 'Ghana': 'gh', 'Great Britain': 'gb', 'Greece': 'gr',
  'Grenada': 'gd', 'Guam': 'gu', 'Guatemala': 'gt', 'Guinea': 'gn',
  'Guinea-Bissau': 'gw', 'Guyana': 'gy', 'Haiti': 'ht', 'Honduras': 'hn',
  'Hong Kong': 'hk', 'Hungary': 'hu', 'Iceland': 'is', 'India': 'in',
  'Indonesia': 'id', 'Iran': 'ir', 'Iraq': 'iq', 'Ireland': 'ie',
  'Israel': 'il', 'Italy': 'it', 'Jamaica': 'jm', 'Japan': 'jp',
  'Jordan': 'jo', 'Kazakhstan': 'kz', 'Kenya': 'ke', 'Kosovo': 'xk',
  'Kuwait': 'kw', 'Kyrgyzstan': 'kg', 'Laos': 'la', 'Latvia': 'lv',
  'Lebanon': 'lb', 'Lesotho': 'ls', 'Liberia': 'lr', 'Libya': 'ly',
  'Lithuania': 'lt', 'Luxembourg': 'lu', 'Madagascar': 'mg', 'Malawi': 'mw',
  'Malaysia': 'my', 'Maldives': 'mv', 'Mali': 'ml', 'Malta': 'mt',
  'Mauritania': 'mr', 'Mauritius': 'mu', 'Mexico': 'mx', 'Moldova': 'md',
  'Monaco': 'mc', 'Mongolia': 'mn', 'Montenegro': 'me', 'Morocco': 'ma',
  'Mozambique': 'mz', 'Myanmar': 'mm', 'Namibia': 'na', 'Nepal': 'np',
  'Netherlands': 'nl', 'Kingdom of the Netherlands': 'nl',
  'New Zealand': 'nz', 'Niger': 'ne', 'Nigeria': 'ng', 'North Korea': 'kp',
  'North Macedonia': 'mk', 'Norway': 'no', 'Oman': 'om', 'Pakistan': 'pk',
  'Palestine': 'ps', 'Panama': 'pa', 'Papua New Guinea': 'pg',
  'Paraguay': 'py', 'Peru': 'pe', 'Philippines': 'ph', 'Poland': 'pl',
  'Portugal': 'pt', 'Puerto Rico': 'pr', 'Qatar': 'qa', 'Romania': 'ro',
  'Russia': 'ru', 'Rwanda': 'rw', 'Saint Lucia': 'lc', 'San Marino': 'sm',
  'Saudi Arabia': 'sa', 'Senegal': 'sn', 'Serbia': 'rs',
  'Sierra Leone': 'sl', 'Singapore': 'sg', 'Slovakia': 'sk',
  'Slovenia': 'si', 'Somalia': 'so', 'South Africa': 'za',
  'South Korea': 'kr', 'South Sudan': 'ss', 'Spain': 'es',
  'Sri Lanka': 'lk', 'Sudan': 'sd', 'Sweden': 'se', 'Switzerland': 'ch',
  'Syria': 'sy', 'Taiwan': 'tw', 'Tajikistan': 'tj', 'Tanzania': 'tz',
  'Thailand': 'th', 'Togo': 'tg', 'Tonga': 'to',
  'Trinidad and Tobago': 'tt', 'Trinidad & Tobago': 'tt', 'Tunisia': 'tn',
  'Turkey': 'tr', 'Turkmenistan': 'tm', 'Uganda': 'ug', 'Ukraine': 'ua',
  'United Arab Emirates': 'ae', 'United Kingdom': 'gb',
  'United States': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz',
  'Vanuatu': 'vu', 'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye',
  'Zambia': 'zm', 'Zimbabwe': 'zw',
}

/**
 * Fallback: get flag image URL from a country name (e.g. "Uganda" → flagcdn lb.png).
 * Use this when flagEmojiToISO() fails (athletes stored with 🏳️ instead of real emoji).
 */
export function countryFlagUrl(country: string, width: 40 | 80 | 160 = 160): string {
  if (!country) return ''
  const code = COUNTRY_ISO[country]
  if (!code) return ''
  return `https://flagcdn.com/w${width}/${code}.png`
}

export function normalizeSport(sport: string): string {
  const NORMALIZE: Record<string, string> = {
    'Short-track speed skaters': 'Short Track Speed Skating',
    'Skeleton racers': 'Skeleton',
    'Ski mountaineers': 'Ski Mountaineering',
    'Aerials': 'Freestyle Skiing',
    'Moguls': 'Freestyle Skiing',
    'Dual Moguls': 'Freestyle Skiing',
    'Shooters': 'Shooting',
    'Administration': '',
  }
  const trimmed = sport?.trim() || ''
  return Object.prototype.hasOwnProperty.call(NORMALIZE, trimmed) ? NORMALIZE[trimmed] : trimmed
}
