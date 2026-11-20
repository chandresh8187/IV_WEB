# Unit 1 web material viewer

Open Production → 3D material viewer (/unit1/production/material-viewer on the merged site). The screen is lazy-loaded, uses the existing production-view permission, and is available to non-labour production users. It does not change stock, job cards or production records and has no native-app dependency.

## Inputs and conventions

- C and Z lipped sections: web × flange × lip; U/C channels and L angles: web × flange; flat strip: width. Section values are outside dimensions, in mm. Corners use square bends; no bend radius is inferred.
- Thickness and cut length are in mm. Supported profiles are explicitly selectable; the tool does not infer crash-barrier or curved profiles from a section string.
- Each punch group selects a face, round diameter or capsule size, direction and centre offset. 12x20 means a 12 mm diameter capsule with 20 mm overall length; 20x20 is round.
- Hole dimensions are absolute centre positions from the starting end, separated by commas, spaces or semicolons. They are not pitches between consecutive holes. A centre offset of 0 places the hole at the face centre; the sign follows the face direction in the section model.
- All solids, thickness and cutouts use the same mm scale. C/Z web holes account for flange thickness at bends. Slots are real holes extruded through their sheet face.

## Viewer

Drag to orbit, scroll/pinch to zoom, right-drag/two-finger pan, or use zoom buttons. Isometric, top, side and starting-end views are available. Fit/reset frames the material and dimension rails; full screen uses the browser full-screen API. Auto-rotation is optional. Dimension labels are optional and include section dimensions, thickness, punch sizes and longitudinal positions. Longitudinal labels hide in an axial end view to keep section dimensions readable.

The last valid model remains visible until Update 3D preview succeeds. The model validator rejects invalid dimensions, edge or bend crossings, overlapping/touching holes and more than 300 holes or 26 punch groups. Geometry tests use raycasting to confirm round and capsule holes pass through the sheet, and test camera fitting on narrow and wide aspects. GPU geometry, controls, animation and labels are disposed when leaving the screen. An unavailable WebGL context shows a retry message.

Run npm run test:material-viewer and npm run build. Three.js is bundled by Vite; no CDN, API or backend migration is required.

The workspace fills the available viewport beneath the application header. Only the material form body scrolls; its Update button remains visible. Dimension and auto-rotation toggles live alongside camera presets. On narrow screens, Material data and 3D workspace tabs share the same viewport instead of stacking into a long page.

Show dimensions also draws green centre-to-centre (C/C) rails between consecutive holes along each face and transverse row. Holes are sorted by start position, across punch sizes/groups; separate faces/rows are not mixed. Existing hole identifiers and start-end positions remain unchanged.

Generate drawing PDF opens an in-place preview with Download, Share and Print. It exports the applied model only (unapplied edits disable export): the current camera image, vector cross-section, a compressed face diagram per face, and complete paginated hole schedules with punch sizes, absolute centres, signed offsets, direction and previous C/C distances. Company branding matches existing reports and uses the Unit 1 address. Closing the preview preserves form and camera state. Reports contain nominal design values, not actual inspection measurements; diagrams state that they are not to scale. Generation is local in the browser, with a bundled company logo.
