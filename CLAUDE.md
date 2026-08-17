# CLAUDE.md

Project rules for this repository. Read this before writing or changing any
code.

## What this is

An interactive explainer about reaction time at a Formula 1 race start.

The visitor holds the spacebar to signal ready, five red lights illuminate one
by one, and after a randomised hold every light goes out at once. The visitor
releases the spacebar. The elapsed time between lights-out and release is their
reaction time, which is then placed on a distribution of real F1 driver start
reactions.

The point of view: the gap between an ordinary person and a professional driver
is far smaller at the start line than anywhere else in the sport, which tells
you where the actual skill lives.

The test is the input device. The distribution is the explainer. When there is a
tradeoff between polishing the lights and improving the comparison, improve the
comparison.

## Hard constraints

These are not negotiable. If a change would break one, stop and say so instead
of working around it.

- Static and client side throughout. No build server, no backend, no runtime
  network requests of any kind. Everything ships as files to GitHub Pages.
- No frameworks and no runtime dependencies. Plain HTML, CSS and JavaScript.
  (TypeScript compiled by the template's Vite build is fine — it erases to plain
  JS and ships no runtime.)
- Must work at both marking viewports, desktop and phone.
- The starter's invariant checks must pass before any commit.
- No number appears on the page without a cited source recorded in
  `data/sources.md`. This includes every driver reaction figure. If a figure
  cannot be sourced, it does not ship.

## Timing rules

Timing correctness is the core of this project. Get these wrong and the whole
artefact is a lie.

- Measure with `performance.now()`, never `Date.now()`.
- Start the clock from a `requestAnimationFrame` callback that confirms the
  lights-out frame has actually painted. Never start it from the `setTimeout`
  that scheduled the change.
- Take the release time from the event's own `timeStamp`, not from a clock read
  inside the handler. The handler can be queued behind other work.
- The hold before lights-out is randomised on every attempt, uniformly between
  0.2 and 3.0 seconds. A fixed or predictable delay is a bug, because it makes
  the whole thing learnable and the result meaningless.
- Report whole milliseconds. Precision beyond that is not real.
- A hidden tab does not paint, so `requestAnimationFrame` never fires and
  `setTimeout` is clamped to ~1s. An attempt interrupted by the page being
  hidden must be **abandoned**, never scored: with no lights-out moment every
  release would classify as a jump start, which blames the visitor for the
  browser's behaviour. Do not report a time that was not measured.

## Interaction rules

- Keyboard is the primary input. Space is held down to arm, released to react.
- `keydown` fires repeatedly while a key is held. Ignore any event where
  `event.repeat` is true.
- Call `preventDefault()` on space so the page does not scroll under the visitor
  mid-attempt.
- Touch and pointer input must have parity: press and hold, release to react.
  Same states, same timing path, same penalties. Do not add a separate
  tap-to-react shortcut.
- The visitor must be holding before the light sequence begins. Releasing at any
  point before lights-out is a jump start, not a fast time.
- Every state must be reachable and escapable with the keyboard alone.

## Jump starts

- Release before lights-out is a jump start. Show it as a jump start. Never show
  it as a time.
- Jump starts are recorded separately and never count toward a personal best.
- Do not silently discard them. The visitor anticipating and being caught is
  part of the explanation, and so is the fact that real drivers get penalised
  for exactly this.

## Data rules

- Driver reaction figures live in `data/` as JSON, with provenance for each
  figure in `data/sources.md`: what it is, where it came from, and the date it
  was retrieved.
- Do not invent, estimate, round for effect, or fill gaps in the data. If the
  published sources disagree with each other, show the disagreement rather than
  picking a favourite.
- Never copy figures from another reaction-test website. Those are unsourced and
  contradict each other.

## Storage

- Personal best only, in `localStorage`, best effort. The page must work
  correctly when storage is unavailable or disabled.
- There is no global leaderboard. It would require a server, and this build is
  static.

## Tests and checks

Run these before every commit. When something breaks, fix the check or add a new
one. Do not retry until it passes by chance.

- A simulated release at a known offset returns that offset within tolerance.
- A release before lights-out returns a jump start, never a time.
- The randomised hold varies across a run of attempts and stays inside 0.2 to
  3.0 seconds.
- Held-key repeat events do not register as a release.
- Every figure rendered on the page has a matching entry in `data/sources.md`.

Run `pnpm check` before you push. Never commit a red state. When a check fails,
read its output before you change anything.

### Facts about this stack that are easy to get wrong

- The invariants run against the **built** site in `dist/`, not the source, so
  `pnpm build` must run before them. `pnpm check` does this in order.
- The invariants require a `<nav>` landmark and **exactly one** `<h1>` on every
  built page. A single-page prototype still needs both.
- CI (`check` and `deploy`) is gated on the repo being public. While it is
  private, pushing runs nothing — local `pnpm check` is the only feedback loop.

## Checking how it looks

Do not render the site to an image and judge it yourself. No headless browser,
no screenshots, no contact sheets, no scripted page inspection to decide whether
something looks right.

It costs a lot of time and tokens, and it does not work. Reading a render back
and deciding it looks fine repeatedly produced the wrong change, because the
judgement was the unreliable part and a picture of the page does not fix that.

Instead:

- Make the change, run `pnpm check`, and say what you changed and where to look.
- Leave the dev server running and hand it over. The human looks at it and says
  what to fix.
- Do not claim a visual result you were told rather than saw. "The cars sit on
  the back row" is a claim about pixels; "the cars are positioned at the
  measured back-row coordinates" is a claim about the code, and only the second
  one is yours to make.

This applies to appearance and layout. Rendering is still fine when the answer
is a measurement rather than a judgement — reading pixel coordinates out of an
image in `public/` to place an element, for instance — because that produces a
number that can be checked, not an opinion.

## Working style

- One change per commit, with a message saying what changed and why.
- When a failure has a root cause, fix the cause and add a check for it. Do not
  patch the symptom and move on.
- When an approach is abandoned, say so in the commit message rather than
  quietly deleting it.
- If a requested change conflicts with anything in this file, stop and raise it
  before making the change.
