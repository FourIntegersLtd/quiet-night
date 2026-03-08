# Vector Images & Illustrations — Placement & Search Guide

Use this guide to add **classy vector illustrations** across the app. Prefer **SVG** (via `react-native-svg` or Expo’s asset pipeline) for sharp scaling and small bundle size. Tint key shapes with `colors.illustration` or accent so they match the dark purple theme.

---

## 1. Onboarding & welcome

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Welcome hero** | `app/(onboarding)/welcome.tsx` | Replaces the large moon icon in the circle; first impression | Single focal illustration: person sleeping peacefully, or moon + bed, soft and aspirational | `sleep illustration minimal vector`, `person sleeping flat illustration`, `moon night bedroom vector SVG`, `wellness app onboarding illustration` |
| **Carousel slides** | `app/(onboarding)/carousel.tsx` | One illustration per slide (Track / Capture / Journey) | Three distinct but cohesive scenes: e.g. bed + clock, microphone + waveform, chart + trend line | `sleep tracking illustration vector`, `audio recording minimal illustration`, `data chart growth vector flat`, `onboarding slide illustration set` |

---

## 2. Tonight tab (Tracker)

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Record Sleep CTA** | `app/(tabs)/tonight/index.tsx` | Optional small illustration next to “Record Sleep” / “Start tracking” (left of text or above) | Moon, stars, or bed icon; subtle, not overwhelming the button | `moon stars night vector icon`, `start sleep tracking illustration`, `bedtime icon minimal vector` |
| **Tip of the day card** | `app/(tabs)/tonight/index.tsx` | Top-right or above the tip text for a “classy” feel | Small lightbulb alternative or a cozy sleep habit (e.g. book, pillow, clock) | `tip idea light bulb vector`, `sleep habit illustration minimal`, `cozy bedtime routine vector` |
| **Partner card** | `app/(tabs)/tonight/index.tsx` | “Sarah’s last check-in” / partner avatar area | Two silhouettes or two people in bed; soft, inclusive | `couple sleeping illustration`, `partner together vector flat`, `two people bed illustration minimal` |
| **Last night card** (no partner) | `app/(tabs)/tonight/index.tsx` | “Your last night” summary card | Single person + moon or a “summary” vibe (e.g. clipboard, chart) | `single person sleep summary vector`, `night summary illustration`, `sleep report minimal illustration` |

---

## 3. Nights tab (Records / calendar)

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Empty state** | `app/(tabs)/nights/index.tsx` | Replaces calendar icon when there are no records | Calendar or sleep diary with a gentle “start here” feel | `empty calendar illustration vector`, `no data yet illustration`, `sleep diary empty state vector`, `first record illustration` |
| **Record card** (optional) | `components/RecordCard.tsx` | Small left accent or tiny icon per card | Very small: moon, Z’s, or sound wave; must not clutter the card | `sleep record icon vector`, `moon phase minimal icon`, `snore sound wave icon SVG` |

---

## 4. Morning flow (post-sleep)

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Good Morning header** | `app/(tabs)/tonight/morning.tsx` | Small graphic next to “Good Morning” (lines ~460–470) | Sunrise, sun + moon, or alarm; warm and positive | `good morning sunrise vector`, `sun moon transition illustration`, `wake up positive illustration minimal` |
| **Stats card** (Loud Snoring) | `app/(tabs)/tonight/morning.tsx` | Top of stats card or next to “Loud Snoring” title (~472) | Subtle waveform, moon with Z’s, or “quiet vs loud” icon | `snoring sound wave illustration`, `sleep quality meter vector`, `loud quiet comparison icon` |
| **Charts & playback link** | `app/(tabs)/tonight/morning.tsx` | Small accent next to “Charts & playback” link (~515–528) | Mini chart, waveform, or “see details” arrow/graph | `chart playback icon vector`, `view details graph minimal`, `analytics link illustration` |
| **When you snored** (chart card) | `app/(tabs)/tonight/morning.tsx` | Above or beside “When you snored” title (~534) | 24h timeline, moon over clock, or bar-chart metaphor | `snoring by hour illustration`, `timeline night vector`, `bar chart sleep minimal`, `when you snored illustration` |
| **Night Insights card** | `app/(tabs)/tonight/morning.tsx` | Next to “Night Insights” title (~565–569) | Sparkle, brain, or “insight” metaphor (e.g. lightbulb, magnifying glass) | `insight idea illustration vector`, `sparkle brain minimal`, `summary insight icon SVG` |
| **Ask your partner card** | `app/(tabs)/tonight/morning.tsx` | Next to “Ask your partner” title or above share button (~581–604) | Two people, share/link, or “invite partner” (handshake, couple, send link) | `ask partner illustration vector`, `share link couple minimal`, `invite partner morning vector`, `send link illustration` |

---

## 5. Journey tab

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Winning remedy card** | `app/(tabs)/journey/index.tsx` | “Your Best Remedy” / winning formula card | Trophy, star, or “best choice” (e.g. checkmark, medal); achievement feel | `best choice trophy vector`, `winner achievement minimal illustration`, `success remedy icon` |
| **Epworth / Daytime energy card** | `app/(tabs)/journey/index.tsx` + `epworth.tsx` | “Check your daytime energy” card and Epworth intro card | Energy, battery, or “wellness check” (e.g. clipboard, heart) | `daytime energy illustration vector`, `wellness check clipboard vector`, `sleepiness scale illustration minimal` |
| **Empty leaderboard** | `app/(tabs)/journey/index.tsx` | When experiment leaderboard has no data | Podium empty or “experiment” (flask, lightbulb) | `empty leaderboard vector`, `experiment flask illustration`, `no data yet chart vector` |
| **Snore scores by month** | `app/(tabs)/journey/index.tsx` | Optional small graphic above the bar chart | Mini chart, trend, or moon-over-months | `monthly trend illustration`, `bar chart minimal vector`, `sleep over time illustration` |

---

## 6. Profile & account

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Account section** | `app/(tabs)/profile.tsx` | Optional above or beside avatar/name block | Profile silhouette, person with settings, or “you” metaphor | `profile account illustration vector`, `user avatar minimal`, `settings person vector flat` |
| **Invite partner / link card** | `app/(tabs)/profile.tsx` | Partner invite or “Enter partner’s code” card | Two people linking, handshake, or “connect” (e.g. link icon, couple) | `invite partner illustration`, `connect two people vector`, `couple link illustration minimal` |

---

## 7. Paywall & premium

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Paywall hero** | `app/(tabs)/paywall.tsx` | Replaces or complements the diamond icon; “Sleep better, together” | Premium feel: crown, diamond, or couple + moon; elegant, not cheap | `premium crown vector`, `sleep better together illustration`, `diamond premium app vector`, `subscription hero illustration` |
| **Benefit rows** | `app/(tabs)/paywall.tsx` | Optional small illustration per benefit (unlimited, insights, export) | Icons: infinity, chart, download/cloud; consistent line style | `unlimited infinity icon vector`, `export download illustration`, `insights chart minimal vector` |

---

## 8. Night detail (single night)

| Location | File | Purpose | Image idea | Search terms |
|----------|------|---------|------------|--------------|
| **Time in bed / pie section** | `app/(tabs)/nights/[key].tsx` | Optional small graphic above “Time in bed” or next to pie | Bed icon, clock, or “time in bed” metaphor | `time in bed illustration`, `sleep duration icon vector`, `bed clock minimal` |
| **Snore timeline** | `app/(tabs)/nights/[key].tsx` | Optional above “Snore timeline” | Waveform, moon with sound, or “timeline” icon | `sound timeline vector`, `snore waveform illustration`, `audio timeline icon` |

---

## Style and tech notes

- **Style:** Prefer **minimal, flat or soft gradient** vectors; avoid heavy 3D or cartoon. Line weight medium–thin. Fits the dark purple, “Migraine Buddy–style” UI.
- **Colors:** Use or tint with `theme.colors.illustration` (star, hair, skin) and accent purple so illustrations feel on-brand.
- **Format:** SVG preferred; export from Figma/Illustrator or use sites that offer SVG (e.g. Undraw, Storyset, Figma Community). For PNG, provide 2x/3x for sharpness.
- **Size:** Hero areas ~200–240px; card illustrations ~80–120px; icons next to text ~24–40px.

---

## Quick search term summary (copy-paste)

- `sleep app illustration vector minimal`
- `person sleeping flat illustration SVG`
- `moon night bedroom vector`
- `empty state calendar illustration`
- `couple sleeping together vector`
- `sleep tracking dashboard illustration`
- `wellness check clipboard vector`
- `premium subscription hero illustration`
- `good morning sunrise vector`
- `insight sparkle minimal vector`
- `when you snored timeline vector`
- `ask partner share link illustration`
- `charts playback icon minimal`

Use these on **Figma Community**, **Undraw**, **Storyset**, **Freepik** (vector), **Flaticon**, or **Google Images** (filter by “vector” or “SVG”).
