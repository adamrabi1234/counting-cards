# Independent implementation review

**Recheck decision: APPROVED for the product/visual review gate; the separate thorough testing gate remains required.** All six initial findings below are resolved in the reviewed implementation. A reproducible first-frame timing interruption remains an explicit release-verification concern, detailed at the end. The original CHANGES REQUIRED findings are retained below.

## Scope and evidence

- Reviewed the master functional contract, architecture, Figma Version 4 audit, application screens, engines, persistence, and existing domain tests.
- Inspected the actual local application in a separate CUA browser tab at 1440×960 and 390×844: home, PAO library/reverse picker, sequence setup/exposure, large visual-memory exposure, and a dealt blackjack hand with Rules open/closed.
- The card artwork is authentic, locally served, crisp, and clearly distinguishes suits. Desktop hierarchy, mobile table layout, typography, restrained motion, honest new-user statistics, and Rules dialog presentation are suitable for the intended product.
- This is a bounded product/source review, not the separately requested exhaustive test pass.

## Required fixes

1. **P1 — Visual-memory exposure does not show all cards simultaneously.** `MemoryScreen.tsx` / `.memory-grid`: 52 cards with four columns produced a 2304.8px-tall grid inside a 775px exposure area at 1440×960. Only 16 complete cards were visible before scrolling. The timer runs for offscreen rows, contrary to the explicit simultaneous-grid requirement. Missing-card mode shares the same issue for large pools. Compute a layout that fits the available exposure area, freeze its spatial order/geometry for recall, and handle viewport changes explicitly. Verify both maximum count and ordinary 8/12-card grids on mobile and desktop.

2. **P2 — Recall records overstate the size of a successful reconstruction.** `MemoryScreen.submit` records `round.sequence.length` as count for visual single-position queries and shuffle first-N/random-position queries. `modeStats` only filters full-recall variants for sequence. One correct answer from a 52-card source can therefore become a generic “best range 52.” Record the answered count separately from the source size or distinguish records by variant; do not label a one-card answer as a full reconstruction. Preserve meaningful shuffle-operation context in the record display.

3. **P2 — Global navigation can discard a PAO draft.** `PaoScreen` saves on its own Previous/Next/Back controls, but the shared sidebar, mobile navigation, and app logo bypass those handlers and unmount the editor. Preserve/flush the dirty draft through those navigations, and retain it if storage rejects the save. This matters because the user explicitly prioritizes PAO data durability.

4. **P2 — The transparent remove target overlaps the selectable card.** In the mobile recall picker, the selected card measured 55×79.7px; its 44×44px remove button overlapped roughly 37×39px of the upper card. The visible remove icon is only 21px, so taps well outside that icon can remove an answer when the user intends to select or reorder it. Give removal a separate, visible 44px target that does not overlap the card's selection/drag area. Verify selection, tap placement, swapping, removal, undo, and dragging after the change.

5. **P2 — Empty recall slots advertise themselves as disabled.** `Slot` spreads dnd-kit's attributes from a disabled draggable onto the still-interactive slot button. The accessibility tree calls an empty destination disabled, even though it is intended to be selectable for tap/keyboard placement. Override the inappropriate `aria-disabled` on the selection button or separate draggable semantics from destination selection. Empty slots must remain clearly operable with keyboard and assistive technology.

6. **P2 — Strategy advertises an unimplemented surrender shortcut.** The action button displays `R`, but `StrategyScreen` has no `r` shortcut handler. Implement it under the same legal-action/answered-state constraints as the other choices, or remove the misleading key hint.

## Additional verification needed

- Several sequence attempts (three cards at 0.2s and 2s) paused at card 1 during this browser review. The normal interruption UI worked and did not silently skip cards. It also occurred during a reserved interval without root browser calls, with `document.visibilityState` reporting visible. This may be browser automation/viewport scheduling or hot-reload interference; the cause was not established. The thorough tester must complete clean foreground timing runs and confirm the fast preset does not routinely pause on an otherwise responsive device.
- The source tests cover useful domain and storage cases, but a passing pure engine suite does not certify full timed UI exposure, mobile dragging, complete 52-card reconstruction, or actual production persistence/deployment.

## Visual approval details

The normal mobile blackjack table has readable totals and labels, complete dealer/player cards, accessible action buttons, and no observed clipping at 390×844. Rules opens in a scrollable dialog, keeps the underlying dealt hand intact, and closes cleanly. The PAO library uses genuine miniature card faces and status labels. The full 52-card bank is present, suit filters are available, selected cards become unavailable in the bank, and removing a card restores it. Preserve this visual direction while resolving the findings.

No application source was modified by this reviewer. Test setup changes affected only the local development origin (visual: 52 cards/120 seconds; sequence: 3 cards/2 seconds); no completed review session or PAO association was saved by this review.

## Recheck after corrections

All six initial findings are closed for this bounded review:

- **Simultaneous grid:** actual screenshots and DOM measurements confirm all 52 visual cards and all 51 visible missing-mode cards fit without exposure scrolling. At 1440x960, each large grid measured 1386x671.5px inside a 1392x775px area. At 390x844, each measured 303x616.1px inside a 354x656px area. An ordinary eight-card mobile grid remains readable in four columns and completed its two-second exposure into recall. Resizing during exposure correctly replaces the grid with an explicit restart instruction.
- **Records:** source now stores the answered count (`score.total`), and generic reconstruction records require full-recall variants for sequence, shuffle, and visual modes. Shuffle summaries retain the operation plan.
- **PAO navigation:** entered only the object `Navigace QA` for 2 spades, selected mobile Home, then Memory without pressing Save. The association appeared as partial and remained after a hard reload. The source flushes dirty drafts on route unmount; storage failure behavior remains covered by the separate persistence tests.
- **Recall interaction:** placed 10 hearts, selected its occupied slot, removed it with the separate toolbar button, and restored it with Undo. Then selected empty position 2 and placed 2 clubs. The removal button measured 46px high and does not overlap the card. Empty destinations advertise `aria-disabled=false` and accept selection. The full card bank remains available.
- **Shortcut:** source now implements `r` only when surrender is legal and the strategy question has not been answered.

No source edits were made. The recheck added only the development PAO association above and changed development mode settings; no scored round was submitted.

### Timing concern handed to the thorough tester

A fresh three-card sequence at 0.2 seconds paused at its first card, despite exclusive browser focus. The development diagnostic was:

```text
Exposure interrupted by a delayed frame {"lateness":849.4000000059605,"frame":7237,"current":7237.4000000059605,"hidden":false,"index":0}
```

The first frame arrived roughly 1049ms after the clock's effect-time initialization. The safety pause correctly prevents skipped cards and invalid timing records. Initial rendering or browser automation scheduling may contribute; the cause is not established by this review. The eight-card two-second grid did complete cleanly. Root is moving clock initialization to a paint-ready frame while keeping faces hidden until ready, without weakening late-frame protections. The separate thorough tester must verify that change in a stable production build. Approval here certifies the repaired product/visual findings, not the upcoming timing change or the later full test/deployment gates.
