// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The Develop "Heal" panel: the Heal button that holds the canvas, the
// settings new spots take (or the selected spot's), and the photo's spots.
// Until Safelight 3.2.0 it was core's built-in.

import { React, api } from "./rt";
import { HEAL_TOOL } from "./HealCanvas";
import { removeSpot, setHealTool, updateSpot, useHealTool } from "./state";
import { MAX_SPOTS } from "./stages";
import { cls } from "./styles";

const MODES = [
  { value: "heal", label: "Heal" },
  { value: "clone", label: "Clone" },
] as const;

export function HealPanel() {
  const { Panel, Slider } = api.components;
  const { Button, SegmentedControl } = api.ui;
  const useDevelopStore = api.stores.useDevelopStore;
  const spots = useDevelopStore((s) => s.params.retouch);
  const commitEdit = useDevelopStore((s) => s.commitEdit);
  const active = api.develop.useCanvasToolHeld();
  const tool = useHealTool();
  const brush = api.develop.brush.defaults;

  const selected = spots.find((s) => s.id === tool.selectedSpotId) ?? null;
  const sizeVal = Math.round((selected ? selected.radius : tool.size) * 100);
  const featherVal = selected ? selected.feather : tool.feather;
  const opacityVal = selected ? selected.opacity : tool.opacity;
  const modeVal = selected ? selected.mode : tool.mode;

  const onSize = (v: number) => {
    setHealTool({ preview: true });
    if (selected) updateSpot(selected.id, { radius: v / 100 });
    else setHealTool({ size: v / 100 });
  };
  const onFeather = (v: number) => {
    setHealTool({ preview: true });
    if (selected) updateSpot(selected.id, { feather: v });
    else setHealTool({ feather: v });
  };
  const onOpacity = (v: number) => {
    if (selected) updateSpot(selected.id, { opacity: v });
    else setHealTool({ opacity: v });
  };
  const onMode = (m: "heal" | "clone") => {
    if (selected) {
      updateSpot(selected.id, { mode: m });
      void commitEdit("Spot Mode");
    } else {
      setHealTool({ mode: m });
    }
  };
  const endPreview = (label: string) => () => {
    setHealTool({ preview: false });
    if (selected) void commitEdit(label);
  };

  const toggleVisibility = (id: string, visible: boolean) => {
    updateSpot(id, { visible: !visible });
    void commitEdit("Spot Visibility");
  };

  const on = (yes: boolean) => (yes ? ` ${cls.on}` : "");

  return (
    <Panel title="Heal" defaultOpen>
      <div className={cls.panel}>
        <div className={cls.head}>
          <Button
            size="sm"
            active={active}
            title="Click or drag · drag the source ring to resample"
            onClick={() => {
              if (active) {
                api.develop.setCanvasTool(null);
                setHealTool({ selectedSpotId: null }); // deselect so the list collapses
              } else {
                api.develop.setCanvasTool(HEAL_TOOL);
              }
            }}
          >
            {active ? "Done" : "Heal"}
          </Button>
          <span className={cls.count}>{`${spots.length}/${MAX_SPOTS} spots`}</span>
        </div>

        <div className={cls.defaults}>
          <div className={cls.caption}>{selected ? "Editing spot" : "New spot defaults"}</div>
          <SegmentedControl
            size="sm"
            value={modeVal}
            onChange={(m) => {
              const picked = MODES.find((o) => o.value === m);
              if (picked) onMode(picked.value);
            }}
            options={[...MODES]}
          />
          <Slider
            label="Size"
            value={sizeVal}
            min={1}
            max={50}
            step={1}
            defaultValue={Math.round(brush.size * 100)}
            onChange={onSize}
            onCommit={endPreview("Spot Size")}
          />
          <Slider
            label="Feather"
            value={featherVal}
            min={0}
            max={100}
            step={1}
            defaultValue={Math.round(brush.feather * 100)}
            onChange={onFeather}
            onCommit={endPreview("Spot Feather")}
          />
          <Slider
            label="Opacity"
            value={opacityVal}
            min={0}
            max={100}
            step={1}
            defaultValue={Math.round(brush.opacity * 100)}
            onChange={onOpacity}
            onCommit={() => {
              if (selected) void commitEdit("Spot Opacity");
            }}
          />
        </div>

        {spots.length > 0 && (
          <div className={cls.list}>
            {spots.map((s, i) => {
              const visible = s.visible !== false;
              const isSelected = s.id === tool.selectedSpotId;
              return (
                <div key={s.id} className={cls.spot + on(isSelected)}>
                  <button
                    type="button"
                    title={visible ? "Hide" : "Show"}
                    className={cls.eye + (visible ? "" : ` ${cls.hidden}`)}
                    onClick={() => toggleVisibility(s.id, visible)}
                  >
                    {visible ? "◉" : "○"}
                  </button>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    className={cls.name}
                    onClick={() => {
                      setHealTool({ selectedSpotId: s.id });
                      api.develop.setCanvasTool(HEAL_TOOL);
                    }}
                  >
                    {`${s.mode === "clone" ? "Clone" : "Heal"} ${i + 1}`}
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className={cls.remove}
                    onClick={() => {
                      removeSpot(s.id);
                      void commitEdit("Delete Spot");
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
