# Design QA

## Visual source

- Source: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-c0cf073c-f938-4581-8417-ab2a66d1f2ec.png`
- Source size: 1812 × 1322 px
- Requested state: dark Brief share page with the product name and version centered across the full header.
- Latest adjustment: use a compact `h3` instead of the originally annotated oversized `h1`.

## Implementation

- Route checked with realistic mock data: `http://127.0.0.1:4173/brief-share/mock-share-b1-read`
- Implementation screenshot: `/Users/jingxi/Desktop/projectmoneny/ai-script/brief-share-qa.png`
- Viewport: 1280 × 720 px
- Files:
  - `web/front-web/src/pages/BriefShare/BriefSharePage.tsx`
  - `web/front-web/src/pages/BriefShare/brief-share-page.css`
- Header layout: symmetric three-column grid so the middle title is centered relative to the full page, independent of the permission badge width.
- Title styling: dedicated `.brief-share-main-title` class on an `h3`; computed size is 28.16 px and the existing white title color is preserved.
- Responsive behavior: the three header regions stack below 900 px and the title becomes left aligned.

## Checks

- [x] Product name is moved into the center title region.
- [x] Current version is displayed immediately after the product name.
- [x] Top-left metadata no longer repeats the product slogan.
- [x] Permission badge remains right aligned.
- [x] Left metadata remains compact and does not compete with the main title.
- [x] Selecting a project shows “撤回关联”.
- [x] “撤回关联” removes the association and clears the selected project state.
- [x] Frontend TypeScript and Vite production build pass.
- [x] Backend Maven tests pass.
- [x] Reference and implementation screenshots were inspected together; the deliberate title-size difference follows the latest `h3` requirement.

## Final result

Passed.
