// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The look core gave the Heal panel with Tailwind utilities, as plain CSS (the
// app's Tailwind build never scans an extension). `:where()` drops every rule
// to zero specificity, so a stylesheet that restyles the panel or its buttons
// wins over them. The `html.sl-larger-text` rules repeat core's Accessibility
// rule for small text.

import type { UiTokens } from "./safelight";

const P = "safelight-heal";

export const cls = {
  panel: `${P}-panel`,
  head: `${P}-head`,
  toggle: `${P}-toggle`,
  hint: `${P}-hint`,
  defaults: `${P}-defaults`,
  caption: `${P}-caption`,
  modes: `${P}-modes`,
  mode: `${P}-mode`,
  on: `${P}-on`,
  list: `${P}-list`,
  spot: `${P}-spot`,
  eye: `${P}-eye`,
  hidden: `${P}-hidden`,
  name: `${P}-name`,
  remove: `${P}-remove`,
} as const;

const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function healCss(t: UiTokens): string {
  return `
:where(.${cls.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${cls.head}) { display: flex; align-items: center; justify-content: space-between; }
:where(.${cls.toggle}) { border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 11px; background-color: ${t.surface2}; color: ${t.textSecondary}; }
:where(.${cls.toggle}:hover) { color: ${t.textPrimary}; }
:where(.${cls.toggle}.${cls.on}) { background-color: ${tint(t.accent, 30)}; color: ${t.textPrimary}; }
:where(.${cls.hint}) { font-size: 10px; color: ${t.textMuted}; }
:where(.${cls.defaults}) { border-radius: 0.25rem; background-color: ${tint(t.surface2, 50)}; padding: 0.375rem; }
:where(.${cls.defaults} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${cls.caption}) { padding-bottom: 0.125rem; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${t.textMuted}; }
:where(.${cls.modes}) { display: flex; gap: 0.25rem; padding-bottom: 0.25rem; }
:where(.${cls.mode}) { flex: 1 1 0%; border-radius: 0.25rem; padding: 0.125rem 0.5rem; font-size: 10px; text-transform: capitalize; background-color: ${t.surface2}; color: ${t.textSecondary}; }
:where(.${cls.mode}:hover) { color: ${t.textPrimary}; }
:where(.${cls.mode}.${cls.on}) { background-color: ${tint(t.accent, 30)}; color: ${t.textPrimary}; }
:where(.${cls.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${cls.spot}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.spot}:hover) { background-color: ${t.surface2}; }
:where(.${cls.spot}.${cls.on}) { background-color: ${tint(t.accent, 20)}; color: ${t.textPrimary}; }
:where(.${cls.eye}) { flex-shrink: 0; border-radius: 0.25rem; padding: 0 0.125rem; color: ${t.textMuted}; }
:where(.${cls.eye}.${cls.hidden}) { color: ${tint(t.textMuted, 40)}; }
:where(.${cls.eye}:hover) { color: ${t.textPrimary}; }
:where(.${cls.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${cls.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${t.textMuted}; }
:where(.${cls.remove}:hover) { color: ${t.labelRed}; }
html.sl-larger-text .${cls.hint}, html.sl-larger-text .${cls.caption}, html.sl-larger-text .${cls.mode} { font-size: 12px !important; }
html.sl-larger-text .${cls.toggle}, html.sl-larger-text .${cls.spot} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${cls.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
