# Script Version Compare Design QA

- Source visual truth: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-d1a6302e-81cd-469e-89f7-e63867ae329f.jpg`
- Browser-rendered implementation: `/private/tmp/ai-script-version-compare-final.png`
- Combined comparison evidence: `/private/tmp/ai-script-version-compare-qa.png`
- Browser viewport: 1280 × 720 CSS pixels, device density 1x
- Source pixels: 2048 × 1092
- Implementation pixels: 1280 × 720
- Normalization: both artifacts were scaled into equal 1024-pixel comparison panels without changing aspect ratio.
- State: logged-in script polish workbench, history modal open, full-screen V1 versus V2 compare open.

## Full-view comparison evidence

The implementation follows the useful layout principles in the source: a dedicated full-screen comparison workspace, equal left/right version panes, version selectors above each pane, and a narrow central synchronization rail. The content medium intentionally differs: the source compares video frames and timelines; this implementation compares two complete script tables.

## Focused region comparison evidence

The dense table region was checked separately in the in-app browser. Both versions expose the same eight columns, use fixed equal row heights, keep headers visible, clamp long cell content, expose full cell content through the native title tooltip, highlight old/new differences with distinct amber/green states, and preserve aligned rows while scrolling.

## Findings and iteration history

1. P1 — the first implementation was rendered under the Ant Design modal mask, so the full-screen workspace looked dim and was not visually independent.
   - Fix: render the full-screen comparison into `document.body` through a portal with its own layer.
   - Post-fix evidence: the final implementation screenshot shows an unobstructed full-screen workspace.
2. P1 — fixed pixel column widths hid the final three fields in each pane at a 1280-pixel viewport.
   - Fix: replace pixel widths with compact percentage widths so all eight fields remain visible in both panes.
   - Post-fix evidence: the final screenshot shows 镜号、景别、运镜、画面描述、台词、时长、卖点体现、备注 in both panes.
3. P2 — variable row content could make the two versions drift vertically.
   - Fix: lock table rows to 58px, clamp visible text to three lines, and keep full text on hover.
   - Post-fix evidence: corresponding rows remain aligned across the center axis.
4. P1 — two pane-level scroll areas made continuous wheel and trackpad movement feel resistant because the panes were repeatedly mirroring each other.
   - Fix: remove both inner scroll containers and give the entire comparison stage one native vertical scroll track. Both tables now move as a single layout without JavaScript scroll mirroring.
   - Post-fix evidence: browser interaction testing moved the shared stage directly from `scrollTop 0` to `262.5`; both inner table wrappers report `overflow: visible`, and both sticky table headers remain visible after scrolling.

## Required fidelity surfaces

- Fonts and typography: uses the existing application system-font stack, compact 10–12px table typography, stronger hierarchy for screen and version titles, and truncation for long labels.
- Spacing and layout rhythm: full viewport is used; two equal panes, a 58px center gap, compact toolbars, fixed row rhythm, and contained scroll areas match the source's comparison-workspace density.
- Colors and visual tokens: retains the product's dark green system, uses amber for the old value and green for the new value, and maintains readable contrast.
- Image quality and asset fidelity: no image assets are required by the script-table implementation. Existing Ant Design icons are used for back, close, link, and history affordances.
- Copy and content: labels are product-specific and concise: 改前版本、改后版本、同步、差异、返回版本记录.

## Primary interactions tested

- Open history and launch full-screen compare.
- Close and reopen full-screen compare.
- Switchable left/right version selectors render.
- Both tables parse and render all script columns and rows.
- One native shared scroll track for both tables; wheel and trackpad work from either pane or the center area.
- Difference count and changed-cell highlighting.

## Console check

No implementation-specific runtime errors remained in the final pass. One unrelated existing Ant Design `destroyOnClose` deprecation warning remains elsewhere in the page.

## Residual P3 polish

- A future iteration could add click-to-expand cell detail without changing the compact comparison layout.

final result: passed

---

# LibLib Wide Text Prompt Editor Fidelity QA

- Source visual truth: `/private/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-d71a476f-e273-4a5a-aad1-e4f75502f171.png`.
- Browser-rendered implementation: `/private/tmp/ai-script-text-node-large-final.png`.
- Focused side-by-side comparison: `/private/tmp/ai-script-text-node-comparison-final.png`.
- Source pixels: 1540 × 886; implementation pixels: 1280 × 720 at 1x browser capture density.
- Normalization: source visible editor crop 1267 × 296 scaled to 1208 × 282; implementation editor crop 1208 × 274 padded vertically to 1208 × 282.
- State: one text creator selected, prompt empty, `GVLM 3.1` selected, model menu closed, editor not expanded.

## Full-view and focused comparison evidence

Both source and implementation were opened, then the editor regions were normalized and placed side by side. The implementation now uses the same wide, dark prompt surface, upper-right expand control, large prompt hierarchy, and bottom model / language / credit / submit control row. The selected compact node remains visible above the viewport-level editor and the bottom canvas toolbar remains unobstructed.

## Required fidelity surfaces

- Fonts and typography: prompt copy resolves to 26px in the wide state; the `GVLM 3.1` label uses a 24px semibold treatment, with muted utility labels and matching hierarchy.
- Spacing and layout rhythm: the text editor is responsive up to 1320px, measures 1208 × 274 at the 1280px verification viewport, retains a 36px canvas inset, and preserves the source's prompt-to-toolbar proportions and 22px outer radius.
- Colors and visual tokens: charcoal editor surface, muted gray placeholder, bright model label, subdued credit count, and light-gray submit state align with the source.
- Image quality and asset fidelity: this editor contains no raster imagery. All visible actions use Ant Design icons already used by the product; no improvised SVG, CSS drawing, emoji, or placeholder asset was introduced.
- Copy and content: story/scene/character prompt, `GVLM 3.1`, translation action, six-credit estimate, expand action, and submit semantics are present and readable.

## Primary interactions tested

- Create a text node and click it to reveal the editor only in the selected state.
- Open the four-option model menu and verify its model metadata is exposed.
- Expand and collapse the prompt editor.
- Verify submit is disabled while empty, becomes enabled after prompt entry, and runs the local generation flow.
- Verify the editor remains within the canvas and does not cover the persistent bottom toolbar.
- Browser console check contains only the previously recorded React Router, Ant Design, and React Flow development notices; no implementation-specific runtime error was introduced.
- Scoped ESLint, TypeScript production build, Vite production build, and `git diff --check` pass.

## Comparison history

1. [P1] The text editor remained at the earlier compact 660 × 148 geometry after the image and video editors had moved to the newly supplied wide LibLib layout.
   - Fix: treat text as a wide viewport-level editor, cap it at 1320px, use the same responsive canvas insets, and estimate its selected-state height before placement.
   - Post-fix evidence: `/private/tmp/ai-script-text-node-large-final.png` and `/private/tmp/ai-script-text-node-comparison-final.png`.
2. [P2] The first wide pass left the model label visually too light and small relative to the new source.
   - Fix: apply the wide-state 24px semibold label directly to the model text and enlarge its provider/down glyphs and the language utility icon.
   - Post-fix evidence: the final focused comparison shows equivalent toolbar hierarchy and alignment.

## Follow-up polish

- P3: LibLib's provider and language glyphs are proprietary; the implementation uses the closest production icons from the existing Ant Design set.

final result: passed

---

# LibLib Image, Video, and Script Editor Fidelity Design QA

- Source visual truth: authenticated LibLib image-node capture at `/private/tmp/liblib-image-node-selected.png` and the supplied selected-image reference `/private/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-fb580357-d8a1-49a8-9f64-1e934a4d5047.png`.
- Browser-rendered implementations: `/private/tmp/ai-script-image-node-selected-v2.png`, `/private/tmp/ai-script-video-node-selected-v2.png`, and `/private/tmp/ai-script-script-node-selected-v2.png`.
- Focused side-by-side comparison: `/private/tmp/liblib-ai-script-image-editor-comparison-v2.png`.
- Source browser screenshot: 914 × 966 pixels at 1x; implementation screenshots: 1280 × 720 pixels at 1x.
- Normalized focused region: 554 × 260 pixels from each image editor, aligned at the editor's upper-left corner.
- States: one image, video, or script creator selected; menus closed; image prompt empty; video and script populated with realistic workflow content.

## Full-view comparison evidence

The source and implementation browser captures were opened and inspected. The surrounding workflows differ, so graph placement is excluded from the component-level judgment. In all implementation states, the compact node remains in the zoomed graph and the selected editor is rendered as an independent viewport surface anchored beside it. Browser measurements report 660 × 259 for image, 660 × 259 for video, and 660 × 245 for script.

## Focused region comparison evidence

The visible 554-pixel portion of the authenticated LibLib image editor and the equivalent local region were cropped to 554 × 260 and placed side by side. Both use the same charcoal surface, compact reference pills, low-contrast prompt copy, a consolidated model trigger, a consolidated parameter summary, utility actions, credit estimate, and rounded submit control. The implementation's 132px prompt area and 59px toolbar reproduce the source's compact selected-editor proportions. The source includes an uploaded reference thumbnail; the local default image node correctly omits it because no asset is attached.

## Required fidelity surfaces

- Fonts and typography: compact Chinese system sans-serif, 14px prompt copy, 11–12px controls, muted secondary labels, and equivalent toolbar hierarchy.
- Spacing and layout rhythm: all three editors are 660px wide. Image/video measure 259px high and script 245px; 16px outer radius, reference/suggestion strip, prompt area, and footer follow the source's density.
- Colors and visual tokens: `#242525` primary surface, subtle white hover fills, muted gray placeholders, near-white primary labels, cyan active indicator, and light disabled submit treatment.
- Image quality and asset fidelity: uploaded source thumbnails use their actual raster URL when present; empty local nodes do not fabricate imagery. Standard controls use the project's Ant Design icon family.
- Copy and content: image, video, and script placeholders and model/parameter labels are specific to each creation task. Video exposes first frame, end frame, and motion references; script exposes product-selling, spoken, and storyboard starters.

## Primary interactions tested

- Select image, video, and script nodes independently and verify only the selected creator shows an editor.
- Open and close the custom image-model menu.
- Open the image-parameter panel, change the aspect ratio from `16:9` to `9:16`, confirm the summary updates, then restore `16:9`.
- Verify video parameters show ratio, duration, and shot count; credit cost derives from shot count.
- Use a script starter to populate the prompt and verify the generate action becomes enabled.
- Expand an editor and verify `ResizeObserver` repositions the overlay to keep the larger surface inside the canvas viewport.
- Verify model and parameter menus remain screen-sized and do not inherit React Flow zoom.
- Console check found only pre-existing React Router future notices, an Ant Design deprecation notice, and React Flow hot-reload warnings; no implementation-specific runtime failure occurred.

## Comparison history

1. [P1] Image and video parameters were originally rendered as several browser-native selects, producing a generic form-like footer unlike LibLib.
   - Fix: replace native controls with a custom model selector and a consolidated parameter trigger whose panel edits ratio, quality, resolution, duration, and batch count.
   - Post-fix evidence: the focused image comparison shows the same model-plus-summary toolbar structure.
2. [P1] The first media-editor pass was 442px high while the authenticated LibLib selected image editor was approximately 250px high in its normal state.
   - Fix: reduce the normal media prompt region to 132px while preserving a functional expanded state.
   - Post-fix evidence: browser measurement reports 660 × 259 and `/private/tmp/liblib-ai-script-image-editor-comparison-v2.png` shows aligned vertical density.
3. [P2] Expanded editors could extend beyond the viewport because placement used a fixed height estimate.
   - Fix: observe the rendered overlay height and recalculate above/below placement whenever the editor expands or collapses.
   - Post-fix evidence: expanded-state interaction remains reachable inside the local canvas.

## Follow-up polish

- P3: LibLib uses proprietary provider glyphs; the implementation uses the closest matching icons already shipped with the product.
- P3: A source reference thumbnail appears only when the node has an attached `assetUrl`; the default product-scene node intentionally remains empty.

final result: passed

# LibLib-style Full Canvas Design QA

- Source visual truth: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-a45e7351-2bc9-42b5-a638-ccb0b1a08416.png`
- Browser-rendered implementation: `/Users/jingxi/Desktop/projectmoneny/ai-script/doc/design-audit/15-local-add-menu-aligned.png`
- Route: `http://127.0.0.1:4173/workspace?step=visual`
- Source pixels: 3576 × 1962; implementation pixels and CSS viewport: 2048 × 1124 at 1x.
- Density normalization: the source was proportionally normalized to 2048 × 1124 by the visual comparison viewer; crops and aspect ratios are equivalent.
- State: authenticated visual workflow canvas with the bottom add-node menu open.

## Full-view comparison evidence

The source and implementation were opened together in one comparison input at the same 1.822:1 aspect ratio. Both now use a true edge-to-edge dark canvas, compact floating controls in both top corners, large content-first nodes, a centered bottom toolbar, and a vertical add menu anchored to the toolbar's first button. The requested no-grid treatment is an intentional deviation from the source's faint dotted texture because the user explicitly asked for a plain canvas background.

## Focused region comparison evidence

The bottom toolbar and add-menu region was checked at 2048 × 1124. The menu matches the source's narrow width, dark elevation, row rhythm, section divider, icon-label-badge structure, and left-button anchoring. Its visible actions are 文本、图片、视频、智能剪辑、导演台、逐帧拉片、音频、脚本、素材库、上传、从生成历史选择.

## Findings and comparison history

1. P1 — the first implementation still exposed the product rail and project step sidebar, so the canvas was not full-window.
   - Fix: collapse both grid tracks to zero in visual/video mode, remove their pointer targets, and let the React Flow stage own the complete viewport.
   - Post-fix evidence: `15-local-add-menu-aligned.png` has uninterrupted canvas from the left to right viewport edges.
2. P1 — the original “＋” opened a large searchable node-library panel instead of the source's compact function list.
   - Fix: replace it with a 226px vertical action menu and map each supported row to a real workflow-node type.
   - Post-fix evidence: the open-state screenshot matches the source hierarchy and menu density.
3. P2 — the first bottom toolbar had too few functions and the add menu was centered over the whole toolbar.
   - Fix: expand the toolbar to 13 controls and anchor the menu above the first add button.
   - Post-fix evidence: the menu center aligns with the add/close button, matching the reference.
4. P2 — fitting every node made the initial graph too small at wide viewports.
   - Fix: constrain initial fit to 0.86–1.08 zoom so nodes remain substantial and the user pans for the rest of the canvas.
   - Post-fix evidence: the final 2048px capture retains readable, content-first nodes instead of thumbnail-scale cards.

## Required fidelity surfaces

- Fonts and typography: the app's established Chinese system-font stack is retained; floating chrome uses compact 10–12px optical sizing and the menu uses readable 12px labels.
- Spacing and layout rhythm: full-viewport stage, 12–14px top offsets, 14px bottom toolbar offset, 38px menu rows, and consistent 8–14px radii match the source's compact dark UI.
- Colors and visual tokens: near-black `#111212` canvas, charcoal floating surfaces, low-contrast borders, white/gray icons, and restrained blue badges reproduce the reference palette while keeping the requested plain background.
- Image quality and asset fidelity: this structural state does not require source imagery; Ant Design icons are used throughout and no improvised CSS/SVG icon assets were introduced.
- Copy and content: all visible controls use product-specific Chinese labels; badges and resource sections follow the reference terminology.

## Primary interactions tested

- Open and close the add-node menu.
- Add an image node and verify the graph changes from six to seven nodes.
- Undo the added node and verify the graph returns to six nodes.
- Use the full-screen canvas at 1280 × 720 and 2048 × 1124.
- Verify bottom toolbar accessibility labels, auto-layout/fit controls, undo/redo state, minimap toggle, share/save actions, Agent toggle, and next-step control are present.
- TypeScript, scoped ESLint, production Vite build, and `git diff --check` pass.

## Residual P3 polish

- Provider-backed audio generation remains a clearly messaged planned capability; all existing image/video/workflow nodes are functional.

final result: passed

---

# Unified Task Center & Batch Script Download Design QA

- Source visual truth: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-5b0cd3d1-e75d-4c73-9dd1-4daf39c95e63.jpg`
- Browser-rendered implementation: `/private/tmp/ai-script-task-center-generation.png`, `/private/tmp/ai-script-task-center-downloads.png`, and `/private/tmp/ai-script-task-center-mobile.png`
- Combined comparison evidence: `/private/tmp/ai-script-task-center-qa.png`
- Browser viewports: 1440 × 900 desktop and 390 × 844 mobile CSS pixels.
- States checked: generation queue, download queue, success/failure/pending/running export cards, script multi-selection, newly-created batch export, and mobile full-screen presentation.

## Visual comparison

The implementation carries over the source's defining layout: a persistent launcher, a wide panel anchored to the right edge, a clear two-tab task switcher, and vertically stacked task records. The panel intentionally keeps AI Script's existing dark Nano theme instead of copying the unrelated reference application's white transfer sheet.

## Findings and iteration history

1. P1 — the existing queue component was mounted only in an unused `MainLayout`, so the launcher was absent from the active router.
   - Fix: mount the unified task center from `RequireAuth`, which is the actual wrapper for every authenticated route.
   - Post-fix evidence: the launcher and task drawer render on the authenticated Assets page and persist while navigating its library views.
2. P2 — the reference panel was too narrow for status-rich batch export cards if copied literally into the existing product shell.
   - Fix: use a 560px desktop drawer with restrained card density and collapse it to a full-screen 390px mobile sheet.
   - Post-fix evidence: ZIP name, count, progress, timestamps, expiry, error copy, and actions remain visible without horizontal clipping.
3. P1 — batch selection originally had no visible handoff into the background queue.
   - Fix: after creating an export, close selection mode, update the task count, open the panel directly on “下载任务”, and show a completion-notification promise.
   - Post-fix evidence: selecting two scripts created a new pending ZIP card and increased the active-task count from three to four.

## Primary interactions tested

- Open and close the persistent task center launcher.
- Switch between “生成任务” and “下载任务”.
- Change generation concurrency controls in the panel.
- Enter script batch-selection mode, select two scripts, and create an export task.
- Verify automatic opening of the download tab and immediate pending-task feedback.
- Render pending, running, success, failed, cancel, retry, download, progress, file-size, and expiry states.
- Render the same task center at 390 × 844 as a full-screen, vertically scrolling mobile panel.

## Console check

No implementation-specific browser errors were observed. The only warnings are pre-existing React Router v7 future-flag notices from the development environment.

final result: passed

---

# Script Source Metadata & Restore Comments Design QA

- Source visual truth: the five annotated screenshots supplied in this task (`codex-clipboard-cb5e3f1b...png` through `codex-clipboard-24e10d0e...png`).
- Browser-rendered implementation: `/private/tmp/ai-script-source-list.png`, `/private/tmp/ai-script-template-preview.png`, and `/private/tmp/ai-script-original-preview.png`, captured from the local mock workspace at `http://127.0.0.1:4173/workspace?projectId=project-1&step=storyboard`.
- Browser viewport: 1280 × 720 CSS pixels.
- States checked: platform-template list, compact template preview, compact AI-original preview, full template polish dialog, full AI-original polish dialog.

## Visual and interaction checks

1. The list header and every row use the same six-column grid. “模板名字” is immediately after “脚本类型”; a template row displays “痛点解决型”, while non-template rows display “-”.
2. At the 1280px QA viewport the table uses a safe horizontal scroll range instead of clipping the action column. Measured header/row columns are identical: `150px 118px 90px 148px 84px 334px`.
3. Template metadata order is `模板名称 → 时长 → 格式`. The compact preview showed `痛点解决型 → 分镜脚本表`; the full dialog showed `痛点解决型 → 时长未记录 → 分镜脚本表` for an old mock record without a duration snapshot.
4. AI-original metadata order is `原创大类 → 时长 → 格式 → 原创子类`. The compact preview showed `电商 → 分镜脚本表 → 产品介绍口播`; the full dialog showed `电商 → 时长未记录 → 分镜脚本表 → 产品介绍口播`.
5. Long source labels are capped, ellipsized, and the metadata row wraps. Old records no longer borrow the current generator dropdown values; missing duration is explicitly labeled “时长未记录”.
6. Restore-comment behavior is implemented with a persisted `restoredFromVersionId` lineage plus content-equivalent version fallback. Comment markers, historical styling, actionable count, and the “按评论修改” enabled state share the same classifier. AI/manual edits transition `已审需修改` to `已改待审核`.

## Console check

No implementation-specific runtime errors were observed. One unrelated existing Ant Design `destroyOnClose` deprecation warning remains.

final result: passed

---

# LibLib Native Editor Nodes Design QA

- Source visual truth: `/private/tmp/liblib-image-node-selected.png`, `/private/tmp/liblib-resource-node-selected.png`, `/private/tmp/liblib-text-node-selected.png`, and the supplied node-menu crops.
- Browser-rendered implementation screenshot: unavailable
- Intended implementation route: `http://127.0.0.1:4173/workspace?step=visual`
- Source pixels: menu crop 370 × 856; image-node crop 1110 × 1024.
- Intended QA viewport: 1110 × 1024 CSS pixels at 1x.
- State: image node selected versus resource node selected. The image state shows a separate editor below the compact node; the resource state shows no editor.

## Full-view comparison evidence

The supplied screenshots and the authenticated live LibLib canvas were opened and inspected. The live interaction confirmed that an image node remains compact and gains a separate editor panel only while selected; selecting a resource node removes the panel. A selected text node was captured and its model menu was opened to verify all four text-model choices. The local route opened in the in-app browser, but redirected to the login screen, so the selected local text-node state could not be captured. Code inspection and a successful build are not substitutes for rendered visual evidence, so no visual-match claim is made.

## Focused region comparison evidence

Blocked for the same reason. The intended focused comparison is the complete image-node editor, especially the 16:9 media region, reference strip, natural-language textarea, bottom model/ratio/quality/resolution/count controls, and the two side connection handles.

## Findings

- [P1] Rendered visual comparison unavailable.
  - Location: local visual workflow route.
  - Evidence: the source screenshots are available, but the selected browser reached the local login screen instead of an authenticated visual-workflow route.
  - Impact: typography, final spacing, toolbar wrapping, and node scale cannot be certified against the source.
  - Fix: open the local route in an accessible browser state, capture the image node at 1110 × 1024, place it beside the source crop, and iterate on any visible mismatch.

## Implementation evidence available

- Text, image, video, and script generator are explicit entries in the base-node menu.
- Creator nodes remain compact when idle and show a separate editor panel only while selected.
- Image and video editor panels include reference controls, prompt input, and provider parameter toolbars; their compact nodes retain only preview/output content.
- Product, scene, character, script asset, result, and note resources never render the generation editor panel.
- Both left and right React Flow handles remain connectable in loose connection mode.
- TypeScript, scoped ESLint, production Vite build, and `git diff --check` pass.

## Comparison history

- Interaction-state correction: newly created nodes are now inserted unselected, so creation only places the compact node. The creator input/parameter editor appears after the user explicitly clicks the node; resource nodes remain compact on selection.
- Text-node parameter correction: the selected LibLib text node was inspected in the authenticated canvas. Its editor toolbar uses a text-model selector (`GVLM 3.1`, `CVLM 5.5`, `GVLM 3.1 Flash`, `Qwen 3 VL Flash`), a language-processing action, six-credit estimate, and a compact submit control. The local text editor now mirrors that control structure instead of showing only a static text/character-count footer.

- Initial implementation mismatch identified from the source: creator editors were always expanded, while resources also exposed prompt inputs.
- Fix applied: split node kinds into creator and resource behavior, keep all nodes compact by default, show the editor only for a selected creator, and introduce a separate script-generator kind so a script asset remains read-only on the canvas.
- Post-fix visual evidence: blocked because a browser-rendered screenshot could not be captured.

final result: blocked

---

# LibLib Text Editor Fidelity Design QA

- Source visual truth: `/private/tmp/liblib-text-node-selected.png`
- Browser-rendered implementation: `/private/tmp/ai-script-text-node-selected-v4.png`
- Focused side-by-side comparison: `/private/tmp/liblib-ai-script-text-editor-comparison-v2.png`
- Source full screenshot: 914 × 966 pixels at 1x; implementation full screenshot: 1280 × 720 pixels at 1x.
- Normalized focused region: source editor 662 × 148 pixels; implementation editor 660 × 148 pixels, padded by one pixel on each side to 662 × 148 before comparison.
- State: one text creator node selected, prompt empty, `GVLM 3.1` selected, model menu closed.

## Full-view comparison evidence

Both full browser captures were opened. The surrounding graphs use different content and viewport sizes, so overall node placement is intentionally excluded from this component-level judgment. In both states the selected compact node remains in the zoomed workflow while the editor is rendered as a screen-sized surface below it; the implementation no longer scales the input panel down with the React Flow viewport.

## Focused region comparison evidence

The source and implementation editors were cropped to their exact visible bounds and placed together in `/private/tmp/liblib-ai-script-text-editor-comparison-v2.png`. Their heights match at 148 pixels, widths differ by two pixels, corner radius and charcoal surface are visually aligned, the placeholder occupies the same upper-left region, and the bottom toolbar uses the same model / translation / credit / compact-submit hierarchy. The implementation also includes the source's upper-right expand control.

## Required fidelity surfaces

- Fonts and typography: both use a compact Chinese system sans-serif, 14px prompt copy, 12px model label, and muted secondary controls with equivalent line height and optical weight.
- Spacing and layout rhythm: the implementation measures 660 × 148 versus the 662 × 148 source. Prompt and toolbar heights are 98px and 48px, matching the source proportions; padding, 16px radius, and right-control spacing align in the focused comparison.
- Colors and visual tokens: near-identical `#242525` charcoal surface, muted gray placeholder, white model name, low-emphasis credit count, and light-gray disabled submit state.
- Image quality and asset fidelity: the editor has no raster assets. All visible controls use Ant Design icons; the text-model mark uses the library-provided `OpenAIOutlined` instead of an improvised graphic.
- Copy and content: placeholder, model names, latency labels, model descriptions, six-credit estimate, translation action, expand action, and submit semantics reflect the authenticated LibLib reference.

## Primary interactions tested

- Create a text node and verify it remains compact and unselected.
- Click the text node and verify the 660 × 148 viewport-level editor appears.
- Open the custom model menu and switch from `GVLM 3.1` to `CVLM 5.5`, then restore `GVLM 3.1`.
- Expand the editor to 288px and collapse it back to 148px.
- Verify the submit button is disabled for an empty prompt.
- Verify the editor stays independent of canvas zoom.
- Console check found only pre-existing React Router future-flag notices, an Ant Design deprecation notice, and React Flow HMR warnings; no implementation-specific runtime error occurred.
- TypeScript, scoped ESLint with zero warnings, production Vite build, and `git diff --check` pass.

## Comparison history

1. [P1] The editor originally lived inside the React Flow node and inherited canvas zoom, making it much smaller and visually unlike the source.
   - Fix: move creator editors into a viewport-level overlay anchored to the selected node's rendered bounding box.
   - Post-fix evidence: implementation editor remains 660px wide while the graph is zoomed out, matching the 662px source editor.
2. [P1] The original native `<select>` and generic footer looked like a form rather than LibLib's model control.
   - Fix: replace it with a custom model trigger and four-item dark model menu, plus matching translation, credit, expand, and submit controls.
   - Post-fix evidence: `/private/tmp/ai-script-text-model-menu-v3.png` and the focused side-by-side comparison.
3. [P2] The first overlay pass measured 660 × 152 and lacked the upper-right expand action.
   - Fix: constrain the textarea/toolbar to 98px/48px, override global button minimum heights, and add a functional expand/collapse control.
   - Post-fix evidence: browser measurements report 660 × 148 and the focused comparison shows matching vertical geometry.

## Follow-up polish

- P3: LibLib uses its proprietary model glyph; the closest available production icon from the project's existing icon library is used locally.

final result: passed

---

# LibLib Image Prompt Editor Four-Layer Fidelity QA

- Source visual truth: `/private/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-bd00d09b-ec49-45c5-b797-633fe910668a.png`.
- Browser-rendered implementation: `/private/tmp/ai-script-image-node-reference-layout-v7.png`.
- Focused side-by-side comparison: `/private/tmp/liblib-ai-script-image-editor-comparison-v7.png`.
- Source pixels: 1520 × 842 at 1x capture density; implementation pixels: 1280 × 720 at 1x.
- Normalization: source editor crop 1320 × 493 scaled to 1208 × 451 and padded to 1208 × 454; implementation editor crop 1208 × 454.
- State: product-scene image node selected, one style reference attached, prompt empty, `Lib Image`, `16:9 · 高画质 · 4K · 1张`, menu closed.

## Full-view and focused comparison evidence

Both images were opened and the editor crops were normalized and placed side by side. The implementation now reproduces the source's four layers: reference/mark action row, dedicated thumbnail row, large prompt area, and fixed bottom parameter toolbar. At the 1280px local viewport the responsive editor measures 1208 × 454 with a 36px left inset; at the 1520px source viewport it resolves to the 1320 × 493 target geometry.

## Required fidelity surfaces

- Fonts and typography: the wide media editor uses 18px reference controls, 22px prompt text, 20px model/parameter controls, and enlarged utility icons to match the newly supplied source rather than the earlier compact crop.
- Spacing and layout rhythm: wide editor width is capped at 1320px with a 36px canvas inset. The implementation measures 178px reference area, 202px prompt area, and 72px toolbar at 1208px width; container-relative prompt height reaches the 493px target at 1320px.
- Colors and visual tokens: charcoal surface, muted prompt copy, gray reference pills, cyan intelligent-reference indicator, light submit control, and low-emphasis credit text align with the source.
- Image quality and asset fidelity: the reference tray uses a project-owned generated 240 × 240 skincare moodboard at `web/front-web/public/mock/skincare-reference-board.png`; it is not a placeholder or copied LibLib artwork.
- Copy and content: reference, mark, prompt placeholder, model, ratio, quality, resolution, count, intelligent reference, preview, translation, advanced settings, 120-credit estimate, and submit semantics are all present.

## Interactions tested

- Reference button is backed by a real image file input and replaces the visible thumbnail.
- Mark toggles `aria-pressed` and selected styling; browser check returned `true` after activation.
- Image parameter trigger opens a visible dialog with ratio, quality, resolution, and count options.
- Generated style-reference thumbnail is visible in both the selected compact node and editor reference tray.
- Editor stays anchored below the selected image node and leaves room for the bottom canvas toolbar.
- Browser console contains only pre-existing React Router notices, Ant Design deprecation output, and React Flow HMR warnings; no implementation-specific runtime error was observed.

## Comparison history

1. [P1] The earlier implementation placed reference buttons and the thumbnail in one horizontal row and measured only 660 × 259.
   - Fix: split the reference actions and assets into two rows, make media-editor width responsive up to 1320px, and derive prompt height from editor width.
   - Post-fix evidence: browser measurement is 1208 × 454 at a 1280px viewport, with the expected 1320 × 493 geometry at the source width.
2. [P1] Controls and prompt typography were visibly smaller than the new source screenshot after equal-width normalization.
   - Fix: add a wide-editor container-query treatment for reference pills, thumbnail, prompt text, toolbar labels, icons, credits, and submit control.
   - Post-fix evidence: `/private/tmp/liblib-ai-script-image-editor-comparison-v7.png`.
3. [P2] The large editor initially moved above the node because the bottom-reserve check missed the available space by one pixel.
   - Fix: use a media-specific 60px bottom reserve so the editor remains directly under the selected node, matching the source relationship.

## Follow-up polish

- P3: LibLib's provider and aperture glyphs are proprietary; the implementation uses the closest Ant Design icons already present in the product.

final result: passed

---

# LibLib Compact Text Reference Controls QA

- Source visual truth: `/private/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-0792e4a8-99b6-41aa-b33e-a08125019b53.png`.
- Browser-rendered implementation: `/private/tmp/ai-script-text-reference-compact-clean.png`.
- Focused side-by-side comparison: `/private/tmp/ai-script-text-reference-controls-comparison-final.png`.
- Source pixels: 650 × 310, supplied as a high-density focused crop; implementation pixels: 1280 × 720 at 1x browser capture density.
- Density normalization: the source reference-control region was downsampled by 2× from 600 × 180 to 300 × 90; the implementation was cropped at 300 × 90 CSS pixels before horizontal comparison.
- State: text creator selected, prompt empty, no reference asset attached, mark inactive, model menu closed.

## Full-view and focused comparison evidence

The full implementation capture confirms that the editor is again a compact 660px viewport-level panel rather than a full-canvas surface. The focused comparison places the normalized source and implementation controls side by side: both use two gray rounded controls, a plus icon with `参考`, a tag icon with `标记`, equivalent 46px control height, compact spacing, and the same charcoal parent surface.

## Required fidelity surfaces

- Fonts and typography: `参考` and `标记` use a compact Chinese system sans-serif with equivalent weight and visual size after density normalization; the prompt and model toolbar retain their earlier hierarchy.
- Spacing and layout rhythm: the text editor is capped at 660px. The reference row is 79px, the prompt is 80px, and the toolbar remains 48px; the complete editor stays compact while accommodating the two required controls.
- Colors and visual tokens: the parent surface remains `#242525`; reference buttons use a subtle lighter charcoal fill, gray foreground, and brighter hover/selected treatment matching the crop.
- Image quality and asset fidelity: no raster asset is required for the empty reference state. Plus and tag marks use the project's Ant Design icon set, not improvised SVG/CSS art.
- Copy and content: `参考` and `标记` exactly match the source; existing prompt, model, translation, credit, expand, and submit content is preserved.

## Primary interactions tested

- Selecting a text node reveals the compact editor with both new controls.
- `标记` toggles `aria-pressed` from false to true and back, with selected styling.
- `参考` is connected to the existing file-input flow and can attach or replace a visible reference thumbnail.
- Empty prompt disables generation; prompt entry and generation behavior remain unchanged.
- The selected editor stays clear of the bottom canvas toolbar.
- No implementation-specific browser runtime error was observed; existing development-only React Router, Ant Design, and React Flow notices remain unchanged.
- Scoped ESLint, TypeScript checking, production Vite build, and `git diff --check` pass.

## Comparison history

1. [P1] The previous pass incorrectly widened the text editor toward media-editor dimensions.
   - Fix: restore the 660px text-editor cap, compact 48px toolbar, and compact prompt region; retain the wide treatment only for image/video/batch-material creators.
   - Post-fix evidence: `/private/tmp/ai-script-text-reference-compact-clean.png`.
2. [P1] Text lacked the source's `参考` and `标记` actions.
   - Fix: reuse the functional reference strip in `TextEditorBody`, add text-specific compact styling, and preserve the expand control without overlap.
   - Post-fix evidence: `/private/tmp/ai-script-text-reference-controls-comparison-final.png`.
3. [P2] The first compact pass placed the buttons too close to the panel edge and made them slightly narrow.
   - Fix: align the row to a 24px left inset, 20px top inset, 46px height, and 22px horizontal button padding.
   - Post-fix evidence: the normalized final side-by-side comparison.

## Follow-up polish

- P3: LibLib's exact tag glyph is proprietary; the closest matching `TagsOutlined` icon from the existing product icon system is used.

final result: passed
