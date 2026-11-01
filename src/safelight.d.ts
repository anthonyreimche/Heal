// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The slice of Safelight's extension API this extension touches, mirrored from
// the app's src/extensions/types.ts, src/extensions/develop-host.tsx,
// src/catalog/types.ts, src/state/{develop-store,settings-store}.ts,
// src/modules/develop/canvas-tool.ts, src/rendering/source-pixels.ts and
// src/ui/components/{Panel,Slider}.tsx.
// Extensions are standalone bundles, so the host's source is not on the type
// path; React types come from @types/react (dev only).

import type { ComponentType, ReactNode } from "react";

/** A release line: the process version its stage text was written for, and
 *  the extension's major version. */
export type Line = 1 | 2 | 3;

export interface StoreApi<T> {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState(): T;
  setState(partial: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

/** A region of the transformed image, 0 to 1 of the image, y down. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformParams {
  perspectiveV: number;
  perspectiveH: number;
  aspect: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  flipH: boolean;
  flipV: boolean;
}

/** One stamp of a brush stroke, in source UV with lengths in image-height
 *  units. */
export interface BrushDab {
  x: number;
  y: number;
  radius: number;
  erase: boolean;
  /** 0 to 1 edge softness. */
  feather: number;
  /** 0 to 1 coverage ceiling of its stroke; absent = 1. */
  opacity?: number;
  /** 0 to 1 per-dab deposit; absent = 1. */
  flow?: number;
  /** First dab of a pointer stroke. */
  strokeStart?: boolean;
}

/** A heal or clone spot: a circle, or a brush stroke's dabs. Positions are
 *  source UV; the source is copied onto the destination. */
export interface RetouchSpot {
  id: string;
  shape: "circle" | "brush";
  mode: "heal" | "clone";
  visible: boolean;
  dstX: number;
  dstY: number;
  srcX: number;
  srcY: number;
  /** Image-height units (a circle's radius; a brush's draw radius). */
  radius: number;
  /** 0 to 100. */
  feather: number;
  /** 0 to 100. */
  opacity: number;
  /** Radians: the source's rotation. */
  angle?: number;
  /** The source's scale (1 = none). */
  scale?: number;
  /** Additive colour offset (encoded 0 to 1), source to match. */
  recolorR?: number;
  recolorG?: number;
  recolorB?: number;
  /** The brush shape, when shape is "brush". */
  dabs?: BrushDab[];
}

/** The develop params this extension reads. Core's carry many more fields. */
export interface DevelopParams {
  crop: CropRect;
  /** Degrees, -45 to 45. */
  straighten: number;
  transform: TransformParams;
  retouch: RetouchSpot[];
}

export interface DevelopStoreState {
  params: DevelopParams;
  /** The open photo, or null. */
  photoId: string | null;
  /** Panels whose preview-off eye is held, by panel id. */
  bypassedPanels: Record<string, boolean>;
  setParam<K extends keyof DevelopParams>(key: K, value: DevelopParams[K]): void;
  /** End a gesture: one undoable history step under `label`. */
  commitEdit(label: string): Promise<void>;
  /** Put `keys` back to their defaults as one undoable step under `label`. */
  resetParams(keys: (keyof DevelopParams)[], label: string): Promise<void>;
}

export interface SettingsState {
  /** Preferences ▸ Interface scale: the CSS zoom on the app's body. */
  uiScale: number;
}

export interface PanelDockDefault {
  module: "library" | "develop";
  direction: "left" | "right" | "bottom";
  order?: number;
  width?: number;
  height?: number;
}

export interface PanelContribution {
  /** Globally unique, e.g. "core.crop" or "my-ext.fancy-curves". */
  id: string;
  title: string;
  component: ComponentType;
  defaultDock?: PanelDockDefault;
  /** Right-clicking the panel's dock header offers "Reset to defaults". */
  onReset?: () => void;
}

export interface UniformDeclaration {
  key: string;
  glslType: "int" | "bool" | "vec4";
  default: number | boolean | number[];
  /** An array of this many. */
  length?: number;
  /** The constant (`defines`) the array is declared with. */
  size?: string;
}

/** One brush stroke an atlas texture bakes into a channel of its own. */
export interface StageAtlasItem {
  id: string;
  dabs: BrushDab[];
}

export type StageValue = number | boolean | number[];

export type StageDerive = (params: DevelopParams) => Record<string, StageValue | StageAtlasItem[]>;

export interface ProcessingStageContribution {
  id: string;
  name: string;
  phase: "geometry";
  priority?: number;
  /** Where in the develop program the block runs (official stages only). */
  anchor?: "retouch";
  /** The stage's block in main(); empty: the stage only declares. */
  glsl: string;
  /** Functions main() calls, declared ahead of it. */
  helpers?: string;
  uniforms: UniformDeclaration[];
  /** "atlas": brush strokes the renderer bakes, one per channel, in order. */
  textures?: { key: string; kind: "atlas" }[];
  /** Constants declared ahead of the uniforms, `#define NAME value`. */
  defines?: Record<string, number>;
  /** The stage patches the source: while any of these uniforms' values is
   *  above zero, the frame develops from a patched copy. */
  patch?: { active: readonly string[] };
  /** The uniforms' values for a photo (official extensions only). */
  derive?: StageDerive;
}

export interface StylesheetContribution {
  id: string;
  css: string;
}

/** The theme's CSS variables as `var(--color-…)` strings. */
export interface UiTokens {
  readonly accent: string;
  readonly surface2: string;
  readonly surface3: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly labelRed: string;
}

export interface PanelProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Double-clicking the track resets to this. */
  defaultValue?: number;
  onChange(value: number): void;
  onCommit?(): void;
}

export interface OverlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The develop canvas's mapping, for an overlay. */
export interface DevelopOverlayState {
  /** The region of the transformed image the frame shows; null until first
   *  layout. */
  region: CropRect | null;
  /** The decoded image's width over its height. */
  imageAspect: number;
}

/** An on-image tool holding the develop canvas. */
export interface CanvasTool {
  /** Drawn over the image inside the view; `rect` is the box the frame shows. */
  overlay: ComponentType<{ rect: OverlayRect }>;
  /** Whether zoom and pan still reach the canvas under the overlay. */
  zoomable?: boolean;
  /** Escape was pressed: core lets the tool go after this. */
  onEscape?(): void;
  /** A shortcut's action pressed while the tool is held: whether it took it. */
  onAction?(action: string): boolean;
}

/** RGBA8 rows from the top. */
export interface SourcePixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface SafelightAPI {
  version: 1;
  extensionId: string;
  react: typeof import("react");
  registerPanel(c: PanelContribution): void;
  registerProcessingStage(c: ProcessingStageContribution): void;
  registerStylesheet(c: StylesheetContribution): void;
  components: {
    /** Core's collapsible panel; inside a dock panel of the same title it
     *  draws its content only. */
    Panel: ComponentType<PanelProps>;
    Slider: ComponentType<SliderProps>;
  };
  stores: {
    useDevelopStore: StoreApi<DevelopStoreState>;
    useSettings: StoreApi<SettingsState>;
  };
  develop: {
    /** React hook: the canvas mapping, for an overlay. */
    useDevelopOverlay(): DevelopOverlayState;
    /** Hold the canvas with an on-image tool, or with null let go of it. */
    setCanvasTool(tool: CanvasTool | null): void;
    /** React hook: whether this extension holds the canvas tool. */
    useCanvasToolHeld(): boolean;
    /** A small 8-bit sRGB copy of the open photo's source; null before its
     *  first frame. */
    sourcePixels(): SourcePixels | null;
    /** Calls `listener` with each new sourcePixels image; returns the
     *  unsubscribe. */
    onSourcePixels(listener: (pixels: SourcePixels) => void): () => void;
  };
  cursors: {
    /** A cursor token's CSS cursor value, as the theme draws it. */
    resolve(token: string): string;
  };
  ui: { tokens: UiTokens };
}

export interface ExtensionModule {
  activate(api: SafelightAPI): void;
  deactivate?(): void;
}
