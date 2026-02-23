# WeatherAggregator Redesign Proposals

## Executive Summary

WeatherAggregator serves private jet dispatchers, pilots, and aviation professionals who need fast, reliable, multi-source weather data for flight planning decisions. The current interface, while functional, relies on generic Tailwind defaults (gray cards, blue buttons, standard shadows) that fail to communicate the precision and authority this domain demands. The layout is dense without being information-rich -- clutter without hierarchy.

This document presents three distinct redesign directions, each solving the same core problems through different design philosophies:

1. **Horizon** -- A premium aviation dashboard inspired by Linear and ForeFlight. Deep, confident, professional. The "control tower" of weather apps.
2. **Clearway** -- A friendly expert inspired by Hotel Tonight and Duolingo. Warm, approachable, personality-driven. Makes aviation weather feel less intimidating without sacrificing depth.
3. **Jetstream** -- A data-forward immersive experience inspired by Windy.com and Bloomberg Terminal. Map-centric, visualization-heavy, power-user oriented.

All three proposals share these non-negotiable principles:
- **Progressive disclosure**: Glanceable summaries that expand to reveal detail, then raw data
- **Flight category colors are sacred**: VFR green, MVFR blue, IFR red, LIFR purple remain consistent
- **Dark and light mode**: Both are first-class citizens, not afterthoughts
- **Mobile-first**: Every layout must work on a phone in a cockpit or on a ramp

---

## Decision Framework

Each proposal is scored 1-5 on these criteria:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Scanability** | High | Can a dispatcher glance at a screen and know the status in under 2 seconds? |
| **Progressive Disclosure** | High | Does the design layer information effectively (summary -> detail -> raw)? |
| **Brand Personality** | Medium | Does it feel like "aviation, but modern" rather than generic or cheesy? |
| **Accessibility** | High | Contrast ratios, color-blind safety, screen reader compatibility |
| **Dev Feasibility** | Medium | How much effort to implement given the current React + Tailwind stack? |
| **Dark/Light Mode** | Medium | Are both modes polished, or does one feel like an afterthought? |
| **Mobile Responsiveness** | High | Does it work well on phones and tablets without losing key information? |
| **Delight Factor** | Low | Does using it feel good? Animations, polish, micro-interactions |

---

## Proposal 1: "Horizon" -- Premium Aviation Dashboard

### Tagline
*"The view from the tower."*

### Design Philosophy

Horizon treats weather data like a financial dashboard treats market data: with clinical precision, confident typography, and structured density. Every pixel serves a purpose. The dark mode is the hero experience -- deep navy blue that feels like looking out a tower window at dusk -- while the light mode is crisp and surgical. This is a tool that earns trust through restraint.

### Color Palette

#### Dark Mode (Primary Experience)

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#0B1120` | Page background, deep navy |
| Surface | `#131D35` | Cards, panels |
| Surface Elevated | `#1A2744` | Hover states, modals, dropdowns |
| Text Primary | `#E8ECF4` | Headings, primary content |
| Text Secondary | `#8892A8` | Labels, captions, metadata |
| Text Tertiary | `#4F5B73` | Disabled text, subtle hints |
| Border | `#1E2D4A` | Card borders, dividers |
| Border Accent | `#2A3F66` | Active borders, focus rings |
| Accent Primary | `#38BDF8` | Sky blue -- CTAs, links, active states |
| Accent Secondary | `#818CF8` | Indigo -- secondary actions, chart accents |
| Success | `#34D399` | GO status, positive indicators |
| Warning | `#FBBF24` | Caution status, alternate required |
| Danger | `#F87171` | NO-GO status, critical alerts |

#### Light Mode

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#F5F7FA` | Page background, off-white with blue undertone |
| Surface | `#FFFFFF` | Cards, panels |
| Surface Elevated | `#F0F3F8` | Hover states, modals |
| Text Primary | `#0F172A` | Headings, primary content |
| Text Secondary | `#475569` | Labels, captions |
| Text Tertiary | `#94A3B8` | Disabled, hints |
| Border | `#E2E8F0` | Card borders |
| Border Accent | `#CBD5E1` | Active borders |
| Accent Primary | `#0284C7` | Sky blue, darker for contrast on white |
| Accent Secondary | `#6366F1` | Indigo |
| Success | `#16A34A` | GO status |
| Warning | `#D97706` | Caution |
| Danger | `#DC2626` | NO-GO |

#### Flight Category Colors (Both Modes)

| Category | Hex | Background (Dark) | Background (Light) |
|----------|-----|-------------------|---------------------|
| VFR | `#22C55E` | `rgba(34,197,94,0.15)` | `#DCFCE7` |
| MVFR | `#3B82F6` | `rgba(59,130,246,0.15)` | `#DBEAFE` |
| IFR | `#EF4444` | `rgba(239,68,68,0.15)` | `#FEE2E2` |
| LIFR | `#A855F7` | `rgba(168,85,247,0.15)` | `#F3E8FF` |

### Typography

| Element | Font | Size | Weight | Letter Spacing |
|---------|------|------|--------|----------------|
| Page Title | Inter | 28px / 1.75rem | 700 Bold | -0.02em |
| Section Title | Inter | 20px / 1.25rem | 600 Semi | -0.01em |
| Card Title | Inter | 16px / 1rem | 600 Semi | 0 |
| Body | Inter | 14px / 0.875rem | 400 Regular | 0 |
| Caption / Label | Inter | 12px / 0.75rem | 500 Medium | 0.04em (uppercase) |
| Data Value (large) | Inter | 36px / 2.25rem | 700 Bold | -0.02em |
| Data Value (medium) | Inter | 24px / 1.5rem | 600 Semi | -0.01em |
| Monospace / METAR | JetBrains Mono | 13px / 0.8125rem | 400 Regular | 0 |
| Flight Category Badge | Inter | 14px / 0.875rem | 800 ExtraBold | 0.05em (uppercase) |

### Textures & Effects

- **Card shadows (dark):** `0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(30,45,74,0.8)` -- inset border feel
- **Card shadows (light):** `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`
- **Glass-morphism (modals, overlays):** `backdrop-filter: blur(12px); background: rgba(19,29,53,0.85)`
- **Gradients:** Subtle top-to-bottom on page background: `#0B1120` to `#0D1526` (dark), `#F5F7FA` to `#EDF1F7` (light)
- **Border radius:** 8px for cards, 6px for inputs, 20px for badges/pills
- **Hover states:** Surface shifts one level up (`Surface` -> `Surface Elevated`), 150ms ease
- **Focus rings:** 2px `Accent Primary` with 2px offset, always visible on keyboard nav

### Iconography Style

Thin-line (1.5px stroke) custom aviation icon set. Clean, geometric, recognizable at small sizes.

- **Altimeter:** Circular gauge face with needle pointing to pressure value
- **Wind sock:** Conical shape with directional indicator, animated gentle sway on live data
- **Runway:** Parallel lines with center dashes, threshold markings
- **Aircraft silhouette:** Side profile, minimalist, used for trip leg indicators
- **Cloud layers:** Layered horizontal lines with varying density for coverage
- **Visibility eye:** Simplified eye icon with distance hash marks radiating outward
- **Temperature:** Minimalist thermometer without bulb -- just a vertical bar with gradient fill
- **Compass rose:** 8-point star for wind direction, rotates to indicate current wind

### Animation & Micro-interactions

1. **Card expansion (progressive disclosure):** Height animates with `spring(1, 80, 10)` physics. Content fades in 150ms after container reaches full height. Chevron rotates 180 degrees.
2. **Data refresh ripple:** When weather data updates, a subtle radial pulse (`opacity: 0.15` of accent color) expands from the refresh button across the card surface over 600ms.
3. **Number transitions:** Temperature, wind speed, visibility values animate between old and new numbers using a counting/slot-machine effect (200ms `ease-out`).
4. **Flight category change:** Badge color cross-fades over 300ms. If category worsens (VFR -> MVFR), a brief attention pulse (scale 1.05 then back) draws the eye.
5. **GO/NO-GO reveal:** Status card fades in with a 50ms stagger per element (icon, text, details). GO gets a subtle green glow that fades. NO-GO gets a single firm red pulse.
6. **Page transitions:** Content sections slide up 12px and fade in with 80ms stagger between sections on initial load.
7. **Timeline scrub:** Dragging the timeline scrubber updates weather data cards with a smooth cross-dissolve (no layout shift).

### ASCII Mockup: Homepage

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [cloud icon]  Weather Aggregator     Single Airport  Trip Planner  Map│
│                                       ─────────────                    │
│                                       14:32Z / 09:32L     [moon] [user│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                                                         │
│                         AVIATION WEATHER                                │
│                         AGGREGATOR                                      │
│                                                                         │
│              Multi-source weather intelligence for                       │
│              Part 135 flight operations.                                 │
│                                                                         │
│         ┌─────────────────────────────────────────────┐                 │
│         │  [search icon]  Enter ICAO code...    [->]  │                 │
│         └─────────────────────────────────────────────┘                 │
│                                                                         │
│                                                                         │
│   ┌─── FAVORITES ────────────────────────────────────────────────────┐  │
│   │                                                                  │  │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│   │  │   KJFK   │  │   KLAX   │  │   KORD   │  │   KATL   │        │  │
│   │  │          │  │          │  │          │  │          │        │  │
│   │  │  VFR     │  │  VFR     │  │  MVFR    │  │  IFR     │        │  │
│   │  │  ● 72°F  │  │  ● 68°F  │  │  ● 45°F  │  │  ● 52°F  │        │  │
│   │  │  8 kt SW │  │  12kt W  │  │  18kt NW │  │  6 kt E  │        │  │
│   │  │          │  │          │  │          │  │          │        │  │
│   │  │  [star]  │  │  [star]  │  │  [star]  │  │  [star]  │        │  │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌─── RECENT ───────────────────────────────────────────────────────┐  │
│   │                                                                  │  │
│   │   [KBOS]   [KSFO]   [KMIA]   [KDEN]   [KLAS]                   │  │
│   │                                                          Clear  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌─── QUICK REFERENCE ─────────────────────────────────────────────┐  │
│   │                                                                  │  │
│   │   ● VFR    Ceiling > 3,000 ft, Visibility > 5 SM                │  │
│   │   ● MVFR   Ceiling 1,000-3,000 ft, Visibility 3-5 SM           │  │
│   │   ● IFR    Ceiling 500-999 ft, Visibility 1-3 SM               │  │
│   │   ● LIFR   Ceiling < 500 ft, Visibility < 1 SM                 │  │
│   │                                                                  │  │
│   │   Part 135: Min ceiling 500 ft, Min visibility 1 SM             │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│   Data from Aviation Weather Center, Open-Meteo, and NWS               │
└─────────────────────────────────────────────────────────────────────────┘
```

### ASCII Mockup: Trip Planner Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [cloud]  Weather Aggregator      Single Airport  Trip Planner  Map    │
│                                   ───────────────                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Trip Planner                          [Delete] [Export] [Import] [Save]│
│  Northeast Shuttle  (3 legs)                                    [+ New] │
│                                                                         │
│  ┌─── LEGS ─────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  LEG 1                                                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────────────┐  ┌──────────┐  │  │
│  │  │ KTEB    │  │ KBOS    │  │ 23 Feb 14:00Z     │  │ 1h 15m   │  │  │
│  │  │ Depart  │  │ Arrive  │  │ 09:00 Local       │  │ Flight   │  │  │
│  │  └─────────┘  └─────────┘  └───────────────────┘  └──────────┘  │  │
│  │                                                                   │  │
│  │  LEG 2                                                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────────────┐  ┌──────────┐  │  │
│  │  │ KBOS    │  │ KJFK    │  │ 23 Feb 16:30Z     │  │ 0h 55m   │  │  │
│  │  │ Depart  │  │ Arrive  │  │ 11:30 Local       │  │ Flight   │  │  │
│  │  └─────────┘  └─────────┘  └───────────────────┘  └──────────┘  │  │
│  │                                                                   │  │
│  │  LEG 3                                                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────────────┐  ┌──────────┐  │  │
│  │  │ KJFK    │  │ KTEB    │  │ 23 Feb 19:00Z     │  │ 0h 25m   │  │  │
│  │  │ Depart  │  │ Arrive  │  │ 14:00 Local       │  │ Flight   │  │  │
│  │  └─────────┘  └─────────┘  └───────────────────┘  └──────────┘  │  │
│  │                                                                   │  │
│  │                                          [+ Add Leg]             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── ETD / ETA ────────────────────────────────────────────────────┐  │
│  │  ETD - KTEB          ETA - KTEB       Flight Time    Trip Dur.   │  │
│  │  14:00Z / 09:00L     19:25Z / 14:25L  2h 35m         5h 25m     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │            [aircraft icon]  Get Weather                        │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════     │
│  WEATHER RESULTS                                                        │
│  ═══════════════════════════════════════════════════════════════════     │
│                                                                         │
│  ┌─── TRIP SUMMARY ──────────────────────┐  ┌─── TIMELINE ──────────┐  │
│  │                                        │  │                       │  │
│  │  ┌──────────────────────────────────┐  │  │  13Z  14Z  15Z  16Z  │  │
│  │  │  ●  GO                           │  │  │   │    │    │    │   │  │
│  │  │     3/3 legs clear               │  │  │   ├────■■■■─┤        │  │
│  │  │     High confidence              │  │  │   │ L1 KTEB→KBOS     │  │
│  │  │     Strong source agreement      │  │  │   │              │   │  │
│  │  └──────────────────────────────────┘  │  │  16Z  17Z  18Z  19Z  │  │
│  │                                        │  │   │    │    │    │   │  │
│  │  Worst conditions: Leg 2   [MVFR]     │  │   ├──■■■──┤          │  │
│  │                                        │  │   │ L2 KBOS→KJFK     │  │
│  │  Shift times:                          │  │   │              │   │  │
│  │  [-2h] [-1h] [+1h] [+2h]             │  │   │    ├──■─┤         │  │
│  │                                        │  │   │ L3 KJFK→KTEB     │  │
│  └────────────────────────────────────────┘  │   │         NOW↓      │  │
│                                               │                       │  │
│                                               │  ● GO  ● CAUTION     │  │
│                                               │  ● NO-GO              │  │
│                                               └───────────────────────┘  │
│                                                                         │
│  ── LAYER 1: GLANCEABLE SUMMARY ───────────────────────────────────    │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │  LEG 1           │  │  LEG 2           │  │  LEG 3           │        │
│  │  KTEB → KBOS     │  │  KBOS → KJFK     │  │  KJFK → KTEB     │        │
│  │                   │  │                   │  │                   │        │
│  │  ● GO             │  │  ● GO             │  │  ● GO             │        │
│  │                   │  │                   │  │                   │        │
│  │  DEP  VFR  72°F  │  │  DEP  VFR  58°F  │  │  DEP  MVFR 55°F  │        │
│  │  ARR  VFR  58°F  │  │  ARR  MVFR 55°F  │  │  ARR  VFR  70°F  │        │
│  │                   │  │                   │  │                   │        │
│  │  [View Details v] │  │  [View Details v] │  │  [View Details v] │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  ── LAYER 2: SELECTED LEG DETAIL (Leg 2: KBOS → KJFK) ───────────    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  ┌─── DEPARTURE: KBOS ───────────┐  ┌─── ARRIVAL: KJFK ──────┐ │  │
│  │  │  VFR  ● GO                     │  │  MVFR  ● GO             │ │  │
│  │  │                                │  │                          │ │  │
│  │  │  Temp     58°F    Wind   8kt W │  │  Temp     55°F          │ │  │
│  │  │  Vis      10 SM   Ceil   4500ft│  │  Vis      4 SM          │ │  │
│  │  │  Press    30.12   Gusts  --    │  │  Ceil     2800 ft       │ │  │
│  │  │                                │  │  Wind     14 kt SW      │ │  │
│  │  │  Part 135: PASS               │  │                          │ │  │
│  │  │  Ceiling:  +4000 ft margin     │  │  Part 135: PASS         │ │  │
│  │  │  Vis:      +9.0 SM margin      │  │  Ceiling:  +2300 ft     │ │  │
│  │  │                                │  │  Vis:      +3.0 SM      │ │  │
│  │  │  Sources: 3/3 agree on VFR     │  │                          │ │  │
│  │  │                                │  │  Sources: 2/3 agree      │ │  │
│  │  │  [Show Raw METAR]             │  │                          │ │  │
│  │  └────────────────────────────────┘  │  [Show Raw METAR]       │ │  │
│  │                                       └────────────────────────┘ │  │
│  │                                                                  │  │
│  │  ── LAYER 3: RAW DATA (collapsed by default) ──────────────────  │  │
│  │  > Raw METAR: KBOS                                               │  │
│  │  > Raw TAF: KBOS                                                 │  │
│  │  > Source Comparison Table                                       │  │
│  │  > Raw METAR: KJFK                                               │  │
│  │  > Raw TAF: KJFK                                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ────────────────────────────────────────────────────────────────────   │
│  Data from Aviation Weather Center, Open-Meteo, and NWS                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Scoring

| Criterion | Score | Notes |
|-----------|-------|-------|
| Scanability | 5 | Clean hierarchy, oversized category badges, data-first layout |
| Progressive Disclosure | 5 | Explicit 3-layer model built into every data section |
| Brand Personality | 4 | Professional and aviation-coded, but may feel too serious for some |
| Accessibility | 4 | High contrast in dark mode; sky blue accent needs careful contrast checking on light backgrounds |
| Dev Feasibility | 4 | Mostly Tailwind config changes + Inter font + Framer Motion; glass-morphism needs testing |
| Dark/Light Mode | 5 | Dark mode is the hero; both are designed with intent |
| Mobile Responsiveness | 4 | Card-based layout adapts well; timeline needs horizontal scroll on mobile |
| Delight Factor | 4 | Number transitions and refresh ripples are subtle but satisfying |
| **Total** | **35/40** | |

---

## Proposal 2: "Clearway" -- Friendly Expert

### Tagline
*"Clear skies, clear answers."*

### Design Philosophy

Clearway believes that aviation weather data does not have to feel cold and clinical. By borrowing the warmth of Hotel Tonight's confident minimalism and Duolingo's character-driven delight, Clearway makes complex meteorological data feel approachable without dumbing it down. The key insight: personality builds trust faster than sterility does. A cumulus cloud character that smiles at you when conditions are VFR is not unprofessional -- it is memorable and instantly communicative.

### Color Palette

#### Light Mode (Primary Experience)

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#FBF8F3` | Warm cream, not sterile white |
| Surface | `#FFFFFF` | Cards |
| Surface Tinted | `#F5F0E8` | Secondary surfaces, input backgrounds |
| Text Primary | `#1C1917` | Stone-900, warm black |
| Text Secondary | `#57534E` | Stone-600 |
| Text Tertiary | `#A8A29E` | Stone-400 |
| Border | `#E7E5E4` | Stone-200 |
| Accent Primary | `#0D9488` | Teal-600 -- confident, calming, distinct from flight categories |
| Accent Secondary | `#D97706` | Amber-600 -- warm, attention-getting |
| Success | `#16A34A` | Green-600 |
| Warning | `#EA580C` | Orange-600 |
| Danger | `#DC2626` | Red-600 |
| Celebration | `#8B5CF6` | Violet-500 -- used for delightful moments |

#### Dark Mode (Warm Dark)

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#1C1917` | Stone-900, warm charcoal (not cold gray) |
| Surface | `#292524` | Stone-800 |
| Surface Tinted | `#44403C` | Stone-700 |
| Text Primary | `#FAFAF9` | Stone-50 |
| Text Secondary | `#A8A29E` | Stone-400 |
| Text Tertiary | `#78716C` | Stone-500 |
| Border | `#44403C` | Stone-700 |
| Accent Primary | `#2DD4BF` | Teal-400 |
| Accent Secondary | `#FBBF24` | Amber-400 |
| Success | `#4ADE80` | Green-400 |
| Warning | `#FB923C` | Orange-400 |
| Danger | `#F87171` | Red-400 |
| Celebration | `#A78BFA` | Violet-400 |

#### Flight Category Colors (Both Modes)

| Category | Hex | Friendly Label | Illustration |
|----------|-----|---------------|--------------|
| VFR | `#22C55E` | "Clear for takeoff!" | Smiling sun, happy cloud |
| MVFR | `#3B82F6` | "Fly with care" | Cloud with sunglasses, cautious |
| IFR | `#EF4444` | "Instruments required" | Cloud with foggy eyes |
| LIFR | `#A855F7` | "Grounded conditions" | Cloud hiding behind umbrella |

### Typography

| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Hero Title | DM Sans | 40px / 2.5rem | 700 Bold | Rounded letterforms |
| Page Title | DM Sans | 28px / 1.75rem | 700 Bold | |
| Section Title | DM Sans | 20px / 1.25rem | 600 Semi | |
| Card Title | DM Sans | 16px / 1rem | 600 Semi | |
| Body | DM Sans | 15px / 0.9375rem | 400 Regular | Slightly larger than typical for readability |
| Caption / Label | DM Sans | 12px / 0.75rem | 500 Medium | uppercase, wide tracking |
| Personality Text | DM Sans | 16px / 1rem | 500 Medium | Italic for friendly status messages |
| Data Value (large) | DM Sans | 32px / 2rem | 700 Bold | |
| Monospace / METAR | IBM Plex Mono | 13px / 0.8125rem | 400 Regular | |
| Flight Category Badge | DM Sans | 15px / 0.9375rem | 700 Bold | Rounded pill shape |

### Textures & Effects

- **Card shadows:** `0 2px 8px rgba(28,25,23,0.06), 0 0 0 1px rgba(231,229,228,0.8)` (light); `0 2px 8px rgba(0,0,0,0.3)` (dark)
- **Border radius:** 12px for cards (generous), 8px for inputs, 9999px for pills and badges
- **Illustration containers:** Soft pastel backgrounds (`teal-50`, `amber-50`) with 16px radius, used as headers for cards
- **Gradients:** Warm diagonal gradients for hero sections: `#FBF8F3` to `#F0EDE6` (light), `#1C1917` to `#292524` (dark)
- **Hover states:** Slight scale transform (`1.01`) + shadow increase, 200ms spring ease
- **Active states:** Scale `0.98`, immediate

### Iconography Style

Custom illustrated character system + simple filled icons for UI controls.

- **Cumulus (mascot):** A friendly cumulus cloud with subtle facial expressions. Appears in empty states, loading screens, and status indicators. Has 5 moods: happy (VFR), cautious (MVFR), worried (IFR), hiding (LIFR), celebrating (GO status).
- **Weather condition illustrations:** Hand-drawn style, 2-3 colors each. Wind shown as playful swirl lines. Rain as bouncy droplets. Snow as gentle spirals. Fog as wavy horizontal layers.
- **UI icons:** Filled style, 2px stroke, rounded joins. Consistent 20x20 grid. Teal for primary actions, stone for secondary.
- **Status illustrations:** Small scene vignettes (64x64px) for trip leg status cards. Runway with sunshine, runway with clouds, runway with fog.

### Animation & Micro-interactions

1. **Card hover:** Gentle float up (translateY -2px) with shadow expansion. Feels like the card is lifting off the surface. 200ms spring ease.
2. **GO celebration:** When trip status is GO, a brief confetti burst of small teal and amber dots (300ms, 12 particles, gravity fall). Happens once per weather fetch, not on every render.
3. **NO-GO shake:** Status card does a quick horizontal shake (3 oscillations, 4px amplitude, 400ms) to draw attention without being alarming.
4. **Weather character animation:** Cumulus mascot has idle breathing animation (subtle scale 1.0 to 1.02 on a 4s loop). On status change, it transitions between moods with a 500ms morph.
5. **Bouncy card transitions:** New cards entering the DOM use a spring animation: `spring(1, 180, 12)` -- slightly bouncy overshoot that settles.
6. **Progress ring:** Part 135 margin is visualized as an animated arc that draws from 0 to the margin percentage over 800ms.
7. **Ambient weather animation:** Subtle CSS animations in card headers. VFR: slow-drifting cloud. IFR: gentle fog drift. Rain: falling droplet particles. These are decorative, use `prefers-reduced-motion` to disable.
8. **Pull to refresh (mobile):** Custom implementation with Cumulus mascot stretching down, then snapping back up with a spin.

### ASCII Mockup: Homepage

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [cloud icon]  Weather Aggregator     Single Airport  Trip Planner  Map│
│                                       14:32Z / 09:32L   [sun/moon] [>]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                                                         │
│                      .-~~~-.                                            │
│                    (  ^   ^  )      < "Where are we flying today?"      │
│                     (  ___  )                                           │
│                      `-----'                                            │
│                                                                         │
│                                                                         │
│         ┌─────────────────────────────────────────────┐                 │
│         │                                             │                 │
│         │  [magnifying glass]  Search ICAO code...    │                 │
│         │                                             │                 │
│         └─────────────────────────────────────────────┘                 │
│           Try: KJFK  KLAX  EGLL  RJTT                                  │
│                                                                         │
│                                                                         │
│   YOUR AIRPORTS                                                         │
│                                                                         │
│   ┌──────────────────────────────────┐  ┌──────────────────────────────┐│
│   │  [illustration: sunny runway]    │  │  [illustration: windy clouds]││
│   │                                  │  │                              ││
│   │  KJFK                            │  │  KORD                        ││
│   │  John F. Kennedy Intl            │  │  Chicago O'Hare Intl         ││
│   │                                  │  │                              ││
│   │  ┌──────────────────────────┐    │  │  ┌──────────────────────┐    ││
│   │  │  VFR  Clear for takeoff! │    │  │  │  MVFR  Fly with care │    ││
│   │  └──────────────────────────┘    │  │  └──────────────────────┘    ││
│   │                                  │  │                              ││
│   │  72°F   8 kt SW   10+ SM        │  │  45°F   18 kt NW   4 SM     ││
│   │                                  │  │                              ││
│   │  [star filled]     View Weather  │  │  [star filled]  View Weather ││
│   └──────────────────────────────────┘  └──────────────────────────────┘│
│                                                                         │
│   ┌──────────────────────────────────┐  ┌──────────────────────────────┐│
│   │  [illustration: fog layers]      │  │  [illustration: clear sky]   ││
│   │                                  │  │                              ││
│   │  KLAX                            │  │  KATL                        ││
│   │  Los Angeles Intl                │  │  Hartsfield-Jackson Atlanta  ││
│   │                                  │  │                              ││
│   │  ┌──────────────────────────┐    │  │  ┌──────────────────────┐    ││
│   │  │  VFR  Clear for takeoff! │    │  │  │  IFR  Instruments req │    ││
│   │  └──────────────────────────┘    │  │  └──────────────────────┘    ││
│   │                                  │  │                              ││
│   │  68°F   12 kt W   10+ SM        │  │  52°F   6 kt E    2 SM      ││
│   │                                  │  │                              ││
│   │  [star filled]     View Weather  │  │  [star filled]  View Weather ││
│   └──────────────────────────────────┘  └──────────────────────────────┘│
│                                                                         │
│                                                                         │
│   RECENTLY VISITED                                                      │
│                                                                         │
│   (KBOS)  (KSFO)  (KMIA)  (KDEN)  (KLAS)              Clear all       │
│                                                                         │
│                                                                         │
│   ┌─── DID YOU KNOW? ───────────────────────────────────────────────┐  │
│   │  [lightbulb illustration]                                        │  │
│   │                                                                  │  │
│   │  We compare 3 independent weather sources so you don't          │  │
│   │  have to. When sources disagree, we flag it -- because          │  │
│   │  the weather you plan on should be the weather you get.          │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│   Data from Aviation Weather Center, Open-Meteo, and NWS               │
└─────────────────────────────────────────────────────────────────────────┘
```

### ASCII Mockup: Trip Planner Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [cloud]  Weather Aggregator      Single Airport  Trip Planner  Map    │
│                                   ───────────────                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Trip Planner                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Trip name:  [Northeast Shuttle________________]                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  BUILD YOUR ROUTE                                                       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  1  [KTEB]  ------>  [KBOS]    Feb 23, 14:00Z    1h 15m   [x]  │  │
│  │     ·                                                            │  │
│  │     ·  (1h 15m ground time)                                      │  │
│  │     ·                                                            │  │
│  │  2  [KBOS]  ------>  [KJFK]    Feb 23, 16:30Z    0h 55m   [x]  │  │
│  │     ·                                                            │  │
│  │     ·  (1h 35m ground time)                                      │  │
│  │     ·                                                            │  │
│  │  3  [KJFK]  ------>  [KTEB]    Feb 23, 19:00Z    0h 25m   [x]  │  │
│  │                                                                  │  │
│  │                      (+ Add another leg)                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  KTEB departs 14:00Z ─────────────── KTEB arrives 19:25Z        │  │
│  │  09:00 Local                         14:25 Local                 │  │
│  │                      Total: 5h 25m (2h 35m flight)               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                                                                │     │
│  │    [cloud mascot waving]   Check the Weather!                  │     │
│  │                                                                │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  [Export]  [Import]  [Save Trip]                [Delete]                 │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════     │
│                                                                         │
│                  .-~~~-.                                                 │
│                (  ^   ^  )    < "Looking good! All legs are clear."     │
│                 (  ___  )                                               │
│                  `-----'                                                 │
│                                                                         │
│  ┌─── TRIP HEALTH ──────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │  │
│  │  │                  │ │                  │ │                  │  │  │
│  │  │   DEPARTURE      │ │   ENROUTE        │ │   ARRIVAL        │  │  │
│  │  │                  │ │                  │ │                  │  │  │
│  │  │   [sun icon]     │ │   [cloud icon]   │ │   [wind icon]    │  │  │
│  │  │                  │ │                  │ │                  │  │  │
│  │  │   All Clear      │ │   Mostly Clear   │ │   Breezy         │  │  │
│  │  │                  │ │                  │ │                  │  │  │
│  │  │   ● VFR at all   │ │   ● VFR/MVFR mix │ │   ● MVFR at KJFK │  │  │
│  │  │     departures   │ │     expected     │ │     arrival      │  │  │
│  │  │                  │ │                  │ │                  │  │  │
│  │  │   ┌──────────┐   │ │   ┌──────────┐   │ │   ┌──────────┐   │  │  │
│  │  │   │  ● GO    │   │ │   │  ● GO    │   │ │   │  ● GO    │   │  │  │
│  │  │   └──────────┘   │ │   └──────────┘   │ │   └──────────┘   │  │  │
│  │  │                  │ │                  │ │                  │  │  │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── TIMELINE ─────────────────────────────────────────────────────┐  │
│  │  13Z     14Z     15Z     16Z     17Z     18Z     19Z     20Z    │  │
│  │   |       |       |       |       |       |       |       |     │  │
│  │           ╔═══════════╗                                          │  │
│  │   Leg 1   ║ KTEB→KBOS ║                                         │  │
│  │           ╚═══════════╝                                          │  │
│  │                           ╔════════╗                             │  │
│  │   Leg 2                   ║BOS→JFK ║                             │  │
│  │                           ╚════════╝                             │  │
│  │                                               ╔════╗             │  │
│  │   Leg 3                                       ║J→T ║            │  │
│  │                                               ╚════╝             │  │
│  │                              NOW ↓                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  LEG DETAILS                                                            │
│  Click a leg above or below to see full weather.                        │
│                                                                         │
│  ┌─── LEG 1: KTEB → KBOS ──────────────── [selected/highlighted] ──┐  │
│  │                                                                   │  │
│  │  SUMMARY                                                          │  │
│  │  Clear for takeoff! VFR conditions at both airports.              │  │
│  │  All 3 weather sources agree.                                     │  │
│  │                                                                   │  │
│  │  ┌──── KTEB (Departure) ─────┐  ┌──── KBOS (Arrival) ──────┐    │  │
│  │  │  VFR  "Clear for takeoff!" │  │  VFR  "Clear for takeoff!"│    │  │
│  │  │                            │  │                            │    │  │
│  │  │  72°F  |  8 kt SW         │  │  58°F  |  10 kt W         │    │  │
│  │  │  10+ SM vis | 5000 ft ceil│  │  10 SM vis | 4500 ft ceil  │    │  │
│  │  │                            │  │                            │    │  │
│  │  │  Part 135 ────────────     │  │  Part 135 ────────────     │    │  │
│  │  │  Ceiling   [████████] +4k  │  │  Ceiling   [███████] +4k  │    │  │
│  │  │  Visibility[████████] +9SM │  │  Visibility[██████ ] +9SM │    │  │
│  │  │                            │  │                            │    │  │
│  │  └────────────────────────────┘  └────────────────────────────┘    │  │
│  │                                                                   │  │
│  │  (v) Show detailed source comparison                              │  │
│  │  (v) Show raw METAR / TAF                                         │  │
│  │  (v) Show NOTAMs                                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── LEG 2: KBOS → KJFK ──────────────────────────────────────────┐  │
│  │  Fly with care -- MVFR at arrival. 2/3 sources agree.    [expand]│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── LEG 3: KJFK → KTEB ──────────────────────────────────────────┐  │
│  │  Clear for takeoff! VFR at both airports.                [expand]│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│   Data from Aviation Weather Center, Open-Meteo, and NWS               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Scoring

| Criterion | Score | Notes |
|-----------|-------|-------|
| Scanability | 5 | "Clear for takeoff!" communicates faster than "VFR"; health cards are instantly readable |
| Progressive Disclosure | 5 | Natural expand/collapse, personality text summarizes before you even look at data |
| Brand Personality | 5 | Unmistakably unique. Cumulus mascot creates brand identity no competitor has |
| Accessibility | 4 | Warm palette has good contrast; illustrations need alt text; reduced-motion support critical |
| Dev Feasibility | 3 | Custom illustrations require design asset creation; character animation needs Lottie/Rive; more complex than CSS-only |
| Dark/Light Mode | 4 | Both warm and intentional; warm dark is unusual and attractive but harder to maintain |
| Mobile Responsiveness | 5 | Large touch targets, generous spacing, health cards stack naturally |
| Delight Factor | 5 | Celebration animations, mascot personality, ambient weather -- highest delight of the three |
| **Total** | **36/40** | |

---

## Proposal 3: "Jetstream" -- Data-Forward Immersive

### Tagline
*"See the weather. Fly through data."*

### Design Philosophy

Jetstream treats the map as the primary interface and data as an overlay. Inspired by the visual density of Bloomberg Terminal and the cartographic beauty of Windy.com, this design is for users who think spatially and want to see weather as a continuous field rather than isolated station reports. The timeline scrubber is the central interaction metaphor: drag through time and watch weather evolve across the map. Data panels are translucent, respecting the map beneath while remaining readable.

### Color Palette

#### Dark Mode (Only Primary -- Light Mode is Minimal)

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#111318` | Near-black charcoal with slight blue |
| Surface | `#1A1D25` | Data panels |
| Surface Glass | `rgba(26,29,37,0.88)` | Translucent overlays on map |
| Text Primary | `#E4E7ED` | High contrast on dark surfaces |
| Text Secondary | `#8B91A0` | Secondary information |
| Text Tertiary | `#4A5066` | Disabled, decorative |
| Border | `#2A2E3A` | Panel edges |
| Accent Primary | `#22D3EE` | Cyan-400 -- electric, high visibility on dark backgrounds |
| Accent Secondary | `#818CF8` | Indigo-400 -- secondary highlights, chart accents |
| Accent Tertiary | `#F472B6` | Pink-400 -- temperature warm end, alerts |
| Success | `#4ADE80` | Green-400 |
| Warning | `#FBBF24` | Amber-400 |
| Danger | `#F87171` | Red-400 |

#### Light Mode (Secondary)

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#F0F2F5` | Cool gray |
| Surface | `#FFFFFF` | Cards and panels |
| Surface Glass | `rgba(255,255,255,0.92)` | Translucent overlays |
| Text Primary | `#111318` | |
| Text Secondary | `#4A5066` | |
| Border | `#D1D5DE` | |
| Accent Primary | `#0891B2` | Cyan-600 |
| Accent Secondary | `#6366F1` | Indigo-500 |
| Accent Tertiary | `#DB2777` | Pink-600 |
| Success | `#16A34A` | |
| Warning | `#D97706` | |
| Danger | `#DC2626` | |

#### Flight Category Colors (Both Modes)

| Category | Hex | Map Overlay | Pin Color |
|----------|-----|-------------|-----------|
| VFR | `#22C55E` | `rgba(34,197,94,0.25)` radius | Green glow |
| MVFR | `#3B82F6` | `rgba(59,130,246,0.25)` radius | Blue glow |
| IFR | `#EF4444` | `rgba(239,68,68,0.25)` radius | Red glow |
| LIFR | `#A855F7` | `rgba(168,85,247,0.25)` radius | Purple glow |

### Typography

| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Panel Title | Inter | 16px / 1rem | 600 Semi | |
| Section Label | Inter | 11px / 0.6875rem | 600 Semi | Uppercase, wide tracking |
| Body | Inter | 14px / 0.875rem | 400 Regular | |
| Data Value (hero) | JetBrains Mono | 48px / 3rem | 700 Bold | Monospace for data |
| Data Value (large) | JetBrains Mono | 28px / 1.75rem | 600 Semi | |
| Data Value (medium) | JetBrains Mono | 18px / 1.125rem | 500 Medium | |
| Data Value (small) | JetBrains Mono | 13px / 0.8125rem | 400 Regular | |
| Timestamp | JetBrains Mono | 11px / 0.6875rem | 400 Regular | Always monospace for alignment |
| Map Labels | Inter | 12px / 0.75rem | 500 Medium | Semi-transparent background |

### Textures & Effects

- **Glass panels:** `backdrop-filter: blur(16px) saturate(1.5); background: rgba(26,29,37,0.88); border: 1px solid rgba(255,255,255,0.06)`
- **Panel shadows:** `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)` (dark)
- **Map tile style:** Dark basemap (Mapbox Dark or CartoDB Dark Matter) with muted labels
- **Data glow:** Key data values have a subtle text-shadow glow in accent color: `0 0 12px rgba(34,211,238,0.3)`
- **Gradients:** Visualization gradients for temperature (cyan to pink), wind speed (green to orange to red), precipitation (transparent to blue to purple)
- **Border radius:** 8px for panels, 4px for inputs and data cells (tighter, more technical)
- **Scanlines (optional):** Extremely subtle (opacity 0.02) horizontal lines on surfaces for a screen/terminal feel

### Iconography Style

Functional, data-oriented icons. Minimal decoration. Icons serve as data labels, not illustrations.

- **Map pins:** Circular with flight category color fill and thin white ring. Inner dot pulses for selected airport.
- **Wind barbs:** Actual meteorological wind barbs rendered on map at each station. Follows WMO standard.
- **Data indicators:** Tiny inline SVGs next to values: up/down arrows for trends, bar charts for distribution, clock for recency.
- **Panel controls:** Minimal line icons (1.5px). Expand, collapse, pin, close, layers.
- **Visualization legends:** Gradient bars with tick marks and values, positioned in panel corners.

### Animation & Micro-interactions

1. **Timeline scrubber:** Dragging the time scrubber smoothly updates all visible weather data. Map overlays crossfade (200ms). Data values in panels animate with a fast counting transition (150ms). Wind barbs rotate smoothly.
2. **Wind particle flow:** Animated particles on the map showing wind speed and direction. Particle density = speed. Direction follows actual wind vectors. Updates on time scrub.
3. **Map zoom transitions:** Weather overlay detail increases on zoom. At continent scale: just flight category dots. At regional scale: temperature and wind. At airport scale: full station model.
4. **Panel slide-in:** Data panels slide in from the edge (right side on desktop, bottom on mobile) with a spring animation. Content fades in 100ms after panel reaches position.
5. **Data hover sparkline:** Hovering over a weather value in a panel reveals an inline 48-hour sparkline chart (150ms fade, 200ms draw animation).
6. **Radar sweep:** Precipitation radar overlay animates with a sweep pattern, cycling through the last 2 hours of radar data in a 4-second loop.
7. **Route visualization:** Trip route draws on the map as an animated dashed line. Flight category color changes along the route based on enroute weather.
8. **Loading state:** Subtle radar-sweep circular loading animation instead of a spinner.

### ASCII Mockup: Homepage

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [logo]  Aggregator   Airport  Trip  Map    14:32Z    [theme] [user]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │                    M  A  P    V  I  E  W                         │  │
│  │                                                                   │  │
│  │           (Dark basemap of continental US)                        │  │
│  │                                                                   │  │
│  │                              ● KORD (blue glow - MVFR)           │  │
│  │         ● KDEN                                                    │  │
│  │         (green glow                    ● KJFK (green - VFR)      │  │
│  │          - VFR)                                   ● KBOS          │  │
│  │                                                   (green - VFR)  │  │
│  │                                                                   │  │
│  │    ● KLAX                                                         │  │
│  │    (green - VFR)               ● KATL (red glow - IFR)          │  │
│  │                                                                   │  │
│  │         ● KLAS                          ● KMIA                    │  │
│  │         (green)                         (green)                   │  │
│  │                                                                   │  │
│  │    ~ ~ ~ ~ ~ ~ ~ ~ (wind particle animation) ~ ~ ~ ~ ~          │  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐   │  │
│  │  │  13Z    14Z    15Z    16Z    17Z    18Z    19Z    20Z     │   │  │
│  │  │         ▲ NOW                                              │   │  │
│  │  │  ═══════●══════════════════════════════════════════════    │   │  │
│  │  │  [<<]  Timeline Scrubber  [>>]              23 Feb 2026   │   │  │
│  │  └────────────────────────────────────────────────────────────┘   │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── SEARCH ───────────────┐                                          │
│  │                           │                                          │
│  │  [>] Enter ICAO code...  │     FAVORITES                            │
│  │                           │                                          │
│  └───────────────────────────┘     KJFK  VFR  72°F  8kt               │
│                                    KLAX  VFR  68°F  12kt              │
│  LAYERS                            KORD  MVFR 45°F  18kt              │
│  [x] Flight Categories             KATL  IFR  52°F  6kt               │
│  [ ] Wind Speed                                                         │
│  [ ] Temperature                   RECENT                               │
│  [ ] Precipitation                 KBOS  KSFO  KMIA  KDEN              │
│  [ ] Radar                                                              │
│  [ ] AIRMETs/SIGMETs                                                    │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│   Data from AWC, Open-Meteo, NWS                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### ASCII Mockup: Trip Planner Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [logo]  Aggregator   Airport  Trip  Map    14:32Z    [theme] [user]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────┐┌──────────────────────────────┐│
│  │                                     ││                              ││
│  │         M A P   V I E W             ││  TRIP: Northeast Shuttle     ││
│  │                                     ││                              ││
│  │    (Dark basemap zoomed to          ││  ┌──────────────────────┐   ││
│  │     NE United States)               ││  │  OVERALL: GO          │   ││
│  │                                     ││  │  3/3 legs clear       │   ││
│  │                                     ││  │  High confidence      │   ││
│  │       ● KTEB                        ││  └──────────────────────┘   ││
│  │         \                           ││                              ││
│  │          \  - - Leg 1 - - -         ││  ETD  14:00Z  KTEB          ││
│  │           \                ● KBOS   ││  ETA  19:25Z  KTEB          ││
│  │            \              /         ││  Duration   5h 25m           ││
│  │             \            /          ││  Flight     2h 35m           ││
│  │     Leg 3    \          / Leg 2     ││                              ││
│  │       \       \        /            ││  Shift: [-2h][-1h][+1h][+2h]││
│  │        \       ● KJFK              ││                              ││
│  │         \     /                     ││  ─────────────────────────   ││
│  │          `---'                      ││                              ││
│  │                                     ││  LEG SELECTOR               ││
│  │    Route color = leg status         ││                              ││
│  │    Green = GO, Yellow = Caution     ││  [1] KTEB→KBOS  ● VFR→VFR  ││
│  │    Red = NO-GO                      ││      14:00-15:15Z   GO      ││
│  │                                     ││                              ││
│  │  ┌──────────────────────────────┐   ││  [2] KBOS→KJFK  ● VFR→MVFR ││
│  │  │  Layers:                     │   ││      16:30-17:25Z   GO      ││
│  │  │  [x] Route  [x] Categories  │   ││                              ││
│  │  │  [ ] Wind   [ ] Precip      │   ││  [3] KJFK→KTEB  ● MVFR→VFR ││
│  │  └──────────────────────────────┘   ││      19:00-19:25Z   GO      ││
│  │                                     ││                              ││
│  └─────────────────────────────────────┘└──────────────────────────────┘│
│                                                                         │
│  ┌─── TIMELINE ─────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  13Z     14Z     15Z     16Z     17Z     18Z     19Z     20Z    │  │
│  │   |       |       |       |       |       |       |       |     │  │
│  │           ╔═══════════╗                                          │  │
│  │           ║ L1 VFR→VFR║                                          │  │
│  │           ╚═══════════╝                                          │  │
│  │                           ╔════════╗                             │  │
│  │                           ║L2 V→MV ║                             │  │
│  │                           ╚════════╝                             │  │
│  │                                               ╔════╗             │  │
│  │                                               ║ L3 ║            │  │
│  │                                               ╚════╝             │  │
│  │          ▲ NOW                                                    │  │
│  │  ═══════●═══════════════════════════════════════════════════════  │  │
│  │  [<<]  Drag to scrub through time  [>>]                          │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── LEG 2 DETAIL (Selected) ─────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  KBOS → KJFK        16:30Z - 17:25Z        0h 55m               │  │
│  │                                                                   │  │
│  │  ┌── DEPARTURE ──────────────────┐  ┌── ARRIVAL ────────────────┐│  │
│  │  │                                │  │                            ││  │
│  │  │  KBOS       VFR     GO        │  │  KJFK       MVFR    GO    ││  │
│  │  │                                │  │                            ││  │
│  │  │  TEMP   58°F    ▼ trending dn │  │  TEMP   55°F               ││  │
│  │  │  WIND   10 kt W              │  │  WIND   14 kt SW           ││  │
│  │  │  GUST   --                     │  │  GUST   22 kt             ││  │
│  │  │  VIS    10 SM                 │  │  VIS    4 SM               ││  │
│  │  │  CEIL   4500 ft               │  │  CEIL   2800 ft            ││  │
│  │  │  PRESS  30.12 "Hg             │  │  PRESS  29.98 "Hg          ││  │
│  │  │                                │  │                            ││  │
│  │  │  SOURCES ──────────────────    │  │  SOURCES ──────────────    ││  │
│  │  │  AWC     VFR   58°F  10kt    │  │  AWC     MVFR  55°F 14kt  ││  │
│  │  │  O-Meteo VFR   57°F  11kt    │  │  O-Meteo VFR   56°F 12kt  ││  │
│  │  │  NWS     VFR   59°F   9kt    │  │  NWS     MVFR  54°F 15kt  ││  │
│  │  │                                │  │                            ││  │
│  │  │  Agreement: STRONG  3/3       │  │  Agreement: MODERATE 2/3   ││  │
│  │  │                                │  │                            ││  │
│  │  │  135 ─────────────────         │  │  135 ─────────────────     ││  │
│  │  │  CEIL  4500/500  ████████ +4k │  │  CEIL  2800/500  ██████ +2k││  │
│  │  │  VIS   10.0/1.0  ████████ +9  │  │  VIS   4.0/1.0  █████ +3  ││  │
│  │  │                                │  │                            ││  │
│  │  └────────────────────────────────┘  └────────────────────────────┘│  │
│  │                                                                   │  │
│  │  ┌── RAW DATA (collapsed) ──────────────────────────────────────┐│  │
│  │  │ > METAR KBOS   > TAF KBOS   > METAR KJFK   > TAF KJFK      ││  │
│  │  │ > NOTAMs KBOS  > NOTAMs KJFK  > Winds Aloft                 ││  │
│  │  └──────────────────────────────────────────────────────────────┘│  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│   Data from AWC, Open-Meteo, NWS                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Scoring

| Criterion | Score | Notes |
|-----------|-------|-------|
| Scanability | 3 | Powerful once learned, but map-centric layout has higher cognitive load for quick checks |
| Progressive Disclosure | 4 | Good: map zoom levels act as natural disclosure layers; panel expand/collapse works |
| Brand Personality | 4 | Dramatic and memorable. "This is a serious tool" message is clear |
| Accessibility | 3 | Glass panels on maps need careful contrast testing; wind particles may trigger motion sensitivity; relies heavily on color |
| Dev Feasibility | 2 | Requires Mapbox/MapLibre GL integration, WebGL particles, custom map styles, timeline scrubber -- significant engineering |
| Dark/Light Mode | 3 | Dark mode is the clear star; light mode works but loses the dramatic effect |
| Mobile Responsiveness | 2 | Split-screen does not work on mobile; must redesign to stacked panels over map with bottom sheet pattern |
| Delight Factor | 5 | Wind particles, radar sweep, route visualization -- the most visually stunning of the three |
| **Total** | **26/40** | |

---

## Comparative Summary

| Criterion | Horizon | Clearway | Jetstream |
|-----------|---------|----------|-----------|
| Scanability | 5 | 5 | 3 |
| Progressive Disclosure | 5 | 5 | 4 |
| Brand Personality | 4 | 5 | 4 |
| Accessibility | 4 | 4 | 3 |
| Dev Feasibility | 4 | 3 | 2 |
| Dark/Light Mode | 5 | 4 | 3 |
| Mobile Responsiveness | 4 | 5 | 2 |
| Delight Factor | 4 | 5 | 5 |
| **Total** | **35** | **36** | **26** |

---

## Recommendation

**Build Clearway, with Horizon's data architecture underneath.**

Here is the argument:

### The Audience Is Not Monolithic

WeatherAggregator serves three distinct user groups with different needs:

1. **Professional dispatchers** (daily power users): Need speed, density, compliance checking. They will use this tool 40+ times a day. They care about efficiency and trust.
2. **Pilots** (frequent but not constant users): Need quick GO/NO-GO answers before flights. They know aviation weather but appreciate good UX. They use the tool in time-pressured situations.
3. **Operations managers / less-technical staff** (occasional users): Need high-level summaries. May not know what MVFR means from memory. Benefit most from plain-language interpretation.

Clearway is the only proposal that serves all three groups simultaneously. The friendly language layer ("Clear for takeoff!" alongside "VFR") translates technical data without removing it. The mascot and illustrations create brand recognition and emotional trust. The generous spacing and progressive disclosure mean dispatchers can get to their data quickly while occasional users are not overwhelmed.

### Why Not Horizon Alone?

Horizon is excellent but austere. For a tool that already exists in a market with ForeFlight, Garmin Pilot, and the AWC's own interface, another "professional dark dashboard" does not differentiate. Horizon would be respected but not remembered. It also does not solve the "too generic" problem -- it just replaces generic-casual with generic-professional.

### Why Not Jetstream?

Jetstream is the most visually impressive but the least practical to build and the hardest to use on mobile. The map-centric paradigm works brilliantly for spatial weather exploration (which is what Windy.com does), but WeatherAggregator's core task is station-based GO/NO-GO decision-making. Making users navigate a map to get to per-airport data adds friction to the primary workflow. Jetstream would be a compelling V3 feature addition (add a map view page) rather than a full redesign.

### The Hybrid Approach

Take Clearway's personality, warmth, and delight, but build it on Horizon's structural foundation:

- **Typography**: Use DM Sans (Clearway) for UI chrome, but keep Inter for data-dense sections where geometric precision matters. The font switch signals "here is the data" vs "here is the interface."
- **Color palette**: Use Clearway's warm cream/stone palette with Horizon's systematic approach to surface elevation levels.
- **Progressive disclosure**: Use Horizon's explicit 3-layer model (Layer 1: Glanceable, Layer 2: Detailed, Layer 3: Raw) but wrap it in Clearway's personality-driven summaries and illustrated status cards.
- **Animations**: Implement Clearway's celebration/shake micro-interactions. Skip the ambient weather particles (high effort, low value). The mascot can be a Phase 2 addition -- start with the color palette, typography, and card structure.
- **Trip health cards**: Use Clearway's 3-card model (Departure / Enroute / Arrival) -- this is the single best UX idea across all three proposals.
- **Map view**: Keep the existing map view page but progressively enhance it with Jetstream ideas (flight category pins, route visualization) as a separate effort.

### What Makes This Choice Defensible

No other aviation weather tool looks like Clearway. ForeFlight is utilitarian. Garmin Pilot is dense. The AWC is government-grade functional. Windy.com is a visualization toy. By going warm, illustrated, and personality-driven while maintaining real data depth, WeatherAggregator carves out a unique position: **the weather app that is actually pleasant to use, without sacrificing anything professionals need.**

---

## Implementation Notes

### Phase 1: Foundation (Est. 2-3 weeks)

**Tailwind Configuration Overhaul:**
- Add custom color palette to `tailwind.config.js` (replace current generic grays/blues with the warm stone palette)
- Configure DM Sans as primary font (Google Fonts, add `@fontsource/dm-sans`)
- Configure JetBrains Mono for monospace (`@fontsource/jetbrains-mono`)
- Add IBM Plex Mono as fallback (`@fontsource/ibm-plex-mono`)
- Update border radius defaults (12px cards, 8px inputs, 9999px badges)
- Add new shadow scale matching the Clearway spec
- Keep existing flight category color tokens (VFR, MVFR, IFR, LIFR) -- they are already well-defined

**New Dependencies:**
- `framer-motion` (v11+) -- animation primitives for card transitions, expand/collapse, page transitions, celebration effects
- `@fontsource/dm-sans` and `@fontsource/jetbrains-mono` -- self-hosted fonts
- Consider `lottie-react` or `rive-react` later for mascot animations (Phase 2)

**Component Library Refactor:**
- Create a shared `Card` component with consistent padding, shadows, border radius (currently every component defines its own card styles)
- Create a `Badge` component (currently `FlightCategoryBadge` is the only one; generalize it)
- Create an `ExpandableSection` component for progressive disclosure (replace ad-hoc `<details>` usage)
- Create a `DataValue` component for the large-number displays (temperature, wind speed, etc.) with optional trend indicators

### Phase 2: Page Redesigns (Est. 3-4 weeks)

**Homepage:**
- Replace static text hero with personality-driven search section
- Upgrade favorite cards from simple ICAO code lists to rich cards with live weather preview (requires a lightweight weather fetch on homepage load or cache-first strategy)
- Add friendly language layer to flight category display
- Add "Did You Know?" educational tips section

**Airport Weather Page:**
- Restructure into explicit 3-layer progressive disclosure
- Layer 1: Redesigned conditions card + Part 135 status as a single "hero" summary
- Layer 2: Source comparison, forecast timeline, winds aloft (collapsible sections)
- Layer 3: Raw METAR/TAF, raw source data (expand-on-demand)
- Add personality text to GO/NO-GO status
- Animate number transitions on data refresh

**Trip Planner Page:**
- Add Trip Health Cards (Departure / Enroute / Arrival) as the primary summary
- Redesign leg builder with connected visual (dotted line between legs showing ground time)
- Collapse/expand leg details with proper animation
- Add personality text to leg summaries

### Phase 3: Illustrations & Delight (Est. 2-3 weeks)

**Illustration Assets Needed:**
- 5 Cumulus mascot mood states (happy, cautious, worried, hiding, celebrating) -- SVG or Lottie
- 4 weather condition scene vignettes (sunny runway, cloudy approach, foggy field, stormy sky) -- SVG, 200x150px
- Empty state illustrations (no favorites, no trips, no weather data) -- SVG
- Weather condition icons (custom set of ~15 icons replacing current inline SVGs)

**Micro-interactions:**
- Card hover float effect (CSS transform + shadow, no JS needed)
- GO celebration confetti (Framer Motion `AnimatePresence` + physics-based particles, ~50 lines of code)
- NO-GO shake animation (CSS keyframes, trivial)
- Number counting transitions (Framer Motion `useSpring` or `motion.span` with `animate`)
- Page section stagger-in on load (Framer Motion `staggerChildren`)

### Files Most Affected

| Current File | Changes |
|-------------|---------|
| `frontend/tailwind.config.js` | Complete rewrite of color palette, font config, shadow scale, border radius |
| `frontend/src/index.css` | Add font imports, global styles, base layer overrides |
| `frontend/src/App.tsx` | New header design, nav styling, overall layout shell |
| `frontend/src/pages/Home.tsx` | Full redesign: mascot, rich favorite cards, personality copy |
| `frontend/src/pages/AirportWeather.tsx` | Restructure into 3-layer disclosure; new section ordering |
| `frontend/src/pages/TripPlanner.tsx` | Add health cards, redesign leg builder visual, personality text |
| `frontend/src/components/CurrentConditions.tsx` | New layout, personality-driven status text, animated values |
| `frontend/src/components/Part135Summary.tsx` | Merge with conditions into hero summary; add progress arcs |
| `frontend/src/components/FlightCategoryBadge.tsx` | Add friendly label prop, new sizing, rounded pill style |
| `frontend/src/utils/colors.ts` | Add friendly labels, illustration references, new palette tokens |
| `frontend/src/components/trip/TripSummaryPanel.tsx` | Redesign as Trip Health Cards (3-card layout) |
| `frontend/src/components/trip/TripTimeline.tsx` | Visual refresh, new color scheme, better mobile layout |
| `frontend/src/components/trip/TripLegCard.tsx` | 3-layer progressive disclosure per leg |

### New Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/ui/Card.tsx` | Shared card component with variants |
| `frontend/src/components/ui/Badge.tsx` | Generalized badge/pill component |
| `frontend/src/components/ui/ExpandableSection.tsx` | Animated expand/collapse for progressive disclosure |
| `frontend/src/components/ui/DataValue.tsx` | Animated large data display with trends |
| `frontend/src/components/ui/Celebration.tsx` | Confetti/celebration animation component |
| `frontend/src/components/illustrations/Cumulus.tsx` | Mascot component with mood prop |
| `frontend/src/components/illustrations/WeatherScene.tsx` | Weather condition vignette component |
| `frontend/src/components/TripHealthCards.tsx` | Departure / Enroute / Arrival tri-panel |
| `frontend/src/utils/personality.ts` | Friendly text mappings (flight category -> human-readable) |

### Performance Considerations

- Framer Motion is ~32KB gzipped. This is acceptable for the animation quality it provides. Use tree-shaking (`import { motion } from 'framer-motion'` not `import * as`).
- DM Sans + JetBrains Mono together add ~60KB (variable font). Self-host with `@fontsource` for reliable loading. Use `font-display: swap` to prevent FOIT.
- Illustrations should be SVG (inline or component-based), not PNGs. Lottie files should be lazy-loaded and only used for animated mascot states.
- Weather preview on homepage favorites: use existing Redis cache to make this cheap. Frontend can fire parallel requests for all favorites. Consider a batch endpoint: `GET /api/weather/batch?icao=KJFK,KLAX,KORD` to reduce round trips.
- Reduce motion: respect `prefers-reduced-motion` at the Framer Motion level (`reducedMotion="user"` global setting). This disables celebration, ambient, and bounce animations automatically.
