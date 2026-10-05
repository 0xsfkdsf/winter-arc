import { describe, it, expect } from 'vitest';
import { arcPhase } from '../src/domain/dates';
import { TRACKS, clampVolume } from '../src/audio/soundscape';
import { uiSoundsEnabled, playCue, getCueVolume, setCueVolume } from '../src/audio/cues';
import { applyFocusCredit } from '../src/domain/focus';

describe('arc chapters', () => {
  it('ignition → deep → ascent → return', () => {
    expect(arcPhase(0)).toBe('THE IGNITION');
    expect(arcPhase(0.33)).toBe('THE IGNITION');
    expect(arcPhase(0.34)).toBe('THE DEEP');
    expect(arcPhase(0.5)).toBe('THE DEEP');
    expect(arcPhase(0.67)).toBe('THE ASCENT');
    expect(arcPhase(0.99)).toBe('THE ASCENT');
    expect(arcPhase(1)).toBe('THE RETURN');
  });
});

describe('soundscape registry', () => {
  it('tracks are unique and start with silence', () => {
    const ids = TRACKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('off');
    expect(ids).toContain('rain');
    expect(ids).toContain('drone');
  });
  it('volume clamps safely', () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(0.7)).toBeCloseTo(0.7);
    expect(clampVolume(NaN)).toBe(0.5);
  });
});

describe('interface sounds', () => {
  it('default to on and never throw headless', () => {
    expect(uiSoundsEnabled()).toBe(true);
    expect(getCueVolume()).toBeCloseTo(0.7);
    setCueVolume(2);
    expect(getCueVolume()).toBe(1);
    setCueVolume(-1);
    expect(getCueVolume()).toBe(0);
    expect(() => {
      playCue('toggle'); playCue('complete'); playCue('session');
      playCue('milestone'); playCue('welcome');
    }).not.toThrow();
  });
});

describe('focus credit to tasks', () => {
  it('credits proportionally and auto-completes at 100', () => {
    expect(applyFocusCredit(0, 22.5, 45)).toEqual({ progress: 50, done: false });
    expect(applyFocusCredit(90, 10, 45)).toEqual({ progress: 100, done: true });
    expect(applyFocusCredit(0, 60, 45)).toEqual({ progress: 100, done: true });
    expect(applyFocusCredit(0, 5, 0)).toEqual({ progress: 100, done: true });
  });
});
