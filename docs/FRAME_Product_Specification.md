# FRAME — Product Concept & MVP Implementation Specification

**Version:** 2.1  
**Date:** 2026-10-31  
**Status:** Implementation-ready product brief (assumptions defined; technical risks require validation)  
**Audience:** Claude Code, Codex, developers, UX designers  
**Language:** English technical specification; user-facing interface may be English in V1.

## 1. Vision

**FRAME turns finished vector artwork into printable screen-print film positives.**

Core workflow: **Copy → Paste → Automatically separate printing inks → Inspect → Export films → Print onto transparency film → Expose screens.**

FRAME is a tool for home screen-print prepress, **not** a fully featured vector illustration editor. Its differentiator is the automatic generation of correct per-ink masks **independent of the source file's design layers**.

### Primary user
Home hobbyist / small-batch screen printer working on T-shirts, hoodies, bags, or paper. The user may create artwork in Figma, Illustrator, or another vector editor and prints transparent exposure films on a home printer.

### Core promise
A multi-color, flattened-in-terms-of-layer-structure but still vector-based graphic can be pasted/imported. FRAME derives actual printable spot-color separations, makes those masks inspectable, and exports physically accurate black film positives. A graphic with twelve vector shapes grouped into one source layer may produce only two or three printing masks.

**Terminology:** Output is a *film positive / exposure transparency* for exposing a screen, not a heat-transfer film.

## 2. Key product decisions for V1

| Area | Decision |
| --- | --- |
| Platform | Desktop-first web app, optimized for macOS desktop browsers |
| Tech stack | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide |
| Primary input | `⌘V` with vector/SVG clipboard content |
| Fallback input | SVG markup pasted as text; drag-and-drop/file picker for `.svg` |
| Editing | Import artwork, move, scale, rotate, align; add text |
| Not supported | Full vector path creation or detailed node editing |
| Separation | Automatic by *visible print colors*, not Figma/Illustrator layers |
| Color model | Opaque, flat-color spot printing; UX optimized for 1–4 inks |
| Default overlap rule | Knockout; no advanced overprint in V1 |
| Ink adjustments | Merge/reassign source colors to destination inks; rename inks |
| Export | Multipage vector PDF and one SVG per film positive |
| Paper | A4 and A3 |
| Print scale | 1:1 by default, dimensions in mm |
| Persistence | Local, no account/backend/cloud required |
| AI | Not required |
| Rendering | Real vector geometry, never a screenshot of the canvas |

The 1–4 ink limit is a UI simplification; avoid hard-coding a maximum into the underlying data model.

## 3. Core end-to-end experience

1. User opens FRAME and sees a large **“Paste your artwork”** area.
2. User copies their artwork from Figma/Illustrator and presses `⌘V` in FRAME, or drops an SVG file.
3. FRAME imports a safe SVG vector representation. If clipboard contains only raster data, explain why vector separation is unavailable and guide the user to **Copy as SVG** / SVG export.
4. Artwork immediately appears on a central canvas, with a physical size that can be adjusted in millimeters.
5. FRAME detects all **supported visible** flat colors, normalizes geometry, and computes ink masks accounting for z-order and knockout.
6. Right panel displays the resulting print inks, ink count, and screen count. User can inspect, merge/reassign, rename, or disable inks.
7. User optionally positions/scales/rotates artwork or adds text; masks are recomputed deterministically after edits.
8. User enters **Print Preparation**, sees a per-ink exposure film preview, chooses A4/A3, checks registration marks, and reviews warnings.
9. FRAME exports a correctly dimensioned, multi-page vector PDF and/or independent SVG film positives. Each film contains **opaque black art**, registration marks at identical coordinates, and consistent origin.
10. User prints on suitable transparent film **at actual size / 100%**, verifies physical dimensions and alignment, then uses the transparencies to expose their screens.

## 4. Clipboard interoperability

**Important:** Plain `⌘C` in design software does not guarantee that a browser can access SVG data. Clipboard data types vary across software versions and browsers.

Requirements:
- Implement `paste` handling on the editor and start surface.
- Inspect clipboard item MIME types, prioritizing usable SVG (`image/svg+xml`) and SVG markup (`text/plain` or `text/html` where appropriate after safe extraction).
- Support Figma's **Copy as SVG** workflow and Illustrator's SVG clipboard options when compatible payloads are exposed.
- Do not silently rasterize a PNG/JPEG and call it vector data.
- Show a concise, specific fallback: “Only a raster image was found. In Figma, use Copy as SVG, or export an SVG file.”
- Offer drag-and-drop SVG as a reliable alternative.
- Test behavior manually in current macOS Chrome/Safari with Figma and Illustrator; record actual supported combinations. Do not promise universal interoperability without tests.

## 5. UX / information architecture

### Primary structure: two modes
1. **Design:** What's on the shirt? Artwork composition, physical sizing, colors, positioning, text.
2. **Print:** How do I expose the screens? Per-ink masks, page layout, registration marks, vector exports.

### Screen A — Home / import
- Minimal start screen with a prominent paste/drop area.
- Headline: **Paste your artwork.**
- Support text: “Press ⌘V or drop an SVG.”
- No setup wizard or account requirement; create a project after first successful import.
- Clearly explain unsupported inputs when encountered.

### Screen B — Design & Separation (main workspace)
- **Top bar:** FRAME / project title / status / Print Preparation CTA.
- **Left panel:** source artwork items (imported SVGs and text), visibility, ordering, add SVG/text.
- **Center:** large visual SVG canvas; selection and transform handles; pan and zoom; optional print-area bounds.
- **Right panel:** **print inks**, not original source layers. Swatches, labels, visibility, source-color assignments, merge inks, ink count, warnings.
- Two views: composite artwork in intended colors vs **individual black-only exposure mask**.
- Any edit triggers derived separation recalculation.
- Keep advanced settings hidden until relevant. Aimed at nontechnical home printers.

**Crucial model distinction:** *Artwork items / design layers* are not *print ink masks*. Many design items can map to one printing ink and one design item can contain many printing inks.

### Screen C — Print Preparation
- Large sheet preview and thumbnail strip (one film per ink).
- Settings: page A4/A3, 100% default scale, registration marks toggle, mirrored output toggle (off by default).
- Export all films as multi-page PDF or individual SVGs; browser print can be launched via printable PDF (no printer driver integration).
- Show film order, intended ink name/color as UI metadata, and exact physical artwork dimensions.
- Warnings for overflow, unsupported features, non-1:1 scaling, or uncertain output.

### Secondary V2 features (not MVP)
- T-shirt and textile color mockups.
- Saved frame sizes and usable exposure area.
- User-defined physical ink library.
- Printer calibration assistant (print a measured 100 × 100 mm square).
- White underbase for dark textiles, trapping, overprint controls.
- Multi-sheet tiling; automatic color reduction suggestions; halftones.

## 6. Separation engine — functional definition

Separation is the **core product**, not an export-by-existing-layer function.

### Expected pipeline
1. **Parse and sanitize** the imported SVG.
2. **Normalize** supported paths, groups, styles, transforms, compound shapes, and strokes without changing appearance.
3. **Compute visible artwork geometry** taking group order and knockout into account.
4. **Detect supported visible flat colors**, combining exactly matching colors by default.
5. **Map source colors to user-defined printing inks**, including merging similar source colors if the user chooses.
6. **Produce one geometrically accurate vector mask per printing ink**, including holes and cutouts.
7. **Render previews** and report any unsupported constructs or uncertain results.
8. **Export** masks with consistent absolute positioning and registration marks.

### Layer and color rules
- Grouping or source-layer count **must not determine** film count.
- Two nonadjacent shapes with the same assigned ink share a mask.
- One SVG group containing three visibly distinct inks becomes three masks.
- Default **knockout**: when a topmost opaque shape covers another, the covered lower color is removed from its mask. This differs from overprint and should be explicit.
- Holes in compound paths must stay open. Treat fill rules correctly.
- Preserve intended stroke shapes, and handle transforms/z-order robustly.
- A color used only in fully occluded geometry must not generate an extra visible-film mask.
- Ink reassignment is based on identifiable source colors/geometry; resolve how changes affect occlusion deterministically and document the rule.
- Composite preview and film-mask geometry must be consistent with the chosen knockout policy.

### Scope limits and failure behavior
V1 supports **opaque flat-fill/stroke SVG vector shapes**. Complex alpha blending, gradients, filters, clipping/masking constructs that cannot be resolved reliably, embedded raster images, and photographic halftones are not automatically separated unless individually proven supported.

- Detect unsupported features during import/separation.
- Give intelligible, localized warnings and prevent misleading “ready to print” states.
- Never replace tricky vector geometry with raster approximations or silent guesses.
- Prefer a correct subset of SVG over an inaccurate claim of universal SVG support.
- SVG content must be sanitized against scripts, event handlers, external resource references, and unsafe embedded content.

### Design examples / acceptance scenarios
- Five objects, two distinct visible spot colors → exactly two masks.
- Same ink in several source groups → one combined mask.
- Grouped/compound single artwork with three different visible colors → three masks.
- Black typography atop yellow circle → yellow film has knockout where black is visible, black film has type.
- Compound path with hole → correct negative area in mask.
- Fully hidden shape → no extra print color solely because it exists in DOM.
- Merge two color assignments → resulting mask geometry includes both assigned color regions.
- Unsupported gradient/filter → actionable warning, no falsely correct export.

## 7. Physical printing/export requirements

**Purpose:** Output a transparency-film positive for UV exposure of a screen, **not** a colored final-image print.

- Each selected spot ink has **one separate sheet/film**.
- Exposed artwork area is represented by **opaque black vector shapes** on a transparent background.
- Maintain an **identical page coordinate system and artwork position** on all films.
- Add optional registration crosses at exactly matched coordinates, outside the artwork but inside printable page bounds.
- Emit physically dimensioned vector PDF pages and SVG documents with explicit size in mm and accurate `viewBox`.
- Default scale = **100% (1:1)**. Do not apply fit-to-page automatically; warn the user about printer dialogs that may scale PDFs.
- Offer A4 (210 × 297 mm) and A3 (297 × 420 mm), portrait/landscape as appropriate.
- Detect when selected artwork or marks exceed page area/margins. Browser/web app cannot guarantee a specific home printer's actual printable margin.
- The ink's display hue is **metadata only**; exported positive artwork is black.
- Text must be reliably converted to vector outlines before export; otherwise block the export with explicit guidance.
- Mirroring is optional, off by default; explain that the need depends on the exposure workflow and film orientation.
- If the user changes output scale away from 100%, clearly show the resulting physical size and warning.
- A multi-page PDF should include exactly one printable film per selected ink; avoid ink names or UI annotations intruding into the exposure region. Put any labels outside usable film region if used.
- Deterministic output: identical inputs/settings yield equivalent page and mask geometry.

**Note:** Correct file dimensions do not prove a printer prints correctly. Real-world print alignment and opacity depend on print settings, printer hardware, ink, and transparency stock. Document a physical test procedure.

## 8. Technical architecture

Suggested components:

1. **Input Engine** — clipboard MIME inspection, SVG file import, parsing, sanitization, safe validation.
2. **Artwork Engine** — source SVG storage, non-destructive object transforms, canvas display, text tool and outline conversion.
3. **Separation Engine** — geometry normalization, color extraction, occlusion/knockout, ink mapping, mask generation and diagnostics.
4. **Print Engine** — mm-based layout, registration marks, export SVG/PDF, physical-size validation.

### Suggested implementation
- **Frontend:** React + TypeScript + Vite.
- **UI:** Tailwind + shadcn/ui + Lucide icons.
- **Canvas:** SVG-based, not canvas raster screenshots for production output.
- **Geometry:** proven robust boolean vector path operations; validate library choice with test cases before committing.
- **Storage:** local persistence (e.g., IndexedDB) with JSON project model and original SVG sources; optional project file import/export later.
- **Export:** vector SVG + vector PDF generated client-side; choose library based on proof of accurate sizing, compound paths and font outlines.
- **No backend needed** for V1.

### Architectural boundaries
- Keep the separation engine as pure/testable TypeScript where feasible, independent of React.
- Maintain original vector artwork and non-destructive editing instructions as source of truth.
- Treat film masks as derived outputs and recompute when edits change inputs.
- Avoid destructive editing of original SVG source.
- Store sizes in millimeters with unambiguous units; normalize source pixel/viewBox measurements consciously rather than assuming source SVG widths represent mm.
- Ensure the preview and export use identical separation results.

### Starting model (illustrative, not exhaustive)

```ts
type PrintProject = {
  id: string;
  name: string;
  unit: 'mm';
  page: { width: number; height: number };
  artwork: ArtworkItem[];
  inks: PrintInk[];
  sourceColorToInk: Record<string, string>;
  printSettings: {
    paperSize: 'A4' | 'A3';
    scale: number; // 1.0 = 100%
    registrationMarks: boolean;
    mirrored: boolean;
  };
};

type ArtworkItem = {
  id: string;
  kind: 'svg' | 'text';
  sourceSVG?: string;
  text?: string;
  transform: {
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    rotationDeg: number;
  };
  visible: boolean;
  zIndex: number;
};

type PrintInk = {
  id: string;
  name: string;
  previewColor: string;
  enabled: boolean;
  printOrder: number;
};

type SeparationResult = {
  masksByInkId: Record<string, string>; // vector mask SVG data
  diagnostics: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    artworkItemId?: string;
  }>;
};
```

This model is a starting point, not a complete geometry/schema contract. Define stable element references, style resolution, ink mapping semantics, fill rules, and unit conversions in the implementation.

## 9. MVP feature list

### Must-have
- Paste/import supported SVG content.
- Informative import errors/raster clipboard fallback.
- Safe SVG parsing and validation.
- Interactive artwork canvas with move/scale/rotate/align, pan/zoom.
- Basic text tool with reliable vector path export.
- Automatic flat-color detection and visible geometry separation.
- Ink assignment, merging, renaming, enabling/disabling.
- Composite and individual black-mask previews.
- A4/A3, true physical sizing, registration marks, mirror toggle.
- Vector multipage PDF and per-ink SVG exports.
- Locally save/reload projects.
- Clear diagnostics and export gating for unsupported constructs.

### Explicitly out of scope in V1
- Node/Bezier drawing editor; bitmap vectorization.
- AI generation, full color management or ink simulation.
- Automatic photographic halftoning, gradients, transparency blending.
- Advanced trapping, overprint, automatic white underbase.
- Direct OS printer-driver integration.
- Account, server, cloud sync, real-time collaboration.
- Saved shirt mockups, screen presets, printer calibration wizard, multi-sheet tiling.

## 10. Implementation plan for Claude Code / Codex

Build in short, working increments; favor verified core behavior over broad demos.

### Phase 1 — Foundation & paste
- Scaffold the React/TS app and shared UI.
- Implement import area, paste handler and SVG file drag/drop.
- Sanitize and render simple SVGs safely.
- Document Figma/Illustrator interoperability and fallbacks.

**Exit:** A compatible SVG can be pasted or imported and visually inspected; raster-only inputs are rejected with instructions.

### Phase 2 — Separation engine (highest technical priority)
- Build SVG normalization and supported-style extraction.
- Implement geometric occlusion/knockout and per-color masks.
- Add source-color-to-ink mapping.
- Implement test fixtures: overlaps, holes, strokes, transforms, z-order, merged colors, unsupported cases.

**Exit:** Automated tests demonstrate correct per-ink black vector masks from representative multi-color SVGs.

### Phase 3 — Interactive editor
- Add source objects, basic transformations, text, ink sidebar and mask previews.
- Recompute separations when the design or mappings change.
- Provide meaningful loading, error, and empty states.

**Exit:** User can work end-to-end with pasted artwork before print export.

### Phase 4 — Print engine
- Implement page layouts in millimeters, marks, per-ink SVGs and multipage PDF.
- Verify bounding boxes and common origin across all films.
- Add 1:1 print instructions, clipping warnings and tests.

**Exit:** Generated PDF/SVG files are geometrically correct and physically dimensioned.

### Phase 5 — Persistence & physical test
- Local save/reopen.
- UX polish, keyboard behavior, accessibility, helpful diagnostics.
- Real print test on transparency media with 2–3 inks.

**Exit:** Printed films align at registration marks and dimensions fall within an explicitly chosen acceptance tolerance.

## 11. Definition of Done / acceptance tests

| Test | Expected result |
| --- | --- |
| Figma Copy as SVG → Paste | Compatible vector graphic imports, remains vector |
| Illustrator SVG clipboard → Paste | Compatible SVG correctly imports |
| Clipboard only PNG | Show fallback, do not silently pretend it is SVG |
| 5 objects, 2 visible colors | 2 separate ink masks |
| Same color on multiple groups | 1 shared ink mask |
| One group with 3 ink colors | 3 masks independent of group count |
| Yellow circle under black text | Correct geometric knockout in yellow mask |
| Compound path with hole | Hole remains uninked |
| Hidden/occluded geometry | Does not create spurious ink mask |
| Merge source colors | Correct combined print ink output |
| Scale artwork 200→250 mm | Exported mask physically measures 250 mm |
| Add text | Text exports as reliable vector outlines |
| 3 selected inks | 3 aligned black-mask PDF pages |
| Registration marks | Exact shared coordinates across all pages |
| Unsupported SVG gradient | Explicit diagnostic; export does not claim accuracy |
| Save and reopen | Artwork and ink settings retained |

### Critical physical acceptance test
Print a three-color example on three transparency sheets. Check that:
1. All registration marks line up when overlays are aligned.
2. Artwork dimensions match the intended mm values within a declared printer tolerance.
3. Film opacity is sufficient for the specific exposure setup (dependent on printer/media and not guaranteed by the software).
4. Resulting screens can be exposed and registered without additional graphics editing.

## 12. Known risks / guardrails

- **Copy/paste compatibility:** Must be verified per app/browser. Provide SVG file fallback; never make `⌘C` cross-app behavior a blanket promise.
- **SVG complexity:** Feature support must be explicitly bounded. Complex masks, filters, gradients, text/font references, external resources and compositing may invalidate naïve separation.
- **Geometric correctness:** Picking pixels by color or exporting PNGs is not acceptable for this vector-first product.
- **Print fidelity:** PDF physical dimensions and printer output are separate concerns. Warn about print-dialog scaling, printable margins and film opacity.
- **Text paths:** Fonts on another machine can differ. Convert text to outlines at export or reject with useful guidance.
- **Security:** Treat imported SVG as untrusted. Sanitize and disallow script/external resource execution.
- **Scope:** Do not spend V1 effort building an Illustrator competitor. The separation/film workflow is the product.

## 13. Instructions to the coding agent

1. Read this specification as the product source of truth.
2. Follow the fixed implementation plan in Section 14; do not replace it with a fresh generic plan. Validate risky library choices with focused proof-of-concepts, then execute the phases in order.
3. Use the stated product defaults without requesting additional product decisions unless truly blocking.
4. Implement working product behavior, not static mockups.
5. Prioritize the SVG paste → per-ink separation → correct print film vertical slice before extensive UI polish.
6. Add deterministic tests for geometry, overlap and physical sizing.
7. Never silently rasterize, simplify away, or otherwise falsify output from unsupported artwork.
8. Keep the application runnable after every phase and document run/test/build commands.
9. Provide clear diagnostics where SVG support is intentionally limited.
10. Treat successful vector film generation as the primary measure of progress.

---

## 14. Prescribed implementation plan (execute, do not re-plan)

This section is the **execution plan** for Claude Code / Codex. The phases, deliverables, and gates are specified. Do not stop after generating a plan or wireframes. Implement the application phase by phase; choose reasonable defaults. Where an external dependency proves unsuitable, document the finding, select an alternative that satisfies the same acceptance gate, and continue.

### 14.1 Rules of execution

- Implement phases **0 → 1 → 2 → 3 → 4 → 5 → 6** in order. Prioritize an end-to-end working SVG-to-films vertical slice before polishing.
- At every phase end: run applicable tests, run `npm run build`, commit coherent changes if a repository and commit permissions are available, and update `docs/IMPLEMENTATION_STATUS.md` with completed items, known limitations, and the next phase.
- Never substitute a raster image or a screenshot for the geometric vector separation/export requirement. Block unsupported inputs with actionable errors.
- Do not invent successful cross-application clipboard support: test real clipboard MIME types and report browser/app limitations.
- Do not claim physical print fidelity based on a digital-only test; use the physical checklist in Phase 6.
- If tests fail, fix the failure before moving to the next phase. Keep the app bootable throughout.
- Treat the output specs and acceptance gates in this file as the definition of success; avoid unsolicited scope expansion.

### 14.2 Repo layout (target)

```text
frame/
  docs/
    FRAME_Product_Specification.md
    IMPLEMENTATION_STATUS.md
    SUPPORTED_SVG.md
    PRINT_VERIFICATION.md
  src/
    app/                   # routes, layout, state wiring
    components/            # UI components
    features/import/       # clipboard, drag-and-drop, sanitization
    features/editor/       # canvas, selection, transform, text
    features/inks/         # assignments, palettes, color UI
    core/svg/              # SVG input, canonicalization, validation
    core/geometry/         # path conversion, clipping, boolean ops
    core/separation/       # source-color to print-ink masks
    core/print/            # film layout, marks, SVG and PDF output
    core/project/          # typed schemas, serialization, migrations
    test/fixtures/         # known input SVGs and expected outputs
    test/helpers/
  package.json
```

Use strict TypeScript and a test runner such as Vitest. Keep `core/` modules free of React/browser UI dependencies where feasible. Pin library versions, check their licenses, and evaluate Boolean geometry/PDF libraries with targeted fixtures before adopting them.

### Phase 0 — Bootstrap and risk spikes

**Build:** Initialize Vite + React + TypeScript; Tailwind + shadcn/ui + Lucide; lint/format/typecheck/tests. Create minimal route structure (Import, Editor, Print) and shared project types. Make small isolated tests proving (a) supported SVG → normalized path geometry; (b) path union/difference preserving holes; (c) vector PDF containing an exact-size rectangle and registration marks. Document the selected libraries and known limitations. Add `SUPPORTED_SVG.md` with a provisional capability matrix.

**Deliverables:** Running app shell, CI-friendly scripts (`dev`, `build`, `test`, `typecheck`, `lint`), geometry/PDF proof-of-concept tests, written library decisions.

**Gate:** Clean build/typecheck; programmatic vector PDF dimensions verifiable; path difference yields an actual hole; no bitmap-only fallback.

### Phase 1 — Secure import and clipboard

**Build:** SVG file picker/drag-drop and document-level paste when focus is not in an editable input. Handle `image/svg+xml`, `text/plain` containing valid SVG markup, and supported SVG `File` clipboard payloads. Validate XML safely, sanitize against scripts/event handlers/foreignObject/remote references, report unsupported features, and store original SVG along with normalized internal representation. Show meaningful clipboard fallback when only raster content is present. Add an explicit menu/help note for Figma `Copy as SVG` and Illustrator SVG clipboard settings.

**Deliverables:** Import screen; informative loading/error/unsupported states; sanitize and clipboard MIME tests.

**Gate:** A known 2–3 color SVG file loads with correct appearance and preserved vector content; malicious/untrusted SVG cannot run scripts or fetch remote content; raster-only paste does not claim vector support.

### Phase 2 — Canonical vector geometry and separation engine (highest priority)

**Build:** Support the documented V1 subset: opaque flat fills; strokes (expand to filled outlines as needed); nested groups; transforms; compound paths/fill rules; clipping only if proven by tests. Resolve object draw order and geometric occlusion; for each visible ink color construct masks with knockout difference from later visible objects, preserving true negative space. Extract distinct *visible* colors, not source group IDs. Support same-color unions and user mapping of multiple source colors to one print ink. Return normalized masks plus diagnostics. Prefer deterministic integer/controlled-precision geometry and validate tolerance trade-offs. Keep mapping and geometry pure and testable.

**Fixture tests:** one group containing 3 colors; same color in separate groups; fully hidden shape; circle under text-shaped path; compound hole; nested transforms; stroke overlap; overlapping shapes; two input colors merged into one ink; empty mask must not create a film.

**Deliverables:** `separateArtwork(artwork, inkMapping, options)` (or equivalent) with typed results, accurate SVG masks, diagnostics, and unit/golden tests.

**Gate:** Every supported fixture generates the expected number of distinct masks and correct knockout/holes. Previewing exported masks as black shapes shows correct silhouette. Unsupported gradient/filter/alpha cases yield explicit errors and do not silently produce approximate films.

### Phase 3 — Minimal functional editor and ink controls

**Build:** A responsive desktop editor: artwork list on left; centered canvas showing paper/artwork bounds; ink inspector on right. Allow select/move/scale/rotate with numeric millimeter inputs and direct manipulation; keep objects non-destructive. Add text using a supported font and deterministic conversion to paths. Detect colors automatically, list mask count, toggle per-ink preview, rename and reassign/merge inks. Recompute separation after edits. Make keyboard shortcuts intuitive (`Cmd+V`, undo/redo, delete, escape, zoom-to-fit). Ensure input fields still paste normal text.

**Deliverables:** Working Design/Separation screen, visual mask preview, basic text tool, non-destructive edits, keyboard handling.

**Gate:** Paste a compatible multi-ink SVG, resize it to a known mm width, merge two colors, add a text label, and obtain correctly regenerated vector masks without refreshing the page.

### Phase 4 — True-size film-positive output

**Build:** Print view with A4/A3 page selection, portrait/landscape as appropriate, 100% physical dimensions default, optional mirror, on/off registration marks, and preflight checks. Generate one **black-only** vector film per enabled nonempty ink, with identical coordinate origin and registration marks across pages; ink label outside the exposure area if practical. Generate individual SVG files with physical `width`/`height` in `mm`, correct `viewBox`, and a multipage vector PDF with physical sizes expressed in points (`1 mm = 72/25.4 pt`). Keep mask opacity black; the PDF page background is not part of the exposed film art. Flag out-of-bounds and printer margins; never silently scale or crop to fit. Browser print can open/export the PDF, but it must not claim to control printer-driver scaling.

**Deliverables:** Print preparation UI; downloadable per-ink SVGs; multipage PDF; preflight summary.

**Gate:** For a three-ink fixture, PDF has exactly three physical-size pages; all marks align numerically at the same coordinates; a 100 mm test shape measures 100 mm in the generated document; visual vector path content survives export. No PDF page is a flattened screenshot.

### Phase 5 — Projects, reliability, UX polish

**Build:** Autosave locally (IndexedDB preferred for project payloads; or size-aware alternative), project list/open/duplicate/delete, robust versioned serialization, recoverable import/export errors and clear unsaved/loading indicators. Polish empty states, onboarding and accessibility (keyboard, focus, labels). Add helpful ink/color warnings and a single clearly worded “Ready for films” state only when preflight passes. Keep all data local, avoid remote artwork uploads.

**Deliverables:** Functional local project lifecycle, polished core experience, error and accessibility improvements.

**Gate:** Reload browser, reopen existing project, change a color mapping, regenerate the same masks and export with the same physical measurements. No backend required.

### Phase 6 — End-to-end acceptance and print verification

**Build:** Create a set of reference SVG designs and expected masks checked into `test/fixtures/`. Add integration tests for SVG file import → automatic separation → ink mapping → PDF/SVG generation. Capture supported browser/OS clipboard behavior from real manual tests. Provide `PRINT_VERIFICATION.md` with a one-page procedure: print 100 × 100 mm calibration target at 100% / Actual Size; measure both axes; print a 3-color set on compatible transparency film; overlay registration marks; check minimum print margins, opacity, screen exposure and registration on the user's actual equipment. Distinguish tests software can verify from physical tests a human must complete.

**Deliverables:** Passing automated suite, documented cross-app paste behavior, print-verification checklist, limitations and final setup commands.

**Gate:** All Section 11 digital acceptance tests pass for the supported input subset; physical print test is either performed and documented or explicitly marked **pending user verification**. No unsupported physical success claim.

### 14.3 Scope discipline and fallback decisions

- If SVG geometry handling is more difficult than anticipated, narrow **documented supported SVG features**, not the vector-only guarantee. Prioritize filled paths, grouped shapes, transforms and holes; label all other cases unsupported instead of rendering misleading masks.
- If a clipboard supplies only a PNG, suggest Figma `Copy as SVG`, Illustrator SVG clipboard, or `.svg` import. No bitmap vectorization in V1.
- If advanced fonts cannot be robustly outlined, ship a deliberately limited list of supported bundled/installed fonts with a reliable outline implementation; do not export `text` that might substitute fonts silently.
- If PDF integration is delayed, still finish the accurate per-ink SVG exporter first; PDF remains a required V1 completion gate.
- If print-driver settings are inaccessible, show user instructions rather than claiming automatic printer configuration.

### 14.4 Final agent response format

On implementation completion, report: (1) runnable app and setup commands, (2) implemented phases and passed tests, (3) SVG feature support and limits, (4) demonstrated SVG → separation → per-film output example, (5) print steps and any pending physical verification. Do not respond with another unexecuted implementation plan.

---

**North star:** A user pastes compatible multi-color vector art and receives usable, correctly registered screen-print film positives without having to manually rebuild the graphic in another design tool.
