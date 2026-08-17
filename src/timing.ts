// Pure timing logic, deliberately free of DOM and clock access so the spec
// tests can drive it with known values. Nothing in here reads a clock; callers
// pass timestamps in. See CLAUDE.md "Timing rules".

export const MIN_HOLD_MS = 200;
export const MAX_HOLD_MS = 3000;

/** Uniform hold in [MIN_HOLD_MS, MAX_HOLD_MS). Injectable rand for testing. */
export function randomHoldMs(rand: () => number = Math.random): number {
  return MIN_HOLD_MS + rand() * (MAX_HOLD_MS - MIN_HOLD_MS);
}

export type Attempt =
  | { kind: "reaction"; ms: number }
  | { kind: "jump-start" };

/**
 * Classify a release.
 *
 * `lightsOutAt` is null until the lights-out frame has actually painted, so a
 * release before that point is a jump start by construction — there is no
 * moment to measure from, and we never invent one.
 */
export function classifyRelease(
  lightsOutAt: number | null,
  releaseAt: number,
): Attempt {
  if (lightsOutAt === null) return { kind: "jump-start" };
  if (releaseAt < lightsOutAt) return { kind: "jump-start" };
  return { kind: "reaction", ms: Math.round(releaseAt - lightsOutAt) };
}

/** keydown repeats while a key is held; only the first one arms. */
export function isArmingKeydown(event: {
  code: string;
  repeat: boolean;
}): boolean {
  return event.code === "Space" && !event.repeat;
}

export function isReleaseKeyup(event: { code: string }): boolean {
  return event.code === "Space";
}

/** Personal best, best-effort. Jump starts never count. */
export function nextBest(current: number | null, attempt: Attempt): number | null {
  if (attempt.kind !== "reaction") return current;
  if (current === null) return attempt.ms;
  return Math.min(current, attempt.ms);
}
