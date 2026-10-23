# CrimewaTHch

Live leaderboard for the LYLC BFF Challenge (26–30 Oct). One page, no sign-in, no backend.
It reads the Google Sheet every 60 seconds and re-ranks in place without a reload.

```
index.html              the whole thing: markup, CSS, JS, inline SVG
vendor/xlsx.full.min.js SheetJS 0.20.3, vendored so venue wifi can't break parsing
vendor/lenis.min.js     Lenis 1.3.27, smooth scrolling
fixtures/               test spreadsheets, used only for verification (safe to delete)
```

## Running it

It needs to be served over http, not opened as a file. `fetch` is blocked on `file://`, so
double-clicking `index.html` will show "SIGNAL LOST".

```bash
python -m http.server 8080      # then open http://127.0.0.1:8080
```

## Deploying to GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`, which injects the sheet source and publishes.
One-time setup:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret**, named `SHEET_URL`, value
   = your Google Sheet id (the long string in the sheet's URL) or the full sheet link.
3. Push, or run the workflow manually from the Actions tab.

Without the secret the site still deploys; it just shows demo data until someone opens it with
`?sheet=<id>`. The workflow excludes `fixtures/` and `.github/` from what gets published.

**A Pages site is public even when the repository is private.** Making this repo private hides the
source, not the board.

For any other static host (Netlify drop, Vercel, a school web server), upload `index.html`, the
`vendor/` folder and `.nojekyll`, then either paste your sheet id into the `crimewathch:sheet` meta
tag or open the board once with `?sheet=<id>`.

## Settings

All at the top of the `<script>` block in `index.html`.

| Setting | Default | What it does |
|---|---|---|
| `DATA_URL` | resolved at runtime | **Not hardcoded** — see [Where the scores come from](#where-the-scores-come-from). Accepts a Google Sheets id or link, or a local file like `./leaderboard.xlsx`. With nothing set, the board runs on 12 built-in sample pairs and shows a DEMO DATA chip. |
| `REFRESH_SECONDS` | `60` | How often to re-read the sheet. |
| `EVENT_DATES` | `"26–30 OCT"` | Shown under the wordmark. |
| `SMOOTH_SCROLL` | `true` | Weighted inertial scrolling. Desktop (≥768px) only, and never when the viewer has reduced motion turned on. Set `false` for plain native scrolling. |
| `PARSE_MODE` | `"auto"` | `"scores"` forces the transposed mastersheet parser, `"table"` forces the flat `Name \| Score` parser, `"auto"` picks. |
| `SCORING_TIERS` | 6×200, 6×400, 6×600, 4×800 | Points per challenge, applied in order down the challenge block. |

## How scoring works

The board reads the **`Scores`** tab and totals each pair itself. That tab is transposed: pairs run
across as columns (LYLC name in row 1, partner in row 2), challenges run down as rows of tick boxes.

Rows are found by their column-A label (`Partner`, `Challenges`, `Bonus Points`), not by row number,
so inserting rows above the block will not break it. Each ticked box adds its tier's points, then the
`Bonus Points` row is added raw.

| Challenge rows | Points each |
|---|---|
| THx Got Talent → I not phantom | 200 |
| Hungry Leh → THe good ol days | 400 |
| Oi oi oi baka → Disconnect to Connect | 600 |
| THx Trap (Mon) → Amazing Race (Thurs) | 800 |
| Bonus Points | added as written |

Maximum without bonus: **10,400**.

If you add or remove challenge rows, update `SCORING_TIERS` to match. The board logs a console
warning if the number of challenge rows stops matching the tiers.

## Where the scores come from

The sheet id is **not** committed to this repository. It is resolved at runtime, first match wins:

1. **`?sheet=<id>`** in the URL. Also saved to that browser's `localStorage`, so the projector only
   needs it once: open `…/index.html?sheet=<id>` and from then on the plain URL works on that
   machine.
2. **`localStorage`**, from a previous `?sheet=` visit.
3. **The `crimewathch:sheet` meta tag** in `index.html`, which the deploy workflow fills in from the
   `SHEET_URL` repository secret.
4. **Nothing** — demo data.

Only a Google Sheets id/link or a file served from the same origin is accepted, so a crafted
`?sheet=` link cannot point the board at someone else's server.

### What this does and does not hide

It keeps the sheet id out of this repository. **It does not hide it from anyone who opens the
deployed page** — the browser has to fetch the sheet, and that request is visible in devtools. There
is no way around that in a page with no backend.

So: treat anything this board can read as public. Before deploying, open the Sheet's **Share**
dialog and confirm *Anyone with the link* is set to **Viewer**, not Editor — otherwise a visitor
could edit your scores. Also note the board publishes participants' names to whoever opens it.

## Two things wrong with the sheet

Found while building this. The board works around both, but you may still want to fix them because
anyone reading the Sheet directly will see wrong numbers.

1. **`Total Score` is only wired up for one pair.** Only column B has the
   `=COUNTIF(B5:B10,TRUE)*200 + …` formula. Columns C–AF contain a hardcoded `0` with no formula, so
   30 of 31 pairs would never move no matter how many boxes get ticked.
   **Fix:** copy `Scores!B3` across `C3:AF3`.
2. **The `Leaderboard` tab is missing 3 pairs** that exist in `Scores`. The board already includes
   them, because it reads `Scores` rather than `Leaderboard`.

## What the board shows

- **Before any points land**, while every pair is on 0, it shows `CASE OPEN · NO CONVICTIONS YET`
  and lists the whole lineup, rather than inventing a podium out of a 31-way tie. The moment any
  score moves it flips to the real podium.
- **Ranks 1–3** go on the podium (#1 centre and raised), everyone else into the lineup table.
- **Ties share a rank** (1, 2, 2, 4) and are listed A→Z. If four pairs tie at the top, three go on
  the plinths and the fourth sits at the top of the table still showing rank 1.
- **Blank rows are skipped**; a blank or non-numeric score counts as 0.
- **Who's Next?** shows ranks 4–13 by default; **Show all** expands the rest.
- **The Full Case File** at the bottom lists *everybody* from rank 1 down, always expanded. The
  podium three are tinted and carry their roles (The Mastermind / The Accomplice / The Getaway
  Driver) instead of a status chip. Searching filters this table too.

## Motion

Modelled on the Novaform theme's restraint: weighted scrolling, numbers that count up, slow hovers.

- **Smooth scrolling** via Lenis — 0.8s, cubic ease-out, desktop only.
- **Scroll reveals** — panels and podium cards ease up as they enter view, once. Table rows fade in,
  staggered. Nothing re-animates on the 60s refresh.
- **Count-up** — the podium scores and the suspects-on-file stat tick up from zero over 1.2s the
  first time they are on screen.
- **Hovers** — 0.4s on colour and shadow, 0.6s on transform. Mugshots scale gently inside their
  frame.
- **Live signals kept** — the REC dot still blinks, changed scores still flash, anyone entering the
  top three still gets a siren flash, and rows slide to their new positions on a refresh.
- All of it is disabled under `prefers-reduced-motion`, including smooth scrolling.

## Search

Click the field or press `/`. Matches either name, so searching a partner's name finds the pair.
`Esc` clears it.

## Photos

Optional. Add a `Photo` column with an image URL and that pair gets a mugshot instead of initials.
A URL that fails to load falls back to initials automatically. There is no `Photo` column today, so
every mugshot is currently initials over a police height chart.

## `?admin` — previewing a file before it goes live

Open `index.html?admin` to get a drop zone. Drop (or browse for) an `.xlsx` and it renders in that
browser only: auto-refresh pauses, a `LOCAL FILE` chip appears, and nothing is uploaded anywhere.
"Resume live feed" goes back to the sheet.

## If the feed goes down

The board keeps the last good scores on screen, turns the CCTV chip amber with
`SIGNAL LOST — RETRYING`, and keeps trying every 60 seconds. It recovers on its own. Google
occasionally throttles frequent requests; that is what this state is for, and no action is needed.

## Accessibility and display notes

- Both lineups are real `<table>`s with proper header scopes; search and controls are keyboard
  reachable with visible focus rings.
- Everything animated respects `prefers-reduced-motion`, smooth scrolling included. Reveals are
  armed by JavaScript, so with JS disabled the page renders fully visible rather than blank.
- Checked at 1920×1080 (projector), 1280×800 and 390×844. Under 640px, #1 goes full width on top
  with #2 and #3 beneath, and the table drops the STATUS column.

## Regenerating the test fixtures

```bash
node fixtures/make-fixtures.mjs
```
