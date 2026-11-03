// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The heal tool on the canvas: the canvas tool this extension holds while the
// panel's Heal button is on. A click or drag paints a spot; letting go picks
// its source from the whole painted region. A spot's outline moves it, its
// source's outline resamples it. Spots live in source UV and are drawn through
// the photo's transform onto the region the canvas shows.

import type { ComponentType, PointerEvent as ReactPointerEvent } from "react";
import { React, api } from "./rt";
import type { BrushDab, CanvasTool, CropRect, OverlayRect, RetouchSpot } from "./safelight";
import { buildForwardTransform, buildInverseTransform, mat3Apply, type Mat3 } from "./transform";
import { findHealSource, healColorOffset } from "./heal-source";
import { regionAnchor, spotRegion } from "./heal-region";
import { addSpot, healTool, setHealTool, updateSpot, useHealTool } from "./state";

type Rect = OverlayRect;

let idSeq = 0;
const genId = (p: string) => `${p}-${Date.now().toString(36)}-${idSeq++}`;

// Pointer position in an element's local LAYOUT pixels, the space `rect` is in:
// Preferences ▸ Interface scale zooms <body>, and under CSS zoom clientX and
// getBoundingClientRect() are in zoomed visual pixels.
function frameLocalPoint(rect: { left: number; top: number }, clientX: number, clientY: number) {
  const z = api.stores.useSettings.getState().uiScale || 1;
  return { x: (clientX - rect.left) / z, y: (clientY - rect.top) / z };
}

type Point = { x: number; y: number };

// Trace the outer boundary of a union of circles as a single SVG path, so a
// brush stroke shows one outline instead of one ring per dab. Marching squares
// over a coverage field: inside where any circle contains the node. Adjacent
// cells share crossing points exactly, so the emitted segments form a
// continuous outline (round caps hide the seams). `cell` is the grid step in
// the circles' space; `map` takes that space to the screen.
export function unionOutlinePath(
  circles: { x: number; y: number; r: number }[],
  cell = 4,
  map: (x: number, y: number) => Point = (x, y) => ({ x, y }),
): string {
  if (circles.length === 0) return "";
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of circles) {
    minX = Math.min(minX, c.x - c.r);
    minY = Math.min(minY, c.y - c.r);
    maxX = Math.max(maxX, c.x + c.r);
    maxY = Math.max(maxY, c.y + c.r);
  }
  minX -= cell; minY -= cell; maxX += cell; maxY += cell;
  const cols = Math.max(1, Math.ceil((maxX - minX) / cell));
  const rows = Math.max(1, Math.ceil((maxY - minY) / cell));
  // Signed field at a grid node: > 0 inside the union (max of r^2 - dist^2).
  const fieldAt = (gx: number, gy: number) => {
    const px = minX + gx * cell, py = minY + gy * cell;
    let v = -Infinity;
    for (const c of circles) {
      const dx = px - c.x, dy = py - c.y;
      const s = c.r * c.r - (dx * dx + dy * dy);
      if (s > v) v = s;
    }
    return v;
  };
  // Cache one row of node values at a time to avoid re-evaluating the field.
  let parts = "";
  let prevRow = new Float64Array(cols + 1);
  for (let i = 0; i <= cols; i++) prevRow[i] = fieldAt(i, 0);
  for (let j = 0; j < rows; j++) {
    const nextRow = new Float64Array(cols + 1);
    for (let i = 0; i <= cols; i++) nextRow[i] = fieldAt(i, j + 1);
    const y0 = minY + j * cell, y1 = y0 + cell;
    for (let i = 0; i < cols; i++) {
      const v00 = prevRow[i], v10 = prevRow[i + 1];
      const v01 = nextRow[i], v11 = nextRow[i + 1];
      const code =
        (v00 >= 0 ? 1 : 0) | (v10 >= 0 ? 2 : 0) | (v11 >= 0 ? 4 : 0) | (v01 >= 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const x0 = minX + i * cell, x1 = x0 + cell;
      const T = (): [number, number] => [x0 + (v00 / (v00 - v10)) * cell, y0];
      const R = (): [number, number] => [x1, y0 + (v10 / (v10 - v11)) * cell];
      const B = (): [number, number] => [x0 + (v01 / (v01 - v11)) * cell, y1];
      const L = (): [number, number] => [x0, y0 + (v00 / (v00 - v01)) * cell];
      const seg = (a: [number, number], b: [number, number]) => {
        const p = map(a[0], a[1]), q = map(b[0], b[1]);
        parts += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      };
      switch (code) {
        case 1: case 14: seg(L(), T()); break;
        case 2: case 13: seg(T(), R()); break;
        case 3: case 12: seg(L(), R()); break;
        case 4: case 11: seg(R(), B()); break;
        case 6: case 9: seg(T(), B()); break;
        case 7: case 8: seg(L(), B()); break;
        case 5: seg(L(), T()); seg(R(), B()); break;
        case 10: seg(T(), R()); seg(B(), L()); break;
      }
    }
    prevRow = nextRow;
  }
  return parts;
}

function projectToScreen(rect: Rect, crop: CropRect, forward: Mat3, sx: number, sy: number) {
  const t = mat3Apply(forward, sx, sy);
  const ox = (t.x - crop.x) / crop.width;
  const oy = (t.y - crop.y) / crop.height;
  return { x: rect.x + ox * rect.w, y: rect.y + oy * rect.h };
}

/** A disc as drawn on screen: centre, semi-axes in px, turn in degrees. */
interface ScreenDisc {
  x: number;
  y: number;
  rx: number;
  ry: number;
  angle: number;
}

// Where the photo's disc of radius r (image-height units) at (sx, sy) lands on
// screen. The transform scales each axis on its own (Aspect, Perspective), so a
// disc that heals round in the photo can be an ellipse on screen: its axes are
// the singular values of the map the disc's two radii go through.
function discOnScreen(toScreen: (sx: number, sy: number) => Point, sx: number, sy: number, r: number, imageAspect: number): ScreenDisc {
  const c = toScreen(sx, sy);
  const ex = toScreen(sx + r / imageAspect, sy);
  const ey = toScreen(sx, sy + r);
  const m00 = ex.x - c.x, m01 = ey.x - c.x, m10 = ex.y - c.y, m11 = ey.y - c.y;
  const e = (m00 + m11) / 2, f = (m00 - m11) / 2, g = (m10 + m01) / 2, h = (m10 - m01) / 2;
  const q = Math.hypot(e, h), w = Math.hypot(f, g);
  const angle = ((Math.atan2(g, f) + Math.atan2(h, e)) / 2) * (180 / Math.PI);
  return { x: c.x, y: c.y, rx: q + w, ry: Math.abs(q - w), angle };
}

const ellipseAt = (x: number, y: number, rx: number, ry: number, angle: number) => ({
  cx: x,
  cy: y,
  rx,
  ry,
  transform: `rotate(${angle} ${x} ${y})`,
});

// Traced brush outlines, keyed by spot: the store replaces a spot object on
// every edit, and `sig` holds the view numbers, because the canvas hands over
// a new rect on each of its renders.
const outlineCache = new WeakMap<RetouchSpot, { sig: string; path: string }>();

function viewSignature(rect: Rect, crop: CropRect, forward: Mat3): string {
  const { x, y, w, h } = rect;
  return [x, y, w, h, crop.x, crop.y, crop.width, crop.height, ...forward].join(",");
}

const HIT = 13; // px handle hit radius (generous grips)

type DragKind = "spot-dst" | "spot-src" | "paint";

interface DragState {
  kind: DragKind;
  id: string;
  downSrc: { x: number; y: number };
  lastDab?: { x: number; y: number };
  dabs?: BrushDab[];
}

// Where the pointer is over the canvas (layout px), and whether a drag is on.
// Only the ring reads it, so a hover move redraws the ring and nothing else:
// the outlines are traced from every painted dab, the costly part.
interface PointerState {
  at: { x: number; y: number } | null;
  dragging: boolean;
}

function pointerStore() {
  let state: PointerState = { at: null, dragging: false };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(partial: Partial<PointerState>) {
      state = { ...state, ...partial };
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

type PointerStore = ReturnType<typeof pointerStore>;

/** The brush ring under the pointer, hidden while a drag is on. */
function Ring({ pointer, shape }: { pointer: PointerStore; shape: ScreenDisc }) {
  const { at, dragging } = React.useSyncExternalStore(pointer.subscribe, pointer.get);
  if (!at || dragging) return null;
  const ring = ellipseAt(at.x, at.y, Math.max(3, shape.rx), Math.max(3, shape.ry), shape.angle);
  return <ellipse {...ring} fill="none" stroke="#e0e0e0" strokeWidth={1} opacity={0.8} />;
}

/** The tool held while the Heal button is on. */
export function HealCanvas({ rect }: { rect: Rect }) {
  const useDevelopStore = api.stores.useDevelopStore;
  const spots = useDevelopStore((s) => s.params.retouch);
  const straighten = useDevelopStore((s) => s.params.straighten);
  const transform = useDevelopStore((s) => s.params.transform);
  const editCrop = useDevelopStore((s) => s.params.crop);
  const { region, imageAspect } = api.develop.useDevelopOverlay();
  const tool = useHealTool();
  const [pointer] = React.useState(pointerStore);
  const dragRef = React.useRef<DragState | null>(null);

  const crop = region ?? editCrop;
  const forward = React.useMemo(
    () => buildForwardTransform(straighten, transform, imageAspect),
    [straighten, transform, imageAspect],
  );
  const inv = React.useMemo(
    () => buildInverseTransform(straighten, transform, imageAspect),
    [straighten, transform, imageAspect],
  );
  const toSource = (px: number, py: number) => {
    const ox = (px - rect.x) / rect.w;
    const oy = (py - rect.y) / rect.h;
    return mat3Apply(inv, crop.x + ox * crop.width, crop.y + oy * crop.height);
  };
  const toScreen = (sx: number, sy: number) => projectToScreen(rect, crop, forward, sx, sy);
  const frameXY = (e: ReactPointerEvent) =>
    frameLocalPoint(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY);
  const params = () => useDevelopStore.getState().params;

  function hitSpot(px: number, py: number): { kind: "spot-dst" | "spot-src"; id: string } | null {
    const p = toSource(px, py);
    // On the disc as the transform draws it, or near its centre for a tiny one.
    const grabs = (sx: number, sy: number, r: number) => {
      if (Math.hypot((p.x - sx) * imageAspect, p.y - sy) <= r) return true;
      const c = toScreen(sx, sy);
      return Math.hypot(px - c.x, py - c.y) <= HIT;
    };
    for (let i = spots.length - 1; i >= 0; i--) {
      const s = spots[i];
      // Source: a brush source can be grabbed anywhere on its (offset) shape;
      // a circle source only near its anchor.
      if (s.shape === "brush" && s.dabs) {
        const ox = s.srcX - s.dstX, oy = s.srcY - s.dstY;
        if (s.dabs.some((d) => grabs(d.x + ox, d.y + oy, d.radius))) return { kind: "spot-src", id: s.id };
      } else if (grabs(s.srcX, s.srcY, s.radius)) {
        return { kind: "spot-src", id: s.id };
      }
      if (s.shape === "brush" && s.dabs) {
        if (s.dabs.some((d) => grabs(d.x, d.y, d.radius))) return { kind: "spot-dst", id: s.id };
      } else if (grabs(s.dstX, s.dstY, s.radius)) {
        return { kind: "spot-dst", id: s.id };
      }
    }
    return null;
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const { x: px, y: py } = frameXY(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const down = toSource(px, py);
    pointer.set({ dragging: true });
    const hit = hitSpot(px, py);
    if (hit) {
      setHealTool({ selectedSpotId: hit.id });
      dragRef.current = { kind: hit.kind, id: hit.id, downSrc: down };
      return;
    }
    const t = healTool();
    const id = genId("spot");
    // Provisional source offset just so something shows while painting; the
    // real source is chosen on pointer-up from the whole painted region (and
    // can be dragged afterwards).
    const off = Math.max(0.04, t.size * 1.5);
    const firstDab: BrushDab = { x: down.x, y: down.y, radius: t.size, erase: false, feather: t.feather / 100 };
    addSpot({
      id,
      shape: "brush",
      mode: t.mode,
      visible: true,
      dstX: down.x,
      dstY: down.y,
      srcX: down.x - off / imageAspect,
      srcY: down.y - off,
      radius: t.size,
      feather: t.feather,
      opacity: t.opacity,
      angle: 0,
      scale: 1,
      recolorR: 0,
      recolorG: 0,
      recolorB: 0,
      dabs: [firstDab],
    });
    dragRef.current = { kind: "paint", id, downSrc: down, lastDab: down, dabs: [firstDab] };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const { x: px, y: py } = frameXY(e);
    pointer.set({ at: { x: px, y: py } });
    const d = dragRef.current;
    if (!d) return;
    const cur = toSource(px, py);
    switch (d.kind) {
      case "paint": {
        const t = healTool();
        const last = d.lastDab ?? d.downSrc;
        const dist = Math.hypot((cur.x - last.x) * imageAspect, cur.y - last.y);
        if (dist >= t.size * 0.25 && d.dabs) {
          d.dabs.push({ x: cur.x, y: cur.y, radius: t.size, erase: false, feather: t.feather / 100 });
          updateSpot(d.id, { dabs: [...d.dabs] });
          d.lastDab = cur;
        }
        break;
      }
      case "spot-dst": {
        const s = params().retouch.find((sp) => sp.id === d.id);
        if (s) {
          const dx = cur.x - d.downSrc.x;
          const dy = cur.y - d.downSrc.y;
          const patch: Partial<RetouchSpot> = {
            dstX: s.dstX + dx,
            dstY: s.dstY + dy,
            srcX: s.srcX + dx,
            srcY: s.srcY + dy,
          };
          if (s.dabs) patch.dabs = s.dabs.map((db) => ({ ...db, x: db.x + dx, y: db.y + dy }));
          updateSpot(d.id, patch);
          d.downSrc = cur;
        }
        break;
      }
      case "spot-src": {
        const s = params().retouch.find((sp) => sp.id === d.id);
        if (s) {
          const dx = cur.x - d.downSrc.x, dy = cur.y - d.downSrc.y;
          const srcX = s.srcX + dx, srcY = s.srcY + dy;
          const patch: Partial<RetouchSpot> = { srcX, srcY, angle: 0, scale: 1 };
          if (s.mode !== "clone") {
            const off = healColorOffset(s.dstX, s.dstY, srcX, srcY, s.radius, imageAspect);
            patch.recolorR = off.r;
            patch.recolorG = off.g;
            patch.recolorB = off.b;
          }
          updateSpot(d.id, patch);
          d.downSrc = cur;
        }
        break;
      }
    }
  };

  // Choose the source for a freshly painted spot from its whole painted region
  // rather than the first click. Heal and clone both search; clone weighs
  // matching colour more, since it copies verbatim. Either can be dragged
  // afterwards.
  function chooseSource(id: string) {
    const s = params().retouch.find((sp) => sp.id === id);
    if (!s) return;
    const region = spotRegion(s);
    const patch: Partial<RetouchSpot> = {};
    const auto = findHealSource(region, s.mode);
    if (auto) {
      // The search answers for the region's anchor; the spot keeps its own.
      const anchor = regionAnchor(region);
      patch.srcX = s.dstX + (auto.x - anchor.x);
      patch.srcY = s.dstY + (auto.y - anchor.y);
      patch.angle = auto.angle; patch.scale = auto.scale;
      if (s.mode !== "clone") {
        patch.recolorR = auto.r; patch.recolorG = auto.g; patch.recolorB = auto.b;
      }
      updateSpot(id, patch);
      return;
    }
    // No usable candidate: offset clear of the painted region.
    let rad = s.radius;
    if (region.kind === "brush") {
      const c = regionAnchor(region);
      rad = 0;
      for (const d of region.dabs) rad = Math.max(rad, Math.hypot((d.x - c.x) * imageAspect, d.y - c.y) + d.radius);
    }
    const off = Math.max(0.04, rad * 2.2);
    patch.srcX = s.dstX - off / imageAspect;
    patch.srcY = s.dstY - off;
    updateSpot(id, patch);
  }

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    pointer.set({ dragging: false });
    if (!d) return;
    if (d.kind === "paint") {
      if (d.dabs && d.dabs.length <= 1) updateSpot(d.id, { shape: "circle", dabs: undefined });
      // Decide the source now that the whole stroke is known.
      chooseSource(d.id);
    }
    void useDevelopStore.getState().commitEdit("Retouch");
  };

  const refCx = rect.x + rect.w / 2;
  const refCy = rect.y + rect.h / 2;
  // The size a new spot heals at, taken at the view's centre: the cursor ring
  // keeps it while it follows the pointer, so a hover maps nothing.
  const spotShape = React.useMemo(() => {
    const c = toSource(refCx, refCy);
    return discOnScreen(toScreen, c.x, c.y, tool.size, imageAspect);
  }, [rect.x, rect.y, rect.w, rect.h, crop, forward, inv, imageAspect, tool.size]);
  const core = 1 - tool.feather / 100;
  const Outlines = memoOutlines();

  return (
    <div
      data-heal-canvas=""
      style={{ position: "absolute", inset: 0, cursor: api.cursors.resolve("crosshair"), touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => pointer.set({ at: null })}
    >
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <Outlines spots={spots} selectedSpotId={tool.selectedSpotId} rect={rect} crop={crop} forward={forward} imageAspect={imageAspect} />
        {/* Centre reference while dragging the Size / Feather sliders. */}
        {tool.preview && (
          <g opacity={0.8}>
            <ellipse {...ellipseAt(refCx, refCy, Math.max(3, spotShape.rx), Math.max(3, spotShape.ry), spotShape.angle)} fill="none" stroke="#fff" strokeWidth={1.2} />
            <ellipse {...ellipseAt(refCx, refCy, Math.max(1, spotShape.rx * core), Math.max(1, spotShape.ry * core), spotShape.angle)} fill="none" stroke="#fff" strokeWidth={0.6} opacity={0.5} />
          </g>
        )}
        <Ring pointer={pointer} shape={spotShape} />
      </svg>
    </div>
  );
}

interface SpotOutlinesProps {
  spots: RetouchSpot[];
  selectedSpotId: string | null;
  rect: Rect;
  crop: CropRect;
  forward: Mat3;
  imageAspect: number;
}

function SpotOutlines({ spots, selectedSpotId, rect, crop, forward, imageAspect }: SpotOutlinesProps) {
  const toScreen = (sx: number, sy: number) => projectToScreen(rect, crop, forward, sx, sy);
  const sig = viewSignature(rect, crop, forward);
  // Traced where the dabs are round, the photo scaled to image-height units,
  // then drawn through the transform, so the outline is the region it heals.
  const brushOutline = (s: RetouchSpot, dabs: BrushDab[]) => {
    const cached = outlineCache.get(s);
    if (cached?.sig === sig) return cached.path;
    const circles = dabs.map((db) => ({ x: db.x * imageAspect, y: db.y, r: db.radius }));
    const first = discOnScreen(toScreen, dabs[0].x, dabs[0].y, dabs[0].radius, imageAspect);
    const pxPerUnit = Math.max(first.rx, first.ry) / dabs[0].radius;
    const path = unionOutlinePath(circles, 4 / pxPerUnit, (x, y) => toScreen(x / imageAspect, y));
    outlineCache.set(s, { sig, path });
    return path;
  };

  return (
    <>
      {spots.map((s) => {
        const src = toScreen(s.srcX, s.srcY);
        const dst = toScreen(s.dstX, s.dstY);
        const sel = s.id === selectedSpotId;
        const col = "#e0e0e0";
        if (s.shape === "brush" && s.dabs && s.dabs.length > 0) {
          // One outline for the whole painted region; the source mirrors that
          // exact shape, translated by the source offset (transform is affine).
          const outline = brushOutline(s, s.dabs);
          const dx = src.x - dst.x, dy = src.y - dst.y;
          return (
            <g key={s.id} data-spot={s.id}>
              <line x1={src.x} y1={src.y} x2={dst.x} y2={dst.y} stroke={col} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
              <path d={outline} fill="none" stroke={col} strokeWidth={1} strokeDasharray="2 2" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} transform={`translate(${dx} ${dy})`} />
              <path d={outline} fill="none" stroke={col} strokeWidth={sel ? 2 : 1.2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        }
        const srcDisc = discOnScreen(toScreen, s.srcX, s.srcY, s.radius, imageAspect);
        const dstDisc = discOnScreen(toScreen, s.dstX, s.dstY, s.radius, imageAspect);
        return (
          <g key={s.id} data-spot={s.id}>
            <line x1={src.x} y1={src.y} x2={dst.x} y2={dst.y} stroke={col} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
            <ellipse {...ellipseAt(src.x, src.y, srcDisc.rx, srcDisc.ry, srcDisc.angle)} fill="none" stroke={col} strokeWidth={1} strokeDasharray="2 2" />
            <ellipse {...ellipseAt(dst.x, dst.y, dstDisc.rx, dstDisc.ry, dstDisc.angle)} fill="none" stroke={col} strokeWidth={sel ? 2 : 1.2} />
          </g>
        );
      })}
    </>
  );
}

let MemoOutlines: ComponentType<SpotOutlinesProps> | null = null;

// Memoised: a redraw of the canvas that changes nothing it shows (the tool's
// settings) leaves it alone, and the traced brush outlines are cached by spot.
// Made on first use, with the React the host injects.
const memoOutlines = () => (MemoOutlines ??= React.memo(SpotOutlines));

const clampSize = (v: number) => Math.max(0.01, Math.min(0.3, Number(v.toFixed(3))));

/** The tool held while the Heal button is on. [ and ] (Develop's brush size
 *  shortcuts) size new spots; Escape drops the selection. */
export const HEAL_TOOL: CanvasTool = {
  overlay: HealCanvas,
  zoomable: true,
  onEscape: () => setHealTool({ selectedSpotId: null }),
  onAction: (action) => {
    if (action !== "brush.smaller" && action !== "brush.larger") return false;
    const dir = action === "brush.larger" ? 1 : -1;
    setHealTool({ size: clampSize(healTool().size + dir * 0.005) });
    return true;
  },
};
