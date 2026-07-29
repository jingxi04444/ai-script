# Design QA

## Visual source

- Admin source: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-6134bb6b-68d1-4694-87fb-4b048051234e.png`
- Frontend source: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-35a1982f-ae19-417d-a0fb-7692fb933e81.png`
- Frontend source viewport: 1462 × 1178 px.
- Requested state: shorten the two admin field labels and make the frontend template-info popover read the dedicated hook/formula fields without rendering URL content description.

## Implementation

- Admin page: `web/admin-web/src/pages/Templates/TemplateListPage.tsx`
- Frontend page: `web/front-web/src/pages/Workspace/ScriptGenerator/ScriptGeneratorPanel.tsx`
- Frontend styles: `web/front-web/src/pages/Workspace/ScriptGenerator/script-generator-panel.css`
- QA route: `http://127.0.0.1:4175/template-popover-qa.html`
- QA screenshot: `/private/tmp/template-popover-qa.png`

## Checks

- [x] The admin label now reads `前5秒钩子`.
- [x] The admin label now reads `模型公式`.
- [x] Existing API field names remain unchanged, so saved template data stays compatible.
- [x] The frontend popover reads `firstFiveSecondsHook` directly.
- [x] The frontend popover reads `structureFormula`, with `modelFormula` retained only as a compatible field fallback.
- [x] `referenceDesc` is no longer parsed or rendered by the template-info popover.
- [x] The popover still displays the template name and reference link.
- [x] The rendered popover contains only the requested hook and formula sections; `内容描述` is absent.
- [x] Admin and frontend TypeScript/Vite production builds pass.

## Final result

Passed.
