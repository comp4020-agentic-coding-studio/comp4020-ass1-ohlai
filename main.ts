import reactions from "./data/reactions.json";
import {
  classifyRelease,
  isArmingKeydown,
  isReleaseKeyup,
  nextBest,
  randomHoldMs,
  type Attempt,
} from "./src/timing";

const LIGHT_INTERVAL_MS = 1000;
const BEST_KEY = "lights-out:best";

type Phase = "idle" | "arming" | "lit" | "out" | "done";

const gantry = document.querySelector<HTMLElement>("#gantry")!;
const scene = document.querySelector<HTMLElement>(".scene")!;
const columns = [...document.querySelectorAll<HTMLElement>(".column")];
const pad = document.querySelector<HTMLButtonElement>("#pad")!;
const padLabel = document.querySelector<HTMLElement>("#pad-label")!;
const resultEl = document.querySelector<HTMLElement>("#result")!;
const bestEl = document.querySelector<HTMLElement>("#best")!;
const jumpsEl = document.querySelector<HTMLElement>("#jumps")!;
const chartEl = document.querySelector<HTMLElement>("#chart")!;
const verdictEl = document.querySelector<HTMLElement>("#verdict")!;

let phase: Phase = "idle";
let lightsOutAt: number | null = null;
let timers: number[] = [];
let best: number | null = readBest();
let jumps = 0;

// Every measured attempt this session, oldest first, drawn behind the live
// marker as a faded trail. One reading says almost nothing — reaction time
// varies far more within a person than the gap between a visitor and a driver
// does — so showing the spread is what makes the comparison honest.
//
// In memory only, deliberately. CLAUDE.md keeps localStorage to the personal
// best, and a trail that survived reloads would mix sessions into one cloud.
const attempts: number[] = [];

// --- storage: best effort, must work when unavailable (CLAUDE.md "Storage")

function readBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw === null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeBest(ms: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(ms));
  } catch {
    // storage disabled; the page still works, we just don't persist.
  }
}

// --- the sequence

function clearTimers(): void {
  for (const t of timers) window.clearTimeout(t);
  timers = [];
}

/** Illuminate the first `count` columns; setLit(0) is lights out — all black. */
function setLit(count: number): void {
  columns.forEach((el, i) => el.classList.toggle("on", i < count));
}

function arm(): void {
  if (phase !== "idle" && phase !== "done") return;
  phase = "arming";
  lightsOutAt = null;
  resultEl.textContent = "";
  resultEl.dataset.kind = "";
  padLabel.textContent = "Hold…";
  pad.dataset.phase = "arming";
  setLit(0);

  // Put the cars back on the grid for the new attempt. Done here, under the
  // first red light, rather than at the end of the last attempt: the previous
  // start should stay finished on screen while the visitor reads their time.
  scene.classList.remove("launched");

  for (let i = 1; i <= 5; i++) {
    timers.push(
      window.setTimeout(() => {
        setLit(i);
        if (i === 5) phase = "lit";
      }, i * LIGHT_INTERVAL_MS),
    );
  }

  const hold = randomHoldMs();
  timers.push(
    window.setTimeout(
      () => {
        setLit(0);
        gantry.classList.add("out");
        // The cars go on the same frame the lights do, because that is what
        // lights out means. Both cars are already on their own compositor
        // layer (`will-change` in the stylesheet), so starting the animation
        // adds no layout or paint work to this frame — the frame the clock
        // below is measured from.
        scene.classList.add("launched");
        // Only start the clock once the lights-out frame has actually
        // painted — never from the setTimeout that scheduled it.
        requestAnimationFrame(() => {
          lightsOutAt = performance.now();
          phase = "out";
          padLabel.textContent = "GO — release!";
          pad.dataset.phase = "out";
        });
      },
      5 * LIGHT_INTERVAL_MS + hold,
    ),
  );
}

function release(releaseAt: number): void {
  if (phase === "idle" || phase === "done") return;
  clearTimers();
  const attempt = classifyRelease(lightsOutAt, releaseAt);
  finish(attempt);
}

/**
 * A hidden tab doesn't paint, so requestAnimationFrame never fires and the
 * lights-out moment never exists. Every release would then be classified a
 * jump start, which would be a lie — the visitor didn't jump, they just
 * weren't looking. Abandon the attempt instead of scoring it.
 */
function abandon(): void {
  if (phase === "idle" || phase === "done") return;
  clearTimers();
  phase = "done";
  lightsOutAt = null;
  gantry.classList.remove("out");
  setLit(0);
  pad.dataset.phase = "done";
  padLabel.textContent = "Again";
  resultEl.dataset.kind = "";
  resultEl.textContent = "Attempt abandoned — the page lost focus.";
  verdictEl.textContent =
    "Nothing was measured, so nothing is recorded. A time taken while the page was hidden wouldn't be a time.";
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) abandon();
});

function finish(attempt: Attempt): void {
  phase = "done";
  gantry.classList.remove("out");
  setLit(0);
  pad.dataset.phase = "done";
  padLabel.textContent = "Again";

  if (attempt.kind === "jump-start") {
    jumps += 1;
    jumpsEl.textContent = String(jumps);
    resultEl.dataset.kind = "jump";
    resultEl.textContent = "Jump start. You went before the lights did.";
    verdictEl.textContent =
      "A jump start in a race is a penalty, not a fast lap. It doesn't count here either.";
  } else {
    resultEl.dataset.kind = "time";
    resultEl.textContent = `${attempt.ms} ms`;
    const updated = nextBest(best, attempt);
    if (updated !== best && updated !== null) {
      best = updated;
      writeBest(best);
    }
    bestEl.textContent = best === null ? "—" : `${best} ms`;
    renderMarker(attempt.ms);
    verdictEl.textContent = verdictFor(attempt.ms);
  }
}

function verdictFor(ms: number): string {
  const f1 = reactions.bands.find((b) => b.id === "f1-grid-reported")!;
  if (ms <= f1.highMs) {
    return `${ms} ms sits inside the range reported for an F1 grid at lights out. That is the point: on this one task, the gap is small enough to fall through.`;
  }
  const gap = ms - f1.highMs;
  return `${ms} ms — ${gap} ms outside the reported F1 range. Worth knowing how small that gap is compared to every other thing a driver does.`;
}

// --- the comparison

function scale(ms: number): number {
  const min = 100;
  const max = 500;
  return Math.max(0, Math.min(1, (ms - min) / (max - min))) * 100;
}

function renderChart(): void {
  chartEl.innerHTML = "";
  for (const band of reactions.bands) {
    const row = document.createElement("div");
    row.className = "band-row";

    const label = document.createElement("span");
    label.className = "band-label";
    label.textContent = band.label;

    const track = document.createElement("div");
    track.className = "track";

    const fill = document.createElement("span");
    fill.className = "band";
    fill.style.left = `${scale(band.lowMs)}%`;
    fill.style.width = `${scale(band.highMs) - scale(band.lowMs)}%`;
    fill.title = band.caveat;
    track.append(fill);

    const range = document.createElement("span");
    range.className = "band-range";
    range.textContent = `${band.lowMs}–${band.highMs} ms`;

    row.append(label, track, range);
    chartEl.append(row);
  }

  const you = document.createElement("div");
  you.className = "band-row you";
  you.innerHTML =
    '<span class="band-label">You</span><div class="track"><span class="marker" id="marker" hidden></span></div><span class="band-range" id="marker-value">—</span>';
  chartEl.append(you);
}

function renderMarker(ms: number): void {
  const marker = document.querySelector<HTMLElement>("#marker")!;
  const value = document.querySelector<HTMLElement>("#marker-value")!;
  const track = marker.parentElement!;

  attempts.push(ms);

  // Redraw the whole trail rather than appending one ghost, so the marks can
  // never drift out of step with `attempts`. At the counts a visitor produces
  // this is far too cheap to be worth tracking nodes individually.
  for (const stale of track.querySelectorAll(".ghost")) stale.remove();
  for (const past of attempts.slice(0, -1)) {
    const ghost = document.createElement("span");
    ghost.className = "ghost";
    ghost.style.left = `${scale(past)}%`;
    track.append(ghost);
  }

  marker.hidden = false;
  marker.style.left = `${scale(ms)}%`;
  value.textContent = `${ms} ms`;
}

// --- input: keyboard primary, pointer at parity (CLAUDE.md "Interaction rules")

document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  e.preventDefault();
  if (!isArmingKeydown(e)) return; // held-key repeats are not a new press
  arm();
});

document.addEventListener("keyup", (e) => {
  if (!isReleaseKeyup(e)) return;
  e.preventDefault();
  release(e.timeStamp);
});

pad.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  pad.setPointerCapture(e.pointerId);
  arm();
});

pad.addEventListener("pointerup", (e) => {
  e.preventDefault();
  release(e.timeStamp);
});

renderChart();
bestEl.textContent = best === null ? "—" : `${best} ms`;
