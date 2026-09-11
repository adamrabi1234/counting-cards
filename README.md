# Counting Cards

Česká aplikace pro trénink karetní paměti, vlastních PAO asociací, Hi-Lo počítání a základní blackjackové strategie. Design vznikl ve Figma Make a prošel samostatnou vizuální kontrolou. Aplikace slouží k procvičování; stůl používá pouze virtuální jednotky.

**[Otevřít aplikaci](https://k8ltlryzwghy6sjfi0ggbda7.92.63.56.110.sslip.io)** · [Záznam nasazení](docs/deployment.md) · [Nezávislé testování a jeho rozsah](docs/thorough-test-report.md)

## Spuštění

Vyžaduje Node.js 24 a npm.

```sh
npm ci
npm run dev
```

Lokální adresa je `http://localhost:5173`. Produkční kontrola:

```sh
npm test
npm run build
npm run preview
```

## Co aplikace umí

- PAO knihovna všech 52 karet. Osoba, akce i předmět jsou nezávisle volitelné. Učení a testování v obou směrech.
- Sekvence 1–52 karet s vlastním intervalem, koly, progresí a několika způsoby vybavení.
- Míchání v paměti: sejmutí, přesun horních karet, rozdání do hromádek, vlastní sesbírání a pravidelné proložení.
- Chybějící karty ze zvoleného rozsahu a vizuální paměť s mřížkou, která se celá vejde na displej.
- Hi-Lo s průběžným countem mezi checkpointy, více balíčky a samostatným true countem.
- Základní strategie podle pravidel a skutečný tréninkový stůl s konečným shoe, skrytou dealerovou kartou, splitem, doublem a surrenderem.
- Skutečný pokrok, historie, rekordy, JSON záloha a validovaný slučovací import.

V odpovědích lze karty přetahovat nebo umístit klepnutím na pozici a kartu. Ovládání zahrnuje odebrání, prohození a vrácení poslední změny. Klávesové zkratky jsou popsané v Nastavení; při psaní do polí se neuplatňují.

## Data a časování

Data jsou místní pro daný prohlížeč a adresu aplikace. Primárním úložištěm je IndexedDB s předchozí platnou verzí; při nedostupnosti se použije localStorage. Selhání zápisu se zobrazí a neuložený obsah zůstává dostupný pro export. Změna domény, protokolu nebo zařízení nepřenese data automaticky. Pravidelně si stáhni zálohu v Nastavení. Import slučuje PAO podle času změny a historii podle identifikátorů; zachovává aktuální nastavení a úroveň progrese.

Karty se před tréninkem načtou. Časování používá monotónní hodiny a absolutní termíny nezávislé na animacích. Přepnutí karty prohlížeče, pauza nebo významný zásek pozastaví zobrazení a vyřadí kolo z rychlostních rekordů. Rozlišení časování omezuje obnovovací frekvence displeje. Rozložení vizuálního kola se uzamkne; významná změna rozměrů během zapamatování vyžaduje nové kolo.

Blackjack používá americký peek, blackjack 3:2, pozdní surrender a základní strategii podle celkového součtu. Počet balíčků, S17/H17, povolené double, DAS a resplit jsou nastavitelné. Skrytá karta do countu vstupuje až po odhalení. Nejde o simulaci evropského no-hole-card nebo early-surrender pravidla.

## Docker a Coolify

```sh
docker build -t counting-cards .
docker run --rm -p 8080:8080 counting-cards
```

Vícefázový Dockerfile sestaví React aplikaci a obslouží ji pomocí nginx na portu **8080**. Health check je **GET /healthz**, hluboké cesty vracejí aplikaci. Žádné proměnné prostředí, databáze ani trvalý serverový svazek nejsou potřebné; osobní data zůstávají v prohlížeči.

V Coolify vytvoř aplikaci z veřejného repozitáře, zvol `Dockerfile`, větev `main`, cestu `/Dockerfile`, port `8080` a přidělenou adresu. Pro health check použij `/healthz`. Po aktualizaci větve aplikaci znovu nasaď. GitHub Actions ověřuje testy, sestavení, Docker image, health endpoint a hlubokou cestu.

## Struktura a podklady

- `src/engine/`: nezávislé karetní, paměťové, blackjackové a časové algoritmy.
- `src/data/`: validace, bezpečné ukládání a sdílený stav.
- `src/screens/`, `src/components/`: tréninky a opakovaně použitelné ovládání.
- `public/cards/`: 52 klasických SVG líců, bez závislosti na vzdálené službě.
- `docs/`: funkční kontrakt, rozhodnutí a nezávislé audity.

[Figma Make](https://www.figma.com/make/OBJhBh3mghgcIPYa9aeMDM/) · [referenční strategie](https://wizardofodds.com/games/blackjack/strategy/calculator/) · [zdroj karetních ilustrací](https://github.com/hayeah/playing-cards-assets)

Fonty a ikony jsou uvedené v `public/asset-credits.txt`, úplné licence závislostí v `public/third-party-notices.txt` (obnoví je `npm run licenses`); původní licence karetních podkladů je v `public/cards/LICENSE.txt`.
