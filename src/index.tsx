// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Registers the Develop "Heal" panel, its canvas tool and the stage that draws
// the spots. It was core's built-in `core.retouch` until Safelight 3.2.0 and
// keeps that panel id, so saved layouts keep it where it was.

import { HealPanel } from "./HealPanel";
import { initRuntime } from "./rt";
import type { Line, SafelightAPI } from "./safelight";
import { setHealSourceImage } from "./heal-source";
import { healStage } from "./stages";
import { resetHealTool, setHealTool } from "./state";
import { healCss } from "./styles";

export const PANEL_ID = "core.retouch";
export const STYLESHEET_ID = "safelight.heal.styles";

/** The release line: this release's major version (vite.config.ts). */
export const LINE = __SAFELIGHT_LINE__ as Line;

let stop: (() => void)[] = [];

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  resetHealTool();
  host.registerStylesheet({ id: STYLESHEET_ID, css: healCss(host.ui.tokens) });
  host.registerProcessingStage(healStage(LINE));
  host.registerPanel({
    id: PANEL_ID,
    title: "Heal",
    component: HealPanel,
    defaultDock: { module: "develop", direction: "left", order: 1, width: 240, height: 160 },
    onReset: () => {
      setHealTool({ selectedSpotId: null });
      void host.stores.useDevelopStore.getState().resetParams(["retouch"], "Reset Heal");
    },
  });
  for (const s of stop) s();
  // The source search reads the open photo's pixels, which core hands over
  // once the photo has a frame and again for each new one.
  const searched = host.develop.sourcePixels();
  if (searched) setHealSourceImage(searched.data, searched.width, searched.height);
  stop = [
    host.develop.onSourcePixels((p) => setHealSourceImage(p.data, p.width, p.height)),
    // Another photo: its spots aren't the ones selected, and the tool is let go.
    host.stores.useDevelopStore.subscribe((s, prev) => {
      if (s.photoId === prev.photoId) return;
      setHealTool({ selectedSpotId: null });
      host.develop.setCanvasTool(null);
    }),
  ];
}

export function deactivate(): void {
  for (const s of stop) s();
  stop = [];
  resetHealTool();
}
