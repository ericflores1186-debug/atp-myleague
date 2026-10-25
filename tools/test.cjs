// Regression suite for the ATP MyLEAGUE engine. Plays several full seasons and checks the invariants on the way.
// usage: node test.cjs [seasons=8] [seed=5]
const assert = require("node:assert");
const E = require("./engine.cjs");
const { reducer, createGame, rankBy, totalPoints, indexById, simMatch, statsAt, scoreLine, honours, goatScore, matchFacts, preview, report, matchPatterns, matchExtras, isBigMatch, matchMarkets, outrightMarket, interview, needle, pressCall, edgeOf, voiceOf, goatDebate, slamPace, milestones, greatRivalries, EVENTS, ATTRS, OFFSEASON_WEEK, ROSTER, TIERS, TOUR_SIZE, TOUR_LIMIT, LEGENDS } = E;

const SEASONS = Number(process.argv[2] || 8);
const BAD = /undefined|NaN|\[object|Infinity/;
const PRONOUN = /\b(he|she|his|her|hers|him|himself|herself)\b/i;
const clean = (line, where) => {
  assert.ok(typeof line === "string" && line.length > 0 && !BAD.test(line) && !/\bnull\b/.test(line), `${where}: ${line}`);
  assert.ok(!PRONOUN.test(line), `gendered pronoun in ${where}: ${line}`);
};

let s = createGame(Number(process.argv[3] || 5));
assert.strictEqual(s.currentYear, 2026);
assert.strictEqual(s.currentWeek, 1);
assert.strictEqual(s.players.length, TOUR_SIZE);
assert.strictEqual(s.calendar.length, EVENTS.length);
assert.strictEqual(OFFSEASON_WEEK, EVENTS.length + 1);
// the eleven players the franchise was specified with keep their ratings
const sinner = s.players.find((p) => p.name === "Jannik Sinner");
assert.ok(sinner.age === 24 && sinner.ovr === 98 && sinner.srv === 94 && sinner.men === 98);
assert.ok(ROSTER.length === TOUR_SIZE && new Set(s.players.map((p) => p.id)).size === TOUR_SIZE);
assert.deepStrictEqual(createGame(77), createGame(77), "a seed always builds the same world");
assert.strictEqual(reducer(s, { type: "RUN_OFFSEASON" }), s, "no off-season before the season is played");

// a franchise started part-way through a season picks up on that date, with everything before it played
{
  const vie = EVENTS.findIndex((e) => e.id === "vie");
  const today = createGame(5, "2026-10-23");
  assert.ok(today.currentYear === 2026 && today.currentWeek === vie + 1 && today.startedOn === "2026-10-23", "Vienna (26 October) is next");
  assert.ok(!today.tournament || today.tournament.status === "complete");
  assert.ok(today.calendar.slice(0, vie).every((e) => e.champion) && today.calendar.slice(vie).every((e) => !e.champion));
  assert.ok(today.news[0].h.includes("Oct 23") && today.news[0].body.every((line) => !/undefined|NaN/.test(line)));
  assert.deepStrictEqual(createGame(5, "2026-10-23"), today, "the same day always gives the same world");
  // 2026 so far is the real one: every champion, every runner-up who is on the tour, the October rankings and weeks at No. 1
  const finals = E.REAL_FINALS[2026];
  const onTour = new Set(today.players.map((p) => p.name));
  today.calendar.slice(0, vie).forEach((e) => {
    assert.strictEqual(e.champion.name, finals[e.id][0], `${e.name} champion`);
    if (onTour.has(finals[e.id][1])) assert.strictEqual(e.runnerUp.name, finals[e.id][1], `${e.name} runner-up`);
  });
  const top = rankBy(today.players, totalPoints).slice(0, 12).map((p) => p.name);
  assert.deepStrictEqual(top, Object.keys(E.REAL_SNAPSHOT.points), "the top twelve on 19 October");
  const cabinet = (name) => honours(today.players.find((p) => p.name === name));
  assert.deepStrictEqual(cabinet("Jannik Sinner"), { slam: 5, finals: 2, masters: 10, weeks: 94, ye: 1 });
  assert.deepStrictEqual(cabinet("Carlos Alcaraz"), { slam: 7, finals: 0, masters: 8, weeks: 66, ye: 2 });
  assert.deepStrictEqual(cabinet("Alexander Zverev"), { slam: 2, finals: 2, masters: 7, weeks: 0, ye: 0 });
  assert.ok(cabinet("Ben Shelton").masters === 2 && cabinet("Arthur Fils").masters === 1 && cabinet("Alejandro Davidovich Fokina").masters === 1);
  // the replayed matches are ordinary matches: each one replays from its seed to the same result
  const last = today.tournament;
  const byId = indexById(today.players);
  last.rounds.forEach((rd) => rd.matches.forEach((m) => {
    const re = simMatch(m.seed, byId[m.a], byId[m.b], last, false, m.en);
    assert.ok(re.winner === m.winner && JSON.stringify(re.sets) === JSON.stringify(m.sets), "a replayed real week replays exactly");
  }));
  // mid-week: Vienna under way with the first round done
  const midweek = createGame(5, "2026-10-28");
  assert.ok(midweek.currentWeek === vie + 1 && midweek.tournament.status === "live" && midweek.tournament.roundIndex === 1);
  let rest = today;
  for (let guard = 0; guard < 10 && rest.currentWeek < OFFSEASON_WEEK; guard++) {
    if (!rest.tournament || rest.tournament.status === "complete") rest = reducer(rest, { type: "START_TOURNAMENT" });
    rest = reducer(rest, { type: "SIM_TOURNAMENT" });
  }
  assert.strictEqual(rest.currentWeek, OFFSEASON_WEEK);
  rest = reducer(rest, { type: "RUN_OFFSEASON" });
  assert.ok(rest.currentYear === 2027 && rest.currentWeek === 1, "and the season carries on into the next one");
  assert.strictEqual(createGame(5, "2026-12-10").currentWeek, OFFSEASON_WEEK, "in December the off-season is next");
  const later = createGame(5, "2027-03-10");
  assert.ok(later.currentYear === 2027 && later.seasons.length === 1 && later.calendar[later.currentWeek - 1].id === "iw" && later.tournament.status === "live");
  assert.ok(later.seasons[0].events.find((e) => e.abbr === "AO").champion === "Carlos Alcaraz", "the real 2026 stays in the record books of later saves");
  assert.strictEqual(createGame(5, "2025-12-01").currentWeek, 1, "before the season starts, nothing is played");
  assert.strictEqual(createGame(5).currentWeek, 1);
  // calendars saved before events had dates still work
  const oldEntry = { ...today.calendar[3] };
  delete oldEntry.dates;
  assert.ok(E.eventDays(oldEntry, 2026).start === Date.UTC(2026, 1, 9) && E.dateRange(oldEntry, 2026) === "Feb 9–15");
  assert.strictEqual(E.dateRange(EVENTS.find((e) => e.id === "wim"), 2026), "Jun 29 – Jul 12");
}

// the three rooms, the pace chart, milestones and head-to-heads all read cleanly
const debateTops = new Set();
const feeds = new Set();
function checkDebate(state) {
  const d = goatDebate(state);
  assert.deepStrictEqual(goatDebate(state), d, "the debate is a pure function of the save");
  assert.strictEqual(d.players.questions.length, 3);
  d.players.questions.forEach((q) => {
    assert.strictEqual(q.poll.reduce((n, r) => n + r.votes, 0), d.players.voters, `${q.id}: every ballot is counted`);
    assert.ok(q.quotes.length >= 4 && q.quotes.length <= 6 && new Set(q.quotes.map((x) => x.id)).size === q.quotes.length, `${q.id}: quotes`);
    assert.ok(new Set(q.quotes.map((x) => x.text)).size === q.quotes.length, `${q.id}: no line is said twice`);
    q.quotes.forEach((x) => {
      assert.ok(x.name !== x.pick && state.players.some((p) => p.id === x.id) && x.reason, "a real voter with a reason, and nobody votes for themselves");
      clean(x.text, `players/${q.id}`);
    });
    clean(q.ask, "question");
    clean(q.note, "question note");
  });
  assert.strictEqual(d.players.voters, 40);
  d.players.own.forEach((x) => clean(x.text, "own words"));
  const a = d.analysts;
  assert.ok(a.desks.length === 5 && a.desks.every((k) => k.list.length === 5) && a.cases.length === 4 && a.cases.every((c) => c.pro.length && c.con.length));
  assert.ok(a.consensus.n >= 2 && a.consensus.of === 5 && a.panel.lines.length >= 4 && a.panel.of >= 4 && a.panel.cast.length === 4);
  const titles = new Set();
  for (let k = 0; k < a.panel.of; k++) {
    const p = goatDebate(state, k).analysts.panel;
    titles.add(p.title);
    clean(p.title, "panel title");
    p.lines.forEach((l) => clean(l.text, `panel/${p.title}`));
    assert.ok(p.lines.every((l) => l.name && l.role));
  }
  assert.strictEqual(titles.size, a.panel.of, "next topic walks through every topic once");
  [a.verdict, ...a.desks.map((k) => k.text), ...a.cases.flatMap((c) => c.pro.concat(c.con)), ...a.chase.map((c) => c.text)].forEach((line) => clean(line, "analysts"));
  const f = d.fans;
  assert.strictEqual(f.poll.reduce((n, r) => n + r.pct, 0), 100, "the fan poll adds up");
  assert.ok(f.posts.length === 10 && new Set(f.posts.map((p) => p.text)).size === 10 && f.tags.length >= 3 && f.accounts >= 35 && f.bases.length === 6);
  const handles = f.posts.flatMap((p) => [p.handle].concat(p.thread.map((r) => r.handle)));
  assert.strictEqual(new Set(handles).size, handles.length, "nobody posts twice in one feed");
  assert.ok(f.posts.filter((p) => p.thread.length).length >= 2, "the top posts have replies");
  f.posts.forEach((p) => {
    clean(p.text, "post");
    assert.ok(p.kind && /^@\w+$/.test(p.handle));
    p.thread.forEach((r) => clean(r.text, "reply"));
  });
  f.bases.forEach((b) => assert.ok(/^\d+\.\dM$/.test(b.followers) && /^[+−]\d+\.\d%$/.test(b.change) && state.players.some((p) => p.id === b.id)));
  const again = goatDebate(state, 1);
  assert.deepStrictEqual(again.fans.poll, f.poll, "refreshing the feed does not move the poll");
  assert.notDeepStrictEqual(again.fans.posts.map((p) => p.text), f.posts.map((p) => p.text), "refreshing changes the feed");
  Object.values(d.stand).forEach((x) => [x.name, x.note].forEach((line) => clean(line, "stand")));
  debateTops.add(`${d.stand.players.name}/${d.stand.analysts.name}/${d.stand.fans.name}`);
  feeds.add(JSON.stringify([f.poll, f.posts.map((p) => p.text)]));

  const pace = slamPace(state);
  assert.strictEqual(pace.bench.length, 3);
  assert.ok(pace.chasers.length <= 3 && new Set(pace.chasers.map((c) => c.slot)).size === pace.chasers.length);
  pace.bench.concat(pace.chasers).forEach((line) => {
    assert.ok(line.pts.length >= 2, `${line.name}: a curve has at least two points`);
    line.pts.forEach(([age, n], k) => assert.ok(Number.isInteger(age) && Number.isInteger(n) && (k === 0 || (age === line.pts[k - 1][0] + 1 && n >= line.pts[k - 1][1])), `${line.name}: one point a year, never falling`));
  });
  pace.chasers.forEach((c) => {
    const p = state.players.find((x) => x.id === c.id);
    const [age, n] = c.pts[c.pts.length - 1];
    assert.ok(age === p.age && n === honours(p).slam && c.n === n, `${c.name}: the curve ends on today's age and total`);
  });
  const real = { "Novak Djokovic": [36, 24], "Rafael Nadal": [36, 22], "Roger Federer": [37, 20] };
  pace.bench.forEach((b) => assert.strictEqual(pace.valueAt(b.pts, real[b.name][0], true), real[b.name][1], `${b.name} at ${real[b.name][0]}`));
  pace.reads.forEach((r) => clean(r.text, "pace"));

  const marks = milestones(state);
  assert.ok(marks.length <= 8 && new Set(marks.map((m) => m.text)).size === marks.length);
  marks.forEach((m) => {
    clean(m.text, "milestone");
    assert.ok(state.players.some((p) => p.id === m.id));
  });
  const g = greatRivalries(state);
  g.closed.concat(g.live).forEach((r) => assert.ok(r.wa >= r.wb && r.wa + r.wb >= 3 && r.a && r.b, "the leader is listed first"));
  assert.ok(g.closed.some((r) => r.a === "Djokovic" && r.b === "Nadal" && r.wa === 31 && r.wb === 29));
}

const kinds = {};
const newsSeen = new Set();
let words = 0, wordsChecked = 0, matchesPlayed = 0, deepChecked = 0, pressChecked = 0, followUps = 0, boothLines = 0;
const pressTopics = {};
const talkTopics = {};
const t0 = Date.now();

for (let season = 0; season < SEASONS; season++) {
  const year = s.currentYear;
  assert.strictEqual(year, 2026 + season);
  for (let w = 1; w <= EVENTS.length; w++) {
    assert.strictEqual(s.currentWeek, w);
    s = reducer(s, { type: "START_TOURNAMENT" });
    assert.strictEqual(reducer(s, { type: "START_TOURNAMENT" }), s, "one tournament at a time");
    assert.strictEqual(reducer(s, { type: "RUN_OFFSEASON" }), s);
    let t = s.tournament;
    const tier = TIERS[t.tier];
    const event = s.calendar[t.slot];
    assert.strictEqual(Object.keys(t.entries).length, tier.draw, `${event.name}: full draw`);
    assert.strictEqual(t.rounds.length, tier.rounds.length);

    // betting on the first event of each season: money in, a bet down, and the books balance afterwards
    if (w === 1) {
      s = reducer(s, { type: "BET_FUNDS", amount: 1000 });
      const before = s.bank.balance;
      const mk = matchMarkets(s, s.tournament, 0, 0);
      assert.ok(mk.win[0] > 1 && mk.win[1] > 1 && 1 / mk.win[0] + 1 / mk.win[1] > 1 && 1 / mk.win[0] + 1 / mk.win[1] < 1.12, "match prices carry a margin");
      s = reducer(s, { type: "BET_PLACE", kind: "win", r: 0, i: 0, pick: "a", stake: 100 });
      assert.strictEqual(s.bank.balance, before - 100);
      assert.strictEqual(s.bank.open.length >= 1, true);
      assert.strictEqual(reducer(s, { type: "BET_PLACE", kind: "win", r: 0, i: 0, pick: "a", stake: 1e9 }), s, "cannot stake more than the bank");
      const out = outrightMarket(s, s.tournament);
      assert.ok(out.length >= 8 && out.every((x) => x.odds > 1));
    }

    const stepwise = w % 4 === 1;
    let guard = 0;
    while (s.tournament.status !== "complete" && guard++ < 12) {
      const r0 = s.tournament.roundIndex;
      const beforeCalls = stepwise ? s.tournament.rounds[r0].matches.map((m, i) => (m.a && m.b && !m.winner ? JSON.stringify(pressCall(s, matchFacts(s, s.tournament, r0, i))) : null)) : [];
      s = reducer(s, stepwise ? { type: "SIM_ROUND" } : { type: "SIM_TOURNAMENT" });
      beforeCalls.forEach((was, i) => {
        if (!was) return;
        const now = JSON.stringify(pressCall(s, matchFacts(s, s.tournament, r0, i)));
        assert.strictEqual(now, was, "pre-match quotes never change once the result is known");
        pressChecked++;
        JSON.parse(now).forEach((side) => {
          assert.ok(side.lines.length >= 1 && side.lines.length <= 2);
          side.lines.forEach((x) => [x.q, x.a, x.by].forEach((line) => clean(line, `pre-match/${x.topic}`)));
          pressTopics[side.lines[0].topic] = (pressTopics[side.lines[0].topic] || 0) + 1;
        });
      });
      // a "War of words" story must match what the match's own interview tab shows afterwards
      s.news.filter((n) => n.k === "words" && n.y === year && n.w === event.week && !newsSeen.has(`w${n.y}:${n.w}`)).forEach((n) => {
        newsSeen.add(`w${n.y}:${n.w}`);
        words++;
        if (!stepwise) return;
        const quote = /“(.+)”/.exec(n.body[1])[1];
        const said = /“(.+)”/.exec(n.body[2])[1];
        s.tournament.rounds.forEach((rd, r) => rd.matches.forEach((m, i) => {
          if (!m.winner || !n.ids.includes(m.a) || !n.ids.includes(m.b)) return;
          const f = matchFacts(s, s.tournament, r, i);
          const who = f.P[0].id === n.ids[0] ? 0 : 1;
          const mine = interview(s, f, who).qa.find((x) => x.topic === "needle");
          const back = interview(s, f, 1 - who).qa.find((x) => x.topic === "reply");
          assert.ok(mine && mine.a === quote, `story and interview disagree: ${n.h}`);
          assert.ok(back && back.a === said, `story and reply disagree: ${n.h}`);
          assert.ok(edgeOf(f.P[who]) > 0, "only players with an edge start it");
          wordsChecked++;
        }));
      });
    }
    t = s.tournament;
    assert.strictEqual(t.status, "complete");
    assert.strictEqual(s.currentWeek, w + 1);
    const done = s.calendar[t.slot];
    assert.ok(done.champion && done.champion.id === t.championId && done.runnerUp && typeof done.score === "string");
    const final = t.rounds[t.rounds.length - 1].matches[0];
    assert.ok(final.winner === t.championId && [final.a, final.b].includes(t.runnerUpId));
    t.rounds.forEach((rd, r) => {
      assert.strictEqual(rd.matches.length, tier.draw / Math.pow(2, r + 1));
      rd.matches.forEach((m) => {
        matchesPlayed++;
        assert.ok(m.winner && (m.winner === m.a || m.winner === m.b) && m.sets.length >= (tier.bestOf + 1) / 2 && m.sets.length <= tier.bestOf, "a decided match with a legal number of sets");
      });
    });
    // the champion banks the winner's points for this slot
    const champ = s.players.find((p) => p.id === t.championId);
    assert.ok(champ.rankingPoints[t.slot] && champ.rankingPoints[t.slot].pts === tier.points.W && champ.rankingPoints[t.slot].round === "W");
    if (w === 1) assert.strictEqual(s.bank.open.filter((b) => b.y === year && b.w === event.week).length, 0, "every bet on a finished event is settled");

    // one tournament a season gets the full read-through: every match previewed, reported, replayed and interviewed
    if ((season === 0 && w === 3) || (season === 1 && w === 6) || (season === 2 && w === 1)) {
      const by = indexById(s.players);
      t.rounds.forEach((rd, r) => rd.matches.forEach((m, i) => {
        const f = matchFacts(s, t, r, i);
        const pv = preview(f);
        const rp = report(f);
        [pv.headline, ...pv.text, rp.headline, ...rp.text].forEach((line) => clean(line, "match story"));
        const re = simMatch(m.seed, by[m.a], by[m.b], t, true, m.en);
        assert.ok(re.winner === m.winner, "a match replays to the same result from its seed");
        assert.deepStrictEqual(re.sets, m.sets);
        assert.deepStrictEqual(statsAt(re.log, re.log.points.length), m.st, "the point log adds up to the stored stats");
        assert.ok(matchPatterns(re.log, f).length >= 2 && matchExtras(re.log, f).length >= 3);
        re.log.games.forEach((g) => (g.booth || []).forEach((b) => {
          assert.ok(b.who === 0 || b.who === 1);
          clean(b.text, "booth");
          boothLines++;
        }));
        assert.ok(re.log.games[re.log.games.length - 1].booth, "the booth always calls the end of the match");
        [0, 1].forEach((who) => {
          const talk = interview(s, f, who);
          assert.deepStrictEqual(interview(s, f, who), talk, "an interview reads the same every time it is opened");
          assert.strictEqual(talk.voice, voiceOf(f.P[who]));
          assert.ok(talk.qa.length >= 4 && new Set(talk.qa.map((x) => x.topic)).size === talk.qa.length, "an interview has at least four distinct questions");
          assert.strictEqual(talk.qa[0].topic === "summary" || talk.qa[0].weight == null, true);
          talk.qa.forEach((x) => {
            clean(`${x.q} ${x.a}`, `interview/${x.topic}`);
            clean(x.by, "outlet");
            assert.ok(Array.isArray(x.more));
            x.more.forEach((y) => {
              clean(`${y.q} ${y.a}`, `follow-up/${x.topic}`);
              followUps++;
            });
            talkTopics[x.topic] = (talkTopics[x.topic] || 0) + 1;
          });
          if (edgeOf(f.P[who]) === 0) assert.strictEqual(needle(s, f, who), null, "polite players never start it");
        });
        const mk = matchMarkets(s, t, r, i);
        mk.win.concat(mk.scores.map((x) => x.odds)).forEach((d) => {
          const us = d >= 2 ? (d - 1) * 100 : -100 / (d - 1);
          assert.ok(Math.abs(us - Math.round(us)) < 0.2 && Math.abs(Math.round(us)) >= 100 && Math.round(Math.abs(us)) % 5 === 0, `prices are whole American odds in steps of five: ${us}`);
        });
        deepChecked++;
      }));
      assert.ok(t.rounds.some((rd, r) => rd.matches.some((m) => isBigMatch(t, r, m))));
    }
    if (w === 3 || w % 8 === 0) checkDebate(s);
  }

  // the stories written this season
  s.news.forEach((n) => {
    if (newsSeen.has(n.id)) return;
    newsSeen.add(n.id);
    kinds[n.k] = (kinds[n.k] || 0) + 1;
    assert.ok(n.h && n.body && n.body.length >= 2 && Array.isArray(n.ids), `article shape: ${n.h}`);
    [n.h, n.dek, ...n.body].forEach((line) => clean(line, `article/${n.k}`));
  });

  // the off-season: the part that has to be flawless
  const ages = Object.fromEntries(s.players.map((p) => [p.id, p.age]));
  const no1 = rankBy(s.players, totalPoints)[0];
  const before = s;
  assert.strictEqual(s.currentWeek, OFFSEASON_WEEK);
  assert.strictEqual(reducer(s, { type: "START_TOURNAMENT" }), s, "nothing left to play this year");
  s = reducer(s, { type: "RUN_OFFSEASON" });
  assert.strictEqual(s.currentYear, year + 1);
  assert.strictEqual(s.currentWeek, 1);
  assert.strictEqual(s.tournament, null);
  assert.ok(s.calendar.length === EVENTS.length && s.calendar.every((e) => !e.champion && e.year === year + 1), "a fresh calendar");
  assert.ok(s.players.length >= TOUR_SIZE && s.players.length <= TOUR_LIMIT, `tour size ${s.players.length}`);
  assert.strictEqual(new Set(s.players.map((p) => p.id)).size, s.players.length);
  assert.strictEqual(s.seasons.length, season + 1);
  assert.ok(s.seasons[season].year === year && s.seasons[season].events.length === EVENTS.length && s.seasons[season].events.every((e) => e.champion));
  const stayed = s.players.filter((p) => ages[p.id] != null);
  assert.ok(stayed.length >= TOUR_SIZE - 30, "most of the tour comes back");
  stayed.forEach((p) => {
    assert.strictEqual(p.age, ages[p.id] + 1, `${p.name} is a year older`);
    ATTRS.concat(["ovr", "hard", "clay", "grass"]).forEach((k) => assert.ok(Number.isInteger(p[k]) && p[k] >= 30 && p[k] <= 99, `${p.name} ${k} ${p[k]}`));
    assert.ok(p.stats.w === 0 && p.stats.l === 0 && p.career.length >= 1 && p.career[p.career.length - 1].year === year, "the season line is filed and the new one is blank");
    const old = before.players.find((x) => x.id === p.id);
    const delta = (k) => p[k] - old[k];
    if (old.age >= 18 && old.age + 1 <= 22) assert.ok(ATTRS.every((k) => delta(k) >= 0), `${p.name}: growth years never lose ratings`);
    if (old.age + 1 >= 29) assert.ok(delta("mov") <= 0 && delta("sta") <= 0, `${p.name}: movement and stamina decline from 29`);
  });
  const champNo1 = s.players.find((p) => p.id === no1.id) || s.retired.find((p) => p.id === no1.id);
  assert.strictEqual(champNo1.yeNo1, no1.yeNo1 + 1, "the year-end No. 1 is recorded");
  assert.ok(s.offseason && s.offseason.fromYear === year && s.offseason.toYear === year + 1 && Array.isArray(s.offseason.development), "the off-season report is filed");
  const copy = JSON.parse(JSON.stringify(s));
  assert.deepStrictEqual(copy, s, "the save survives a round trip through JSON");
  checkDebate(s);
}

// scouting adds a rookie; a new franchise starts clean
if (s.players.length < TOUR_LIMIT) {
  const more = reducer(s, { type: "ADD_ROOKIE" });
  assert.strictEqual(more.players.length, s.players.length + 1);
  assert.ok(more.players[more.players.length - 1].rookie || more.players.some((p) => p.rookie));
}
const fresh = reducer(s, { type: "NEW_GAME", seed: 9 });
assert.ok(fresh.currentYear === 2026 && fresh.seasons.length === 0 && fresh.bank.balance === 0);

// the all-time list still makes sense
const best = s.players.concat(s.retired).map((p) => goatScore(honours(p))).sort((a, b) => b - a)[0];
assert.ok(best >= goatScore({ slam: 24, finals: 7, masters: 40, weeks: 428, ye: 8 }) && LEGENDS.length === 5);
assert.ok(feeds.size >= Math.max(2, SEASONS * 4), "the fan room changes from week to week");
assert.ok(words >= SEASONS && words <= SEASONS * 16, `trash talk is occasional: ${words}`);

const size = JSON.stringify(s).length;
console.log(`seasons ${SEASONS} | matches ${matchesPlayed} | deep-checked matches ${deepChecked} | ${((Date.now() - t0) / 1000).toFixed(1)}s | save ${(size / 1024).toFixed(0)} KB`);
console.log("articles by kind:", Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", "));
console.log(`war of words: ${words} stories, ${wordsChecked} checked against the interview tab`);
console.log(`dialogue: ${pressChecked} pre-match calls stable before and after the result | ${followUps} follow-ups | ${boothLines} booth lines`);
console.log("interview topics:", Object.entries(talkTopics).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", "));
console.log("pre-match lead topics:", Object.entries(pressTopics).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", "));
assert.ok(pressChecked > 100 && followUps > 200 && boothLines > 500, "the dialogue is actually there");
console.log("room leaders seen (players/analysts/fans):", [...debateTops].join(", "));
console.log("ALL ASSERTIONS PASSED");
