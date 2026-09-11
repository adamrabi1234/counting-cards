# Independent verification plan

## Design gate
Reviewer must inspect actual Figma-generated rendering (not infer approval from source). Check desktop and narrow mobile states, PAO edit, timed card, recall picker, comparison results, blackjack actions, navigation and empty state. Report evidence and concrete fixes. Replacement with externally sourced classic SVG faces is an implementation task, not sufficient reason to reject an otherwise usable layout.

## Domain tests
- All deck sizes preserve unique identity; every suit/rank occurs once; each Hi-Lo deck totals zero; input decks stay immutable.
- Fisher–Yates boundary cases (empty/singleton), sample shape/conservation, rejection of invalid sizes; physical multi-deck identity distinct.
- Cut/move 0, full deck, wrap; deal odd counts into 2/3/4 piles; gather custom order validation; deterministic riffle odd/even; composed operations conserve cards.
- Forward/reverse/random/missing recall targets; ordered mismatches and unordered sets; duplicate answers never count twice; full 52-card result.
- Progression increments only after required consecutive perfect eligible rounds; failures reset streak; caps at 52; config changes do not reuse a stale streak.
- PAO person-only/action-only/object-only/partial/all fields; whitespace/case; blank save validation; correct and incorrect fields; reverse ambiguity accepts any matching configured card.
- Timing exact boundary math, cancellation, pause/resume/background interruption, no stale callback changes a later round, measured exposure and answer durations separate.
- Blackjack aces (A,A,9; A,6; A,6,10), naturals versus split21; H17/S17; peek resolves dealer natural; double single card; split state and restrictions; surrender legal only initially; hole count only on reveal; finite shoe conservation.
- Strategy all table dimensions/rule sets and targeted hard/soft/pair/surrender cases. Illegal double falls back appropriately (soft18 stands while soft17 hits); disabled split goes to total-dependent row; DAS-sensitive pairs; max hands/resplit aces.
- Import size/schema/card IDs/invalid numbers/XSS strings; atomic rejection; merge without losing unrelated PAO; dedup sessions; recovery from malformed primary data; unknown future schema preserved; storage failure never reports success.
- Statistics weight correct/total consistently; no fake data; completed rounds only; fastest record requires perfect uninterrupted run; scores comparable within modes; timestamps format locally.

## Browser journeys
1. Fresh load → empty progress → PAO edit one field → save → reload → field persists → learn → test success and failure → reverse.
2. Sequence count3/speed0.5 → memorize → correct recall by taps → result and next → incorrect answer → per-slot comparison → undo/removal/swap; repeat with full52 and narrow mobile.
3. Sequence reverse/random/missing target; progression increment after configured streak; shortcut Enter/Space/R/Esc does not intercept text inputs.
4. Shuffle operation plan, recall and expected transformed sequence; Missing Cards multiple answers; Visual grid reconstruction/position variants.
5. Hi-Lo successive checkpoints maintain cumulative count, all52 deck ends at start count, multi-deck duplicates legal, empty/invalid input rejected.
6. Strategy action and rule change; table hit/stand/double/split/surrender where legal, dealer result and hidden card, count checkpoint.
7. Settings export/import/recovery, local-storage failure feedback, reduced-motion and keyboard focus, 390px/768px/1440px overflow check.
8. Production URL deep route/reload, card/fonts load locally, no console errors, health endpoint 200, correct container/build commit.

Each reviewer identifies blockers rather than silently narrowing the scope. Implementation findings are fixed by the main agent, then affected checks are repeated.
