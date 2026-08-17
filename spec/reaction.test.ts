import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_HOLD_MS,
  MIN_HOLD_MS,
  classifyRelease,
  isArmingKeydown,
  nextBest,
  randomHoldMs,
} from "../src/timing";

// The week's contract, from the published A1 spec plus the checks CLAUDE.md
// commits to. These assert what the thing must DO, not how it's built.

describe("measurement is honest", () => {
  it("a release at a known offset returns that offset", () => {
    const lightsOut = 1000;
    for (const offset of [87, 152, 213, 460]) {
      expect(classifyRelease(lightsOut, lightsOut + offset)).toEqual({
        kind: "reaction",
        ms: offset,
      });
    }
  });

  it("reports whole milliseconds only", () => {
    const attempt = classifyRelease(1000, 1000 + 187.6231);
    expect(attempt).toEqual({ kind: "reaction", ms: 188 });
  });
});

describe("jump starts", () => {
  it("a release before lights-out is a jump start, never a time", () => {
    expect(classifyRelease(1000, 940)).toEqual({ kind: "jump-start" });
  });

  it("a release while the lights are still on is a jump start", () => {
    // lightsOutAt is null until the lights-out frame has painted.
    expect(classifyRelease(null, 12_345)).toEqual({ kind: "jump-start" });
  });

  it("never counts toward a personal best", () => {
    expect(nextBest(210, { kind: "jump-start" })).toBe(210);
    expect(nextBest(null, { kind: "jump-start" })).toBeNull();
  });

  it("keeps the better of two real attempts", () => {
    expect(nextBest(210, { kind: "reaction", ms: 190 })).toBe(190);
    expect(nextBest(190, { kind: "reaction", ms: 240 })).toBe(190);
  });
});

describe("the hold is unpredictable", () => {
  const holds = Array.from({ length: 200 }, () => randomHoldMs());

  it("stays inside 0.2s to 3.0s", () => {
    for (const h of holds) {
      expect(h).toBeGreaterThanOrEqual(MIN_HOLD_MS);
      expect(h).toBeLessThanOrEqual(MAX_HOLD_MS);
    }
  });

  it("varies across attempts", () => {
    expect(new Set(holds.map(Math.round)).size).toBeGreaterThan(50);
  });

  it("spans the range rather than hugging one end", () => {
    expect(Math.min(...holds)).toBeLessThan(MIN_HOLD_MS + 500);
    expect(Math.max(...holds)).toBeGreaterThan(MAX_HOLD_MS - 500);
  });
});

describe("held keys do not re-arm", () => {
  it("ignores keydown repeats while space is held", () => {
    expect(isArmingKeydown({ code: "Space", repeat: false })).toBe(true);
    expect(isArmingKeydown({ code: "Space", repeat: true })).toBe(false);
  });

  it("ignores other keys", () => {
    expect(isArmingKeydown({ code: "Enter", repeat: false })).toBe(false);
  });
});

describe("every shipped figure is sourced", () => {
  const root = resolve(import.meta.dirname, "..");
  const data = JSON.parse(
    readFileSync(resolve(root, "data/reactions.json"), "utf8"),
  ) as { bands: { id: string; sourceId: string; caveat: string }[] };
  const sources = readFileSync(resolve(root, "data/sources.md"), "utf8");

  it("ships at least one band", () => {
    expect(data.bands.length).toBeGreaterThan(0);
  });

  for (const band of data.bands) {
    it(`${band.id} has provenance in sources.md`, () => {
      expect(sources).toContain(band.sourceId);
    });

    it(`${band.id} states its caveat`, () => {
      expect(band.caveat.trim().length).toBeGreaterThan(0);
    });
  }
});

describe("static and client-side throughout", () => {
  const root = resolve(import.meta.dirname, "..");
  const source = readFileSync(resolve(root, "main.ts"), "utf8");

  it("makes no runtime network requests", () => {
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/navigator\.sendBeacon/);
  });

  it("measures with performance.now, never Date.now", () => {
    expect(source).toContain("performance.now()");
    expect(source).not.toMatch(/Date\.now\s*\(/);
  });

  it("starts the clock inside a painted frame, not the scheduling timeout", () => {
    expect(source).toMatch(
      /requestAnimationFrame\(\(\) => \{\s*lightsOutAt = performance\.now\(\)/,
    );
  });

  it("takes the release time from the event's own timeStamp", () => {
    expect(source).toMatch(/release\(e\.timeStamp\)/);
  });

  // A hidden tab never paints, so there is no lights-out moment to measure
  // from. Scoring that as a jump start would blame the visitor for the
  // browser. The attempt must be abandoned instead.
  it("abandons an attempt when the page is hidden rather than scoring it", () => {
    expect(source).toMatch(/visibilitychange/);
    expect(source).toMatch(/document\.hidden\)\s*abandon\(\)/);
  });
});

describe("the page states its core interaction", () => {
  const html = readFileSync(
    resolve(import.meta.dirname, "..", "index.html"),
    "utf8",
  );

  it("tells the visitor what to do before they do it", () => {
    expect(html).toMatch(/hold/i);
    expect(html).toMatch(/release|let go/i);
  });

  it("keeps the result in a live region so it is announced", () => {
    expect(html).toMatch(/aria-live="polite"/);
  });

  it("offers a pointer path at parity with the keyboard", () => {
    expect(html).toMatch(/id="pad"/);
  });

  // A real start gantry is five columns of four lamps, and only the bottom
  // pair in a column illuminates. Lights-out clears all of them.
  it("builds five columns of four lamps", () => {
    expect(html.match(/class="column"/g)).toHaveLength(5);
    expect(html.match(/class="lamp"/g)).toHaveLength(20);
  });

  it("marks each lamp with its row so only the bottom pair can light", () => {
    for (const row of [1, 2, 3, 4]) {
      expect(html.match(new RegExp(`data-row="${row}"`, "g"))).toHaveLength(5);
    }
  });
});
