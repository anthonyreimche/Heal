// A stand-in Safelight API over real React and zustand. The develop store holds
// the crop, straighten, transform and spots the way core's does and records
// every write; the canvas tool is kept as core would keep it, and the source
// pixels are handed out as core hands them. Core's Panel draws its children,
// and core's Slider is a stub that keeps the props it was last rendered with,
// so a test can drive it the way the real one would. The official brush hands
// out the defaults the test asks for, steps without holding to a range (core's
// own tests cover that) and records what it was asked; its ring is a stub that
// keeps the props of each one drawn.

import * as React from "react";
import { create } from "zustand";
import type {
  BrushCursorProps,
  BrushSettings,
  ButtonProps,
  CanvasTool,
  DevelopOverlayState,
  DevelopParams,
  DevelopStoreState,
  PanelContribution,
  PanelProps,
  ProcessingStageContribution,
  SafelightAPI,
  SegmentedControlProps,
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

/** The official brush's defaults as core hands them out. */
export const BRUSH_DEFAULTS: Readonly<BrushSettings> = Object.freeze({ size: 0.08, feather: 0.5, opacity: 1, flow: 1 });

const BRUSH_STEPS: Record<string, { key: keyof BrushSettings; by: number }> = {
  "brush.smaller": { key: "size", by: -0.01 },
  "brush.larger": { key: "size", by: 0.01 },
  "brush.featherDown": { key: "feather", by: -0.05 },
  "brush.featherUp": { key: "feather", by: 0.05 },
  "brush.opacityDown": { key: "opacity", by: -0.1 },
  "brush.opacityUp": { key: "opacity", by: 0.1 },
  "brush.flowDown": { key: "flow", by: -0.1 },
  "brush.flowUp": { key: "flow", by: 0.1 },
};

export interface BrushStepAsked {
  action: string;
  brush: Partial<BrushSettings>;
}

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
  /** Each brush step the extension asked core for. */
  brushSteps: BrushStepAsked[];
  /** The props of each official brush ring drawn now that draws something. */
  brushCursors(): BrushCursorProps[];
  /** Interface scale as framePoint applies it. */
  setFrameZoom(zoom: number): void;
}

function Button({ active, variant: _variant, size: _size, full: _full, type = "button", children, ...rest }: ButtonProps) {
  return React.createElement("button", { ...rest, type, "data-active": active ? "true" : undefined }, children);
}

function SegmentedControl({ value, onChange, options }: SegmentedControlProps) {
  return React.createElement(
    "div",
    { "data-segmented": "" },
    options.map((o) =>
      React.createElement(
        "button",
        { key: o.value, type: "button", title: o.title, "data-active": value === o.value ? "true" : undefined, onClick: () => onChange(o.value) },
        o.label,
      ),
    ),
  );
}

export function fakeApi({
  params = {} as Partial<DevelopParams>,
  source = null as SourcePixels | null,
  brushDefaults = BRUSH_DEFAULTS,
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
  const brushSteps: BrushStepAsked[] = [];
  const cursors = new Map<number, BrushCursorProps>();
  let nextCursor = 0;
  let frameZoom = 1;

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
  const overlay: StoreApi<DevelopOverlayState> = create<DevelopOverlayState>()(() => ({ region: null, imageAspect: 1 }));

  function Panel({ children, title }: PanelProps) {
    return React.createElement("section", { "aria-label": title }, children);
  }

  function Slider(props: SliderProps) {
    const id = React.useRef(nextSlider++).current;
    sliderProps.set(id, props);
    return React.createElement("div", { "data-slider": id }, `${props.label} ${props.value}`);
  }

  function BrushCursor(props: BrushCursorProps) {
    const id = React.useRef(nextCursor++).current;
    cursors.set(id, props);
    React.useEffect(() => () => void cursors.delete(id), [id]);
    return null;
  }

  function stepBrush(action: string, brush: Partial<BrushSettings>) {
    brushSteps.push({ action, brush: { ...brush } });
    const s = BRUSH_STEPS[action];
    const now = s ? brush[s.key] : undefined;
    return s && now !== undefined ? { key: s.key, value: Math.round((now + s.by) * 1000) / 1000 } : null;
  }

  const api: SafelightAPI = {
    version: 1,
    extensionId: "safelight.heal",
    react: React,
    registerPanel: (c) => void panels.push(c),
    registerProcessingStage: (c) => void stages.push(c),
    registerStylesheet: (c) => void stylesheets.push(c),
    components: { Panel, Slider },
    stores: { useDevelopStore: develop },
    develop: {
      useDevelopOverlay: () => overlay(),
      setCanvasTool: (t) => tool.setState({ tool: t }),
      useCanvasToolHeld: () => tool((s) => s.tool !== null),
      sourcePixels: () => pixels,
      onSourcePixels: (listener) => {
        sourceListeners.add(listener);
        return () => void sourceListeners.delete(listener);
      },
      brush: { defaults: brushDefaults, actions: Object.keys(BRUSH_STEPS), step: stepBrush },
      BrushCursor,
      framePoint: (el, clientX, clientY) => {
        const r = el.getBoundingClientRect();
        return { x: (clientX - r.left) / frameZoom, y: (clientY - r.top) / frameZoom };
      },
    },
    cursors: { resolve: (token) => (token === "crosshair" ? "crosshair" : "default") },
    ui: { tokens: TOKENS, Button, SegmentedControl },
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
    brushSteps,
    brushCursors: () => [...cursors.values()].filter((c) => c.at !== null),
    setFrameZoom: (zoom) => {
      frameZoom = zoom;
    },
  };
}
