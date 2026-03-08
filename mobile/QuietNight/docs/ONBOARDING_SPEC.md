# QuietNight: Complete Onboarding Spec Sheet

## Overview

This document defines every screen and question in the QuietNight onboarding flow. It is modeled on the Cal AI onboarding architecture ($2M/month revenue, 25+ steps) but adapted for a **couples-focused snoring experiment app**.

### Why a Long Onboarding Works

- Cal AI runs 25+ screens before the paywall and generates $2M/month from 500K–800K downloads
- Noom runs 81+ screens — only motivated users reach the paywall
- Animations between onboarding screens increased Cal AI's conversion by 10%
- 80% of subscription revenue comes from the FIRST paywall shown after onboarding

### Core Principles

1. **Sunk Cost:** 20+ steps = user is emotionally invested before seeing the paywall
2. **Deep Personalization:** Every question makes the user feel the app was built for their relationship
3. **Validation & Affirmation:** Reassuring screens reduce doubt and build confidence
4. **Benefits Over Features:** Frame around relationship outcomes, not technical specs
5. **Market Research:** Collect free intelligence even from users who don't convert
6. **Honesty:** Managing expectations reduces refund requests

---

## THE ONBOARDING FLOW (26 Steps)

Four psychological phases:

- **Phase A (Steps 1–6):** The Hook — Validate, affirm, demonstrate
- **Phase B (Steps 7–15):** Deep Personalization — Make it THEIR plan
- **Phase C (Steps 16–20):** The Science — Build credibility and trust
- **Phase D (Steps 21–26):** Setup & Paywall — Configure the app and convert

---

## PHASE A: THE HOOK (Steps 1–6)

### Step 1: The Welcome Screen

- **Type:** Static hero screen
- **Visual:** Couple sleeping peacefully, moon/stars motif, dark navy (#0f172a)
- **Headline:** "Welcome to QuietNight"
- **Subtext:** "The app that helps couples sleep better — together."
- **CTA:** "Let's Get Started"

### Step 2: The Core Feature Demo

- **Type:** Animated feature showcase
- **Visual:** Phone on nightstand → sound waves analyzed → morning summary "Snoring reduced by 45%"
- **Headline:** "Just place your phone by the bed."
- **Subtext:** "QuietNight listens, detects snoring, and tells you what actually works."
- **CTA:** "Next"

### Step 3: The Two-Player Hook

- **Type:** Animated feature showcase
- **Visual:** Two phones side by side (Sleeper night summary + Partner morning check-in)
- **Headline:** "Built for two."
- **Subtext:** "Your partner rates their sleep each morning. QuietNight combines both perspectives."
- **CTA:** "Next"

### Step 4: Social Proof & Stats

- **Type:** Stats + testimonials
- **Headline:** "Join 10,000+ couples sleeping better."
- **Stats:** 78% improved sleep within 2 weeks, 4.8★ average rating
- **Testimonial:** "We were sleeping in separate rooms for 2 years. QuietNight helped us figure out mouth tape was the answer." — Sarah & James, London
- **CTA:** "Next"

### Step 5: How Did You Hear About Us?

- **Type:** Single-select
- **Headline:** "How did you find QuietNight?"
- **Options:** App Store Search, TikTok/Instagram, A friend, My doctor, YouTube, Other
- **CTA:** "Continue"

### Step 6: Have You Tried Other Apps?

- **Type:** Single-select
- **Headline:** "Have you tried other snoring apps before?"
- **Options:** Yes but they didn't help, Yes and they were okay, No this is my first one
- **CTA:** "Continue"

---

## PHASE B: DEEP PERSONALIZATION (Steps 7–15)

### Step 7: Who Are You?

- **Type:** Single-select (large illustrated cards)
- **Headline:** "Which best describes you?"
- **Options:** "I'm the snorer", "I'm the partner who can't sleep", "We're not sure who snores"
- **CTA:** "Continue"

### Step 8: Your Living Situation

- **Type:** Single-select (pill buttons)
- **Headline:** "Where do you and your partner currently sleep?"
- **Options:** Same bed same room, Same room separate beds, Separate rooms, I sleep alone (no partner)
- **CTA:** "Continue"

### Step 9: How Bad Is It?

- **Type:** Emoji scale 1–5
- **Headline:** "How much does snoring affect your relationship?"
- **Scale:** 1 mild → 5 breaking point
- **CTA:** "Continue"

### Step 10: How Long Has This Been Going On?

- **Type:** Single-select
- **Headline:** "How long has snoring been a problem?"
- **Options:** Less than 6 months, 6 months–1 year, 1–3 years, More than 3 years
- **CTA:** "Continue"

### Step 11: What Have You Tried?

- **Type:** Multi-select
- **Headline:** "Have you tried any of these before?"
- **Options:** Nasal strips, Mouth tape, Anti-snore pillow, Side sleeping, Cutting alcohol, Mandibular device, Surgery, Nothing yet
- **CTA:** "Continue"
- **Conditional:** If Step 7 = partner → show "What has your partner tried?"

### Step 12: Validation Screen (NO question)

- **Headline:** "You're in the right place."
- **Subtext:** "Most people try 3–4 remedies before finding what works. QuietNight removes the guesswork."
- **Stat:** 90% of couples who complete 3 experiments find a remedy
- **CTA:** "Let's build your plan"

### Step 13: Your Goal

- **Type:** Single-select (large cards)
- **Headline:** "What's your ultimate goal?"
- **Options:** Get back to same bed, Reduce snoring for partner, See a doctor, Just track
- **CTA:** "Continue"

### Step 14: Set Your Target

- **Type:** Slider 1–8 weeks (default 4)
- **Headline:** "In how many weeks would you like to find a solution?"
- **CTA:** "Continue"

### Step 15: Affirmation Screen (NO question)

- **Headline:** "You've got great potential."
- **Subtext:** Based on couples like you, snoring can be reduced within [X] weeks
- **Stat:** Couples who test with partner see 2x faster results
- **CTA:** "Continue"

---

## PHASE C: THE SCIENCE (Steps 16–20)

### Step 16: How Experiments Work

- **Type:** 3-panel swipe
- **Panels:** Pick remedy → QuietNight tracks → Partner rates
- **CTA:** "Makes sense"

### Step 17: The Honesty Screen

- **Headline:** "The first few nights are about learning you."
- **Subtext:** Baseline first, insights after Night 3
- **CTA:** "I'm committed"

### Step 18: Privacy & Trust

- **Headline:** "Your audio never leaves your phone."
- **Bullets:** On-device AI, no cloud upload, anonymous metadata only
- **CTA:** "Good to know"

### Step 19: Medical Disclaimer

- **Headline:** "QuietNight is a wellness tool, not a medical device."
- **Subtext:** GP report available if needed
- **CTA:** "Understood"

### Step 20: The Generating Screen

- **Type:** 15–20 second loading with rotating micro-copy
- **Phases:** Analyzing profile → Building plan → Personalizing milestones → Preparing partner invite → Your plan is ready
- **CTA:** (auto-advance)

---

## PHASE D: SETUP & PAYWALL (Steps 21–26)

### Step 21: Your Personalized Plan

- **Type:** Dashboard preview (blurred/mock Journey tab)
- **Headline:** "Here's your plan, [Name]."
- **CTA:** "Let's do this"

### Step 22: Notification Permissions

- **Headline:** "Stay on track with smart reminders."
- **CTA:** "Enable Notifications" / "Not now"

### Step 23: Health App Integration

- **Headline:** "Connect with Apple Health"
- **CTA:** "Connect Apple Health" / "Skip for now"

### Step 24: Invite Your Partner

- **Headline:** "Invite [Partner Name] to join your experiment."
- **CTA:** "Send Invite Link" / "I'll do this later"
- **Conditional:** Skip if Step 8 = "I sleep alone"

### Step 25: Rate Us

- **Headline:** "Enjoying QuietNight so far?"
- **CTA:** "Rate QuietNight ★★★★★" / "Maybe later"

### Step 26: The Paywall

- **Trial:** 7-day free trial
- **Pricing:** Annual £29.99 (Best Value), Monthly £6.99
- **Framing:** "£2.50/month — Less than a pack of nasal strips"
- **Goal at top:** "Your goal: Get back to the same bed in 4 weeks"
- **CTA:** "Start Your Free Trial"

---

## DATA COLLECTED

| Step | Data Point | Used For |
|------|-----------|----------|
| 5 | attribution_source | Marketing analytics |
| 6 | prior_app_usage | Competitive intelligence |
| 7 | role | App mode (SLEEPER/PARTNER) |
| 8 | sleeping_arrangement | Room context, goal framing |
| 9 | relationship_severity (1–5) | Urgency scoring |
| 10 | problem_duration | AI personalization |
| 11 | remedies_tried | Experiment recommendations |
| 13 | primary_goal | Milestone Path |
| 14 | target_weeks | Retention nudges |

---

## CONDITIONAL LOGIC

| Condition | Action |
|-----------|--------|
| Step 7 = partner | Skip Step 11; show "What has your partner tried?" |
| Step 8 = I sleep alone | Skip Step 24; adjust Step 3 copy for solo |
| Step 9 = 4 or 5 (severe) | Show extra compassionate screen after Step 9 |

---

## IMPLEMENTATION NOTES

- **Transitions:** Smooth fade/slide between screens; progress bar "Step X of 26"
- **A/B Tests:** Short vs long onboarding; 3-day vs 7-day trial; review prompt position; price points
