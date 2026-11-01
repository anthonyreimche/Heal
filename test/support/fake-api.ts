// A stand-in Safelight API over real React and zustand. The develop store holds
// the crop, straighten, transform and spots the way core's does and records
// every write; the canvas tool is kept as core would keep it, and the source
// pixels are handed out as core hands them. Core's Panel draws its children,
// and core's Slider is a stub that keeps the props it was last rendered with,
// so a test can drive it the way the real one would.

import * as React from "react";
import { create } from "zustand";
import type {
  CanvasTool,
  DevelopOverlayState,
  DevelopParams,
  DevelopStoreState,
  PanelContribution,
  PanelProps,
  ProcessingStageContribution,
  SafelightAPI,
  SettingsState,
  SliderProps,
  SourcePixels,
  StoreApi,
  StylesheetContribution,
  UiTokens,
} from "../../src/safelight";
import { DEFAULT_CROP, DEFAULT_TRANSFORM } from "../../src/defaults";

export type DevelopCall =
  | { setParam: keyof DevelopParams; value: unknown }
  | { commitEdit: string }
  | { resetParams: (keyof DevelopParams)[]; label: string };

export const TOKENS: UiTokens = {
  accent: "var(--color-accent)",
  surface2: "var(--color-surface-2)",
  surface3: "var(--color-surface-3)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  labelRed: "var(--color-label-red)",
};

export const PARAMS: DevelopParams = {
  crop: { ...DEFAULT_CROP },
  straighten: 0,
  transform: { ...DEFAULT_TRANSFORM },
  retouch: [],
};

export interface Rig {
  api: SafelightAPI;
  develop: StoreApi<DevelopStoreState>;
  overlay: StoreApi<DevelopOverlayState>;
  calls: DevelopCall[];
  panels: PanelContribution[];
  stages: ProcessingStageContribution[];
  stylesheets: StylesheetContribution[];
  /** The canvas tool this extension holds, or null. */
  held(): CanvasTool | null;
  /** Hand the extension new source pixels, as core does for a new frame. */
  showSource(pixels: SourcePixels): void;
  /** The latest props of each slider drawn in `root`, in document order. */
  sliders(root: ParentNode): SliderProps[];
}

export function fakeApi({
  params = {} as Partial<DevelopParams>,
  source = null as SourcePixels | null,
} = {}): Rig {
  const calls: DevelopCall[] = [];
  const panels: PanelContribution[] = [];
  const stages: ProcessingStageContribution[] = [];
  const stylesheets: StylesheetContribution[] = [];
  const tool = create<{ tool: CanvasTool | null }>(() => ({ tool: null }));
  const sourceListeners = new Set<(pixels: SourcePixels) => void>();
  let pixels = source;
  const sliderProps = new Map<number, SliderProps>();
  let nextSlider = 0;

  const develop: StoreApi<DevelopStoreState> = create<DevelopStoreState>()((set) => ({
    params: { ...PARAMS, ...params },
    photoId: "p",
    bypassedPanels: {},
    setParam: (key, value) => {
      calls.push({ setParam: key, value });
      set((s) => ({ params: { ...s.params, [key]: value } }));
    },
    commitEdit: async (label) => {
      calls.push({ commitEdit: label });
    },
    resetParams: async (keys, label) => {
      calls.push({ resetParams: keys, label });
      set({ params: { ...PARAMS } });
    },
  }));
  const settings: StoreApi<SettingsState> = create<SettingsState>()(() => ({ uiScale: 1 }));
  const overlay: StoreApi<DevelopOverlayState> = create<DevelopOverlayState>()(() => ({ region: null, imageAspect: 1 }));

  function Panel({ children, title }: PanelProps) {
    return React.createElement("section", { "aria-label": title }, children);
  }

  function Slider(props: SliderProps) {
    const id = React.useRef(nextSlider++).current;
    sliderProps.set(id, props);
    return React.createElement("div", { "data-slider": id }, `${props.label} ${props.value}`);
  }

  const api: SafelightAPI = {
    version: 1,
    extensionId: "safelight.heal",
    react: React,
    registerPanel: (c) => void panels.push(c),
    registerProcessingStage: (c) => void stages.push(c),
    registerStylesheet: (c) => void stylesheets.push(c),
    components: { Panel, Slider },
    stores: { useDevelopStore: develop, useSettings: settings },
    develop: {
      useDevelopOverlay: () => overlay(),
      setCanvasTool: (t) => tool.setState({ tool: t }),
      useCanvasToolHeld: () => tool((s) => s.tool !== null),
      sourcePixels: () => pixels,
      onSourcePixels: (listener) => {
        sourceListeners.add(listener);
        return () => void sourceListeners.delete(listener);
      },
    },
    cursors: { resolve: (token) => (token === "crosshair" ? "crosshair" : "default") },
    ui: { tokens: TOKENS },
  };

  return {
    api,
    develop,
    overlay,
    calls,
    panels,
    stages,
    stylesheets,
    held: () => tool.getState().tool,
    showSource: (next) => {
      pixels = next;
      for (const l of sourceListeners) l(next);
    },
    sliders: (root) =>
      [...root.querySelectorAll("[data-slider]")].map((el) => {
        const props = sliderProps.get(Number(el.getAttribute("data-slider")));
        if (!props) throw new Error("a slider without props");
        return props;
      }),
  };
}
