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
