# Sources

Provenance for every figure rendered on the page. `sourceId` values here match
`sourceId` in `reactions.json`; a spec test fails the build if any shipped
figure lacks an entry.

All entries retrieved **2026-08-17**.

## What could not be sourced, and why it is not on the page

Per-driver race-start reaction times (the "Verstappen did 140ms at Spa" kind of
figure) are **not shipped**. F1's start analysis is derived from the spec ECU
and FOM timing, and those per-start figures are not published as a dataset. The
numbers circulating online come almost entirely from reaction-test websites
that cite no primary source and contradict each other, which `CLAUDE.md`
explicitly rules out.

The honest consequence: this explainer compares you to a **reported range**, not
to a measured distribution of named drivers, and the page says so where the
comparison appears. Showing a smooth bell curve of driver names here would be
inventing data.

If a primary source is obtained later — an FIA timing appendix, a published
telemetry study — add it below, add the figures to `reactions.json`, and the
comparison can become a real distribution.

## `f1-start-reaction-reported-range`

- **What it is:** the commonly reported range for an F1 driver's reaction
  between the lights going out and throttle application at a race start,
  150–250 ms, clustering near 200 ms.
- **Where it came from:** secondary aggregation across motorsport commentary
  and reaction-testing sites. No primary FIA/FOM telemetry release underpins
  it. Treated here as *reported*, not *measured*.
- **Retrieved:** 2026-08-17
- **Confidence:** low on precision, moderate on order of magnitude. Rendered as
  a band with its caveat visible, never as a point estimate.

## `human-simple-visual-reaction`

- **What it is:** typical adult reaction to a simple visual stimulus,
  approximately 250–300 ms.
- **Where it came from:** widely reported figure for simple visual reaction
  tasks in psychology teaching material. Not a race-start measurement, and the
  task differs (no anticipatory hold, no motor pre-loading).
- **Retrieved:** 2026-08-17
- **Confidence:** moderate as an order of magnitude for a *different task*;
  the page states that difference rather than implying a like-for-like race.

## Your own time

First-party. Measured in this page with `performance.now()` and the release
event's own `timeStamp`, reported to whole milliseconds. This is the only figure
on the page that is actually measured rather than cited.
