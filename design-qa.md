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
