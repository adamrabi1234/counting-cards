# Continuation after Figma connection failure

The initial Make generation reported “Couldn't connect to Figma” after approximately fifteen minutes. The code panel confirmed that its components, data, screens, typography and theme files remained. The following shorter prompt was submitted to finish a reviewable visual slice. This changes the scope of the first Figma preview only; every final functional requirement remains in `requirements.md`.

The continuation also encountered a disconnected generation stream. Reloading the file returned Make to its initial composer, so the visible intermediate files were not a durable completed version. A further four-view prompt was submitted using Make's available Claude Sonnet 4.6 option in place of Default. The direct Figma MCP returned source resource links, but its resource reader returned `Unknown resource`; the browser code editor can expose generated source through ordinary copy operations.

> The previous generation disconnected but files are preserved. CONTINUE FROM EXISTING FILES; retain your chosen visual system, fonts, palette, PlayingCard, Navigation and HomeScreen. Do not re-plan. Finish and wire App.tsx into a working visual prototype now. This pass needs only FOUR navigable views: Home, PAO library/editor, Sequence Memory, and Blackjack table. Other modes can remain named future entries in the hub; final production implementation comes separately.
>
> VISUAL DESIGN AND CLICKABLE DEMO STATES ONLY. Do not build production engines, storage or complex statistics. Czech UI, premium refined card room, excellent 390px mobile and desktop. Traditional white cards/red hearts+diamonds/black clubs+spades. We have licensed classic SVG card art for final integration, so use your existing card component and do not spend more time on portraits.
>
> PAO: 52 cards, suit filter, status indicators, editor Osoba/Akce/Předmět (any one field enough), save/previous/next and learn/test demo. Sequence: count/speed setup, large memorization card, numbered recall slots and all 52 cards with suit filters, tap-to-place/remove, expected/submitted results. Add quick controls through demo states so reviewer can inspect them. Blackjack: polished table, dealer upcard+hidden hole card, player hand, big Hit/Stand/Double/Split, rules panel, explanatory result.
>
> Focus on composition, typography, spacing, mobile usability, clear cards, short motion, no overflow. Label sample stats as demo. Finish this limited scope and make Preview run now; do not expand into additional modes during this pass.
