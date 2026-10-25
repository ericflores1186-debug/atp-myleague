# ATP MyLEAGUE

A multi-season tennis franchise simulator that runs in the browser. One React component, no server.

A new franchise picks up on today's date. The 2026 season so far is replayed with the real champion of every event, and the rankings start from the real ATP rankings of 19 October 2026. From there the game simulates the rest of the season and every season after it, with players aging, developing, retiring and being replaced by rookies.

## Play

Open `index.html` in a browser. Your save is kept in that browser's local storage.

To play it online, turn on GitHub Pages for this repository (Settings → Pages → deploy from the `main` branch, root folder). `index.html` is served as the home page.

## What's in it

- **The tour:** 150 players with ratings for serve, forehand, backhand, movement, stamina and mental strength, plus surface ratings. A 32-event calendar: the four Grand Slams, the Masters 1000s, ATP 500s and 250s, and the ATP Finals.
- **Matches:** simulated point by point, with play-by-play commentary, a two-person commentary booth, full match stats and a replay you can watch live.
- **Rankings:** rolling 52-week ATP points, where only a player's best six 500 and 250 results count. Players choose their own schedules and manage their energy.
- **Stories:** previews, reports, upsets, critiques, rivalries, power rankings and the occasional war of words, with feuds that carry over.
- **Press room:** post-match interviews with follow-up questions, answered in each player's own voice; pre-match quotes; trash talk when the moment calls for it.
- **Betting:** realistic American odds on matches and tournament winners, with your own bankroll and profit chart.
- **Records and GOAT:** a GOAT score, all-time records, a three-room GOAT debate (players, analysts, fans), a pace chart of Grand Slams by age, a milestone watch and head-to-heads between the greats.

## Develop

```bash
npm install
npm run build
npm test
```

- `ATPMyLeague.jsx` is the whole game: data, engine and interface in one file.
- `npm run build` compiles it into `atp-myleague.html` (the page as an HTML fragment, the format the Claude artifact host expects) and `index.html` (the same page as a complete document).
- `npm test` plays eight full seasons and checks the invariants on the way: draws, points, the off-season, save files, betting prices, the real 2026 results, and that every line of generated text reads cleanly.

React, ReactDOM, Tailwind and the icons load from public CDNs, so the page needs an internet connection.

## Real and simulated

This is an unofficial fan simulation, not affiliated with the ATP. Player names are real; ratings are the game's own estimates.

- **Real:** career honours through 2025 (Grand Slams, ATP Finals, Masters 1000s, weeks at No. 1, year-end No. 1), the champion and runner-up of each 2026 final on the game's calendar through 18 October 2026, the top 12 of the ATP rankings on 19 October 2026, and weeks at No. 1 during 2026.
- **Simulated:** everything else, including the scores and earlier rounds of those 2026 weeks and every season after today.
- **Generated:** interviews, quotes, trash talk, the commentators, the pundits and the fan accounts. Nobody named in the game said any of it, and the commentators, pundits and accounts are invented.
