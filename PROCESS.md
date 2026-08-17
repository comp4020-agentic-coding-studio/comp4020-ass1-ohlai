# Process overview

## What I built

**Lights Out** is an interactive explainer about reaction time at a Formula 1
race start. You hold the space bar, five red lights come on one by one, and
after a randomised hold they all go out at once. You release. The page measures
the gap and places it against what F1 drivers are reported to manage. The idea
it argues: the start is the one moment in the sport where an ordinary person is
in the same order of magnitude as a professional, and that tells you the skill
in F1 lives everywhere *except* the reflex everyone thinks it's about.

## The moments that mattered

### 1. Writing the harness before writing any code

The whole build ran under a deadline, which is exactly when it's tempting to
start typing at the prototype and sort the rules out later. I did the opposite
and committed `CLAUDE.md` on its own as the first commit of the repo
([`1691ec8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ohlai/commit/1691ec8)),
before a line of the prototype existed. It fixed the timing rules
(`performance.now()`, never `Date.now()`; start the clock in a painted frame,
not in the `setTimeout` that scheduled it; take the release from the event's own
`timeStamp`), the jump-start policy, and the data-sourcing constraint.

How I knew it was worth it: those rules then did real work rather than
decorating the repo. The timing rules are why the measurement logic ended up in
`src/timing.ts` as pure functions with no DOM or clock access — the spec tests
drive it with known values instead of sleeping and hoping. And the sourcing rule
is what stopped me shipping invented data (moment 2).

### 2. The data I refused to ship

The design called for placing your time on a distribution of real driver
reactions. I went looking for that data and it does not exist in any citable
form: F1's per-start telemetry isn't published, and essentially every figure in
circulation traces back to reaction-test websites that cite nothing and
contradict each other.

The obvious move was to ship a plausible-looking bell curve with driver names on
it. Nobody marking this would have caught it. I didn't, because `CLAUDE.md`
already said no figure ships without provenance in `data/sources.md`, and I'd
written that rule before I knew it would cost me the nicest visual in the
project.

What I did instead: the comparison renders **reported bands with their caveats
visible**, `data/sources.md` records what each figure is, where it came from and
that its provenance is secondary, and it documents *what could not be sourced
and why* — a section about absent data, which is unusual to ship and is the most
honest thing in the repo. The page says out loud that only one number on it is
actually measured: yours. A spec test fails the build if any shipped figure
lacks a matching `sourceId` in `sources.md`
([`4629d97`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ohlai/commit/4629d97)).

The constraint made the piece better. "Here is a number and here is exactly how
much you should trust it" is a stronger point of view than a fake distribution.

### 3. A bug that wasn't, and the real one hiding behind it

I drove the finished page from a script to check the interaction end to end. A
release ~180 ms after lights-out reported **1000 ms**. My first instinct was
that the timing path was broken.

Instead of changing the timing code I measured the harness first, and found
`document.visibilityState === "hidden"`: the tab was backgrounded, so
`setTimeout` was clamped to ~1 s and my "180 ms" sleep had actually taken 1009
ms. The app was right and my test was wrong. Changing the timing code would have
broken working software to satisfy a bad measurement.

But the same check exposed a real defect. A hidden tab never paints, so
`requestAnimationFrame` never fires, `lightsOutAt` stays `null`, and
`classifyRelease` returns a jump start for *every* release. Correct by the
function, wrong for the person — they didn't jump, they looked away. The page
would have blamed the visitor for the browser.

The fix abandons the attempt instead of scoring it, and the rule went into
`CLAUDE.md` rather than only into the patch, so it constrains everything written
after it
([`2398a0a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ohlai/commit/2398a0a)).
A spec test asserts the behaviour so it can't quietly regress. Full range:
[`1691ec8...2398a0a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ohlai/compare/1691ec8...2398a0a).

### 4. Taking the visual judgement away from the model

The last third of the build was layout work — cars sitting on the grid, a sign
that reads as signage, text clearing the artwork behind it. Claude's instinct
throughout was to check its own work by rendering: drive a headless browser,
screenshot the page, look at the image, decide it was fine.

It was not fine, and the loop was expensive:

> Claude kept trying to look at the website and render it out as an image
> itself, which kept costing tokens and time, and when it sometimes actually
> worked it didn't even make the correct changes — so I told it to always let me
> inspect it visually, then I'll tell it what to change.

The failure is worth naming precisely, because "it couldn't see properly" is the
wrong diagnosis. It could produce the picture. What it could not do reliably was
*judge* the picture — decide whether the spacing read as deliberate, whether text
was legible over a busy background, whether the thing looked right. Adding a
screenshot to that loop doesn't repair the judgement; it just makes a bad
judgement cost four tool calls and a couple of minutes each time, and dresses it
up as verified.

So the harness changed rather than the technique
([`b6f683b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ohlai/commit/b6f683b)):
make the change, run `pnpm check`, say where to look, hand it over. I look. I say
what's wrong. That splits the work along the line where each side is actually
reliable — the model is good at deriving geometry and holding the timing rules
straight, I'm good at looking at a page and knowing it's wrong.

The rule draws one distinction rather than banning rendering outright. Reading
pixel coordinates out of the track artwork to place an element is still fine,
because it produces a number that can be checked — the six grid rows in this
build were measured that way, and the front-row figures the scan produced matched
the ones already in the stylesheet, which is what made the rest trustworthy.
Deciding a layout looks good is not that. One is a measurement, the other is an
opinion, and only the first one survives being made by something that can't see.

It also caught a habit worth flagging in its own right: the model was reporting
visual outcomes as verified when what it had really done was look at its own
render and agree with itself. The rule now says a claim about pixels isn't its
claim to make.

## What I'd fix with more time

The commit history is honest but compressed — this was built in one sitting
against the deadline, and it reads that way. The comparison deserves real
sourced data if a primary source can ever be obtained; `sources.md` says exactly
what would need to arrive for the bands to become a genuine distribution.
