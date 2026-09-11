# Counting Cards — behavior contract

The user's master prompt is the functional authority. Figma Make chooses the visual design, and its prototype is reviewed before production implementation.

## Data and core invariants
- A card is a stable rank/suit ID, a deck contains each of the 52 cards exactly once. Only an explicitly multi-deck blackjack shoe permits repeated card faces, with distinct physical IDs.
- Shuffle uses Fisher–Yates with cryptographic unbiased random integers. Transformations are pure operations over arrays, never inferred from animation.
- PAO fields person/action/object are independently optional. A configured card has at least one trimmed nonempty field. Tests include only configured fields and configured cards. Normalize whitespace and case (retain meaningful diacritics), give field-level feedback.
- Timing uses monotonic performance timestamps and absolute deadlines. Motion must not add exposure time. Background-tab interruption pauses/invalidates competitive timing; no silent skipped cards. Restart cancels the previous run. Statistics distinguish completed scored rounds from abandoned rounds.
- Persist versioned PAO, settings, progression and session history. Validate imports completely before changing data. Offer downloadable backup and merge imports. Report storage failures visibly; never claim an unsuccessful save succeeded. Retain recovery copy of prior valid data.

## Training modes
1. PAO editor: all 52 cards, configured/complete/partial/missing counts, suit filtering, editor save/clear/previous/next, keyboard support. Learn, forward test, reverse test.
2. Sequence: 1–52 cards, preset/custom interval, rounds, default full recall, reverse, random position, missing position. Recall from full deck with drag/drop and tap, remove/undo/reorder. Per-position expected/actual feedback and timing. Configurable progression start/increment/consecutive perfect rounds; cap at 52.
3. Shuffle: configurable deck size and operation sequence. Cut and top-to-bottom move use slice rotation. Deal is round-robin into piles keeping deal order; gather concatenates explicit pile order. Riffle deterministically interleaves two halves starting from stated half. Expose convention to learner. Recall full, first N, or random position after transformation.
4. Missing cards: suit/all suits, inclusive rank range, missing count less than available pool, display seconds, rounds. Show pool minus random missing subset, hide it, select unordered missing set. No duplicate answers.
5. Visual memory: stable responsive grid, configurable count/duration. Reconstruct grid, card-at-position, find-position variants. Spatial layout remains the same between exposure and recall.
6. Hi-Lo: 2–6 +1; 7–9 0; 10/J/Q/K/A −1. Start count, decks, cards/checkpoint, speed, rounds and difficulty. Count persists between checkpoints; shoe resets are explicit and reset count. Running versus true count clearly distinguished.
7. Strategy: deterministic published basic strategy, selected deck count/S17-H17/double restrictions/DAS/surrender/resplit rules. Legal action constraints and fallback behavior. American hole-card/peek conventions explicit. Explain recommendations; no count deviations in basic-strategy mode.
8. Practice table: actual finite shoe, player/dealer hands, concealed hole card excluded from running count until exposed, ace valuation, naturals, hit/stand/double/split/surrender, dealer soft17 policy, occasional count checkpoint. Training only, no money. Session results and counts persist.
9. Progress: real completed-session accuracy, per-mode best, fastest successful exposure, activity history, configured PAO and latest card mastery, customizable sequence level. Honest empty states.

## Quality / delivery gates
- Classic card assets, clear red/black suits and authentic face cards, self-hosted assets with attribution.
- React + TypeScript modular engines, reusable card/picker/session components, motion independent of game clocks, accessible drag/drop with tap and keyboard alternatives.
- Czech product copy; desktop/mobile/tablet; 44px touch controls; focus and reduced-motion; no global shortcuts while editing inputs.
- Figma design review subagent and iteration before implementation. Separate final quality review and thorough-test subagents.
- Engine tests cover deck uniqueness, transform conservation/order, PAO partial configurations, timers, progression, scoring, Hi-Lo balance, blackjack edge rules, import validation and recovery.
- Production build, Docker health endpoint and SPA routing. Public GitHub repository `adamrabi1234/counting-cards`, new Coolify project, Dockerfile deployment, live smoke test and fixes.

## Reference sources
- Strategy: https://github.com/gsdriver/blackjack-strategy (MIT; supports configured rule variants), cross-check against https://wizardofodds.com/games/blackjack/strategy/calculator/ . Inspect actual implementation and verify representative hard, soft, pair and surrender cases.
- Card artwork candidate: https://github.com/hayeah/playing-cards-assets (public-domain vector-playing-cards artwork, MIT processing repository).
- Design: https://www.figma.com/make/OBJhBh3mghgcIPYa9aeMDM/

## Deployment assumptions
Local-first application without accounts/cloud synchronization, as allowed by the prompt. HTTPS stable production origin is important because browser data belongs to its origin. GitHub CLI authentication verified; local Docker daemon is currently unavailable, so the container will also be built and verified on Coolify.
