# Visual QA revision sent to Figma Make

Fix the EXISTING Version 1 only, preserving its Fraunces/DM Sans, ink-and-gold visual direction. Independent visual QA requires these concrete changes. Implement directly, no redesign or lengthy planning.

1. PAO editor at 390px: 52 progress dots push Next offscreen (x539). Replace dots with compact flexible progress; Previous/Next always visible, single-line, >=44px targets.
2. Blackjack header at 390px: Rules clips and W-L/score wrap vertically. Use two rows: Back/title/Rules then compact score/RC/TC. No horizontal page overflow.
3. Accessibility throughout: replace near-invisible #45455A helper labels with readable muted color; minimum 12–14px helper text and all interactive targets >=44px (filters, speed/round chips, save/prev/next). Dealer total and red ranks must contrast clearly.
4. PAO library tiles: show real small PlayingCard faces and explicit complete/partial/missing status, not only rank/suit text.
5. Rename blackjack Lístek to Vzít kartu. Recall needs visible concise tap/place/remove/reorder instructions. Results need clear Očekáváno / Tvoje odpověď labels and legible submitted cards.

Keep working preview and current flows. Apply these focused fixes now.

Submitted through the existing Make file using its Gemini 3.6 Flash model for a focused correction pass. No application behavior is accepted as production correctness from this design pass.
