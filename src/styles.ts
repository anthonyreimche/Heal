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
  count: `${P}-count`,
  defaults: `${P}-defaults`,
  caption: `${P}-caption`,
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
:where(.${cls.count}) { font-size: 10px; color: ${t.textMuted}; }
:where(.${cls.defaults}) { border-radius: 0.25rem; background-color: ${tint(t.surface2, 50)}; padding: 0.375rem; }
:where(.${cls.defaults} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${cls.caption}) { padding-bottom: 0.125rem; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${t.textMuted}; }
:where(.${cls.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${cls.spot}) { display: flex; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.spot}:hover) { background-color: ${t.surface2}; }
:where(.${cls.spot}.${cls.on}) { background-color: ${tint(t.accent, 20)}; color: ${t.textPrimary}; }
:where(.${cls.eye}) { flex-shrink: 0; border-radius: 0.25rem; padding: 0 0.125rem; color: ${t.textMuted}; }
:where(.${cls.eye}.${cls.hidden}) { color: ${tint(t.textMuted, 40)}; }
:where(.${cls.eye}:hover) { color: ${t.textPrimary}; }
:where(.${cls.name}) { flex: 1 1 0%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; color: inherit; }
:where(.${cls.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${t.textMuted}; }
:where(.${cls.remove}:hover) { color: ${t.labelRed}; }
html.sl-larger-text .${cls.count}, html.sl-larger-text .${cls.caption} { font-size: 12px !important; }
html.sl-larger-text .${cls.spot} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${cls.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
