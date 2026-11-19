// SPDX-License-Identifier: GPL-3.0-or-later

let sharedCtx: AudioContext | null = null;
let lastPopTimestamp = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;

  if (!sharedCtx) {
    try {
      sharedCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

/**
 * Subtle warm marimba/pixel pop when placing pixels or voxels (throttled to 65ms).
 */
export function playPaintPop(muted: boolean): void {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastPopTimestamp < 65) return;
  lastPopTimestamp = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const jitter = (Math.random() - 0.5) * 45;
    osc.frequency.setValueAtTime(510 + jitter, t);
    osc.frequency.exponentialRampToValueAtTime(690 + jitter, t + 0.038);

    gain.gain.setValueAtTime(0.042, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.042);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  } catch {
    // Ignore audio context errors in headless environments
  }
}

/**
 * Soft muted low tick when erasing pixels or removing voxels.
 */
export function playEraseTick(muted: boolean): void {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastPopTimestamp < 65) return;
  lastPopTimestamp = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.035);

    gain.gain.setValueAtTime(0.038, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  } catch {
    // Ignore
  }
}

/**
 * Cheerful 2-note chime for flood-fill bucket actions.
 */
export function playFillChime(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const notes = [440, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = t + i * 0.045;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.095);
    });
  } catch {
    // Ignore
  }
}

/**
 * Metallic forge anvil clang + triumphant 3-note fanfare on successful export!
 */
export function playForgeCelebration(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;

    // 1. Metallic Anvil Strike (inharmonic overtones)
    const partials = [880, 1345, 2190];
    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.06 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });

    // 2. Heroic rising triad (C5 -> E5 -> G5 -> C6)
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = t + 0.08 + i * 0.075;
      const dur = i === fanfare.length - 1 ? 0.28 : 0.12;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.055, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    });
  } catch {
    // Ignore
  }
}
