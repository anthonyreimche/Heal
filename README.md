# Heal for Safelight

The Develop **Heal** panel: remove dust, spots and blemishes by copying
another part of the photo over them.

- **Heal** turns the tool on. Click to heal a round spot, or drag to paint
  over a longer blemish. Letting go picks a source from the photo: a place
  whose edges, detail and colour match the spot's surroundings. Circle spots
  can turn and scale their source to follow an edge.
- Drag a spot's outline to move it; drag its dashed source outline to pick
  the source by hand.
- **Heal** blends the copy into its surroundings; **Clone** copies it as it
  is.
- **Size**, **Feather** and **Opacity** set what new spots take, or change
  the selected spot. While you drag Size or Feather the brush shows at the
  middle of the photo.
- Develop's brush size shortcuts (`[` and `]` by default) size the brush
  while the tool is on.
- The list shows each spot: the eye hides it, × deletes it, and a click
  selects it. **Done** or Escape turns the tool off.

Right-click the panel's header and choose **Reset to defaults** to remove
every spot as one step.

Until Safelight 3.2.0 this panel was built in. It keeps the built-in panel's
id (`core.retouch`), so layouts saved before then keep it where it was. While
Heal is off or uninstalled, photos show without their spots, and Develop says
so for photos that had them.

## Development

```bash
npm install
npm run typecheck
npm run build    # dist/index.js, the file Safelight loads
npm test         # vitest; the bundle checks read dist/, so build first
npm run check    # all three, in that order
```
