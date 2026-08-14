# Onboarding Ops Copilot

An AI operations copilot that transforms unstructured customer requests and notes into structured onboarding plans and readiness scores — identifying missing information, prioritizing next actions, and drafting the follow-up needed to move forward.

**[Live demo](#)** — works immediately, no API key or setup required; all scoring and analysis is rule-based, not AI-generated.

## Who it's for

Operations, lab, and customer-facing teams (onboarding, customer success, account management) who receive incoming requests as free-form notes or emails and need a consistent, fast way to triage them before work can be scheduled.

## Why it matters

At a lab, contract research organization, or any customer-facing operations team, requests often arrive in inconsistent, unstructured formats — a paragraph of email text standing in for what should be a complete intake form. Someone has to manually re-read each one, spot what's missing, and chase it down before work can even be scheduled. This prototype explores automating that first triage pass, so a person reviews a structured, scored summary instead of raw notes, and the follow-up email is already drafted.

## What it does

- Extracts the request type, deadline, and missing information from unstructured customer text
- Scores intake readiness and flags a risk level (on track, needs attention, high risk)
- Generates a prioritized action list for the operations team
- Drafts a ready-to-send follow-up email requesting any missing information

## Product decisions that mattered more than the model

1. **Score, don't just flag** — a single readiness score (with visible deductions) is faster to act on than a list of disconnected warnings
2. **Draft the email, don't just identify the gap** — closing the loop from "here's what's missing" to "here's what to send" is what actually saves time
3. **Human sends, tool drafts** — the generated email is a starting point for review, not an auto-send

## Built with

- React + Vite
- Tailwind CSS

## Status

This is a prototype built to explore a problem space — not a finished product. Built by [Jane Natividad](https://github.com/jane-natividad).
