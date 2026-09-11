# Basic-strategy reference

Published factual tables: https://wizardofodds.com/games/blackjack/strategy/calculator/

The reference has six matrices: one deck, two decks, and four or more decks, each with S17/H17. Only American hole-card/peek columns are used. Late surrender is evaluated after dealer blackjack is excluded. Insurance and count deviations are not part of this trainer.

Rows: hard 5–21, soft 13–21, pairs 2–10 and aces. Columns: dealer 2–10 and ace. `DH`/`DS` mean double if allowed, otherwise hit/stand. `QH`/`QD`/`QS` mean split if doubling after split is available, otherwise hit/double/stand. `RH`/`RS`/`RP` mean surrender if allowed, otherwise hit/stand/split.

The application exposes deck counts 1, 2, 4, 6 and 8, dealer soft17, double restrictions (any two cards, 9–11, 10–11 or disabled), DAS, late/no surrender, maximum split hands and resplitting aces. Split restrictions must fall back to the applicable total row, never recommend an illegal action. Split aces receive one card; resplitting is the only possible further action when eligible. Split 21 does not count as a natural. Equal ten-valued cards may split under the stated table convention, though basic strategy stands on 20.

## Regression examples
- Six decks S17, hard16 versus ace: late surrender, otherwise hit.
- Six decks S17, hard15 versus10: late surrender, otherwise hit.
- Six decks H17, hard17 versus ace: late surrender, otherwise stand.
- Six decks S17, 8+8 versus ace: split; H17 with surrender: surrender.
- Six decks S17, A+7 versus2: stand; H17: double if allowed, otherwise stand.
- Six decks S17, 6+5 versus ace: hit; H17: double if allowed, otherwise hit.
- Pair4 versus5: split with eligible DAS, otherwise hit for multi-deck rules.
- Single deck, 4+4 versus5 without DAS: double if allowed, otherwise hit.
- Split disallowed/max hands reached: use total-dependent recommendation, still respecting double/surrender restrictions.

The finite practice shoe tracks physical card identifiers separately from face identifiers. The exposed running count changes once per revealed physical card. The dealer hole card remains excluded until reveal, including a natural after peek. A new shoe is announced and resets the count. Training outcomes use virtual units only and are never represented as money or gambling returns.
