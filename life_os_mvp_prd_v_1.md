# LifeOS — MVP Product Requirements Document (PRD)

Version: 1.0 (Lean Validation Build)
Status: Draft for 6-Week MVP Execution
Owner: Founder

---

# 1. Executive Summary

LifeOS is a structured family reflection and pattern intelligence system designed for parents of young children (0–8).

The MVP validates a single core hypothesis:

> Structured reflection + deterministic pattern detection produces meaningful clarity that parents would not otherwise see.

LifeOS does not provide advice, diagnosis, or therapy. It surfaces educational context and invites reflection.

---

# 2. Product Vision

LifeOS is a calm cognitive layer for modern families.

It helps parents:
- Notice recurring developmental patterns
- Understand dynamics over time
- Reframe difficult moments with educational context
- Reduce reactive interpretation

---

# 3. Target User

Primary User:
Parents of children ages 0–8 who:
- Are reflective
- Experience cognitive overload
- Want clarity, not coaching
- Log primarily at end-of-day or next-day reflective windows

---

# 4. Core Value Proposition

"See what’s been happening so you can respond with more context and less reactivity."

---

# 5. MVP Scope (6-Week Build)

## In Scope

1. Structured logging
2. Controlled taxonomy classification
3. Deterministic pattern detection
4. Educational reframe surfacing
5. Cross-note pattern referencing
6. Weekly pattern digest

## Out of Scope

- Advice engine
- Parenting techniques
- Task management
- Calendar or logistics
- Social features
- Gamification
- Cross-family analytics
- Multi-role accounts
- Therapy or diagnosis functionality

---

# 6. System Architecture Overview

The MVP consists of five modules:

1. Structured Reflection Capture
2. Developmental Classification Engine
3. Deterministic Pattern Engine
4. Educational Reframe Engine
5. Weekly Digest Generator

All logic is domain-driven and deterministic.

No vector database required.

---

# 7. Module Specifications

## 7.1 Structured Reflection Capture

### Purpose
Enable low-friction logging during reflective windows.

### Required Fields
- child_id
- raw_text
- intensity (1–5, required)
- time_window (Morning / Midday / Evening / Bedtime; auto-suggested)
- transition_flag (Yes / No, optional)
- created_at timestamp

### Constraints
- Logging time ≤ 120 seconds
- Must support summary-style entries
- Must support batch logging in a single session

### Output
Structured Event Object stored in database

---

## 7.2 Developmental Classification Engine

### Purpose
Map raw text to controlled taxonomy.

### Domain Set (MVP)
- Emotional Regulation
- Autonomy & Agency
- Routine & Rhythm
- Attachment & Security
- Social Formation
- Cooperation & Alignment
- Identity & Expression
- Family System Dynamics

### Classification Method
- Rule-based keyword mapping
- Deterministic logic
- Confidence score stored

No open-ended tagging.

---

## 7.3 Deterministic Pattern Engine

### Purpose
Detect recurring patterns across time.

### Pattern Types (MVP)

1. Recurrence Detection
   - Trigger: Domain appears ≥3 times in 14 days

2. Intensity Cluster
   - Trigger: Intensity ≥4 occurs ≥3 times in 10 days

3. Context Cluster
   - Trigger: ≥60% of domain logs share same time_window

4. Momentum Shift
   - Trigger: ≥30% increase week-over-week with minimum count threshold

### Pattern Output Structure
- child_id
- pattern_type
- domain_id
- confidence_score
- time_window
- detected_at

Only surface pattern when confidence ≥ threshold.

---

## 7.4 Educational Reframe Engine

### Purpose
Translate detected patterns into educational + reflective insights.

### Structure of Each Insight
- Domain framing statement
- Developmental lens explanation
- Single reflective question

### Tone Constraints
- Observational
- Educational
- Non-prescriptive
- Non-diagnostic
- Calm

Reframes are human-authored templates mapped to rule triggers.

---

## 7.5 Weekly Pattern Digest

### Purpose
Aggregate signal across a 7-day window.

### Structure
1. Most frequent domain
2. Any detected pattern shifts
3. Educational lens
4. One reflection prompt

Maximum 3 surfaced signals.

If no strong signal → show minimal summary.

---

# 8. Data Model

## Tables
- Users
- Children
- Events
- Domains
- Subdomains
- PatternSignals
- WeeklyReports
- ReframeTemplates

## Event Object Schema
- id
- child_id
- raw_text
- domain_id
- subdomain_id
- intensity
- time_window
- transition_flag
- created_at

---

# 9. Insight Surfacing Logic

Upon saving a log:

1. Classify domain
2. Surface immediate educational reframe
3. Check for pattern triggers
4. If confidence threshold met → show cross-note reference
5. If no pattern detected → do not fabricate insight

Silence is preferred over weak signal.

---

# 10. Success Metrics

Primary Metrics:
- ≥4 logs per week (median user)
- ≥70% weekly digest open rate
- ≥40% 60-day retention

Qualitative Validation:
- "I didn’t realize this was recurring"
- "This reframed things"
- "This helped me see what’s been happening"

Failure Signal:
- "This is just journaling"
- "Interesting but not necessary"

---

# 11. Trust & Safety Guardrails

- No labeling children negatively
- No therapy positioning
- No diagnosis
- No prescriptive parenting tactics
- Data private by default
- Sparse insight > noisy insight

---

# 12. 6-Week Build Plan

Week 1:
- Finalize taxonomy (≤25 subdomains)
- Write 25 reframe templates
- Define pattern thresholds

Week 2:
- Build logging UI
- Save events to database

Week 3:
- Implement rule-based classification
- Implement recurrence detection

Week 4:
- Implement intensity + context clustering
- Build insight surfacing logic

Week 5:
- Build weekly digest page
- Recruit 5–10 test parents

Week 6:
- Collect feedback
- Adjust thresholds
- Refine taxonomy

---

# 13. Definition of MVP Success

The MVP succeeds if users report:

"This helped me understand what’s been happening over time."

The MVP fails if the product feels:

- Redundant
- Obvious
- Like journaling with labels

---

End of Document

