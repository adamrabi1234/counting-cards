# Figma Make handoff

Design file: https://www.figma.com/make/OBJhBh3mghgcIPYa9aeMDM/

The initial Make run eventually produced a durable Version 1 (16 files, 4,444 added lines). The editor's network/generation overlay did not reflect the completed server-side version. Its working preview was opened from the actual Preview iframe URL. Later queued requests had not replaced the completed version. This corrects the provisional connection notes in `figma-make-continuation.md`.

Figma `get_design_context` returned the complete source inventory. The connector's resource links were not fetchable in this environment, so source was read from Make's Code editor using its normal clipboard interface. Browser download-history access was unavailable and was not bypassed.

## Version 1 visual language
- Ink background `#0B0B10`; surfaces `#13131C`, `#1B1B27`, `#232334`.
- Warm ivory primary text `#EBE7DD`, muted `#7B7B90`, gold accent `#C4955A`.
- Fraunces display headings; DM Sans body/UI; DM Mono counts, positions, times.
- Thin translucent white borders, 8–12px component corners, restrained 18px large corners.
- Desktop left navigation, centered main training area; mobile bottom navigation.
- Home: restrained card fan, daily training actions, four real-stat tiles, PAO progress, separate memory/blackjack lists.
- PAO: searchable suit-filtered library, editor with large card and optional association fields, learning/test views.
- Sequence: compact setup panels, focused single-card presentation, numbered answer positions, suit-filtered full-deck picker, expected/submitted comparisons.
- Table: dealer and player zones, concealed hole card, prominent actions, rules and count checks.

## Production adaptation
The prototype's sample statistics, simplified card drawings, interval timer, storage and game logic are reference/demo behavior only. Production uses real saved sessions, licensed traditional SVG card faces, monotonic exposure scheduling and independently verified engines. Preserve Figma's visual direction while correcting accessibility, responsiveness and the review findings. Self-host all fonts and cards.

## Review
Independent reviewer: `figma_visual_review`. Visual approval and corrections are recorded below once completed.

Version 1 required mobile PAO pagination, blackjack header, contrast/target sizes, actual card thumbnails and clearer recall results. The exact revision prompt is in `figma-revision-prompt.md`; the audit is in `figma-visual-audit.md`.

Make completed the focused revision as Version 3, changing five files. Revised source confirms compact PAO progress, 44px suit filters, light card thumbnails with named association statuses, and brighter secondary text (`#A0A0B8` / `#8E8EA8`). Independent screenshot recheck remains the approval authority.
