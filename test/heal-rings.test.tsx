// The rings show the disc the stage heals. A spot is a disc in the photo; the
// photo's transform draws it on screen, so with Transform ▸ Aspect +100 (1.5×
// wider, 1/1.5 as tall) the healed disc is an ellipse and its ring must be too.

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { React, initRuntime } from "../src/rt";
import type { RetouchSpot } from "../src/safelight";
import { HealCanvas } from "../src/HealCanvas";
import { healTool, resetHealTool, setHealTool } from "../src/state";
import { fakeApi, type Rig } from "./support/fake-api";

HTMLElement.prototype.setPointerCapture ??= () => {};

const RECT = { x: 0, y: 0, w: 1000, h: 1000 };
const WIDE = 1.5;

const spot = (over: Partial<RetouchSpot> = {}): RetouchSpot => ({
  id: "s1",
  shape: "circle",
  mode: "heal",
  visible: true,
  dstX: 0.5,
  dstY: 0.5,
  srcX: 0.2,
  srcY: 0.2,
  radius: 0.05,
  feather: 50,
  opacity: 100,
  ...over,
});

let rig: Rig;

function withAspect(aspect: number, retouch: RetouchSpot[]) {
  const { params } = rig.develop.getState();
  rig.develop.setState({ params: { ...params, retouch, transform: { ...params.transform, aspect } } });
}

/** Half-extents on screen of a drawn ring, whatever element draws it. */
function extent(el: Element): { rx: number; ry: number } {
  const n = (name: string) => Number(el.getAttribute(name));
  if (el.tagName === "circle") return { rx: n("r"), ry: n("r") };
  if (el.tagName === "ellipse") {
    const turn = /rotate\(([-\d.e]+)/.exec(el.getAttribute("transform") ?? "");
    const a = ((turn ? Number(turn[1]) : 0) * Math.PI) / 180;
    const rx = n("rx"), ry = n("ry");
    return { rx: Math.hypot(rx * Math.cos(a), ry * Math.sin(a)), ry: Math.hypot(rx * Math.sin(a), ry * Math.cos(a)) };
  }
  const nums = (el.getAttribute("d") ?? "").match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return { rx: (Math.max(...xs) - Math.min(...xs)) / 2, ry: (Math.max(...ys) - Math.min(...ys)) / 2 };
}

const canvas = () => document.querySelector("[data-heal-canvas]") as HTMLElement;
/** The spot's own ring: drawn last in its group, solid. */
const spotRing = () => {
  const group = document.querySelector('[data-spot="s1"]');
  if (!group) throw new Error("no spot drawn");
  return group.lastElementChild as Element;
};
const cursorRing = () => {
  const ring = document.querySelector("[data-heal-canvas] > svg > :not(g)");
  if (!ring) throw new Error("no cursor ring");
  return ring;
};

beforeEach(() => {
  rig = fakeApi();
  rig.overlay.setState({ imageAspect: 1 });
  initRuntime(rig.api);
  resetHealTool();
});

afterEach(cleanup);

describe("with Aspect +100", () => {
  it("draws a round spot's ring as the stretched disc it heals", () => {
    withAspect(100, [spot()]);
    render(<HealCanvas rect={RECT} />);
    const { rx, ry } = extent(spotRing());
    expect(rx).toBeCloseTo(50 * WIDE, 0);
    expect(ry).toBeCloseTo(50 / WIDE, 0);
  });

  it("traces a brush spot's outline as the stretched dabs", () => {
    const dabs = [{ x: 0.5, y: 0.5, radius: 0.05, erase: false, feather: 0.5 }];
    withAspect(100, [spot({ shape: "brush", dabs })]);
    render(<HealCanvas rect={RECT} />);
    const { rx, ry } = extent(spotRing());
    expect(Math.abs(rx - 50 * WIDE)).toBeLessThan(2);
    expect(Math.abs(ry - 50 / WIDE)).toBeLessThan(2);
  });

  it("sizes the cursor ring as the spot a click would heal", () => {
    withAspect(100, []);
    render(<HealCanvas rect={RECT} />);
    fireEvent.pointerMove(canvas(), { pointerId: 1, clientX: 500, clientY: 500 });
    const { rx, ry } = extent(cursorRing());
    expect(rx).toBeCloseTo(healTool().size * 1000 * WIDE, 0);
    expect(ry).toBeCloseTo((healTool().size * 1000) / WIDE, 0);
  });

  it("grabs a spot anywhere on its ring, not just inside the unstretched circle", () => {
    withAspect(100, [spot()]);
    render(<HealCanvas rect={RECT} />);
    fireEvent.pointerDown(canvas(), { pointerId: 1, button: 0, clientX: 570, clientY: 500 });
    fireEvent.pointerUp(canvas(), { pointerId: 1, clientX: 570, clientY: 500 });
    expect(rig.develop.getState().params.retouch.map((s) => s.id)).toEqual(["s1"]);
    expect(healTool().selectedSpotId).toBe("s1");
  });

  it("leaves a spot alone outside its ring's short axis", () => {
    withAspect(100, [spot()]);
    setHealTool({ selectedSpotId: null });
    render(<HealCanvas rect={RECT} />);
    fireEvent.pointerDown(canvas(), { pointerId: 1, button: 0, clientX: 500, clientY: 545 });
    fireEvent.pointerUp(canvas(), { pointerId: 1, clientX: 500, clientY: 545 });
    expect(rig.develop.getState().params.retouch).toHaveLength(2);
  });
});

describe("with Aspect +100 and Straighten 30°", () => {
  it("turns a round spot's ring with the traced outline of the same disc", () => {
    const { params } = rig.develop.getState();
    const transform = { ...params.transform, aspect: 100 };
    rig.develop.setState({ params: { ...params, straighten: 30, transform, retouch: [spot()] } });
    const ring = render(<HealCanvas rect={RECT} />);
    const round = extent(spotRing());
    ring.unmount();
    const dabs = [{ x: 0.5, y: 0.5, radius: 0.05, erase: false, feather: 0.5 }];
    rig.develop.setState({ params: { ...rig.develop.getState().params, retouch: [spot({ shape: "brush", dabs })] } });
    render(<HealCanvas rect={RECT} />);
    const traced = extent(spotRing());
    expect(Math.abs(round.rx - traced.rx)).toBeLessThan(2);
    expect(Math.abs(round.ry - traced.ry)).toBeLessThan(2);
    expect(round.rx).not.toBeCloseTo(round.ry, 0);
  });
});

describe("with no transform", () => {
  it("keeps a round spot's ring round", () => {
    withAspect(0, [spot()]);
    render(<HealCanvas rect={RECT} />);
    const { rx, ry } = extent(spotRing());
    expect(rx).toBeCloseTo(50, 0);
    expect(ry).toBeCloseTo(50, 0);
  });
});
