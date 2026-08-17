# Assignment 1 — reflection

## What was the breakthrough that moved the work forward?

Writing the rules down before writing the code, and then letting them cost me
something.

I committed `CLAUDE.md` as the first commit in the repo, before any prototype
existed. One of the rules I put in it was that no number ships without recorded
provenance. Later that rule blocked the best-looking feature in the design — a
distribution of named F1 drivers' reaction times — because that data doesn't
exist in any citable form; the figures everywhere online come from
reaction-testing sites that cite nothing and disagree with each other.

The breakthrough was realising I could keep the rule and get a better artefact
for it. Instead of a fabricated bell curve, the page shows reported bands with
their uncertainty visible, and says plainly that the only measured number on it
is yours. `data/sources.md` documents what couldn't be sourced and why. The
constraint didn't shrink the piece; it gave it its point of view.

## What did this work change about who I want to be as a software developer?

That a rule only counts once it's expensive. It's easy to write "cite your
sources" when nothing is at stake and quietly drop it when it costs the good
visual. The difference between a principle and a decoration is whether you keep
it on the day it takes something away from you.

The other thing was a false alarm that taught me more than the real bug. A
reading looked wrong, and my instinct was to change the code. I measured my own
test setup first and found the test was wrong, not the app — but the same check
surfaced a genuine defect underneath. I want to be the kind of developer who
checks the instrument before rewriting what it's pointed at.
