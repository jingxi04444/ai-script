# Membership center design QA

## Source of truth

- Reference: user-provided full-screen membership-center layout (2704 × 1450).
- Desktop acceptance target: one-screen purchasing workspace without the application left rail.
- Implementation route: `http://localhost:4002/membership`.
- Authenticated test account: `demo@ai-script.local`.

## Implemented structure

- Full-width account header with profile, expiry information, points entry and membership navigation.
- Year / quarter / month purchase-period selector backed by the configured SKU data.
- Four plan cards backed by membership plan and entitlement APIs.
- Right-side promotion and synchronized order-detail panel.
- Categorized membership comparison is an on-demand inline section below the purchasing workspace, so it never covers or hides the main screen.
- Membership redemption now has a dedicated full-screen themed “正在开发中” page.
- Desktop layout has no document-level horizontal or vertical scroll.

## Typography verification

The global `#root` typography reset previously overrode the membership-page rules. The page now uses scoped selectors with sufficient specificity.

| Element | Required range | Browser measured at 1280 px | Computed at 2048 px |
| --- | ---: | ---: | ---: |
| Plan name | 24–26 px | 24 px | 25.6 px |
| Price | 34–40 px | 34 px | 38.9 px |
| Benefit label | 18–20 px | 18 px | 19.46 px |
| Benefit value | supporting size | 16 px | 17.4 px |

The account header and purchase-period selector were also verified in the narrow in-app preview:

| Element | Browser measured at 791 px |
| --- | ---: |
| Account name | 26 px |
| Membership level | 18 px |
| Header navigation | 22 px |
| Purchase-period tab | 28 px |
| Purchase-period hint | 16 px |

At widths up to 680 px, the purchase-period selector keeps three horizontal columns instead of collapsing into a vertical list.

## Verification

- Authenticated Spring-backed page load: passed.
- Plans, SKU periods and configured entitlement values: passed.
- Year-period switch: passed.
- Year-card “限时优惠” badge is fully visible above the year tab without covering the label: passed.
- Membership redemption route and return-to-membership action: passed.
- Plan selection and order-detail synchronization: passed.
- Order-detail panel top and bottom align exactly with all four plan cards on desktop (`top difference = 0`, `bottom difference = 0`); compact-height content remains accessible through internal scrolling: passed.
- First available purchase-period tab is selected by default (year / quarter / month display order): passed.
- Categorized benefit comparison is permanently rendered after the purchasing screen and can be reached by normal page scrolling: passed.
- “查看会员对比” smoothly scrolls to the existing comparison section instead of mounting, hiding or toggling content: passed.
- No membership-comparison modal overlay is mounted: passed.
- “查看会员对比” uses a visible green filled treatment instead of a transparent text action: passed.
- Document overflow at 1280 × 720: none (`scrollWidth = 1280`, `scrollHeight = 720`).
- `npm run build`: passed.
- `git diff --check`: passed.

## Responsive verification

- Desktop (1280 × 720): four plan cards and the order panel remain in one row; no horizontal overflow (`scrollWidth = 1280`).
- Tablet (≤ 1180 px): plan cards change to a two-column grid and the order area moves below without changing the visual language, colors or typography hierarchy.
- Mobile (≤ 680 px): purchase-period tabs remain three horizontal columns; plan cards use a single readable column and the order area follows beneath them.
- Very narrow mobile (≤ 420 px): header navigation wraps, avatar and tab typography scale down, and all primary content remains inside the viewport.
- Benefit comparison keeps its desktop table proportions inside an independent horizontal scroll container, so it cannot force the full page to overflow.

## Evidence

- `membership-implementation-qa-2.png`: authenticated membership page.
- `membership-comparison-qa.png`: categorized benefit-comparison modal.
- `membership-default-first-tab-qa.png`: default first purchase-period tab and colored comparison action.
- `membership-inline-comparison-qa.png`: full-width categorized comparison rendered beneath the main membership screen.
- `membership-responsive-desktop-qa.png`: responsive desktop layout at 1280 × 720.
- `membership-responsive-mobile-qa.png`: mobile single-column layout with the original visual styling preserved.
- `membership-scroll-comparison-qa.png`: the always-present comparison section after the quick-scroll action.
- `membership-checkout-alignment-qa.png`: payment/order panel aligned to the plan-card row.
- `membership-typography-qa.png`: enlarged account header and horizontal purchase-period tabs in the in-app preview.
- `membership-year-promo-qa.png`: visible year-card promotion badge in the desktop layout.
- `membership-exchange-development-qa.png`: themed membership-redemption development page.

## Non-blocking note

- Ant Design logs one deprecation warning for `Modal.destroyOnClose` from an existing shared authentication dialog; it does not affect the membership page layout or interaction.

final result: passed
---

# Storyboard list-only design QA

## Source of truth

- Source visual: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-0bddd19c-2610-4011-8786-d7a148dd6b04.png` (3348 × 1848).
- Implementation: `/private/tmp/storyboard-list-only.png` (1280 × 720).
- Combined comparison: `/private/tmp/storyboard-list-comparison.png`.
- Browser viewport: 1280 × 720 CSS px; DPR 2; screenshot normalized to 1280 × 720.
- State: light theme, empty unnamed project, step 3, 我的脚本.

## Verification

- Removed the list/card view switch.
- Removed the card rendering branch.
- Every script category remains on the list layout.
- Fixed page size at 10 rows.
- Search, type/status filters, reset, pagination, preview, polish, copy and delete behavior remain wired.
- Production build: passed.
- Browser check: switching to AI 原创脚本 still shows the list header; both view-toggle button counts are zero.
- Existing console warnings for `Modal.destroyOnClose` and empty-project loading were present and are unrelated to this change.

## Fidelity surfaces

- Typography: existing Workspace list typography preserved.
- Spacing/layout: total count remains right-aligned; filter grid and table columns are unchanged.
- Colors/tokens: no new colors; existing theme styles remain in control.
- Images/assets: card-only decorative art is no longer rendered; no new asset is needed.
- Copy/content: only the “列表 / 卡片” view labels were removed; list and action copy is preserved.

## Comparison history

1. Before: card layout and the list/card switch were visible.
2. Fix: removed view state, switch controls and card JSX; fixed `pageSize = 10`.
3. After: only the list header, list empty/data state and pagination remain.

final result: passed
