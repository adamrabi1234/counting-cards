# Architecture and engineering decisions

## Frontend
React + TypeScript + Vite, with Figma's approved visual language adapted into reusable production components. Zustand for shared local state, Zod for validated versioned imports, dnd-kit for pointer/touch recall, native buttons for keyboard placement, Motion for non-timing-sensitive UI transitions, Lucide for icons and locally served font files. A static production bundle is served by nginx in a multi-stage Docker image, with a health endpoint and fallback routing.

## Engine boundaries
- `cards`: canonical rank/suit identities, deck/shoe generation, rejection-sampled secure RNG and Fisher–Yates shuffle.
- `memory`: target construction for each recall variant, ordered/unordered scoring, per-position comparison, configurable progression.
- `shuffle`: immutable cut, round-robin deal, gather and deterministic riffle operations. A composed plan applies these pure operations sequentially with explicit convention descriptions.
- `pao`: partial association validation, normalized text comparison, forward/reverse targets.
- `counting`: Hi-Lo tag and cumulative exposed-card count, remaining-deck estimate and true count.
- `blackjack`: hand totals, natural detection, legal actions, published strategy tables, pure practice-table state transitions and dealer settlement. Hole cards counted only when revealed.
- `timing`: deadline-based scheduler plus React adapter, explicit cancellation, visibility interruption and invalidation rules.
- `progress`: session records, meaningful aggregation by mode and settings, milestones.
- `persistence`: validated snapshot store, a last-known-good backup and import/export, user-visible failures.

## Persistence contract
Device-local data is allowed by the user's master prompt. Persist PAO and completed sessions independently of component mounts. Never initialize sample associations as real user data. Keep prior valid snapshot before replacement; parse/validate snapshots before accepting them. Import merges card records deliberately and deduplicates sessions by ID, never deletes unrelated PAO entries. Unknown newer schema is rejected without overwriting the stored original. A failed save retains the unsaved editor contents and surfaces an actionable error.

## Timing contract
Use absolute elapsed time from `performance.now`, independent of card animations. A late callback must not race with the next round. Mark materially interrupted/paused timed runs as practice and exclude them from speed records. Hidden tabs pause exposure; resuming requires an explicit control. No promise of sub-frame timing beyond browser refresh precision. Record planned interval and measured memorization duration separately.

## Strategy source decision
An inspection of `blackjack-strategy@1.4.0` found rule discrepancies (including late surrender versus ace under S17), so do not trust the dependency unmodified. Use the six published Wizard of Odds basic-strategy tables as factual reference data: single/double/4+ decks × S17/H17, with DAS and surrender conditional cells. Application logic independently interprets table action and legal-action fallbacks. The app explicitly trains American peek blackjack and total-dependent basic strategy. No early surrender or European no-hole-card variant is advertised without its own tables.

Double restrictions gate eligibility and conditional DAS splitting. Resplit settings govern legal actions/maximum hands. For split aces, receive one card, with a resplit only when enabled and another ace is drawn. A split 21 is not a natural. Naturals are resolved after dealer peek before ordinary actions. Late surrender is initial unsplit hand only after the dealer has checked for blackjack.

## Verification
Use Vitest for domain properties, rule regressions and storage safety. Use real-browser UI checks for the complete user's journey, mobile recall, keyboard behavior, saved PAO reload, empty states and console errors. Reviewers are independent: first Figma visual review; then implemented-product quality review; finally thorough test review. Fix material findings and rerun affected checks before publishing.
