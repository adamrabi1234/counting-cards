# Independent thorough test report

**Decision: functional checks PASS after the PAO save-race correction. Real-browser foreground timing and browser-mediated file transfer are not fully verified.** Those limitations are detailed below; this is not a claim that every browser journey or display frame was successfully observed.

Tested 11–12 September 2026. The independent tester changed test files and this report only. Application fixes were made by the main agent.

## Environment and coverage

- Actual production preview at http://localhost:4173, a fresh origin with empty PAO and history; hard reload after the latest application build.
- CUA-controlled Brave browser. Desktop 1440×960, mobile 390×844, and a tablet settings inspection at 768×1024. Temporary viewport overrides were reset.
- Existing requirements, QA plan, design approval, implementation review, source engines, UI components, persistence code, and regression suite inspected.
- All 80 tests in 12 files passed. TypeScript checking and production Vite build passed.
- The newly added integration tests use real React screens, recall picker, scoring, transformation, timing, schema, and progression code. Only random ordering, image preload, persistence boundary, and browser animation scheduling are controlled. These are component integration tests in jsdom, not browser rendering tests.

## Actual browser journeys

| Area | Observed result |
| --- | --- |
| Fresh data | Home and PAO started at 0 configured cards and no completed sessions. No seeded production progress. |
| PAO durability | Entered only object “Modrý kompas” on ace of spades, navigated using global Home and Memory without Save, then hard-reloaded. Association persisted as partial. |
| PAO forward | Only the configured object input appeared. Case and repeated whitespace were normalized; correct response accepted. A later wrong answer displayed the stored expected answer. |
| PAO reverse and learning | Selected ace of spades for the visible association and received correct feedback. Learning revealed the configured object only. |
| Progress | Three PAO answers, two correct, displayed 67%. Latest mastery changed to incorrect after the wrong test. The two-day streak matched tests spanning local midnight. |
| Strategy | Changed S17 to H17 using the mobile Rules dialog. H shortcut on hard 14 versus ace was accepted and correct. R shortcut on hard 17 versus 6 was accepted and marked wrong with Stand explained. Two-question summary was 1/2. |
| Practice table | Completed actual stand/dealer-bust, split, double after split, hit, and surrender flows. Double added exactly one card and advanced to the next split hand. Hit removed double and surrender from available actions. Split hands settled independently. Surrender lost 0.5 virtual unit and revealed the hole card without further dealer draws. |
| Count at table | Followed exposed cards across hands. First hand ended at count 0; next hand exposed three kings while its hole remained hidden. Answer −3 was accepted. Quiz blocked game actions; its close button restored play. |
| Table rules | Rules were disabled during an active hand and left the cards intact. Remaining-card counter decreased with actual draws. Repeated card faces in the six-deck shoe were allowed. |
| Settings | Motion preference could be switched off. Settings reported IndexedDB and the actual ten accumulated results. Tablet layout rendered. Export displayed the preparation confirmation. |
| Runtime | No warning/error console entries were captured for the production journeys. Mobile PAO/progress did not show horizontal overflow. The reviewed mobile table retained visible player/dealer cards and legal action controls. |

## Independent automated additions

### TrainingJourneys.test.tsx — 19 passing cases

- Complete three-card exposures at 200, 500, and 2000 ms, including hidden faces before the first ready frame; exact recorded exposure duration and no skipped card.
- Full 52-card exposure with 52 distinct faces and complete reconstruction from all 52 bank cards.
- Reverse, random-position, and missing-position sequence targets.
- Progressive sequence advances from two to three cards after the configured perfect round; a subsequent incorrect round does not advance.
- Ordered cut followed by round-robin deal and explicit gather, including persisted operation description.
- Missing-card reconstruction accepts the unordered answer and hides the exposed cards during recall.
- Full-grid, card-at-position, and find-position visual modes; retained column count between exposure and recall; single-position records count one answer.
- Abandoning exposure leaves no completed record and cancels stale callbacks.
- Hi-Lo count carries between checkpoints; true count rounds correctly; a full deck returns to its starting count; a replacement shoe explicitly resets; zero remaining decks produce an unscored undefined true count.
- Invalid import is rejected before mutation; valid import receives a preview and merges through the actual schema/merge functions.

### independent-invariants.test.ts — 4 passing cases

- 500 deterministic complete blackjack games across deck counts and rule variations: legal actions, finite termination, immutable previous states, physical-card conservation, visible running count, and settled outcomes.
- Exhausted draw fails atomically without damaging the original hand.
- Resplitting aces respects maximum hands and one-card split-ace restrictions.
- Empty/singleton shuffle and rejection of invalid random-source outputs.

### PaoSaveRace.test.tsx — passing after correction

The test initially failed. While Save awaited persistence, the editor allowed another change, then cleared its dirty flag when the older save completed. Global navigation could discard the newer draft.

The main agent disabled editing while saving and added a draft-version check before clearing the dirty flag. The independent regression now passes. This was the only newly confirmed application defect found during this gate.

## Unresolved verification limits

### Real display timing

Fresh and cached Brave production attempts at 0.2 seconds paused at the first card. A two-second attempt advanced to the second card then paused; a one-card five-second Hi-Lo attempt also paused at its deadline. This happened with exclusive browser focus from the automation's perspective. The document reported visible, but actual foreground/occlusion state of the native Brave window could not be certified.

Development diagnostics after the first-ready-frame fix showed:

- 808.8 ms lateness at the first 200 ms deadline, with approximately 1008.8 ms between frames.
- 818 ms lateness after resetting the viewport override, with approximately 1018 ms between frames.
- Both reported document.hidden=false. The screenshot stream also lagged behind DOM card state.

This is consistent with approximately 1 Hz browser rendering/throttling, but its cause was not proven. The application correctly paused rather than skipping cards or awarding an invalid speed record. The protection was not weakened. The pure clock and controlled-frame screen tests pass; clean actual foreground fast exposure still requires verification in a normally rendering browser window.

No full 52-card browser reconstruction is claimed. That end-to-end state flow passed in component integration tests; maximum-grid visibility was separately established by the implementation reviewer.

### Backup transfer through browser automation

The file chooser opened, but its setFiles operation failed with “Not allowed.” The documented extension troubleshooting points to browser extension file-URL permission. No permission bypass, alternate browser filesystem access, or native-picker workaround was attempted.

Export showed “Záloha byla připravena ke stažení,” but the automation download event timed out. Thus downloaded-file delivery and a real browser upload were not certified. Schema, atomic invalid-import rejection, preview/merge UI, storage transactions, backups, and recovery are covered by automated tests.

### Remaining distinction

The passing tests certify the covered application behavior; they do not certify native drag gesture fidelity, every possible viewport, real display timing under all browser conditions, or production Docker/network deployment. The main agent must perform the separate container and live-URL checks.


## Additional main-agent browser evidence

After this tester released browser focus, the main agent separately verified a real CUA drag in the mobile 390px PAO reverse picker on the production preview: ace of spades was dragged into the empty answer slot; DOM showed 1/1 placed, the occupied position label, the disabled source card, enabled evaluation, and dnd-kit reported a successful drop. This is attributed to the main agent and is not an independent gesture observation by this tester.
