# Figma Make visual audit

**Final decision: APPROVED — Version 4 visual foundation.**

All reported design blockers were resolved through two Figma revisions and independently checked against actual browser rendering. This approves the shared visual system and the representative Home, PAO, Sequence and Blackjack views for production implementation. It does not certify production training algorithms, data persistence, full functionality, or final accessibility behavior.

## Version 1 initial review

**Decision: CHANGES REQUIRED.**

Independent review of the actual Figma Make rendering at `https://app-sdowmfvmqmyuepad3afkp745zp7qwf7us7autfqtledzi5rsfbdd.makeproxy-c.figma.site/`. Inspected through the browser at desktop 1440×960 and mobile 390×844. No production engine correctness is implied by this design review.

## Inspected

- Desktop and mobile home, navigation, PAO library and PAO editor.
- Mobile sequence setup, three-card memorization, full 52-card picker, tap selection, submission, and incorrect-answer comparison result.
- Mobile and desktop blackjack practice table, dealing, concealed dealer card, player actions, and expanded rule controls.
- Actual rendered screenshots, accessibility trees, and read-only DOM geometry/style checks. This decision is not inferred from source code.

## Required revisions

1. **P1 — PAO editor mobile navigation is pushed offscreen.** At 390px, the Next button begins at x≈539px. The fixed row of 52 dots creates a horizontal inner scroller and forces Previous/Next labels onto two lines. Keep both buttons visible within the viewport, use at least 44px targets and non-wrapping labels, and replace the full dot row with a responsive compact progress indicator.
2. **P1 — Blackjack header does not fit mobile.** At 390px the W–L label and 0–0 score stack into a narrow vertical column, the title wraps awkwardly, and Rules clips at the right edge. Use a title/back/rules row followed by a separate well-spaced stats row. Preserve visible RC/TC meaning and full Rules access.
3. **P1 — Essential secondary text lacks contrast and several controls are too small.** The table uses rgb(69,69,90), including 9px W–L/RC/TC labels and the 14px dealer total. Similar muted PAO empty labels and help copy are hard to read. Increase text contrast consistently, use legible 12–14px or larger contextual text, and keep interactive targets at least 44px. Verified PAO Save is 40px high and Previous/Next are 32px; sequence and suit chips are also visually undersized. Red card ranks on dark PAO panels need stronger contrast or light card faces.
4. **P2 — PAO library should read as a card library.** Existing tiles show only a small suit/rank text label. Add classic light-faced card thumbnails and distinguish missing, partial, and complete associations with a clear legend/status. Preserve the compact optional-field editor.
5. **P2 — Clarify recall/result interaction.** The tap picker works and answers are hidden correctly. Add a short visible instruction explaining placing, removing, and reordering answers. Label expected versus submitted rows directly; do not dim submitted cards so strongly that comparison becomes difficult.
6. **P2 — Correct Czech blackjack copy.** Replace “Lístek” with “Vzít kartu” and update its shortcut hint. Keep terminology consistent across the strategy and practice modes.

## Preserve

The Fraunces/DM Sans typography and restrained dark club direction are coherent. Home hierarchy, grouping of memory versus blackjack, ivory/red/black card direction, focused timed stage, picker size, and table composition provide a usable base. The PAO editor explicitly marks all three fields as optional. The recall picker includes all 52 cards, accepts taps, and the result visually compares each expected/submitted pair.

Court-card artwork, seeded demo statistics, full production engines, additional advanced settings and remaining mode completeness are implementation concerns in this design pass. Real classic card assets will replace prototype faces. Production should use honest new-user data, accessible button semantics, keyboard alternatives, and verified timing/strategy logic.

## Recheck after Figma revision

At 390px: PAO Previous/Next visibility, no horizontal content scroller, table header/rules, input/button target sizes, recall/result legibility. At 1440px: preserve hierarchy and avoid creating oversized or scattered controls. Approve only after actual updated screenshots have been inspected.

## Version 3 recheck

**Decision: CHANGES REQUIRED — one remaining mobile table issue.**

Actual updated rendering was inspected at 390×844 and 1440×960. The PAO editor now has 44px Save/Previous/Next controls, with Next ending at x=360px inside the 390px viewport. Its compact progress indicator eliminates the previous navigation overflow. PAO library tiles now include classic card-face thumbnails and explicit complete/missing statuses. The table uses a separate stats row, readable totals, accessible Rules placement, and “Vzít kartu”. Sequence setup chips and recall filters are larger, a visible tap instruction is present, and the result directly labels expected/submitted rows with readable card faces and success/error markers. The desktop result composition remains coherent.

The remaining issue is the mobile practice table with **Rules open and cards dealt**: expanded inline rules plus the now two-row action bar leave insufficient table height, clipping the bottom of player cards and hiding the player label. Present mobile rules in a scrollable sheet/modal with at least 44px controls, preserving the full underlying table layout when dismissed. Current rule-number chips remain approximately 27px high. The normal table with rules closed is usable.

Production implementation notes: replace the recall lightbulb emoji with a library icon; use accessible names/button semantics for cards; reset view scroll position on navigation; ensure responsive behavior follows actual window resize. These do not require a new visual direction.

## Version 4 final recheck — approved

Inspected the revised Rules modal with a dealt hand at 390×844 and 1440×960. The dialog fits the viewport, has clear Close and Apply-and-close actions, and no longer consumes table layout height. DOM measurements confirm 44×44px deck choices, 49.5px rule rows, and 44px close/apply controls. Closing the modal preserves the dealt cards and shows the entire player hand and player label. The previous clipping issue is resolved. The visual foundation is approved for production implementation with the integration notes above.
