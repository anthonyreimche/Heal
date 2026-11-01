// Hovering the heal tool over a photo moves only the cursor ring. The outlines
// are traced from every painted dab, which is the costly part, so a pointer
// move must not trace them again, and neither may a redraw for another reason
// when the spots and the view are unchanged.
//
// Outline renders are counted by the work every outline render does and the
// ring never does: mapping an image point to the screen (`mat3Apply`, spied
// pass-through). Each outline render maps at least each spot's two anchors;
// tracing a brush outline also maps every dab.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/transform", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/transform")>();
  return { ...real, mat3Apply: vi.fn(real.mat3Apply) };
});

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { React, initRuntime } from "../src/rt";
import type { BrushDab, OverlayRect, RetouchSpot } from "../src/safelight";
import { HealCanvas } from "../src/HealCanvas";
import { resetHealTool, setHealTool } from "../src/state";
import { mat3Apply } from "../src/transform";
import { fakeApi, type Rig } from "./support/fake-api";

HTMLElement.prototype.setPointerCapture ??= () => {};

const mapped = vi.mocked(mat3Apply);
const SPOTS = 10;
const DABS = 40;

// The canvas hands out a fresh rect on each of its renders, with the same
// numbers.
const view = (): OverlayRect => ({ x: 40, y: 30, w: 1000, h: 750 });

function brushSpot(i: number): RetouchSpot {
  const y = 0.08 + i * 0.085;
  const dabs: BrushDab[] = Array.from({ length: DABS }, (_, k) => ({
    x: 0.1 + k * 0.012,
    y,
    radius: 0.02,
    erase: false,
    feather: 0.5,
  }));
  return {
    id: `spot-${i}`,
    shape: "brush",
    mode: "heal",
    visible: true,
    dstX: dabs[0].x,
    dstY: y,
    srcX: dabs[0].x + 0.6,
    srcY: y,
    radius: 0.02,
    feather: 50,
    opacity: 100,
    dabs,
  };
}

let rig: Rig;

function seed(): RetouchSpot[] {
  const retouch = Array.from({ length: SPOTS }, (_, i) => brushSpot(i));
  rig.develop.setState({ params: { ...rig.develop.getState().params, retouch } });
  return retouch;
}

function renderCanvas(rect: OverlayRect = view()) {
  const result = render(<HealCanvas rect={rect} />);
  const canvas = result.container.firstElementChild;
  if (!canvas) throw new Error("HealCanvas rendered nothing");
  return {
    canvas,
    rerender: (next: OverlayRect) => result.rerender(<HealCanvas rect={next} />),
    // The ring and the size reference; spots draw their circles inside a group.
    rings: () => [...result.container.querySelectorAll("svg > circle")],
    paths: () => [...result.container.querySelectorAll("path")].map((p) => p.getAttribute("d")),
  };
}

// jsdom lays nothing out, so the canvas sits at the origin and client
// coordinates are canvas coordinates.
const hover = (canvas: Element, x: number, y: number) =>
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: x, clientY: y });

beforeEach(() => {
  rig = fakeApi();
  rig.overlay.setState({ imageAspect: 4 / 3 });
  initRuntime(rig.api);
  resetHealTool();
  mapped.mockClear();
});

afterEach(cleanup);

describe("hover", () => {
  it("moves the ring with the pointer without tracing any outline again", () => {
    seed();
    const { canvas, rings } = renderCanvas();
    expect(mapped).toHaveBeenCalled();
    mapped.mockClear();

    for (let k = 0; k < 10; k++) hover(canvas, 100 + 20 * k, 200 + 10 * k);

    expect(mapped).not.toHaveBeenCalled();
    const [ring] = rings();
    expect(ring.getAttribute("cx")).toBe("280");
    expect(ring.getAttribute("cy")).toBe("290");
    expect(ring.getAttribute("r")).toBe("30");
  });

  it("hides the ring while a stroke is being painted", () => {
    seed();
    const { canvas, rings } = renderCanvas();
    hover(canvas, 900, 700);
    expect(rings()).toHaveLength(1);

    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 900, clientY: 700 });
    hover(canvas, 910, 705);

    expect(rings()).toHaveLength(0);
  });

  it("drops the ring when the pointer leaves", () => {
    seed();
    const { canvas, rings } = renderCanvas();
    hover(canvas, 300, 300);
    expect(rings()).toHaveLength(1);

    fireEvent.pointerLeave(canvas);

    expect(rings()).toHaveLength(0);
  });
});

describe("outlines", () => {
  it("re-map only the spot anchors when the selection changes", () => {
    const retouch = seed();
    renderCanvas();
    mapped.mockClear();

    act(() => setHealTool({ selectedSpotId: retouch[3].id }));

    expect(mapped).toHaveBeenCalled();
    expect(mapped.mock.calls.length).toBeLessThanOrEqual(2 * SPOTS);
  });

  it("are left alone by a redraw that changes nothing they show", () => {
    seed();
    renderCanvas();
    mapped.mockClear();

    act(() => setHealTool({ opacity: 50 }));

    expect(mapped).not.toHaveBeenCalled();
  });

  it("reuse the traced outlines for a fresh view with the same numbers", () => {
    seed();
    const { rerender, paths } = renderCanvas();
    const before = paths();
    mapped.mockClear();

    rerender(view());

    expect(mapped.mock.calls.length).toBeLessThanOrEqual(2 * SPOTS);
    expect(paths()).toEqual(before);
  });

  const changes: [string, (rerender: (r: OverlayRect) => void) => void][] = [
    ["zoom", (rerender) => rerender({ ...view(), w: 2000, h: 1500 })],
    ["crop", () => rig.overlay.setState({ region: { x: 0.1, y: 0, width: 0.9, height: 1 } })],
    [
      "transform",
      () => {
        const { params } = rig.develop.getState();
        rig.develop.setState({ params: { ...params, transform: { ...params.transform, offsetX: 10 } } });
      },
    ],
  ];
  it.each(changes)("are traced again after a %s change", (_, change) => {
    seed();
    const { rerender, paths } = renderCanvas();
    const before = paths();
    mapped.mockClear();

    act(() => change(rerender));

    expect(mapped.mock.calls.length).toBeGreaterThanOrEqual(SPOTS * DABS);
    expect(paths()).not.toEqual(before);
  });
});
