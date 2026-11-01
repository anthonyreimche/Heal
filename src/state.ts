// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The heal tool's view state, never part of the edit: the settings a new spot
// takes, the spot being edited, and whether a Size or Feather slider is being
// dragged (the canvas then shows the brush at the centre). Spots themselves
// live in the photo's params; the edits below write them there.

import { React, api } from "./rt";
import type { RetouchSpot } from "./safelight";
import { MAX_SPOTS } from "./stages";

export interface HealTool {
  /** Image-height units. */
  size: number;
  /** 0 to 100. */
  feather: number;
  /** 0 to 100. */
  opacity: number;
  mode: "heal" | "clone";
  selectedSpotId: string | null;
  /** A Size or Feather slider is being dragged. */
  preview: boolean;
}

const INITIAL: HealTool = { size: 0.04, feather: 50, opacity: 100, mode: "heal", selectedSpotId: null, preview: false };

let tool: HealTool = INITIAL;
const listeners = new Set<() => void>();

export const healTool = (): HealTool => tool;

export function setHealTool(partial: Partial<HealTool>): void {
  tool = { ...tool, ...partial };
  for (const listener of listeners) listener();
}

export const resetHealTool = () => setHealTool(INITIAL);

export const subscribeHealTool = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** React hook: the heal tool's state. */
export const useHealTool = (): HealTool => React.useSyncExternalStore(subscribeHealTool, healTool);

const spots = (): RetouchSpot[] => api.stores.useDevelopStore.getState().params.retouch;
const setSpots = (next: RetouchSpot[]) => api.stores.useDevelopStore.getState().setParam("retouch", next);

/** Add `spot` and select it; a photo holds at most MAX_SPOTS. */
export function addSpot(spot: RetouchSpot): void {
  if (spots().length >= MAX_SPOTS) return;
  setSpots([...spots(), spot]);
  setHealTool({ selectedSpotId: spot.id });
}

export function updateSpot(id: string, patch: Partial<RetouchSpot>): void {
  setSpots(spots().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

/** Remove the spot, and the selection with it. */
export function removeSpot(id: string): void {
  setSpots(spots().filter((s) => s.id !== id));
  if (tool.selectedSpotId === id) setHealTool({ selectedSpotId: null });
}
