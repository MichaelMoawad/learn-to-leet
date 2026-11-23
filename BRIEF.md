# Learn to Leet: project brief

Handoff from the scoping conversation (2026-11-23). Everything decided so far is here, so the spec session does not need that conversation.

## What we're building

An interactive site for learning LeetCode-style problems, in the format of https://designed-to-scale.vercel.app (a system design course). Credit it as the inspiration in the README and on the site.

What to borrow from it:
- Lessons grouped into modules. Each lesson is a short series of steps, around 5 to 10, with prev/next and a progress bar, and ends with a recap.
- A visual next to the text that changes at every step. Their isometric 3D style is fine to borrow, since it's a common style and not one person's signature.
- Metadata per lesson: duration, difficulty, step count, and a "you'll learn" list.

What we add: **a code sandbox** in every lesson, with an editor, a Run button and test cases, showing pass or fail for each test.

## Fixed decisions

- **Languages: Python and JS/TS only, all running in the browser, no backend.** Python runs through Pyodide. JS/TS runs in a Web Worker, and the TS transpiler is chosen in the spec. Code runs in workers so the page can't freeze.
- **Data-driven lessons.** One reusable visual engine (array + pointers, hash map, stack/queue, linked list, tree, graph, grid/matrix). A lesson is a data file of steps plus visual state, not bespoke code. This is the main cost control: a new lesson should be content work only.
- **Original problem statements.** Write every problem in our own words. Never copy LeetCode's text. Referencing the LeetCode problem number or name is fine.
- **Public launch.** Vercel, a public GitHub repo, a polished README with a demo GIF. Michael will post it on LinkedIn.
- **No em dashes** in any user-facing copy.

## Design direction

Michael's old portfolio is the vibe: see `reference/old-portfolio.webp`.
- Dark navy background, neon cyan as the main accent (a pink or magenta second accent is fine), faint grid lines, glow on headings, monospace pixel-style labels. It should feel like a code environment.
- **Pixel art** throughout, including a pixel mascot called **"Leet"** that appears in lessons (intro, hints, celebrating a passed test).
- **3D pushable buttons**, using the mechanics from https://www.joshwcomeau.com/animation/3d-button/: separate shadow, edge and front layers. The front lifts on hover and presses down on click, with springy easing that bounces back. It doesn't need to look like his, only work the same way. Reimplement it rather than copying it.
- Works on phones, and has a reduced-motion mode.

## Name

**Learn to Leet.** Decided, not up for suggestions. Use "Learn to Leet" in UI copy and `learn-to-leet` for the repo and package slug. The domain is chosen at launch (phase 5), for example learntoleet.com or .dev, depending on what's free. Don't use "Leetify" anywhere: it's an existing Counter-Strike 2 stats platform.

## Phases

Each phase runs as its **own fresh session**, started from this folder and `SPEC.md`, never from an earlier conversation.

| # | Phase | Session model | Done when |
|---|---|---|---|
| 1 | Spec | Fable | `SPEC.md` written (contents below) |
| 2 | Site shell + sandbox | Opus | Site layout, stepper, routing and themes work; Python + JS/TS run against tests in the browser. Two agents work in parallel |
| 3 | Visual engine | Opus, then a short Fable review | All structures render and animate; the example lesson works end to end |
| 4 | Lessons | Opus, with Sonnet agents in batches of 3 to 5 | 10 to 15 lessons, each with passing reference solutions in both languages |
| 5 | Polish + launch | Opus | Deployed, README, demo GIF and screenshots, phone and reduced-motion check |

## Token budget rules

- Target: the whole build in **about a third of one Ultra week**. Usage was 4% when scoping started.
- Fable is used only for phase 1 and the review at the end of phase 3. Every agent runs on Opus or Sonnet.
- Agents report back short summaries, never file dumps.
- At the end of each phase, add a line to `USAGE.md` with the phase, the model and the weekly usage % before and after. That gives Michael real numbers for the LinkedIn post.
- Michael doesn't want to do any manual work. Ask him only for real decisions, and batch the questions.

## Phase 1 deliverable: `SPEC.md`

Keep it short enough that an engineer agent can build from it without questions:
1. Stack and folder structure (with short reasons).
2. Lesson data schema (TypeScript types) and one **complete example lesson** (Two Sum) written in it: steps, visual states, problem statement, starter code and reference solutions in Python and TS, and test cases.
3. Visual engine API: the structures, what one step's state looks like, how transitions animate.
4. Sandbox design: workers, how Pyodide loads, the test harness format, timeouts.
5. Design tokens (colours, type, spacing), the 3D button spec, and the Leet mascot brief (sprite size, palette, 3 to 4 poses).
6. Module and lesson list for the MVP (10 to 15 problems that cover the core patterns).
7. The phase 2 to 5 task breakdown, split into agent-sized briefs with done criteria.
8. Open questions for Michael, if any, as a short list at the end.
