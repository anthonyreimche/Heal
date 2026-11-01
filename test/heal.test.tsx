// What activate() registers, the stage that draws the spots (its text pinned
// by the hashes core holds for each line, its values from the spots), the
// panel and the canvas tool: painting a spot, moving it, sizing the brush.

import { createHash } from "node:crypto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LINE, PANEL_ID, STYLESHEET_ID, activate, deactivate } from "../src/index";
import { React } from "../src/rt";
import type { DevelopParams, Line, ProcessingStageContribution, RetouchSpot } from "../src/safelight";
import { HealPanel } from "../src/HealPanel";
import { HEAL_TOOL, HealCanvas } from "../src/HealCanvas";
import { MAX_SPOTS, STAGE_ID, healStage } from "../src/stages";
import { healTool, setHealTool } from "../src/state";
import { fakeApi, PARAMS, type Rig } from "./support/fake-api";

// jsdom has no pointer capture.
HTMLElement.prototype.setPointerCapture ??= () => {};

/** core's ESSENTIAL_LINE_HASHES for safelight.heal.retouch. */
const LINE_HASHES: Record<Line, string> = {
  1: "747ee2bf13ec1faaefaf6369283678f1bbcd97ef8de2bfe69c43b1ce6d671767",
  2: "7d48e923e283d2a22f084c7fe42009bf25c480a880d8cc977bac37849782b8a7",
  3: "7d48e923e283d2a22f084c7fe42009bf25c480a880d8cc977bac37849782b8a7",
};

/** What a line's hash covers, as the app's stageText writes it. */
const stageText = (s: ProcessingStageContribution): string =>
  JSON.stringify([
    s.id, s.phase, s.priority ?? null, s.anchor ?? null, s.glsl, s.helpers ?? null, s.uniforms, s.textures ?? null,
    ...(s.defines ? [s.defines, s.patch ?? null] : []),
  ]);

const spot = (over: Partial<RetouchSpot> = {}): RetouchSpot => ({
  id: "s1",
  shape: "circle",
  mode: "heal",
  visible: true,
  dstX: 0.5,
  dstY: 0.5,
  srcX: 0.3,
  srcY: 0.4,
  radius: 0.05,
  feather: 50,
  opacity: 80,
  angle: 0,
  scale: 1,
  recolorR: 0.1,
  recolorG: 0.2,
  recolorB: 0.3,
  ...over,
});

let rig: Rig;
const params = () => rig.develop.getState().params;
const setParams = (over: Partial<DevelopParams>) => rig.develop.setState({ params: { ...params(), ...over } });
const RECT = { x: 0, y: 0, w: 1000, h: 1000 };

beforeEach(() => {
  rig = fakeApi();
  activate(rig.api);
});

afterEach(() => {
  deactivate();
  cleanup();
});

describe("activate", () => {
  it("registers the Heal panel, as core's core.retouch did, and this line's stage", () => {
    expect(PANEL_ID).toBe("core.retouch");
    expect(rig.panels).toEqual([
      {
        id: "core.retouch",
        title: "Heal",
        component: HealPanel,
        defaultDock: { module: "develop", direction: "left", order: 1, width: 240, height: 160 },
        onReset: expect.any(Function),
      },
    ]);
    expect(rig.stylesheets.map((s) => s.id)).toEqual([STYLESHEET_ID]);
    expect(rig.stages.map((s) => s.id)).toEqual([STAGE_ID]);
    expect(stageText(rig.stages[0])).toBe(stageText(healStage(LINE)));
  });

  it("removes every spot as one step on reset, dropping the selection", () => {
    setHealTool({ selectedSpotId: "s1" });
    rig.panels[0].onReset?.();
    expect(rig.calls).toEqual([{ resetParams: ["retouch"], label: "Reset Heal" }]);
    expect(healTool().selectedSpotId).toBeNull();
  });

  it("lets go of the tool and the selection when another photo opens", () => {
    rig.api.develop.setCanvasTool(HEAL_TOOL);
    setHealTool({ selectedSpotId: "s1" });
    act(() => rig.develop.setState({ photoId: "q" }));
    expect(rig.held()).toBeNull();
    expect(healTool().selectedSpotId).toBeNull();
  });
});

describe("the stage", () => {
  it.each([1, 2, 3] as const)("holds line %i as core's copy does", (line) => {
    expect(createHash("sha256").update(stageText(healStage(line))).digest("hex")).toBe(LINE_HASHES[line]);
  });

  it("declares the spots at the retouch anchor and patches while any are shown", () => {
    const stage = healStage(3);
    expect(stage).toMatchObject({ id: STAGE_ID, phase: "geometry", anchor: "retouch", glsl: "" });
    expect(stage.defines).toEqual({ MAX_SPOTS: 32, MAX_RBRUSH: 4 });
    expect(stage.textures).toEqual([{ key: "uRetouchTex", kind: "atlas" }]);
    expect(stage.patch).toEqual({ active: ["uSpotCount", "uRetouchCount"] });
  });

  it("writes each shown circle's placement, its source turn and its recolour, none for a clone", () => {
    const values = healStage(3).derive!({
      ...PARAMS,
      retouch: [
        spot(),
        spot({ id: "hidden", visible: false }),
        spot({ id: "c", mode: "clone", angle: Math.PI / 2, scale: 2 }),
      ],
    });
    expect(values.uSpotCount).toBe(2);
    const a = values.uSpotA as number[];
    expect(a).toHaveLength(MAX_SPOTS * 4);
    expect(a.slice(0, 4)).toEqual([0.5, 0.5, 0.3, 0.4]);
    expect((values.uSpotB as number[]).slice(0, 8)).toEqual([0.05, 0.5, 0.8, 1, 0.05, 0.5, 0.8, 0]);
    const c = (values.uSpotC as number[]).slice(4, 8);
    expect(c[0]).toBeCloseTo(0);
    expect(c.slice(1)).toEqual([1, 0.5, 0]);
    expect((values.uSpotTint as number[]).slice(0, 8)).toEqual([0.1, 0.2, 0.3, 0, 0, 0, 0, 0]);
  });

  it("hands the brush strokes to the atlas in channel order, with their source offsets", () => {
    const dabs = [{ x: 0.5, y: 0.5, radius: 0.02, erase: false, feather: 0.5 }];
    const values = healStage(3).derive!({
      ...PARAMS,
      retouch: [
        spot({ id: "b1", shape: "brush", dabs }),
        spot({ id: "empty", shape: "brush", dabs: [] }),
        spot({ id: "b2", shape: "brush", dabs, opacity: 50, srcX: 0.6, srcY: 0.5 }),
      ],
    });
    expect(values.uSpotCount).toBe(0);
    expect(values.uRetouchCount).toBe(2);
    expect(values.uRetouchTex).toEqual([{ id: "b1", dabs }, { id: "b2", dabs }]);
    expect(values.uRetouchCh).toEqual([0, 1, 2, 3]);
    const data = values.uRetouchData as number[];
    expect(data.slice(0, 3)).toEqual([0.3 - 0.5, 0.4 - 0.5, 0.8]);
    expect(data.slice(4, 7)).toEqual([0.6 - 0.5, 0, 0.5]);
  });
});

describe("the panel", () => {
  const button = (name: string) => screen.getByRole("button", { name });

  it("holds the canvas with the heal tool, and Done lets go and drops the selection", () => {
    render(<HealPanel />);
    fireEvent.click(button("Heal"));
    expect(rig.held()).toBe(HEAL_TOOL);
    setHealTool({ selectedSpotId: "s1" });
    fireEvent.click(button("Done"));
    expect(rig.held()).toBeNull();
    expect(healTool().selectedSpotId).toBeNull();
  });

  it("sets what new spots take, showing the brush while Size drags", () => {
    const { container } = render(<HealPanel />);
    expect(screen.getByText("New spot defaults")).toBeTruthy();
    const [size, feather, opacity] = rig.sliders(container);
    act(() => size.onChange(10));
    expect(healTool()).toMatchObject({ size: 0.1, preview: true });
    act(() => size.onCommit?.());
    act(() => feather.onChange(20));
    act(() => opacity.onChange(60));
    fireEvent.click(button("clone"));
    expect(healTool()).toMatchObject({ feather: 20, opacity: 60, mode: "clone" });
    expect(rig.calls).toEqual([]);
  });

  it("edits the selected spot instead, committing each change", () => {
    setParams({ retouch: [spot()] });
    setHealTool({ selectedSpotId: "s1" });
    const { container } = render(<HealPanel />);
    expect(screen.getByText("Editing spot")).toBeTruthy();
    const [size] = rig.sliders(container);
    expect(size.value).toBe(5);
    act(() => size.onChange(8));
    act(() => size.onCommit?.());
    fireEvent.click(button("clone"));
    expect(params().retouch[0]).toMatchObject({ radius: 0.08, mode: "clone" });
    expect(rig.calls.filter((c) => "commitEdit" in c)).toEqual([{ commitEdit: "Spot Size" }, { commitEdit: "Spot Mode" }]);
  });

  it("lists the spots: the eye hides one, × deletes it, a click selects it", () => {
    setParams({ retouch: [spot(), spot({ id: "s2", mode: "clone" })] });
    render(<HealPanel />);
    expect(screen.getByText("2/32 spots")).toBeTruthy();
    fireEvent.click(screen.getAllByTitle("Hide")[0]);
    expect(params().retouch[0].visible).toBe(false);
    fireEvent.click(screen.getByText("Clone 2"));
    expect(healTool().selectedSpotId).toBe("s2");
    expect(rig.held()).toBe(HEAL_TOOL);
    fireEvent.click(screen.getAllByTitle("Delete")[1]);
    expect(params().retouch.map((s) => s.id)).toEqual(["s1"]);
    expect(healTool().selectedSpotId).toBeNull();
    expect(rig.calls.filter((c) => "commitEdit" in c)).toEqual([
      { commitEdit: "Spot Visibility" },
      { commitEdit: "Delete Spot" },
    ]);
  });
});

describe("the canvas tool", () => {
  const canvas = () => document.querySelector("[data-heal-canvas]") as HTMLElement;
  const draw = () => render(<HealCanvas rect={RECT} />);

  it("heals a round spot where it is clicked, sourced clear of it with no pixels to search, in one step", () => {
    draw();
    fireEvent.pointerDown(canvas(), { pointerId: 1, button: 0, clientX: 500, clientY: 500 });
    fireEvent.pointerUp(canvas(), { pointerId: 1, clientX: 500, clientY: 500 });
    const [made] = params().retouch;
    expect(made).toMatchObject({ shape: "circle", mode: "heal", dstX: 0.5, dstY: 0.5, radius: 0.04, feather: 50, opacity: 100 });
    expect(made.dabs).toBeUndefined();
    expect(made.srcX).toBeCloseTo(0.5 - 0.088);
    expect(made.srcY).toBeCloseTo(0.5 - 0.088);
    expect(healTool().selectedSpotId).toBe(made.id);
    expect(rig.calls.filter((c) => "commitEdit" in c)).toEqual([{ commitEdit: "Retouch" }]);
  });

  it("paints a brush stroke while dragged", () => {
    draw();
    fireEvent.pointerDown(canvas(), { pointerId: 1, button: 0, clientX: 300, clientY: 500 });
    fireEvent.pointerMove(canvas(), { pointerId: 1, clientX: 400, clientY: 500 });
    fireEvent.pointerMove(canvas(), { pointerId: 1, clientX: 500, clientY: 500 });
    fireEvent.pointerUp(canvas(), { pointerId: 1, clientX: 500, clientY: 500 });
    const [made] = params().retouch;
    expect(made.shape).toBe("brush");
    expect(made.dabs?.map((d) => d.x)).toEqual([0.3, 0.4, 0.5]);
  });

  it("moves a spot by its outline, its source with it", () => {
    setParams({ retouch: [spot()] });
    draw();
    fireEvent.pointerDown(canvas(), { pointerId: 1, button: 0, clientX: 500, clientY: 500 });
    fireEvent.pointerMove(canvas(), { pointerId: 1, clientX: 550, clientY: 500 });
    fireEvent.pointerUp(canvas(), { pointerId: 1, clientX: 550, clientY: 500 });
    expect(params().retouch).toHaveLength(1);
    expect(params().retouch[0].dstX).toBeCloseTo(0.55);
    expect(params().retouch[0].srcX).toBeCloseTo(0.35);
    expect(healTool().selectedSpotId).toBe("s1");
  });

  it("caps a photo's spots", () => {
    setParams({ retouch: Array.from({ length: MAX_SPOTS }, (_, i) => spot({ id: `s${i}`, dstX: 0.9, dstY: 0.9, srcX: 0.9, srcY: 0.9 })) });
    draw();
    fireEvent.pointerDown(canvas(), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(canvas(), { pointerId: 1, clientX: 100, clientY: 100 });
    expect(params().retouch).toHaveLength(MAX_SPOTS);
  });

  it("sizes the brush with Develop's brush size shortcuts, leaving other actions to core", () => {
    expect(HEAL_TOOL.onAction?.("brush.larger")).toBe(true);
    expect(healTool().size).toBe(0.045);
    expect(HEAL_TOOL.onAction?.("brush.smaller")).toBe(true);
    expect(HEAL_TOOL.onAction?.("brush.featherUp")).toBe(false);
    expect(healTool().size).toBe(0.04);
  });

  it("drops the selection on Escape", () => {
    setHealTool({ selectedSpotId: "s1" });
    HEAL_TOOL.onEscape?.();
    expect(healTool().selectedSpotId).toBeNull();
  });
});

describe("the source search", () => {
  it("searches the source pixels core hands over", () => {
    // A flat frame: the search finds a plain copy, so the spot's source moves
    // off the fallback offset to wherever the search put it, unturned.
    const size = 64;
    const data = new Uint8ClampedArray(size * size * 4).fill(128);
    rig.showSource({ data, width: size, height: size });
    render(<HealCanvas rect={RECT} />);
    const el = document.querySelector("[data-heal-canvas]") as HTMLElement;
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 500, clientY: 500 });
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 500, clientY: 500 });
    const [made] = params().retouch;
    expect(made).toMatchObject({ angle: 0, scale: 1, recolorR: 0, recolorG: 0, recolorB: 0 });
    expect(Math.hypot(made.srcX - 0.5, made.srcY - 0.5)).toBeGreaterThan(0.04);
  });
});
