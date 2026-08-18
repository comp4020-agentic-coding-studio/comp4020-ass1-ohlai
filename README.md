# Lights Out

**[comp4020-agentic-coding-studio.github.io/comp4020-ass1-ohlai](https://comp4020-agentic-coding-studio.github.io/comp4020-ass1-ohlai/)**

An interactive explainer about reaction time at a Formula 1 race start.

Hold the space bar. Five red lights come on one by one, and after a randomised
hold they all go out at once. Let go. The page measures the gap between
lights-out and your release, and places it against what F1 drivers are reported
to manage at the same moment.

The argument it makes: the start is the one moment in the sport where an
ordinary person lands in the same order of magnitude as a professional — which
tells you the skill in F1 lives everywhere *except* the reflex everyone thinks
it's about. The test is the input device; the comparison is the explainer.

## Why the timing is the whole thing

An artefact that claims to measure your reaction time and gets it wrong is
worse than no artefact. The measurement is built to be defensible:

- The clock is `performance.now()`, never `Date.now()`.
- It starts inside a `requestAnimationFrame` callback that confirms the
  lights-out frame has actually **painted** — not in the `setTimeout` that
  scheduled the change, which would count the browser's own latency as yours.
- The release time comes from the event's own `timeStamp`, not from a clock
  read inside the handler, which can be queued behind other work.
- The hold before lights-out is uniformly random between 0.2 and 3.0 seconds on
  every attempt, so the sequence can't be learned and timed blind.
- Times are reported in whole milliseconds. Precision beyond that isn't real.

Two consequences fall out of taking that seriously:

**Jump starts are shown as jump starts, never as fast times.** Releasing before
lights-out is recorded separately and never counts toward a personal best —
because that's what happens on a real grid, and because a 40 ms "reaction" is a
guess that paid off, not a reaction.

**An attempt interrupted by the tab being hidden is abandoned, not scored.** A
hidden tab doesn't paint, so `requestAnimationFrame` never fires and the
lights-out moment never exists. Every release would then classify as a jump
start, which would blame you for the browser. The page says nothing was
measured instead of reporting a time it didn't take.

The measurement logic lives in `src/timing.ts` as pure functions with no DOM or
clock access, so the spec drives it with known values instead of sleeping and
hoping.

## The data, and what isn't in it

The design called for placing your time on a distribution of real driver
reactions. That data does not exist in citable form — F1's per-start telemetry
isn't published, and the figures in circulation trace back to reaction-test
sites that cite nothing and contradict each other.

So the page doesn't show one. It shows two **reported bands** with their
caveats visible, and says plainly that the only measured number on it is yours.
Every figure has provenance recorded in [`data/sources.md`](data/sources.md) —
what it is, where it came from, when it was retrieved, and that it's secondary.
That file also documents what could not be sourced and why.

A spec test fails the build if any shipped figure lacks a matching `sourceId`,
so this can't quietly rot.

## Running it

```sh
mise install    # the Node and pnpm versions this was built against
pnpm install
pnpm dev        # local dev server
pnpm check      # typecheck, build, lint, and the spec — run before pushing
pnpm build      # produce dist/, which is what deploys
```

`mise` is the recommended runtime manager; any other is fine if you match the
versions in `mise.toml`.

## What's here

- `index.html`, `styles.css`, `main.ts` — the site. The track, gantry, sign and
  cars are composited from artwork in `public/`, with every position derived
  from measured pixel coordinates in the source images rather than eyeballed,
  so the whole scene scales together at any viewport.
- `src/timing.ts` — the measurement, as pure functions.
- `data/` — the reaction figures as JSON, and `sources.md` for their provenance.
- `spec/` — the invariants that ship with the course template, plus the tests
  for this build's timing, jump-start and sourcing rules.
- [`CLAUDE.md`](CLAUDE.md) — the rules this repo is built under, written before
  the code and binding on anyone working in it, human or agent.
- [`PROCESS.md`](PROCESS.md) — the process overview: the moments that mattered
  and what they cost, with citations.

## Constraints it's built under

Static and client-side throughout — no build server, no backend, no runtime
network requests, no frameworks and no runtime dependencies. TypeScript is
compiled away by Vite and ships nothing. Personal best is kept in
`localStorage` on a best-effort basis, and the page works correctly when
storage is unavailable. There's no leaderboard, because that would need a
server.

CI runs `pnpm check`, an evidence check on PROCESS.md's citations, an internal
link check, and a secret scan on every push to `main`, then builds and deploys
to GitHub Pages.
