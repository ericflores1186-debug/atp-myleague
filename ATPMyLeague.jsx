/*
 * ATP MyLEAGUE — a multi-season tennis franchise simulator in one React component.
 * Styling: Tailwind CSS with the theme tokens defined in the host page (bg, panel, raise,
 * line, fg, muted, ball, ink, hard, clay, grass, up, down + display/body/mono fonts).
 */
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Activity, CalendarDays, ArrowDown, ArrowUp, Award, BarChart3, BatteryMedium, Medal, Star, Wallet, ChevronRight, Crown, Eye, FastForward, LayoutDashboard, MapPin, Minus, Moon, Newspaper, Pause, Play, RotateCcw, Search, SkipForward, Swords, Timer, TrendingDown, TrendingUp, Trophy, UserMinus, UserPlus, Users, X } from "lucide-react";

/* ────────────────────────────── Game data ────────────────────────────── */

const SAVE_KEY = "atp-myleague.save";
const SAVE_VERSION = 7;
const START_YEAR = 2026;
const TOUR_SIZE = 150; // the tour is trimmed back to this many players every off-season
const TOUR_LIMIT = TOUR_SIZE + 16; // scouting stops here until the next off-season

const ATTRS = ["srv", "fh", "bh", "mov", "sta", "men"];
const ATTR_LABEL = { srv: "Serve", fh: "Forehand", bh: "Backhand", mov: "Movement", sta: "Stamina", men: "Mental" };
const ATTR_SHORT = { srv: "SRV", fh: "FH", bh: "BH", mov: "MOV", sta: "STA", men: "MEN" };
const SURFACE_KEYS = ["hard", "clay", "grass"];

// Slams use the real format: 128 players, 32 seeds, 112 direct entries and 16 qualifiers.
const TIERS = {
  slam: { label: "Grand Slam", short: "Slam", bestOf: 5, draw: 128, seeds: 32, qual: 16, rounds: ["R128", "R64", "R32", "R16", "QF", "SF", "F"], points: { W: 2000, F: 1300, SF: 800, QF: 400, R16: 200, R32: 100, R64: 50, R128: 10 } },
  masters: { label: "Masters 1000", short: "1000", bestOf: 3, draw: 64, seeds: 16, qual: 8, rounds: ["R64", "R32", "R16", "QF", "SF", "F"], points: { W: 1000, F: 650, SF: 400, QF: 200, R16: 100, R32: 50, R64: 30 } },
  atp500: { label: "ATP 500", short: "500", bestOf: 3, draw: 32, seeds: 8, qual: 4, rounds: ["R32", "R16", "QF", "SF", "F"], points: { W: 500, F: 330, SF: 200, QF: 100, R16: 50, R32: 0 } },
  atp250: { label: "ATP 250", short: "250", bestOf: 3, draw: 32, seeds: 8, qual: 4, rounds: ["R32", "R16", "QF", "SF", "F"], points: { W: 250, F: 165, SF: 100, QF: 50, R16: 25, R32: 0 } },
  finals: { label: "ATP Finals", short: "Finals", bestOf: 3, draw: 8, seeds: 8, qual: 0, rounds: ["QF", "SF", "F"], points: { W: 1500, F: 1000, SF: 600, QF: 200 } },
};
const OPTIONAL = { atp500: true, atp250: true }; // players choose whether to enter these
const OTHER_COUNT = 6; // only a player's best six 500/250 results count toward the ranking
const ROUND_LABEL = { R128: "Round of 128", R64: "Round of 64", R32: "Round of 32", R16: "Round of 16", QF: "Quarterfinals", SF: "Semifinals", F: "Final" };
const RESULT_LABEL = { W: "Champion", F: "Finalist", SF: "Semifinal", QF: "Quarterfinal", R16: "Round of 16", R32: "Round of 32", R64: "Round of 64", R128: "Round of 128", DNQ: "Missed the cut", DNP: "Did not play" };

const EVENTS = [
  { id: "bri", abbr: "BRI", name: "Brisbane International", city: "Brisbane", country: "AUS", month: "Jan", tier: "atp250", surface: "hard", dates: [1, 4, 8] },
  { id: "ade", abbr: "ADE", name: "Adelaide International", city: "Adelaide", country: "AUS", month: "Jan", tier: "atp250", surface: "hard", dates: [1, 11, 7] },
  { id: "ao", abbr: "AO", name: "Australian Open", city: "Melbourne", country: "AUS", month: "Jan", tier: "slam", surface: "hard", dates: [1, 18, 15] },
  { id: "rot", abbr: "ROT", name: "Rotterdam Open", city: "Rotterdam", country: "NED", month: "Feb", tier: "atp500", surface: "hard", indoor: true, dates: [2, 9, 7] },
  { id: "rio", abbr: "RIO", name: "Rio Open", city: "Rio de Janeiro", country: "BRA", month: "Feb", tier: "atp500", surface: "clay", dates: [2, 16, 7] },
  { id: "doh", abbr: "DOH", name: "Qatar Open", city: "Doha", country: "QAT", month: "Feb", tier: "atp500", surface: "hard", dates: [2, 16, 6] },
  { id: "dub", abbr: "DUB", name: "Dubai Championships", city: "Dubai", country: "UAE", month: "Feb", tier: "atp500", surface: "hard", dates: [2, 23, 6] },
  { id: "iw", abbr: "IW", name: "Indian Wells Masters", city: "Indian Wells", country: "USA", month: "Mar", tier: "masters", surface: "hard", dates: [3, 4, 12] },
  { id: "mia", abbr: "MIA", name: "Miami Open", city: "Miami", country: "USA", month: "Mar", tier: "masters", surface: "hard", dates: [3, 18, 12] },
  { id: "mc", abbr: "MC", name: "Monte-Carlo Masters", city: "Monte-Carlo", country: "MON", month: "Apr", tier: "masters", surface: "clay", dates: [4, 5, 8] },
  { id: "bar", abbr: "BCN", name: "Barcelona Open", city: "Barcelona", country: "ESP", month: "Apr", tier: "atp500", surface: "clay", dates: [4, 13, 7] },
  { id: "mad", abbr: "MAD", name: "Madrid Open", city: "Madrid", country: "ESP", month: "May", tier: "masters", surface: "clay", dates: [4, 22, 12] },
  { id: "rom", abbr: "ROM", name: "Italian Open", city: "Rome", country: "ITA", month: "May", tier: "masters", surface: "clay", dates: [5, 6, 12] },
  { id: "gen", abbr: "GEN", name: "Geneva Open", city: "Geneva", country: "SUI", month: "May", tier: "atp250", surface: "clay", dates: [5, 17, 7] },
  { id: "rg", abbr: "RG", name: "Roland Garros", city: "Paris", country: "FRA", month: "Jun", tier: "slam", surface: "clay", dates: [5, 24, 15] },
  { id: "stu", abbr: "STU", name: "Stuttgart Open", city: "Stuttgart", country: "GER", month: "Jun", tier: "atp250", surface: "grass", dates: [6, 8, 7] },
  { id: "que", abbr: "QUE", name: "Queen's Club Championships", city: "London", country: "GBR", month: "Jun", tier: "atp500", surface: "grass", dates: [6, 15, 7] },
  { id: "hal", abbr: "HAL", name: "Halle Open", city: "Halle", country: "GER", month: "Jun", tier: "atp500", surface: "grass", dates: [6, 15, 7] },
  { id: "wim", abbr: "WIM", name: "Wimbledon", city: "London", country: "GBR", month: "Jul", tier: "slam", surface: "grass", dates: [6, 29, 14] },
  { id: "gst", abbr: "GST", name: "Swiss Open Gstaad", city: "Gstaad", country: "SUI", month: "Jul", tier: "atp250", surface: "clay", dates: [7, 13, 7] },
  { id: "was", abbr: "WAS", name: "Washington Open", city: "Washington", country: "USA", month: "Jul", tier: "atp500", surface: "hard", dates: [7, 27, 7] },
  { id: "can", abbr: "CAN", name: "Canadian Open", city: "Montreal", country: "CAN", month: "Aug", tier: "masters", surface: "hard", dates: [8, 2, 12] },
  { id: "cin", abbr: "CIN", name: "Cincinnati Open", city: "Cincinnati", country: "USA", month: "Aug", tier: "masters", surface: "hard", dates: [8, 13, 11] },
  { id: "ws", abbr: "WS", name: "Winston-Salem Open", city: "Winston-Salem", country: "USA", month: "Aug", tier: "atp250", surface: "hard", dates: [8, 23, 7] },
  { id: "uso", abbr: "USO", name: "US Open", city: "New York", country: "USA", month: "Sep", tier: "slam", surface: "hard", dates: [8, 31, 14] },
  { id: "tok", abbr: "TOK", name: "Japan Open", city: "Tokyo", country: "JPN", month: "Sep", tier: "atp500", surface: "hard", dates: [9, 28, 7] },
  { id: "bei", abbr: "BEI", name: "China Open", city: "Beijing", country: "CHN", month: "Sep", tier: "atp500", surface: "hard", dates: [9, 28, 7] },
  { id: "sha", abbr: "SHA", name: "Shanghai Masters", city: "Shanghai", country: "CHN", month: "Oct", tier: "masters", surface: "hard", dates: [10, 7, 12] },
  { id: "vie", abbr: "VIE", name: "Vienna Open", city: "Vienna", country: "AUT", month: "Oct", tier: "atp500", surface: "hard", indoor: true, dates: [10, 26, 7] },
  { id: "bas", abbr: "BAS", name: "Swiss Indoors", city: "Basel", country: "SUI", month: "Oct", tier: "atp500", surface: "hard", indoor: true, dates: [10, 26, 7] },
  { id: "par", abbr: "PAR", name: "Paris Masters", city: "Paris", country: "FRA", month: "Nov", tier: "masters", surface: "hard", indoor: true, dates: [11, 2, 7] },
  { id: "fin", abbr: "FIN", name: "ATP Finals", city: "Turin", country: "ITA", month: "Nov", tier: "finals", surface: "hard", indoor: true, dates: [11, 15, 8] },
];
const OFFSEASON_WEEK = EVENTS.length + 1; // every event takes a week; the last week is the off-season
// Where each event sits on the real calendar ("dates": month, first day, length in days), roughly as the tour runs it.
// The game plays one event at a time, so events that share a real week are played one after the other.
const DAY_MS = 86400000;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Saves made before the dates existed keep their calendars, so the dates are looked up by event id.
const EVENT_DATES = Object.fromEntries(EVENTS.map((e) => [e.id, e.dates]));
const eventDays = (e, year) => {
  const [month, day, len] = EVENT_DATES[e.id] || e.dates;
  const start = Date.UTC(year, month - 1, day);
  return { start, end: start + (len - 1) * DAY_MS, len };
};
const dayLabel = (ms) => `${MONTH_SHORT[new Date(ms).getUTCMonth()]} ${new Date(ms).getUTCDate()}`;
function dateRange(e, year) {
  const { start, end } = eventDays(e, year);
  const a = new Date(start);
  const b = new Date(end);
  return a.getUTCMonth() === b.getUTCMonth() ? `${dayLabel(start)}–${b.getUTCDate()}` : `${dayLabel(start)} – ${dayLabel(end)}`;
}
// Today's date on the player's own clock, as YYYY-MM-DD.
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const IS_OTHER = EVENTS.map((e) => !!OPTIONAL[e.tier]);

// The supplied roster, unchanged.
const CORE_ROSTER = [
  { name: "Jannik Sinner", country: "ITA", age: 24, ovr: 98, hard: 99, clay: 90, grass: 95, srv: 94, fh: 98, bh: 98, mov: 95, sta: 96, men: 98, potential: 99 },
  { name: "Carlos Alcaraz", country: "ESP", age: 23, ovr: 97, hard: 95, clay: 98, grass: 96, srv: 87, fh: 99, bh: 92, mov: 99, sta: 95, men: 96, potential: 99 },
  { name: "Alexander Zverev", country: "GER", age: 29, ovr: 93, hard: 93, clay: 94, grass: 85, srv: 98, fh: 87, bh: 96, mov: 89, sta: 95, men: 89, potential: 93 },
  { name: "Daniil Medvedev", country: "", age: 30, ovr: 90, hard: 95, clay: 77, grass: 85, srv: 94, fh: 87, bh: 95, mov: 91, sta: 96, men: 90, potential: 92 },
  { name: "Ben Shelton", country: "USA", age: 23, ovr: 89, hard: 94, clay: 82, grass: 89, srv: 99, fh: 93, bh: 81, mov: 88, sta: 91, men: 91, potential: 94 },
  { name: "Novak Djokovic", country: "SRB", age: 39, ovr: 89, hard: 90, clay: 88, grass: 92, srv: 90, fh: 89, bh: 94, mov: 85, sta: 87, men: 99, potential: 89 },
  { name: "F. Auger-Aliassime", country: "CAN", age: 25, ovr: 87, hard: 89, clay: 86, grass: 88, srv: 92, fh: 91, bh: 84, mov: 86, sta: 88, men: 82, potential: 90 },
  { name: "Alex de Minaur", country: "AUS", age: 27, ovr: 87, hard: 90, clay: 81, grass: 89, srv: 82, fh: 86, bh: 88, mov: 97, sta: 96, men: 90, potential: 89 },
  { name: "Frances Tiafoe", country: "USA", age: 28, ovr: 86, hard: 88, clay: 84, grass: 87, srv: 88, fh: 89, bh: 85, mov: 87, sta: 87, men: 86, potential: 87 },
  { name: "Flavio Cobolli", country: "ITA", age: 24, ovr: 85, hard: 85, clay: 87, grass: 80, srv: 84, fh: 88, bh: 86, mov: 90, sta: 88, men: 87, potential: 91 },
  { name: "Arthur Fils", country: "FRA", age: 21, ovr: 84, hard: 86, clay: 84, grass: 81, srv: 85, fh: 87, bh: 82, mov: 88, sta: 85, men: 83, potential: 92 },
];

// The rest of the tour. Columns: name, country, age, OVR, hard, clay, grass, SRV, FH, BH, MOV, STA, MEN, potential.
// Ratings are estimates, kept at or below 85 so the supplied players stay at the top of the game.
const TOUR_ROWS = [
  ["Taylor Fritz", "USA", 28, 85, 88, 78, 87, 95, 90, 82, 80, 86, 84, 86],
  ["Lorenzo Musetti", "ITA", 24, 84, 80, 88, 85, 82, 85, 91, 88, 85, 80, 89],
  ["Jack Draper", "GBR", 24, 84, 87, 81, 85, 91, 89, 84, 83, 76, 84, 91],
  ["Casper Ruud", "NOR", 27, 83, 80, 89, 70, 84, 91, 77, 86, 92, 85, 84],
  ["Holger Rune", "DEN", 23, 83, 84, 83, 80, 84, 86, 87, 86, 81, 75, 90],
  ["Alexander Bublik", "KAZ", 28, 82, 83, 80, 87, 95, 84, 82, 78, 77, 72, 83],
  ["Andrey Rublev", "", 28, 82, 84, 82, 78, 85, 93, 80, 82, 87, 70, 83],
  ["Tommy Paul", "USA", 28, 82, 84, 80, 84, 81, 85, 83, 91, 85, 81, 83],
  ["Jakub Mensik", "CZE", 20, 82, 86, 75, 81, 96, 83, 85, 77, 79, 85, 93],
  ["Karen Khachanov", "", 30, 82, 84, 80, 80, 88, 87, 84, 80, 86, 81, 82],
  ["Alejandro Davidovich Fokina", "ESP", 27, 82, 82, 84, 78, 79, 85, 85, 90, 86, 76, 83],
  ["Jiri Lehecka", "CZE", 24, 81, 84, 76, 82, 88, 87, 82, 82, 83, 77, 86],
  ["Joao Fonseca", "BRA", 19, 81, 82, 83, 75, 85, 94, 79, 80, 78, 84, 95],
  ["Hubert Hurkacz", "POL", 29, 81, 83, 74, 86, 97, 82, 82, 79, 82, 80, 81],
  ["Grigor Dimitrov", "BUL", 35, 80, 82, 77, 83, 86, 86, 82, 81, 74, 80, 80],
  ["Stefanos Tsitsipas", "GRE", 27, 80, 79, 85, 76, 87, 90, 74, 83, 85, 76, 82],
  ["Ugo Humbert", "FRA", 28, 80, 83, 72, 82, 86, 85, 84, 80, 78, 79, 81],
  ["Francisco Cerundolo", "ARG", 27, 80, 78, 85, 76, 79, 90, 78, 84, 84, 78, 81],
  ["Denis Shapovalov", "CAN", 27, 80, 83, 74, 80, 90, 88, 84, 80, 78, 72, 81],
  ["Learner Tien", "USA", 20, 79, 82, 72, 77, 74, 81, 85, 85, 82, 87, 90],
  ["Tallon Griekspoor", "NED", 29, 79, 81, 76, 81, 89, 85, 80, 79, 80, 76, 79],
  ["Tomas Machac", "CZE", 25, 79, 82, 76, 76, 82, 83, 85, 86, 78, 77, 82],
  ["Brandon Nakashima", "USA", 24, 79, 81, 74, 80, 86, 81, 85, 80, 82, 82, 82],
  ["Sebastian Korda", "USA", 25, 79, 82, 75, 80, 87, 85, 85, 79, 74, 76, 83],
  ["Valentin Vacherot", "MON", 27, 79, 82, 74, 76, 90, 85, 80, 78, 82, 84, 80],
  ["Luciano Darderi", "ITA", 24, 79, 76, 85, 72, 85, 87, 78, 81, 85, 81, 82],
  ["Matteo Berrettini", "ITA", 30, 79, 79, 79, 86, 96, 91, 70, 74, 74, 82, 79],
  ["Alexei Popyrin", "AUS", 26, 78, 81, 76, 77, 92, 86, 76, 75, 79, 76, 80],
  ["Alex Michelsen", "USA", 21, 78, 81, 72, 79, 86, 81, 84, 78, 79, 80, 86],
  ["Gabriel Diallo", "CAN", 24, 78, 81, 73, 81, 93, 84, 79, 73, 78, 79, 82],
  ["Arthur Rinderknech", "FRA", 30, 78, 80, 74, 80, 91, 84, 78, 74, 79, 80, 78],
  ["Cameron Norrie", "GBR", 30, 78, 79, 78, 79, 78, 80, 82, 84, 91, 82, 78],
  ["Giovanni Mpetshi Perricard", "FRA", 22, 77, 80, 68, 82, 99, 82, 72, 68, 73, 78, 84],
  ["Corentin Moutet", "FRA", 27, 77, 76, 81, 76, 73, 80, 82, 87, 82, 72, 78],
  ["Jaume Munar", "ESP", 29, 77, 77, 81, 70, 76, 81, 79, 87, 90, 80, 77],
  ["Lorenzo Sonego", "ITA", 31, 77, 78, 77, 79, 89, 85, 74, 78, 81, 80, 77],
  ["Jordan Thompson", "AUS", 32, 76, 78, 70, 80, 85, 78, 78, 80, 84, 82, 76],
  ["Daniel Altmaier", "GER", 27, 76, 74, 80, 72, 82, 80, 84, 78, 82, 78, 77],
  ["Zizou Bergs", "BEL", 27, 76, 77, 76, 76, 84, 85, 76, 80, 79, 76, 78],
  ["Nuno Borges", "POR", 29, 76, 77, 77, 73, 80, 82, 79, 81, 84, 79, 76],
  ["Miomir Kecmanovic", "SRB", 26, 76, 78, 75, 74, 79, 82, 81, 82, 82, 75, 78],
  ["Sebastian Baez", "ARG", 25, 76, 72, 83, 66, 72, 84, 78, 88, 88, 80, 78],
  ["Fabian Marozsan", "HUN", 26, 76, 77, 77, 74, 80, 85, 80, 78, 77, 76, 79],
  ["Reilly Opelka", "USA", 28, 76, 79, 70, 79, 99, 80, 72, 62, 70, 78, 77],
  ["Jenson Brooksby", "USA", 25, 76, 78, 72, 77, 72, 78, 87, 82, 80, 83, 80],
  ["Matteo Arnaldi", "ITA", 25, 76, 77, 77, 73, 80, 82, 79, 85, 82, 76, 80],
  ["Alejandro Tabilo", "CHI", 29, 76, 76, 80, 76, 85, 84, 76, 78, 77, 76, 77],
  ["Hamad Medjedovic", "SRB", 22, 76, 79, 74, 74, 90, 86, 78, 72, 72, 76, 85],
  ["Terence Atmane", "FRA", 24, 76, 79, 71, 75, 86, 86, 76, 77, 76, 75, 82],
  ["Juncheng Shang", "CHN", 21, 76, 78, 74, 73, 80, 83, 82, 82, 76, 78, 87],
  ["Marin Cilic", "CRO", 37, 76, 77, 72, 82, 92, 86, 80, 68, 70, 82, 76],
  ["Gael Monfils", "FRA", 39, 76, 78, 74, 75, 86, 82, 80, 82, 72, 78, 76],
  ["Alexandre Muller", "FRA", 29, 75, 76, 76, 72, 78, 82, 78, 80, 84, 78, 75],
  ["Tomas Martin Etcheverry", "ARG", 26, 75, 73, 81, 68, 84, 84, 77, 76, 83, 77, 77],
  ["Camilo Ugo Carabelli", "ARG", 26, 75, 71, 81, 66, 78, 83, 78, 80, 84, 78, 76],
  ["Francisco Comesana", "ARG", 25, 75, 75, 79, 72, 84, 84, 76, 76, 80, 78, 78],
  ["Marton Fucsovics", "HUN", 34, 75, 76, 75, 76, 80, 80, 80, 80, 84, 78, 75],
  ["Marcos Giron", "USA", 32, 75, 77, 72, 74, 79, 83, 78, 82, 82, 78, 75],
  ["Ethan Quinn", "USA", 22, 75, 77, 73, 73, 86, 87, 73, 76, 76, 75, 84],
  ["Aleksandar Kovacevic", "USA", 27, 75, 78, 69, 75, 85, 82, 80, 76, 76, 76, 77],
  ["Jacob Fearnley", "GBR", 24, 75, 77, 73, 77, 82, 83, 77, 80, 78, 76, 80],
  ["Mattia Bellucci", "ITA", 25, 75, 77, 72, 76, 82, 81, 78, 80, 77, 78, 79],
  ["Botic van de Zandschulp", "NED", 30, 75, 76, 76, 75, 84, 82, 80, 77, 78, 72, 75],
  ["Raphael Collignon", "BEL", 24, 75, 78, 72, 73, 85, 82, 79, 76, 78, 80, 82],
  ["Benjamin Bonzi", "FRA", 30, 75, 78, 70, 75, 82, 80, 80, 80, 79, 78, 75],
  ["Arthur Cazaux", "FRA", 23, 75, 78, 71, 74, 87, 85, 76, 78, 72, 75, 82],
  ["Mariano Navone", "ARG", 25, 74, 69, 81, 64, 70, 82, 78, 86, 87, 78, 77],
  ["Emilio Nava", "USA", 24, 74, 75, 76, 71, 84, 83, 76, 78, 77, 74, 80],
  ["Adam Walton", "AUS", 27, 74, 77, 68, 75, 80, 79, 80, 80, 80, 79, 76],
  ["Luca Nardi", "ITA", 22, 74, 76, 74, 71, 78, 84, 80, 78, 72, 72, 83],
  ["Pedro Martinez", "ESP", 29, 74, 72, 79, 70, 74, 80, 80, 82, 84, 78, 74],
  ["Nicolas Jarry", "CHI", 30, 74, 75, 77, 74, 93, 85, 72, 68, 74, 72, 74],
  ["Jesper de Jong", "NED", 26, 74, 73, 78, 70, 76, 80, 79, 83, 82, 78, 76],
  ["Valentin Royer", "FRA", 25, 74, 75, 76, 70, 80, 82, 78, 79, 80, 77, 78],
  ["Jan-Lennard Struff", "GER", 36, 74, 75, 76, 75, 91, 84, 76, 68, 72, 76, 74],
  ["Roberto Bautista Agut", "ESP", 38, 74, 76, 73, 77, 76, 82, 82, 76, 76, 86, 74],
  ["Adrian Mannarino", "FRA", 38, 74, 77, 62, 80, 78, 78, 83, 76, 76, 84, 74],
  ["Damir Dzumhur", "BIH", 34, 74, 73, 78, 70, 72, 78, 80, 86, 82, 78, 74],
  ["Yunchaokete Bu", "CHN", 24, 74, 77, 70, 72, 82, 84, 76, 78, 78, 76, 79],
  ["Kei Nishikori", "JPN", 36, 74, 76, 75, 72, 72, 82, 86, 78, 68, 84, 74],
  ["Dino Prizmic", "CRO", 20, 74, 73, 79, 68, 78, 80, 80, 82, 82, 80, 86],
  ["Eliot Spizzirri", "USA", 24, 73, 76, 69, 73, 82, 80, 77, 78, 78, 77, 78],
  ["Martin Landaluce", "ESP", 20, 73, 75, 74, 70, 86, 83, 74, 74, 74, 76, 87],
  ["Nishesh Basavareddy", "USA", 21, 73, 76, 68, 71, 76, 80, 82, 80, 76, 78, 85],
  ["Alexander Blockx", "BEL", 21, 73, 76, 71, 72, 87, 83, 74, 74, 74, 76, 85],
  ["Rafael Jodar", "ESP", 19, 72, 75, 73, 69, 82, 83, 75, 76, 72, 76, 88],
  ["Justin Engel", "GER", 18, 71, 74, 70, 68, 82, 82, 74, 74, 70, 74, 88],
  ["Nicolai Budkov Kjaer", "NOR", 19, 71, 74, 69, 71, 83, 80, 76, 73, 71, 75, 87],
  ["Federico Cina", "ITA", 19, 70, 71, 74, 66, 76, 80, 76, 76, 72, 74, 87],
  ["Roman Safiullin", "", 28, 74, 77, 70, 76, 86, 83, 78, 74, 74, 72, 75],
  ["Borna Coric", "CRO", 29, 74, 76, 74, 72, 80, 78, 82, 80, 80, 80, 75],
  ["Zhizhen Zhang", "CHN", 29, 74, 76, 74, 73, 90, 84, 74, 72, 74, 74, 74],
  ["Aleksandar Vukic", "AUS", 30, 73, 76, 68, 75, 90, 81, 75, 71, 75, 73, 73],
  ["Quentin Halys", "FRA", 29, 73, 76, 67, 76, 90, 81, 75, 71, 73, 73, 73],
  ["Kamil Majchrzak", "POL", 30, 73, 75, 71, 74, 76, 78, 80, 81, 80, 78, 73],
  ["Vit Kopriva", "CZE", 29, 73, 71, 78, 67, 76, 80, 78, 79, 81, 77, 73],
  ["Sebastian Ofner", "AUT", 30, 73, 73, 76, 70, 84, 81, 76, 73, 76, 75, 73],
  ["Filip Misolic", "AUT", 24, 73, 70, 78, 66, 78, 80, 77, 78, 80, 76, 77],
  ["Pablo Carreno Busta", "ESP", 34, 73, 74, 74, 70, 76, 79, 82, 76, 76, 80, 73],
  ["David Goffin", "BEL", 35, 73, 75, 73, 73, 74, 79, 82, 78, 72, 80, 73],
  ["Thanasi Kokkinakis", "AUS", 30, 73, 76, 71, 73, 90, 84, 74, 72, 68, 74, 73],
  ["Yannick Hanfmann", "GER", 34, 72, 72, 76, 70, 86, 82, 74, 70, 73, 74, 72],
  ["Laslo Djere", "SRB", 31, 72, 69, 78, 65, 78, 80, 78, 75, 80, 75, 72],
  ["Cristian Garin", "CHI", 30, 72, 70, 77, 66, 78, 80, 78, 77, 78, 73, 72],
  ["Thiago Seyboth Wild", "BRA", 26, 72, 71, 77, 66, 82, 86, 72, 73, 73, 68, 75],
  ["Thiago Agustin Tirante", "ARG", 25, 72, 71, 77, 67, 82, 82, 75, 75, 77, 74, 76],
  ["Juan Manuel Cerundolo", "ARG", 24, 72, 68, 78, 64, 70, 78, 78, 82, 83, 78, 76],
  ["Roman Andres Burruchaga", "ARG", 24, 72, 70, 77, 65, 78, 80, 76, 77, 79, 77, 77],
  ["Ignacio Buse", "PER", 22, 72, 71, 77, 66, 78, 81, 76, 78, 76, 76, 80],
  ["Roberto Carballes Baena", "ESP", 33, 72, 69, 77, 64, 72, 78, 78, 80, 82, 78, 72],
  ["Elmer Moller", "DEN", 22, 72, 71, 76, 67, 76, 79, 79, 78, 76, 76, 79],
  ["Otto Virtanen", "FIN", 25, 72, 75, 67, 74, 88, 82, 74, 71, 72, 72, 76],
  ["Emil Ruusuvuori", "FIN", 27, 72, 75, 68, 72, 78, 80, 80, 78, 74, 72, 75],
  ["Hugo Gaston", "FRA", 25, 72, 72, 75, 69, 70, 77, 79, 82, 78, 74, 75],
  ["Jerome Kym", "SUI", 23, 72, 75, 68, 72, 87, 83, 74, 70, 72, 74, 80],
  ["Stan Wawrinka", "SUI", 41, 72, 73, 74, 68, 84, 82, 86, 62, 62, 82, 72],
  ["Tristan Schoolkate", "AUS", 25, 72, 75, 66, 74, 84, 79, 76, 74, 76, 75, 75],
  ["Rinky Hijikata", "AUS", 25, 72, 75, 67, 73, 78, 78, 77, 80, 77, 76, 75],
  ["Christopher O'Connell", "AUS", 32, 72, 75, 69, 72, 82, 80, 76, 74, 76, 74, 72],
  ["Mackenzie McDonald", "USA", 31, 72, 75, 66, 73, 76, 79, 79, 81, 75, 74, 72],
  ["Zachary Svajda", "USA", 23, 72, 75, 67, 71, 78, 79, 79, 78, 75, 78, 78],
  ["Lloyd Harris", "RSA", 29, 72, 75, 66, 74, 88, 80, 74, 70, 72, 74, 72],
  ["Vilius Gaubas", "LTU", 21, 72, 71, 76, 67, 78, 80, 77, 77, 76, 76, 81],
  ["Coleman Wong", "HKG", 22, 72, 75, 68, 71, 84, 81, 74, 74, 74, 76, 80],
  ["Shintaro Mochizuki", "JPN", 23, 72, 73, 68, 76, 76, 77, 79, 80, 76, 76, 77],
  ["Yoshihito Nishioka", "JPN", 30, 72, 74, 70, 70, 68, 77, 80, 84, 80, 76, 72],
  ["Alexander Shevchenko", "KAZ", 25, 72, 73, 73, 69, 78, 80, 78, 76, 76, 72, 76],
  ["Nick Kyrgios", "AUS", 31, 72, 74, 62, 78, 96, 82, 74, 66, 60, 66, 72],
  ["Luca Van Assche", "FRA", 22, 71, 71, 75, 67, 72, 77, 78, 80, 79, 77, 78],
  ["Daniel Evans", "GBR", 36, 71, 72, 68, 75, 76, 76, 78, 76, 72, 78, 71],
  ["Adolfo Daniel Vallejo", "PAR", 22, 71, 70, 76, 66, 78, 81, 74, 77, 75, 74, 80],
  ["Jaime Faria", "POR", 22, 71, 72, 74, 68, 82, 81, 74, 74, 74, 74, 79],
  ["Henrique Rocha", "POR", 22, 71, 70, 76, 66, 78, 80, 76, 76, 76, 74, 79],
  ["Chun-Hsin Tseng", "TPE", 24, 71, 73, 69, 69, 72, 77, 78, 81, 78, 76, 75],
  ["Martin Damm", "USA", 22, 70, 73, 64, 72, 88, 78, 73, 68, 70, 72, 79],
  ["Rei Sakamoto", "JPN", 20, 69, 72, 64, 68, 84, 79, 72, 70, 70, 74, 84],
  ["Joel Schwaerzler", "AUT", 20, 69, 68, 73, 65, 78, 80, 72, 73, 72, 72, 84],
  ["Henry Bernet", "SUI", 19, 68, 70, 66, 67, 78, 77, 78, 70, 68, 72, 86],
  ["Darwin Blanch", "USA", 18, 67, 68, 69, 64, 82, 78, 70, 70, 66, 68, 86],
];
const ROSTER = CORE_ROSTER.concat(
  TOUR_ROWS.map(([name, country, age, ovr, hard, clay, grass, srv, fh, bh, mov, sta, men, potential]) => ({ name, country, age, ovr, hard, clay, grass, srv, fh, bh, mov, sta, men, potential }))
);
const SHORT_NAMES = {
  "Tomas Martin Etcheverry": "Etcheverry",
  "Juan Manuel Cerundolo": "J.M. Cerundolo",
  "Thiago Agustin Tirante": "Tirante",
  "Roman Andres Burruchaga": "Burruchaga",
  "Adolfo Daniel Vallejo": "Vallejo",
};

// Real-life honours through the 2025 season: [Slams, ATP Finals, Masters 1000, weeks at No. 1, year-end No. 1s].
// They count toward the GOAT score and the career record book; everything after is earned in the game.
const LEGACY = {
  "Novak Djokovic": [24, 7, 40, 428, 8],
  "Carlos Alcaraz": [6, 0, 8, 52, 2],
  "Jannik Sinner": [4, 2, 5, 66, 1],
  "Daniil Medvedev": [1, 1, 6, 16, 0],
  "Alexander Zverev": [0, 2, 7, 0, 0],
  "Stan Wawrinka": [3, 0, 1, 0, 0],
  "Marin Cilic": [1, 0, 1, 0, 0],
  "Stefanos Tsitsipas": [0, 1, 3, 0, 0],
  "Grigor Dimitrov": [0, 1, 1, 0, 0],
  "Andrey Rublev": [0, 0, 2, 0, 0],
  "Hubert Hurkacz": [0, 0, 2, 0, 0],
  "Casper Ruud": [0, 0, 1, 0, 0],
  "Taylor Fritz": [0, 0, 1, 0, 0],
  "Cameron Norrie": [0, 0, 1, 0, 0],
  "Karen Khachanov": [0, 0, 1, 0, 0],
  "Borna Coric": [0, 0, 1, 0, 0],
  "Holger Rune": [0, 0, 1, 0, 0],
  "Pablo Carreno Busta": [0, 0, 1, 0, 0],
  "Alexei Popyrin": [0, 0, 1, 0, 0],
  "Jack Draper": [0, 0, 1, 0, 0],
  "Jakub Mensik": [0, 0, 1, 0, 0],
  "Ben Shelton": [0, 0, 1, 0, 0],
  "Valentin Vacherot": [0, 0, 1, 0, 0],
};
// The real 2026 season so far, for a franchise that starts part-way through it: the champion and runner-up of each
// final on the game's calendar, as reported through 18 October 2026. Those weeks are replayed with the real champion
// (and the real runner-up wherever the draw lets them meet), so titles and trophy cabinets match the real tour.
// Scores and everything else in those weeks are still the game's own simulation.
const REAL_FINALS = {
  2026: {
    bri: ["Daniil Medvedev", "Brandon Nakashima"],
    ade: ["Tomas Machac", "Ugo Humbert"],
    ao: ["Carlos Alcaraz", "Novak Djokovic"],
    rot: ["Alex de Minaur", "F. Auger-Aliassime"],
    rio: ["Tomas Martin Etcheverry", "Alejandro Tabilo"],
    doh: ["Carlos Alcaraz", "Arthur Fils"],
    dub: ["Daniil Medvedev", "Tallon Griekspoor"],
    iw: ["Jannik Sinner", "Daniil Medvedev"],
    mia: ["Jannik Sinner", "Jiri Lehecka"],
    mc: ["Jannik Sinner", "Carlos Alcaraz"],
    bar: ["Arthur Fils", "Andrey Rublev"],
    mad: ["Jannik Sinner", "Alexander Zverev"],
    rom: ["Jannik Sinner", "Casper Ruud"],
    gen: ["Learner Tien", "Mariano Navone"],
    rg: ["Alexander Zverev", "Flavio Cobolli"],
    stu: ["Ben Shelton", "Taylor Fritz"],
    que: ["Francisco Cerundolo", "Tommy Paul"],
    hal: ["Frances Tiafoe", "Taylor Fritz"],
    wim: ["Jannik Sinner", "Alexander Zverev"],
    gst: ["Stefanos Tsitsipas", "Raphael Collignon"],
    was: ["Taylor Fritz", "Rafael Jodar"],
    can: ["Ben Shelton", "Brandon Nakashima"],
    cin: ["Arthur Fils", "Frances Tiafoe"],
    ws: ["Ignacio Buse", "Arthur Fery"],
    uso: ["Alexander Zverev", "Ben Shelton"],
    tok: ["Carlos Alcaraz", "Jiri Lehecka"],
    bei: ["Novak Djokovic", "Alex de Minaur"],
    sha: ["Alejandro Davidovich Fokina", "Rafael Jodar"],
  },
};
// The real picture on 19 October 2026, applied once the replay reaches that week: ranking points for the top twelve
// and weeks at No. 1 during 2026 (Alcaraz until Monte-Carlo, Sinner since).
const REAL_SNAPSHOT = {
  year: 2026,
  after: "sha",
  points: { "Jannik Sinner": 10950, "Alexander Zverev": 10070, "Carlos Alcaraz": 5610, "Ben Shelton": 4720, "Daniil Medvedev": 3660, "Flavio Cobolli": 3640, "F. Auger-Aliassime": 3590, "Alex de Minaur": 3430, "Frances Tiafoe": 3380, "Arthur Fils": 3325, "Rafael Jodar": 3234, "Novak Djokovic": 3090 },
  weeks: { "Carlos Alcaraz": 14, "Jannik Sinner": 28 },
};
// Which Slams those real titles came at, so the trophy cabinet can show them event by event.
const LEGACY_SLAMS = {
  "Novak Djokovic": { ao: 10, rg: 3, wim: 7, uso: 4 },
  "Carlos Alcaraz": { rg: 2, wim: 2, uso: 2 },
  "Jannik Sinner": { ao: 2, wim: 1, uso: 1 },
  "Daniil Medvedev": { uso: 1 },
  "Stan Wawrinka": { ao: 1, rg: 1, uso: 1 },
  "Marin Cilic": { uso: 1 },
};
const SLAM_IDS = ["ao", "rg", "wim", "uso"];
// Retired greats, shown on the GOAT list as benchmarks to chase. Same column order as LEGACY.
const LEGENDS = [
  ["Rafael Nadal", "ESP", [22, 0, 36, 209, 5]],
  ["Roger Federer", "SUI", [20, 6, 28, 310, 5]],
  ["Pete Sampras", "USA", [14, 5, 11, 286, 6]],
  ["Andre Agassi", "USA", [8, 1, 17, 101, 1]],
  ["Andy Murray", "GBR", [3, 1, 14, 41, 1]],
];
const GOAT_WEIGHTS = { slam: 100, finals: 50, masters: 25, weeks: 0.5, ye: 20 };
const WEEKS_PER_EVENT = 52 / EVENTS.length; // the season stands in for 52 weeks at No. 1

// Real head-to-heads through 2025 for the three marquee rivalries: [wins for the first id, wins for the second, finals played].
const H2H_SEED = {
  "carlos-alcaraz|jannik-sinner": [10, 6, 8],
  "jannik-sinner|novak-djokovic": [6, 4, 2],
  "carlos-alcaraz|novak-djokovic": [4, 5, 4],
};

// Fictional name pools for the newcomers who replace retiring players.
const NEWGEN = [
  { c: "ITA", first: ["Matteo", "Luca", "Tommaso", "Davide"], last: ["Ferraro", "Bellandi", "Castelli", "Moretti"] },
  { c: "ESP", first: ["Pablo", "Alvaro", "Hugo", "Sergio"], last: ["Ortega", "Vidal", "Navarro", "Calvo"] },
  { c: "FRA", first: ["Theo", "Louis", "Maxime", "Bastien"], last: ["Garnier", "Lemoine", "Roussel", "Marchand"] },
  { c: "USA", first: ["Caleb", "Mason", "Trevor", "Jalen"], last: ["Whitaker", "Brooks", "Hensley", "Carver"] },
  { c: "AUS", first: ["Lachlan", "Cooper", "Jarrah", "Riley"], last: ["Hartigan", "Maddox", "Kerrigan", "Sloane"] },
  { c: "GER", first: ["Jonas", "Felix", "Moritz", "Lennart"], last: ["Brandt", "Kessler", "Vogel", "Lindner"] },
  { c: "ARG", first: ["Santiago", "Tomas", "Joaquin", "Bruno"], last: ["Acosta", "Ferreyra", "Luna", "Paredes"] },
  { c: "GBR", first: ["Oscar", "Harry", "Callum", "Toby"], last: ["Ashdown", "Pemberton", "Whitlock", "Marlowe"] },
  { c: "CZE", first: ["Matej", "Vojtech", "Ondrej", "Filip"], last: ["Dvorak", "Novotny", "Kolar", "Benes"] },
  { c: "JPN", first: ["Haruto", "Ren", "Sota", "Kaito"], last: ["Nakamura", "Ishikawa", "Fujita", "Morita"] },
  { c: "BRA", first: ["Rafael", "Caio", "Vinicius", "Enzo"], last: ["Barros", "Teixeira", "Camargo", "Pacheco"] },
  { c: "CAN", first: ["Liam", "Emile", "Nolan", "Xavier"], last: ["Tremblay", "Gagnon", "Leclair", "Bouchard"] },
];

/* ────────────────────────────── Engine helpers ────────────────────────────── */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const signed = (n) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
const pct = (x, y) => (y ? `${Math.round((100 * x) / y)}%` : "–");
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const shortName = (name) => SHORT_NAMES[name] || name.split(" ").slice(1).join(" ") || name;
const phaseFor = (age) => (age <= 22 ? "growth" : age <= 28 ? "peak" : "regression");
const clock = (mins) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;

// Seeded PRNG (mulberry32). Every roll in the game flows from state.seed, so the reducer stays pure.
function makeRng(seed) {
  let a = seed | 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.seed = () => a >>> 0;
  return next;
}
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const gauss = (rng) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
function weightedIndex(rng, weights) {
  let r = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
function shuffle(rng, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ────────────────────────────── Rankings ────────────────────────────── */

// rankingPoints holds one entry per calendar slot: the most recent edition of that event.
// Playing the event again overwrites the entry, which is how last year's points drop off.
// Slams, Masters and the Finals always count; from the 500s and 250s only the best six do.
function sumPoints(p, year) {
  let total = 0;
  const others = [];
  for (let i = 0; i < p.rankingPoints.length; i++) {
    const e = p.rankingPoints[i];
    if (!e || !e.pts || (year && e.year !== year)) continue;
    if (IS_OTHER[i]) others.push(e.pts);
    else total += e.pts;
  }
  if (others.length > OTHER_COUNT) others.sort((a, b) => b - a);
  for (let i = 0; i < others.length && i < OTHER_COUNT; i++) total += others[i];
  return total;
}
const totalPoints = (p) => sumPoints(p, 0);
const racePoints = (p, year) => sumPoints(p, year);
const seasonTitles = (p, year) => p.rankingPoints.filter((e) => e && e.year === year && e.round === "W").length;

function rankBy(players, score) {
  return players
    .map((p) => ({ p, s: score(p) }))
    .sort((x, y) => y.s - x.s || y.p.ovr - x.p.ovr || (x.p.id < y.p.id ? -1 : 1))
    .map((x) => x.p);
}
const rankMap = (ranked) => Object.fromEntries(ranked.map((p, i) => [p.id, i + 1]));
const indexById = (players) => Object.fromEntries(players.map((p) => [p.id, p]));

/* ────────────────────────────── Match simulation ────────────────────────────── */
// Every match is played point by point. The gap in match power sets how many service points
// each player wins; serve, return, mental and surface shape how those points are won.

const SERVE_BASE = { hard: 0.645, clay: 0.622, grass: 0.668 }; // tour-average share of service points won
const ACE_SURFACE = { hard: 0, clay: -0.03, grass: 0.025 };
const RALLY_MEAN = { hard: 3.8, clay: 4.8, grass: 3.0 };
const EDGE = 0.0078; // service-point edge per point of match-power difference
const PTS = ["0", "15", "30", "40"];
const ORDINAL = ["first", "second", "third", "fourth", "fifth"];

function matchPower(p, surface) {
  const style = surface === "grass" ? p.srv : surface === "clay" ? (p.mov + p.sta) / 2 : (p.fh + p.bh) / 2;
  return 0.5 * p.ovr + 0.5 * p[surface] + (style - 88) * 0.08;
}
// A player short of energy gives up match power: nothing above 60, up to about five points when empty.
const tiredness = (energy) => (energy == null || energy >= 60 ? 0 : (60 - energy) * 0.08);
// What a match takes out of a player: longer matches, weaker stamina and age all cost more.
const matchCost = (p, mins) => (2.5 + mins * 0.035) * (1.5 - p.sta / 130) * (p.age >= 33 ? 1.1 : 1);
const retSkill = (p) => (p.mov + p.bh + p.men) / 3;
// Big servers hold more and break less; great returners the reverse. It shifts both players'
// hold rates the same way, so it changes the shape of a match without changing who is favoured.
const styleBias = (p) => (p.srv - retSkill(p)) * 0.0022;

function serveModel(S, R, ctx) {
  const reach = clamp((S.srv - 65) / 35, 0, 1);
  return {
    p1: clamp(0.61 + (S.srv - 88) * 0.002 + (S.men - 88) * 0.001, 0.5, 0.74), // first serves in
    p2: clamp(0.905 + (S.men - 88) * 0.0015, 0.82, 0.97), // second serves in
    gap: clamp(0.19 + (S.srv - 88) * 0.004, 0.08, 0.3), // how much better the first serve is
    ace: clamp(0.02 + 0.2 * Math.pow(reach, 2.2) - (retSkill(R) - 85) * 0.002 + ACE_SURFACE[ctx.surface] + (ctx.indoor ? 0.012 : 0), 0.006, 0.34),
    mph: 110 + (S.srv - 70) * 0.7,
  };
}
function rallyMix(W, L, ctx) {
  const lean = ctx.surface === "grass" ? 0.03 : ctx.surface === "clay" ? -0.03 : 0;
  return {
    pw: clamp(0.3 + ((W.fh + W.bh) / 2 - 85) * 0.005 + lean, 0.15, 0.5), // clean winner
    pu: clamp(0.38 - ((L.men + L.mov) / 2 - 85) * 0.005, 0.15, 0.5), // loser's unforced error
  };
}

const blankMatchStats = () => ({ ac: 0, df: 0, fi: 0, sp: 0, fw: 0, sw: 0, bf: 0, bs: 0, wn: 0, ue: 0, pt: 0, sg: 0, hd: 0, mx: 0, sv: 0 });
// s = server, w = point winner, k = kind (A ace, D double fault, S unreturned serve, W winner, U unforced, F forced)
function tallyPoint(st, s, w, k, f, bp, mph) {
  const S = st[s];
  S.sp++;
  st[w].pt++;
  if (f) {
    S.fi++;
    S.sv += mph;
    if (mph > S.mx) S.mx = mph;
    if (w === s) S.fw++;
  } else if (w === s) S.sw++;
  if (k === "A") {
    S.ac++;
    S.wn++;
  } else if (k === "D") S.df++;
  else if (k === "W") st[w].wn++;
  else if (k === "U") st[1 - w].ue++;
  if (bp) {
    S.bf++;
    if (w === s) S.bs++;
  }
}

const tidy = (text) =>
  String(text)
    .replace(/(^|[.!?] )([a-z])/g, (all, lead, ch) => lead + ch.toUpperCase())
    .replace(/\b([Aa]) (8\d*|11|18)([–-])/g, "$1n $2$3");
const hashOf = (s) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
// Grinders win the long points and first-strike players the short ones. The same index shapes
// the rallies in the point-by-point log, so previews and reports can talk about the same pattern.
const grindIndex = (p) => (p.mov + p.sta) / 2 - (p.srv + p.fh) / 2;
// Every server has a favourite first-serve target: the share that goes down the T.
const teeRate = (p) => 0.36 + (hashOf(p.id || p.name) % 29) / 100;
const STROKE = { fh: "forehand", bh: "backhand" };

// Commentary uses its own random stream, so a match plays out identically with or without it.
// Each point comes back with its text plus the pattern data behind it:
//   n = shots in the rally, fin = the shot that ended it, spot = where the serve went.
function makeCommentary(seed, P, ctx) {
  const fl = makeRng((seed ^ 0x5bd1e995) >>> 0);
  const N = P.map((p) => shortName(p.name));
  const pick = (list) => list[Math.floor(fl() * list.length)];
  const grind = P.map(grindIndex);
  const tee = P.map(teeRate);
  const stroke = (x) => (fl() < 0.55 + (P[x].fh - P[x].bh) * 0.01 ? "fh" : "bh");
  return (s, w, k, mph, bp) => {
    const r = 1 - s;
    const l = 1 - w;
    // placement: the favourite target comes out more on break points, and it is where the free points come from
    let spot = "";
    if (k !== "D") {
      const lean = (bp ? 0.12 : 0) + (k === "A" || k === "S" ? 0.14 : 0);
      const share = tee[s] >= 0.5 ? tee[s] + lean : tee[s] - lean;
      spot = fl() < 0.08 ? "body" : fl() < share ? "T" : "wide";
    }
    const where = spot === "T" ? "down the T" : spot === "wide" ? "out wide" : "into the body";
    if (k === "A") return { n: 1, fin: "srv", spot, text: `Ace ${spot === "body" ? "on the line" : where}, ${mph} mph.` };
    if (k === "D") return { n: 1, fin: "", spot, text: pick(["Double fault.", "Double fault, the second serve sails long.", "Double fault into the net."]) };
    if (k === "S")
      return {
        n: 1,
        fin: "srv",
        spot,
        text: pick([`${N[s]} lands a ${mph} mph serve ${where} and ${N[r]} can't get it back.`, `Service winner ${where}, ${mph} mph.`, `${N[r]} nets the return off a heavy serve ${where}.`, `${N[r]} blocks the return long.`]),
      };
    const mean = RALLY_MEAN[ctx.surface] * clamp(1 + (grind[w] - grind[l]) * 0.03, 0.55, 1.7);
    const n = Math.min(34, 2 + Math.floor(-Math.log(1 - fl()) * mean));
    const tail = n >= 9 ? ` after a ${n}-shot rally` : "";
    if (k === "W") {
      const st = stroke(w);
      const u = fl();
      if (w === r && n <= 3 && u < 0.5) return { n: 2, fin: "ret", spot, text: `${N[w]} crushes a ${STROKE[st]} return winner ${pick(["down the line", "crosscourt"])}.` };
      if (u < 0.68) {
        const dir = st === "fh" ? pick(["down the line", "crosscourt", "inside-out", "on the run"]) : pick(["down the line", "crosscourt", "up the line"]);
        return { n, fin: st, spot, text: `${N[w]} ${pick(["rips", "drills", "cracks", "whips"])} a ${STROKE[st]} winner ${dir}${tail}.` };
      }
      if (u < 0.79) return { n, fin: "net", spot, text: w === s && n <= 3 ? `Serve and volley from ${N[w]}, and the volley is put away.` : `${N[w]} moves in and puts away the volley${tail}.` };
      if (u < 0.84) return { n, fin: "net", spot, text: `${N[w]} smashes the overhead into the open court.` };
      if (u < 0.91) return { n, fin: "drop", spot, text: `${N[w]} feathers a drop shot that ${N[l]} can't reach.` };
      if (u < 0.98) return { n, fin: "pass", spot, text: `${N[l]} comes to the net and ${N[w]} threads the pass ${pick(["crosscourt", "down the line"])}.` };
      return { n, fin: "lob", spot, text: `${N[w]} lifts a lob over ${N[l]} for a clean winner.` };
    }
    if (k === "U") {
      const st = stroke(l);
      const name = STROKE[st];
      return { n, fin: st, spot, text: pick([`${N[l]} nets a routine ${name}${tail}.`, `${N[l]} sends a ${name} long${tail}.`, `${N[l]} pulls a ${name} wide${tail}.`, `Loose ${name} from ${N[l]}, into the net.`, `${N[l]} overcooks a ${name}${tail}.`]) };
    }
    const st = stroke(l);
    return {
      n,
      fin: st,
      spot,
      text: pick([`${N[w]} pins ${N[l]} deep and forces the error${tail}.`, `Heavy ${STROKE[stroke(w)]} from ${N[w]}, and ${N[l]} can't control the reply.`, `${N[l]} stretches for a ${STROKE[st]} and can't keep it in play${tail}.`, `${N[w]} takes time away and draws the error.`]),
    };
  };
}

// The booth: two invented commentators talk over the bigger games. Their own random stream again, so the
// chatter never changes a result. Returns [{ who: 0 lead or 1 analyst, text }] for a finished game, or null.
const BOOTH = ["Tessa Lund", "Ray Moreno"];
function makeBooth(seed, P) {
  const rb = makeRng((seed ^ 0x2545f491) >>> 0);
  const N = P.map((p) => shortName(p.name));
  const pick = (list) => list[Math.floor(rb() * list.length)];
  const said = new Set();
  let calls = 0;
  let lastRally = -9;
  let lastAces = -9;
  const fresh = (list) => {
    const open = list.filter((x) => !said.has(x));
    const line = pick(open.length ? open : list);
    said.add(line);
    return line;
  };
  return (x) => {
    const { game, pts, g, setOver, matchOver, st, firstBreak, breakBack, setsWon, need, earlier } = x;
    calls++;
    const s = game.s;
    const w = game.w;
    const l = 1 - w;
    const W = N[w];
    const L = N[l];
    const Sv = N[s];
    const score = `${g[w]}–${g[l]}`;
    const ord = ORDINAL[game.set - 1] || "next";
    const saved = pts.filter((p) => p.bp && p.w === p.s).length;
    const mpSaved = pts.some((p) => (p.tags || []).includes("Match point") && p.w !== (game.tb ? null : p.bp ? 1 - p.s : p.s));
    const servingForIt = !game.tb && pts.some((p) => !p.bp && (p.tags || []).some((tag) => tag === "Set point" || tag === "Match point"));
    const aces = pts.filter((p) => p.k === "A").length;
    const rally = pts.reduce((best, p) => (p.n > best ? p.n : best), 0);
    const lines = (a, b) => [{ who: 0, text: tidy(fresh(a)) }].concat(b ? [{ who: 1, text: tidy(fresh(b)) }] : []);

    if (matchOver) {
      const fs = pctOf(st[w].fw, st[w].fi);
      const saveRate = st[w].bf ? `saved ${st[w].bs} of ${st[w].bf} break points` : "never faced a break point";
      return lines(
        [`Game, set and match, ${W}!`, `${W} wins it!`, `That's it! ${W} closes it out.`, `And ${W} is through!`],
        [`${W} won ${fs}% of first-serve points and ${saveRate}. That's how you win matches.`, `A deserved win. ${W} was better on the big points, and that's all this sport is.`, `${L} will be disappointed, but there were good signs in there.`, `${W} had an answer every time ${L} asked a question.`].concat(setsWon[l] > 0 ? [`And from a set down at one stage. Character, that.`] : [`Not a set dropped. Clinical.`])
      );
    }
    if (setOver) {
      const next = setsWon[w] + 1;
      const tbLine = game.tb ? [`${W} takes the tiebreak, and the ${ord} set.`, `Tiebreak to ${W}. The ${ord} set is gone for ${L}.`] : [`${W} takes the ${ord} set ${score}.`, `The ${ord} set goes to ${W}, ${score}.`];
      const errorsBig = st[l].ue >= st[w].ue + 6;
      return lines(tbLine, [
        next === need - 1 ? `${W} is one set away now.` : setsWon[w] + 1 === setsWon[l] ? `We're level. A whole new match.` : `${L} needs a response, and quickly.`,
        errorsBig ? `${L} is up to ${st[l].ue} unforced errors already. That's the story so far.` : `${W} has ${st[w].wn} winners so far. The ball is coming off that racquet beautifully.`,
        game.tb ? `Tiebreaks are about nerve, and ${W} had more of it.` : `You felt that set turning a few games ago.`,
      ]);
    }
    if (mpSaved && w === s) return lines([`${Sv} saves match point and holds!`, `Match point saved! ${Sv} hangs on.`], [`Not over. Not even nearly over, maybe.`, `That takes some nerve. Some serious nerve.`]);
    if (servingForIt && game.brk) return lines([`${Sv} was serving for the set and couldn't close it out!`, `Broken while serving for it. ${W} is back in this set.`], [`Nerves. Everybody feels them, even at this level.`, `That's the hardest game in tennis, serving it out. ${Sv} found that out.`]);
    if (game.brk && breakBack) return lines([`And straight back! ${W} breaks for ${score}.`, `${W} hits back immediately. ${score}.`], [`That's the response you want. No time to settle.`, `${L} won't like that. You can't hand a break straight back.`]);
    if (game.brk && firstBreak) return lines([`That's the break. ${W} leads ${score} in the ${ord} set.`, `${W} breaks! ${score}.`, `There it is. The first break of the set goes to ${W}.`, `${W} gets the breakthrough. ${score}.`, `Broken! ${W} moves ahead ${score}.`], [`${Sv} had looked comfortable on serve until that game.`, `You could see it coming. ${W} was getting a racquet on everything.`, `That's what pressure does. ${Sv} went for a little too much there.`, `Big moment. Now ${W} has to back it up.`, `${W} stepped inside the baseline on those returns and took the time away.`, `One loose game from ${Sv}, and that might be the set.`, `${Sv} will want that double fault back. Or that forehand. Or both.`]);
    if (game.brk) {
      if (rb() >= 0.6) return null;
      const again = earlier.some((e) => e.brk && e.w === w);
      const back = earlier.some((e) => e.brk && e.w === l);
      const where = g[w] > g[l] ? `${W} leads ${score}` : g[w] === g[l] ? `Level at ${score}` : `${W} still trails ${g[w]}–${g[l]}`;
      return lines(again ? [`${W} breaks again. ${where}.`, `Another break for ${W}. ${where}.`] : back ? [`${W} gets the break back. ${where}.`, `${W} breaks back. ${where}.`] : [`${W} breaks. ${where}.`], [`${Sv}'s serve is under real pressure now.`, `The momentum keeps swinging in this set.`, `Neither of them is finding much on serve in this set.`]);
    }
    if (saved >= 2) return lines([`${Sv} survives! ${capital(word(saved))} break points saved in that game.`, `What a hold from ${Sv}.`, `${Sv} digs out of trouble.`, `Somehow ${Sv} holds on to that one.`], [`That could be a big game later in this set.`, `Those are the games that win matches. ${L} had chances there and didn't take them.`, `${Sv} served big when it mattered. You can't coach that.`, `${L} will look back at that game, I promise you.`, `That's a lot of energy spent for ${L} with nothing to show for it.`]);
    if (aces >= 2 && calls - lastAces > 4 && rb() < 0.35) {
      lastAces = calls;
      return lines([`Quick hold for ${Sv}, ${word(aces)} aces in that game.`, `${Sv} holds in a hurry.`, `Bang, bang. ${Sv} is through that game in no time.`, `${Sv} serving it out of reach.`], [`When the serve lands like that, there's very little the returner can do.`, `Free points. Every server's favourite kind.`, `${L} hasn't had a sniff on that serve for a while now.`, `That's the sort of game that lets you breathe.`]);
    }
    if (rally >= 18 && calls - lastRally > 3 && rb() < 0.5) {
      lastRally = calls;
      return lines([`What a rally that was. ${rally} shots.`, `${rally} shots in that point. The crowd is on its feet.`, `Did you count that one? ${rally} shots.`, `An epic exchange there, ${rally} shots long.`, `Back and forth, back and forth. ${rally} shots before anyone blinked.`], [`The crowd loved that. The legs will feel it later.`, `Points like that are worth more than one on the scoreboard.`, `You feel that one in the thighs tomorrow morning.`, `Neither of them wanted to miss first. Great defence on both sides.`, `That's the kind of point people remember from a match.`, `Somebody check the ball. It must be exhausted.`]);
    }
    return null;
  };
}

// ctx needs { tier, surface, indoor }; en is the two players' energy going in.
// With withLog the result also carries every point and game.
function simMatch(seed, a, b, ctx, withLog, en) {
  const rng = makeRng(seed);
  const P = [a, b];
  const need = (TIERS[ctx.tier].bestOf + 1) / 2;
  const base = SERVE_BASE[ctx.surface] + (ctx.indoor ? 0.008 : 0) + styleBias(a) + styleBias(b);
  const tired = en ? tiredness(en[1]) - tiredness(en[0]) : 0;
  const form = matchPower(a, ctx.surface) + gauss(rng) * 2.2 - (matchPower(b, ctx.surface) + gauss(rng) * 2.2) + tired;
  const model = [serveModel(a, b, ctx), serveModel(b, a, ctx)];
  const mix = [rallyMix(a, b, ctx), rallyMix(b, a, ctx)];
  const st = [blankMatchStats(), blankMatchStats()];
  const sets = [];
  const won = [0, 0];
  const firstServer = rng() < 0.5 ? 0 : 1;
  let server = firstServer;
  let nPoints = 0;
  let nGames = 0;

  const say = withLog ? makeCommentary(seed, P, ctx) : null;
  const booth = withLog ? makeBooth(seed, P) : null;
  const N = withLog ? P.map((p) => shortName(p.name)) : null;
  const points = [];
  const games = [];

  let kind = "";
  let first = 0;
  let mph = 0;
  const point = (s, p, bp) => {
    const r = 1 - s;
    const m = model[s];
    if (bp) p += (P[s].men - P[r].men) * 0.001; // nerve on break point
    const w2 = clamp((p - m.p1 * m.gap) / (m.p1 + (1 - m.p1) * m.p2), 0.2, 0.82);
    const w1 = Math.min(0.96, w2 + m.gap);
    let win;
    kind = "";
    mph = 0;
    first = rng() < m.p1 ? 1 : 0;
    if (first) {
      mph = Math.round(m.mph + (rng() + rng() - 1) * 13);
      const u = rng();
      if (u < Math.min(m.ace, w1 - 0.08)) {
        win = s;
        kind = "A";
        mph += 4;
      } else win = u < w1 ? s : r;
    } else if (rng() >= m.p2) {
      win = r;
      kind = "D";
    } else win = rng() < w2 ? s : r;
    if (!kind) {
      let u = rng();
      if (first && win === s) {
        if (u < 0.27) kind = "S";
        else u = (u - 0.27) / 0.73;
      }
      if (!kind) kind = u < mix[win].pw ? "W" : u < mix[win].pw + mix[win].pu ? "U" : "F";
    }
    tallyPoint(st, s, win, kind, first, bp, mph);
    nPoints++;
    return win;
  };

  while (won[0] < need && won[1] < need) {
    const setNo = sets.length + 1;
    const deciding = won[0] === need - 1 && won[1] === need - 1;
    let diff = form;
    if (deciding) diff += (a.men - b.men) * 0.12;
    if (sets.length >= 3) diff += (a.sta - b.sta) * 0.12; // deep into a best-of-five
    const p = [clamp(base + (EDGE * diff) / 2, 0.42, 0.88), clamp(base - (EDGE * diff) / 2, 0.42, 0.88)];
    const g = [0, 0];
    const done = sets.map((x) => [x.a, x.b, x.tb]);
    // would winning the current game (or tiebreak) hand player x the set or the match?
    const stake = (x, tb) => (tb || (g[x] + 1 >= 6 && g[x] + 1 - g[1 - x] >= 2) ? (won[x] === need - 1 ? "Match point" : "Set point") : null);
    let tbLoser = null;

    for (;;) {
      const tb = g[0] === 6 && g[1] === 6;
      const game = withLog ? { set: setNo, no: g[0] + g[1] + 1, s: server, tb, from: points.length, to: -1, w: -1, brk: false, text: "", g: null, end: "" } : null;
      let w;
      if (tb) {
        const target = deciding && ctx.tier === "slam" ? 10 : 7;
        const t = [0, 0];
        for (let n = 0; ; n++) {
          const s = (((n + 1) >> 1) & 1) === 0 ? server : 1 - server;
          const tags = withLog ? [0, 1].filter((x) => t[x] >= target - 1 && t[x] > t[1 - x]).map((x) => stake(x, true)) : null;
          const x = point(s, p[s], false);
          t[x]++;
          const over = (t[0] >= target || t[1] >= target) && Math.abs(t[0] - t[1]) >= 2;
          if (withLog) {
            const now = over ? [g[0] + (t[0] > t[1] ? 1 : 0), g[1] + (t[1] > t[0] ? 1 : 0), Math.min(t[0], t[1])] : [g[0], g[1], null];
            points.push({
              s, w: x, k: kind, f: first, bp: false, mph, tags, ...say(s, x, kind, mph, false), set: setNo, late: true, score: `${t[0]}–${t[1]}`, note: "",
              board: { sets: done.concat([now]), pt: over ? ["", ""] : [String(t[0]), String(t[1])], sv: over ? 1 - server : (((n + 2) >> 1) & 1) === 0 ? server : 1 - server },
            });
          }
          if (over) break;
        }
        w = t[0] > t[1] ? 0 : 1;
        tbLoser = Math.min(t[0], t[1]);
        if (withLog) game.text = `${N[w]} takes the tiebreak ${Math.max(t[0], t[1])}–${tbLoser}.`;
      } else {
        const s = server;
        const r = 1 - s;
        let sp = 0;
        let rp = 0;
        for (;;) {
          const bp = rp >= 3 && rp > sp;
          let tags = null;
          if (withLog) {
            tags = bp ? ["Break point", stake(r, false)] : sp >= 3 && sp > rp ? [stake(s, false)] : [];
            tags = tags.filter(Boolean);
          }
          const x = point(s, p[s], bp);
          if (x === s) sp++;
          else rp++;
          const over = (sp >= 4 || rp >= 4) && Math.abs(sp - rp) >= 2;
          if (withLog) {
            const deuce = sp >= 3 && rp >= 3;
            const score = over ? "Game" : deuce ? (sp === rp ? "Deuce" : `Ad ${N[sp > rp ? s : r]}`) : `${PTS[sp]}–${PTS[rp]}`;
            const mine = deuce ? (sp > rp ? "AD" : "40") : PTS[sp];
            const theirs = deuce ? (rp > sp ? "AD" : "40") : PTS[rp];
            const gw = over ? (sp > rp ? s : r) : -1;
            points.push({
              s, w: x, k: kind, f: first, bp, mph, tags, ...say(s, x, kind, mph, bp), set: setNo, late: g[0] >= 4 && g[1] >= 4, score, note: bp && x === s ? "Break point saved." : "",
              board: {
                sets: done.concat([[g[0] + (gw === 0 ? 1 : 0), g[1] + (gw === 1 ? 1 : 0), null]]),
                pt: over ? ["", ""] : s === 0 ? [mine, theirs] : [theirs, mine],
                sv: over ? r : s,
              },
            });
          }
          if (over) break;
        }
        st[s].sg++;
        w = sp > rp ? s : r;
        if (w === s) st[s].hd++;
        if (withLog) {
          const lost = w === s ? rp : sp;
          game.brk = w !== s;
          game.text = `${N[w]} ${w === s ? "holds" : "breaks"}${lost === 0 ? " to love" : lost >= 3 ? " after deuce" : ` to ${PTS[lost]}`}.`;
        }
      }
      g[w]++;
      nGames++;
      server = 1 - server;
      const setOver = tb || (g[w] >= 6 && g[w] - g[1 - w] >= 2);
      if (withLog) {
        game.to = points.length - 1;
        game.w = w;
        game.g = [g[0], g[1]];
        if (setOver) {
          const matchOver = won[w] + 1 === need;
          game.end = matchOver
            ? `Game, set and match, ${N[w]}.`
            : `${N[w]} wins the ${ORDINAL[setNo - 1]} set ${g[w]}–${g[1 - w]}${tb ? ` (${tbLoser})` : ""}.`;
          if (matchOver) points[points.length - 1].board.sv = -1;
        }
        const prev = games[games.length - 1];
        game.booth = booth({
          game,
          pts: points.slice(game.from, game.to + 1),
          g: [g[0], g[1]],
          setOver,
          matchOver: setOver && won[w] + 1 === need,
          st,
          firstBreak: game.brk && !games.some((x) => x.set === setNo && x.brk),
          breakBack: game.brk && !!prev && prev.set === setNo && prev.brk && prev.w === 1 - w,
          earlier: games.filter((x) => x.set === setNo),
          setsWon: won.slice(),
          need,
        });
        games.push(game);
      }
      if (setOver) break;
    }
    sets.push({ a: g[0], b: g[1], tb: tbLoser });
    won[g[0] > g[1] ? 0 : 1]++;
  }

  const pace = ctx.surface === "clay" ? 1.08 : ctx.surface === "grass" ? 0.94 : 1;
  const result = {
    winner: won[0] > won[1] ? a.id : b.id,
    sets,
    st,
    mins: Math.round((nPoints * 0.56 + nGames + sets.length * 2) * pace),
  };
  if (withLog) result.log = { points, games, first: firstServer, names: N };
  return result;
}

// Stats as they stood after the first n points of a logged match.
function statsAt(log, n) {
  const st = [blankMatchStats(), blankMatchStats()];
  for (let i = 0; i < n; i++) {
    const p = log.points[i];
    tallyPoint(st, p.s, p.w, p.k, p.f, p.bp, p.mph);
  }
  log.games.forEach((g) => {
    if (!g.tb && g.to < n) {
      st[g.s].sg++;
      if (g.w === g.s) st[g.s].hd++;
    }
  });
  return st;
}

// Pre-match estimate, fitted to the point-by-point engine.
function winProbability(a, b, ctx, en) {
  const diff = matchPower(a, ctx.surface) - matchPower(b, ctx.surface) + (en ? tiredness(en[1]) - tiredness(en[0]) : 0);
  return 1 / (1 + Math.exp(-(TIERS[ctx.tier].bestOf === 5 ? 0.208 : 0.167) * diff));
}

const scoreLine = (m) =>
  m.sets.map((s) => (m.winner === m.a ? `${s.a}-${s.b}` : `${s.b}-${s.a}`) + (s.tb != null ? `(${s.tb})` : "")).join(" ");

/* ────────────────────────────── Calendar and entries ────────────────────────────── */

function buildCalendar(year) {
  return EVENTS.map((e, slot) => ({
    ...e,
    slot,
    week: slot + 1,
    year,
    city: e.id === "can" ? (year % 2 === 0 ? "Montreal" : "Toronto") : e.city,
    beforeSlam: slot + 1 < EVENTS.length && EVENTS[slot + 1].tier === "slam",
    champion: null,
    runnerUp: null,
    score: null,
  }));
}

// env describes the tour on the day the entry list closes:
//   rankOf {id: rank}, energy {id: 0–100}, played {id: 500s and 250s entered this season}, race [players by Race]

// How keen a player is on a 500 or 250 this week, as a probability of entering.
// Top players pick a handful and rest before the Slams; lower-ranked players chase every point.
function appetite(p, event, env) {
  const rank = env.rankOf[p.id];
  const small = event.tier === "atp250";
  let want = rank <= 5 ? (small ? 0.06 : 0.38) : rank <= 10 ? (small ? 0.12 : 0.4) : rank <= 20 ? (small ? 0.25 : 0.55) : rank <= 50 ? (small ? 0.45 : 0.7) : rank <= 100 ? (small ? 0.65 : 0.8) : small ? 0.75 : 0.85;
  want += (p[event.surface] - p.ovr) * 0.015; // favourite surface
  if (p.country && p.country === event.country) want += 0.25; // home event
  const last = p.rankingPoints[event.slot];
  if (last && last.pts >= (small ? 100 : 200)) want += 0.2; // points to defend
  if (event.beforeSlam && rank <= 30) want *= 0.4; // rest the week before a Slam
  if ((env.played[p.id] || 0) >= (rank <= 10 ? 5 : rank <= 30 ? 8 : 99)) want *= 0.3; // schedule already full
  return clamp(want * clamp((env.energy[p.id] - 35) / 45, 0, 1.15), 0, 0.97);
}

// Slams are never skipped by choice. Masters are skipped when the tank is empty, and veterans pick their spots.
function sitsOut(rng, p, event, env) {
  const energy = env.energy[p.id];
  if (event.tier === "slam") return energy < 15 ? "fatigue" : null;
  const tired = energy < 25 ? 0.8 : energy < 40 ? 0.3 : 0;
  if (rng() < tired) return "fatigue";
  return p.age >= 35 && rng() < 0.25 ? "schedule" : null;
}

function selectField(rng, event, ranked, env) {
  const tier = TIERS[event.tier];
  if (event.tier === "finals") return { field: env.race.slice(0, tier.draw).map((p, i) => ({ p, seed: i + 1, tag: null })), cut: [], out: [] };
  const why = {};
  const willing = [];
  ranked.forEach((p) => {
    const reason = env.must && env.must.includes(p.id) ? null : OPTIONAL[event.tier] ? (rng() < appetite(p, event, env) ? null : env.energy[p.id] < 55 ? "fatigue" : "rest") : sitsOut(rng, p, event, env);
    if (reason) why[p.id] = reason;
    else willing.push(p);
  });
  const direct = willing.slice(0, tier.draw - tier.qual);
  const bag = willing.slice(direct.length);
  const picked = new Set();
  while (picked.size < tier.qual && picked.size < bag.length) {
    const open = bag.filter((p) => !picked.has(p.id));
    picked.add(open[weightedIndex(rng, open.map((p) => Math.exp((p.ovr - 75) / 5)))].id);
  }
  const field = direct.concat(bag.filter((p) => picked.has(p.id))).map((p, i) => ({ p, seed: i < tier.seeds ? i + 1 : null, tag: i >= direct.length ? "Q" : null }));
  // a short field is topped up with wildcards: the best-ranked players who had planned to rest
  if (field.length < tier.draw) {
    const inField = new Set(field.map((f) => f.p.id));
    ranked
      .filter((p) => !inField.has(p.id))
      .slice(0, tier.draw - field.length)
      .forEach((p) => {
        delete why[p.id];
        field.push({ p, seed: null, tag: "WC" });
      });
  }
  // anyone who has to be there and missed the cut comes in on a wildcard, in place of the lowest unseeded entry
  (env.must || []).forEach((id) => {
    if (field.some((f) => f.p.id === id)) return;
    const p = ranked.find((x) => x.id === id);
    const k = field.map((f) => !f.seed && !(env.must || []).includes(f.p.id)).lastIndexOf(true);
    if (p && k >= 0) field[k] = { p, seed: null, tag: "WC" };
  });
  const inField = new Set(field.map((f) => f.p.id));
  return {
    field,
    cut: bag.filter((p) => !inField.has(p.id)).map((p) => p.id),
    out: ranked
      .slice(0, 20)
      .filter((p) => !inField.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, rank: env.rankOf[p.id], why: why[p.id] || "cut" })),
  };
}

/* ────────────────────────────── Draws and matches ────────────────────────────── */

// Bracket lines for a perfectly seeded draw: [1, n, ...] so 1 and 2 can only meet in the final.
function seedOrder(n) {
  let order = [1];
  while (order.length < n) {
    const m = order.length * 2 + 1;
    order = order.flatMap((s) => [s, m - s]);
  }
  return order;
}

// Seeds 1 and 2 anchor the halves; 3–4, 5–8, 9–16 and 17–32 are drawn within their tier, as on tour.
// Everyone else is drawn at random. The ATP Finals bracket is seeded exactly.
function buildDraw(rng, field, seeds, exact) {
  let seeded = field.slice(0, seeds);
  if (!exact) {
    const drawn = seeded.slice(0, 2);
    for (let lo = 2; lo < seeds; lo *= 2) drawn.push(...shuffle(rng, seeded.slice(lo, lo * 2)));
    seeded = drawn;
  }
  const floaters = shuffle(rng, field.slice(seeds));
  const lines = seedOrder(field.length).map((n) => (n <= seeds ? seeded[n - 1] : floaters.pop()));
  const pairs = [];
  for (let i = 0; i < lines.length; i += 2) pairs.push([lines[i], lines[i + 1]]);
  return pairs;
}

function createTournament(rng, event, year, ranked, env) {
  const tier = TIERS[event.tier];
  const entry = selectField(rng, event, ranked, env);
  const pairs = buildDraw(rng, entry.field, tier.seeds, event.tier === "finals");
  const entries = {};
  entry.field.forEach((f) => {
    entries[f.p.id] = { id: f.p.id, name: f.p.name, country: f.p.country, seed: f.seed, tag: f.tag, rank: env.rankOf[f.p.id] };
  });
  const rounds = tier.rounds.map((key, r) => ({
    key,
    matches: Array.from({ length: tier.draw >> (r + 1) }, (_, m) => ({
      a: r === 0 ? pairs[m][0].p.id : null,
      b: r === 0 ? pairs[m][1].p.id : null,
      winner: null,
      sets: null,
    })),
  }));
  return { slot: event.slot, year, tier: event.tier, surface: event.surface, indoor: !!event.indoor, entries, rounds, cut: entry.cut, out: entry.out, roundIndex: 0, status: "ready", championId: null, runnerUpId: null, awards: null };
}

function tallyAwards(tier, rounds) {
  const pts = TIERS[tier].points;
  const awards = {};
  rounds.forEach((rd) =>
    rd.matches.forEach((m) => {
      awards[m.winner === m.a ? m.b : m.a] = { round: rd.key, pts: pts[rd.key] };
    })
  );
  const final = rounds[rounds.length - 1].matches[0];
  awards[final.winner] = { round: "W", pts: pts.W };
  return awards;
}

// Plays every unplayed match in round r, or just match `only`. `energy` is updated in place:
// each player goes in with what is left in the tank and pays for the minutes played.
// A match keeps its seed and the two energy levels, which is all that is needed to replay it point by point.
function playMatches(rng, t, byId, energy, r, only) {
  const rounds = t.rounds.map((rd, k) => (k === r || k === r + 1 ? { ...rd, matches: rd.matches.map((m) => ({ ...m })) } : rd));
  const played = [];
  rounds[r].matches.forEach((m, i) => {
    if (m.winner || !m.a || !m.b || (only != null && only !== i)) return;
    const A = byId[m.a];
    const B = byId[m.b];
    let seed = Math.floor(rng() * 4294967296);
    const en = [Math.round(energy[m.a]), Math.round(energy[m.b])];
    let res = simMatch(seed, A, B, t, false, en);
    const fix = t.fix;
    const must = fix ? ([m.a, m.b].includes(fix.w) ? fix.w : [m.a, m.b].includes(fix.r) ? fix.r : null) : null;
    for (let k = 1; must && res.winner !== must && k < 2000; k++) {
      seed = (seed + 0x9e3779b9) >>> 0; // the next match the simulation could have produced; kept as the seed so it replays
      res = simMatch(seed, A, B, t, false, en);
    }
    m.winner = res.winner;
    m.sets = res.sets;
    m.seed = seed;
    m.st = res.st;
    m.mins = res.mins;
    m.en = en;
    energy[m.a] = Math.max(0, energy[m.a] - matchCost(A, res.mins));
    energy[m.b] = Math.max(0, energy[m.b] - matchCost(B, res.mins));
    played.push({ m, r, key: rounds[r].key });
    if (r + 1 < rounds.length) {
      const next = rounds[r + 1].matches[i >> 1];
      if (i % 2 === 0) next.a = res.winner;
      else next.b = res.winner;
    }
  });
  const open = rounds.findIndex((rd) => rd.matches.some((m) => !m.winner));
  if (open !== -1) return { t: { ...t, rounds, roundIndex: open, status: "live" }, played };
  const final = rounds[rounds.length - 1].matches[0];
  return {
    t: {
      ...t,
      rounds,
      roundIndex: rounds.length,
      status: "complete",
      championId: final.winner,
      runnerUpId: final.winner === final.a ? final.b : final.a,
      awards: tallyAwards(t.tier, rounds),
    },
    played,
  };
}

// Rest and recovery once a week's event is done: everyone recovers, and those who sat it out recover more.
const recover = (energy, playedThisWeek) => Math.min(100, energy + (playedThisWeek ? 12 : 22));

/* ────────────────────────────── Players, honours and records ────────────────────────────── */

// Season line. The second row holds the pattern splits: record by surface (h/c/g), in deciding sets (d),
// against the top 10 (t), in finals (f), after winning the first set (a: wins, of n) and after losing it (b: wins, of n).
const blankSeason = () => ({
  w: 0, l: 0, setW: 0, setL: 0, tbW: 0, tbL: 0, ac: 0, df: 0, fi: 0, sp: 0, fw: 0, s2: 0, bf: 0, bs: 0, bo: 0, bc: 0, sg: 0, hd: 0, rg: 0, br: 0, pt: 0, tp: 0,
  hW: 0, hL: 0, cW: 0, cL: 0, gW: 0, gL: 0, dW: 0, dL: 0, tW: 0, tL: 0, fW: 0, fL: 0, aW: 0, aN: 0, bW: 0, bN: 0,
  mn: 0, zW: 0, zL: 0, // minutes on court; straight-set wins and straight-set defeats
});
const sumStats = (a, b) => {
  const out = { ...a };
  Object.keys(b).forEach((k) => {
    out[k] = (out[k] || 0) + b[k];
  });
  return out;
};

// Career line for patterns: the pre-save baseline, every completed season in the save and the current one.
const careerStats = (p) => sumStats(sumStats(p.base || blankSeason(), p.totals), p.stats);

// Honours: real results through 2025 (legacy) plus everything won in this save.
const legacyOf = (name) => {
  const r = LEGACY[name] || [0, 0, 0, 0, 0];
  return { slam: r[0], finals: r[1], masters: r[2], weeks: r[3], ye: r[4] };
};
const honours = (p) => ({
  slam: p.legacy.slam + p.titles.slam,
  finals: p.legacy.finals + p.titles.finals,
  masters: p.legacy.masters + p.titles.masters,
  weeks: Math.round(p.legacy.weeks + p.weeksNo1),
  ye: p.legacy.ye + p.yeNo1,
});
const goatScore = (h) => Math.round(h.slam * GOAT_WEIGHTS.slam + h.finals * GOAT_WEIGHTS.finals + h.masters * GOAT_WEIGHTS.masters + h.weeks * GOAT_WEIGHTS.weeks + h.ye * GOAT_WEIGHTS.ye);
// Every title won in this save, grouped by event with the years, biggest events first.
const TIER_ORDER = { slam: 0, finals: 1, masters: 2, atp500: 3, atp250: 4 };
function titleRoll(state, p) {
  const won = {};
  const add = (abbr, year) => {
    (won[abbr] = won[abbr] || []).push(year);
  };
  state.seasons.forEach((s) =>
    s.events.forEach((e) => {
      if (e.champion === p.name) add(e.abbr, s.year);
    })
  );
  state.calendar.forEach((e) => {
    if (e.champion && e.champion.id === p.id) add(e.abbr, e.year);
  });
  return EVENTS.filter((e) => won[e.abbr])
    .map((e) => ({ id: e.id, abbr: e.abbr, name: e.name, tier: e.tier, surface: e.surface, years: won[e.abbr] }))
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
}
// Grand Slam titles event by event: the real ones through 2025 plus those won in this save.
function slamBreakdown(state, p) {
  const before = LEGACY_SLAMS[p.name] || {};
  const roll = titleRoll(state, p);
  return SLAM_IDS.map((id) => {
    const e = EVENTS.find((x) => x.id === id);
    const mine = roll.find((x) => x.id === id);
    return { id, abbr: e.abbr, name: e.name, surface: e.surface, n: (before[id] || 0) + (mine ? mine.years.length : 0) };
  });
}
const titleCount = (titles) => titles.slam + titles.masters + titles.finals + titles.atp500 + titles.atp250;
const legendScores = () => LEGENDS.map(([name, , v]) => ({ name, score: goatScore({ slam: v[0], finals: v[1], masters: v[2], weeks: v[3], ye: v[4] }) }));

function makePlayer(base, year) {
  return {
    id: slug(base.name),
    ...base,
    rankingPoints: EVENTS.map(() => null),
    titles: { slam: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    legacy: legacyOf(base.name),
    weeksNo1: 0,
    yeNo1: 0,
    energy: 100,
    streak: 0,
    form: "", // last ten results, newest last
    stats: blankSeason(),
    totals: blankSeason(), // completed seasons in this save
    base: blankSeason(), // career baseline from before the save: one simulated season's worth
    openRank: null, // ranking when the season began
    record: { w: 0, l: 0 },
    career: [],
    lastChange: null,
    bestRank: null,
    debut: year,
    rookie: false,
  };
}

// Folds freshly played matches into each player's season line, form and current winning streak.
function foldMatches(add, won, played, t) {
  const letter = t.surface[0];
  const bestOf = TIERS[t.tier].bestOf;
  played.forEach(({ m, key }) => {
    const firstSetToA = m.sets[0].a > m.sets[0].b;
    [m.a, m.b].forEach((id, i) => {
      const mine = m.st[i];
      const opp = m.st[1 - i];
      const d = add[id] || (add[id] = blankSeason());
      const tag = (m.winner === id ? "W" : "L");
      won[id] = m.winner === id;
      if (won[id]) d.w++;
      else d.l++;
      d[letter + tag]++;
      d.mn += m.mins;
      if (m.sets.length === (bestOf + 1) / 2) d[`z${tag}`]++;
      if (m.sets.length === bestOf) d[`d${tag}`]++;
      if (t.entries[i === 0 ? m.b : m.a].rank <= 10) d[`t${tag}`]++;
      if (key === "F") d[`f${tag}`]++;
      if ((i === 0) === firstSetToA) {
        d.aN++;
        if (won[id]) d.aW++;
      } else {
        d.bN++;
        if (won[id]) d.bW++;
      }
      m.sets.forEach((s) => {
        const tookIt = i === 0 ? s.a > s.b : s.b > s.a;
        if (tookIt) d.setW++;
        else d.setL++;
        if (s.tb != null) {
          if (tookIt) d.tbW++;
          else d.tbL++;
        }
      });
      d.ac += mine.ac;
      d.df += mine.df;
      d.fi += mine.fi;
      d.sp += mine.sp;
      d.fw += mine.fw;
      d.s2 += mine.sw;
      d.bf += mine.bf;
      d.bs += mine.bs;
      d.bo += opp.bf;
      d.bc += opp.bf - opp.bs;
      d.sg += mine.sg;
      d.hd += mine.hd;
      d.rg += opp.sg;
      d.br += opp.sg - opp.hd;
      d.pt += mine.pt;
      d.tp += mine.pt + opp.pt;
    });
  });
}

function applyMatchStats(players, played, t) {
  if (!played.length) return players;
  const add = {};
  const won = {};
  foldMatches(add, won, played, t);
  return players.map((p) => {
    const d = add[p.id];
    if (!d) return p;
    return { ...p, stats: sumStats(p.stats, d), record: { w: p.record.w + d.w, l: p.record.l + d.l }, streak: won[p.id] ? p.streak + 1 : 0, form: ((p.form || "") + (won[p.id] ? "W" : "L")).slice(-10) };
  });
}

// Record book. keep() returns the better of the standing record and a new mark.
const blankRecords = () => ({ match: {}, season: {}, feats: {} });
const keep = (cur, next, lowWins) => (!cur || (lowWins ? next.v < cur.v : next.v > cur.v) ? next : cur);

function matchRecords(records, played, t, event) {
  if (!played.length) return records;
  const match = { ...records.match };
  const where = `${event.name} ${t.year}`;
  played.forEach(({ m }) => {
    const names = [t.entries[m.a].name, t.entries[m.b].name];
    const w = m.winner === m.a ? 0 : 1;
    const result = `${names[w]} d. ${shortName(names[1 - w])}`;
    const detail = `${scoreLine(m)}, ${where}`;
    [0, 1].forEach((i) => {
      const against = `v ${shortName(names[1 - i])}, ${where}`;
      match.aces = keep(match.aces, { v: m.st[i].ac, name: names[i], note: against });
      match.mph = keep(match.mph, { v: m.st[i].mx, name: names[i], note: against });
      match.winners = keep(match.winners, { v: m.st[i].wn, name: names[i], note: against });
    });
    match.mins = keep(match.mins, { v: m.mins, name: result, note: detail });
    match.points = keep(match.points, { v: m.st[0].pt + m.st[1].pt, name: result, note: detail });
  });
  return { ...records, match };
}

/* ────────────────────────────── Head-to-heads ────────────────────────────── */
// h2h maps "idA|idB" (ids in alphabetical order) to [wins for the first, wins for the second, finals played, last meeting, who won it, sequence].
// The sequence remembers the last eight meetings: "0"/"1" for who won, "a"/"b" for the same when it went to a deciding set.
// Only matches that could matter to a rivalry are kept: both players in the top 40, a semifinal or final, or a pair already on file.

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
// wins for a and for b, in that order
const h2hFor = (h2h, a, b) => {
  const rec = h2h[pairKey(a, b)];
  if (!rec) return [0, 0];
  return a < b ? [rec[0], rec[1]] : [rec[1], rec[0]];
};
function addMeeting(h2h, t, event, key, m) {
  const k = pairKey(m.a, m.b);
  const known = h2h[k];
  if (!known && !(key === "SF" || key === "F") && !(t.entries[m.a].rank <= 40 && t.entries[m.b].rank <= 40)) return;
  const rec = known ? known.slice() : [0, 0, 0, "", 0, ""];
  const first = m.a < m.b ? m.a : m.b;
  const idx = m.winner === first ? 0 : 1;
  rec[idx]++;
  if (key === "F") rec[2]++;
  rec[3] = `${event.abbr} ${t.year}`;
  rec[4] = idx;
  rec[5] = ((rec[5] || "") + (m.sets.length === TIERS[t.tier].bestOf ? "ab"[idx] : String(idx))).slice(-8);
  h2h[k] = rec;
}

/* ────────────────────────────── News desk ────────────────────────────── */
// Storylines are written as things happen and kept newest first: { y, w, k (kind), h (headline), b (body), ids }.

const NEWS_LIMIT = 170;
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n) => WORDS[n] || String(n);
const listNames = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
const WHY = { fatigue: "citing fatigue", rest: "resting", schedule: "managing a lighter schedule", cut: "missed the cut" };
const h2hLine = (h2h, a, b) => {
  const [x, y] = h2hFor(h2h, a.id, b.id);
  if (x + y < 2) return "";
  return x === y ? ` Their head-to-head is level at ${x}–${y}.` : ` ${shortName(x > y ? a.name : b.name)} leads their head-to-head ${Math.max(x, y)}–${Math.min(x, y)}.`;
};

function openingArticle(players) {
  const order = rankBy(players, totalPoints);
  return article({ y: START_YEAR, w: 1, city: "Brisbane" }, "preview", `The ${START_YEAR} season opens in Brisbane`, "Thirty-two events, four Slams and a tour of 150 players.", [
    `A new season starts with ${order[0].name} as world No. 1, ${fmt(totalPoints(order[0]) - totalPoints(order[1]))} points ahead of ${order[1].name}. ${order[2].name} is third.`,
    "The calendar runs to 32 events: four Grand Slams, nine Masters 1000s, twelve ATP 500s, six ATP 250s and the ATP Finals. Only a player's best six results from the 500s and 250s count, so the leading names will pick their weeks.",
    "Energy is the other thing to watch. Matches drain it and rest restores it, and a tired player gives up match power. Who plays where, and who sits out, will shape the year.",
  ], order.slice(0, 5).map((p, i) => [`${i + 1}. ${shortName(p.name)}`, fmt(totalPoints(p))]), order.slice(0, 3).map((p) => p.id));
}

/* ────────────────────────────── Game state ────────────────────────────── */

// Opening points come from seeded simulations of a prior season, schedules and fatigue included.
// Big events carry the average haul. For the 500s and 250s each player gets a typical schedule:
// the events entered most often, each worth the average haul when playing.
function seedOpeningPoints(players) {
  const rng = makeRng(0x7e551a);
  const runs = 10;
  const calendar = buildCalendar(START_YEAR - 1);
  const byOvr = players.slice().sort((a, b) => b.ovr - a.ovr || (a.id < b.id ? -1 : 1));
  const rankOf = rankMap(byOvr);
  const byId = indexById(players);
  const blank = () => Object.fromEntries(players.map((p) => [p.id, EVENTS.map(() => 0)]));
  const sums = blank();
  const entered = blank();
  const career = {}; // every simulated match, folded into a stat line per player
  for (let n = 0; n < runs; n++) {
    const energy = Object.fromEntries(players.map((p) => [p.id, 100]));
    const season = Object.fromEntries(players.map((p) => [p.id, 0]));
    const played = {};
    calendar.forEach((event) => {
      const race = byOvr.slice().sort((a, b) => season[b.id] - season[a.id]);
      let t = createTournament(rng, event, event.year, byOvr, { rankOf, energy, played, race });
      while (t.status !== "complete") {
        const step = playMatches(rng, t, byId, energy, t.roundIndex);
        foldMatches(career, {}, step.played, step.t);
        t = step.t;
      }
      players.forEach((p) => {
        const award = t.awards[p.id];
        if (award) {
          sums[p.id][event.slot] += award.pts;
          entered[p.id][event.slot]++;
          season[p.id] += award.pts;
          if (OPTIONAL[event.tier]) played[p.id] = (played[p.id] || 0) + 1;
        }
        energy[p.id] = recover(energy[p.id], !!award);
      });
    });
  }
  const year = START_YEAR - 1;
  const round5 = (v) => Math.round(v / 5) * 5;
  const small = EVENTS.map((e, i) => i).filter((i) => IS_OTHER[i]);
  return players.map((p) => {
    const mine = entered[p.id];
    const usual = Math.round(small.reduce((s, i) => s + mine[i], 0) / runs);
    const chosen = new Set(
      small
        .filter((i) => mine[i] > 0)
        .sort((x, y) => mine[y] - mine[x] || x - y)
        .slice(0, usual)
    );
    // the career baseline is one average season from those simulations
    const base = blankSeason();
    if (career[p.id]) Object.keys(base).forEach((k) => {
      base[k] = Math.round(career[p.id][k] / runs);
    });
    return {
      ...p,
      base,
      rankingPoints: EVENTS.map((e, i) => {
        if (!IS_OTHER[i]) return { pts: round5(sums[p.id][i] / runs), year, round: null };
        return chosen.has(i) ? { pts: round5(sums[p.id][i] / mine[i]), year, round: null } : { pts: 0, year, round: "DNP" };
      }),
    };
  });
}

// today ("YYYY-MM-DD", optional): the franchise picks up on that date, with everything before it already played.
function createGame(seed, today) {
  const fresh = newWorld(seed);
  return today ? catchUp(fresh, today) : fresh;
}

function newWorld(seed) {
  let players = seedOpeningPoints(ROSTER.map((r) => makePlayer(r, START_YEAR)));
  const ranks = rankMap(rankBy(players, totalPoints));
  const legends = legendScores();
  players = players.map((p) => {
    const score = goatScore(honours(p));
    return { ...p, bestRank: ranks[p.id], openRank: ranks[p.id], passed: legends.filter((l) => l.score <= score).map((l) => l.name) };
  });
  const h2h = {};
  Object.keys(H2H_SEED).forEach((k) => {
    const [x, y, finals] = H2H_SEED[k];
    h2h[k] = [x, y, finals, "real meetings through 2025", x > y ? 0 : 1, ""];
  });
  return {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    currentYear: START_YEAR,
    currentWeek: 1,
    calendar: buildCalendar(START_YEAR),
    players,
    tournament: null,
    prevRanks: {},
    lastResult: null,
    seasons: [],
    retired: [],
    records: blankRecords(),
    critLog: {},
    bank: blankBank(),
    h2h,
    news: [openingArticle(players)],
    offseason: null,
  };
}

// Plays the calendar forward to a date: whole seasons that are already over, then every event of this season that
// has finished, then the early rounds of an event that is under way. It goes through the ordinary game loop, so the
// world it hands back (rankings, records, stories) is the same one you would get by pressing the buttons yourself.
function catchUp(state, today) {
  const [y, mo, d] = String(today).split("-").map(Number);
  if (!y || !mo || !d) return state;
  const now = Date.UTC(y, mo - 1, d);
  let s = state;
  let seasonsPlayed = 0;
  let real = 0;
  // the real champion and runner-up for a week, if the game knows them and both are on the tour
  const realWeek = (st, ev) => {
    const pair = (REAL_FINALS[st.currentYear] || {})[ev.id];
    if (!pair) return null;
    const [w, r] = pair.map((name) => (st.players.find((p) => p.name === name) || {}).id || null);
    if (!w) return null;
    real++;
    return { must: [w, r].filter(Boolean), fix: { w, r } };
  };
  for (let guard = 0; guard < 400; guard++) {
    if (s.currentWeek >= OFFSEASON_WEEK) {
      if (Date.UTC(s.currentYear + 1, 0, 1) > now) break; // the off-season runs once the new year has arrived
      s = reducer(s, { type: "RUN_OFFSEASON" });
      seasonsPlayed++;
      continue;
    }
    const ev = s.calendar[s.currentWeek - 1];
    const { start, end, len } = eventDays(ev, s.currentYear);
    if (end >= now) {
      // under way today: the rounds finished before today are played
      if (start <= now) {
        s = startTournament(s, realWeek(s, ev));
        const rounds = s.tournament.rounds.length;
        const done = Math.min(rounds - 1, Math.floor((rounds * (now - start)) / (len * DAY_MS)));
        if (done > 0) s = advanceTournament(s, done);
      }
      break;
    }
    s = advanceTournament(startTournament(s, realWeek(s, ev)), Infinity);
    if (s.currentYear === REAL_SNAPSHOT.year && ev.id === REAL_SNAPSHOT.after) s = applySnapshot(s);
  }
  return { ...s, startedOn: today, news: [catchUpArticle(s, now, seasonsPlayed, real)].concat(s.news).slice(0, NEWS_LIMIT) };
}

// Sets the real ranking points and weeks at No. 1 for the date of the snapshot. Each listed player's ranking entries
// are scaled to the real total; anyone else is scaled down, if needed, so the real top twelve stay the top twelve.
function applySnapshot(s) {
  const target = REAL_SNAPSHOT.points;
  const floor = Math.min(...Object.values(target));
  const others = s.players.filter((p) => !target[p.name]);
  const highest = Math.max(1, ...others.map(totalPoints));
  const squeeze = highest >= floor ? (floor - 40) / highest : 1;
  const scaled = (p, k) => ({ ...p, rankingPoints: p.rankingPoints.map((e) => (e ? { ...e, pts: Math.round(e.pts * k) } : e)) });
  const players = s.players.map((p) => {
    const q = target[p.name] ? scaled(p, target[p.name] / Math.max(1, totalPoints(p))) : squeeze < 1 ? scaled(p, squeeze) : p;
    return { ...q, weeksNo1: REAL_SNAPSHOT.weeks[p.name] || 0 };
  });
  return { ...s, players, prevRanks: rankMap(rankBy(players, totalPoints)) };
}

// The first story of a franchise that starts part-way through a season: where everything stands today.
function catchUpArticle(s, now, seasonsPlayed, real) {
  const year = s.currentYear;
  const when = dayLabel(now);
  const done = s.calendar.filter((e) => e.champion);
  const ranked = rankBy(s.players, totalPoints);
  const race = rankBy(s.players, (p) => racePoints(p, year));
  const t = s.tournament;
  const live = t && t.status !== "complete" ? s.calendar[t.slot] : null;
  const next = s.currentWeek < OFFSEASON_WEEK ? s.calendar[s.currentWeek - 1] : null;
  const slams = done.filter((e) => e.tier === "slam").map((e) => `${e.champion.name} (${e.name})`);
  const haul = ranked.map((p) => ({ p, n: seasonTitles(p, year) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const upNext = live ? `${at(live)} is under way, with the ${ROUND_LABEL[t.rounds[t.roundIndex].key].toLowerCase()} up next` : next ? `${at(next)} is next on the calendar (${dateRange(next, year)})` : "the season is complete, and the off-season is next";
  return article({ y: year, w: Math.min(s.currentWeek, OFFSEASON_WEEK), city: live ? live.city : next ? next.city : "the tour" }, "preview", `The ${year} season so far: where things stand on ${when}`, `${done.length} of ${EVENTS.length} events played. ${capital(upNext)}.`, [
    `The franchise picks up on ${when}, ${year}. Every event before today has been played${seasonsPlayed ? `, along with ${word(seasonsPlayed)} earlier ${seasonsPlayed === 1 ? "season" : "seasons"}` : ""}, and ${upNext}. ${real ? `${capital(word(real))} of those events were replayed with their real champions, so the titles and trophy cabinets match the real tour; the scores and everything else in them are the game's own simulation.` : "These results are the game's own: the season so far was simulated from the opening ratings."}`,
    slams.length ? `Grand Slam champions so far: ${listNames(slams)}.` : "No Grand Slam has been played yet this season.",
    haul.length ? `Most titles this year: ${listNames(haul.map((x) => `${x.p.name} with ${x.n}`))}.` : "Nobody has won a title yet this year.",
    `${ranked[0].name} is world No. 1, ${fmt(totalPoints(ranked[0]) - totalPoints(ranked[1]))} points ahead of ${ranked[1].name}. In the Race to Turin, the top eight are ${listNames(race.slice(0, 8).map((p) => shortName(p.name)))}.`,
  ], [["Date", when], ["Events played", `${done.length} of ${EVENTS.length}`], ["World No. 1", shortName(ranked[0].name)], ["Race leader", shortName(race[0].name)]], ranked.slice(0, 3).map((p) => p.id));
}

function tourEnv(state, ranked) {
  const year = state.currentYear;
  const played = {};
  const energy = {};
  state.players.forEach((p) => {
    let n = 0;
    p.rankingPoints.forEach((e, i) => {
      if (IS_OTHER[i] && e && e.year === year && e.round !== "DNP" && e.round !== "DNQ") n++;
    });
    played[p.id] = n;
    energy[p.id] = p.energy;
  });
  return { rankOf: rankMap(ranked), energy, played, race: rankBy(state.players, (p) => racePoints(p, year)) };
}

// opts (optional, used when replaying real weeks): { must: [ids who play], fix: { w: champion id, r: runner-up id } }
function startTournament(state, opts) {
  if (state.currentWeek >= OFFSEASON_WEEK) return state;
  if (state.tournament && state.tournament.status !== "complete") return state;
  const rng = makeRng(state.seed);
  const event = state.calendar[state.currentWeek - 1];
  const ranked = rankBy(state.players, totalPoints);
  const env = tourEnv(state, ranked);
  if (opts && opts.must) env.must = opts.must;
  const tournament = createTournament(rng, event, state.currentYear, ranked, env);
  if (opts && opts.fix) {
    tournament.fix = opts.fix;
    // the real finalists go in opposite halves, so the replayed final can be the real one
    const { w, r } = opts.fix;
    const first = tournament.rounds[0].matches;
    const where = (id) => first.findIndex((m) => m.a === id || m.b === id);
    const half = (i) => (i < first.length / 2 ? 0 : 1);
    const wi = where(w);
    const ri = where(r);
    if (wi >= 0 && ri >= 0 && half(wi) === half(ri)) {
      const seeded = !!tournament.entries[r].seed;
      const swapWith = first
        .map((m, i) => [m, i])
        .filter(([, i]) => half(i) !== half(wi))
        .flatMap(([m]) => [m.a, m.b])
        .find((id) => id && id !== w && !!tournament.entries[id].seed === seeded);
      if (swapWith) {
        const si = where(swapWith);
        first[ri] = { ...first[ri], a: first[ri].a === r ? swapWith : first[ri].a, b: first[ri].b === r ? swapWith : first[ri].b };
        first[si] = { ...first[si], a: first[si].a === swapWith ? r : first[si].a, b: first[si].b === swapWith ? r : first[si].b };
      }
    }
  }
  return { ...state, tournament, news: previewArticles(state, tournament, event).concat(state.news).slice(0, NEWS_LIMIT), seed: rng.seed() };
}

// Awards the points, overwrites every player's entry for this slot, and moves the calendar on one week.
function settleTournament(state, t) {
  const year = state.currentYear;
  const event = state.calendar[t.slot];
  const before = rankMap(rankBy(state.players, totalPoints));
  const missed = new Set(t.cut);
  let players = state.players.map((p) => {
    const award = t.awards[p.id];
    const rankingPoints = p.rankingPoints.slice();
    rankingPoints[t.slot] = award ? { pts: award.pts, year, round: award.round } : { pts: 0, year, round: missed.has(p.id) ? "DNQ" : "DNP" };
    const titles = award && award.round === "W" ? { ...p.titles, [t.tier]: p.titles[t.tier] + 1 } : p.titles;
    return { ...p, rankingPoints, titles, energy: recover(p.energy, !!award) };
  });
  const after = rankMap(rankBy(players, totalPoints));
  players = players.map((p) => ({
    ...p,
    bestRank: p.bestRank == null ? after[p.id] : Math.min(p.bestRank, after[p.id]),
    weeksNo1: after[p.id] === 1 ? p.weeksNo1 + WEEKS_PER_EVENT : p.weeksNo1,
  }));
  const final = t.rounds[t.rounds.length - 1].matches[0];
  const champion = { id: t.championId, name: t.entries[t.championId].name };
  const runnerUp = { id: t.runnerUpId, name: t.entries[t.runnerUpId].name };
  const score = scoreLine(final);
  const where = `${event.name} ${year}`;
  const champ = players.find((p) => p.id === t.championId);
  const top = players.find((p) => after[p.id] === 1);
  const feats = { ...state.records.feats };
  if (t.tier === "slam") {
    feats.youngestSlam = keep(feats.youngestSlam, { v: champ.age, name: champ.name, note: where }, true);
    feats.oldestSlam = keep(feats.oldestSlam, { v: champ.age, name: champ.name, note: where });
  }
  feats.lowestChampion = keep(feats.lowestChampion, { v: t.entries[t.championId].rank, name: champ.name, note: where });
  feats.youngestNo1 = keep(feats.youngestNo1, { v: top.age, name: top.name, note: `after ${where}` }, true);
  feats.oldestNo1 = keep(feats.oldestNo1, { v: top.age, name: top.name, note: `after ${where}` });

  const fresh = resultArticles(state, t, event, players, before, after, state.h2h);
  const critical = critiqueArticles(state, t, event, players, before, after);
  fresh.push(...critical.items);
  const wrap = wrapUpArticles(state, t, event, players, before, after);
  fresh.push(...wrap.items);
  // climbing past a legend on the GOAT list is a headline, once
  const champScore = goatScore(honours(champ));
  const caught = legendScores().filter((l) => l.score < champScore && !(champ.passed || []).includes(l.name));
  if (caught.length) {
    players = players.map((p) => (p.id === champ.id ? { ...p, passed: (p.passed || []).concat(caught.map((l) => l.name)) } : p));
    const hc = honours(champ);
    fresh.push(
      article({ y: year, w: event.week, city: event.city }, "goat", `${champ.name} passes ${listNames(caught.map((l) => l.name))} on the all-time list`, `The ${event.name} title lifts ${shortName(champ.name)}'s GOAT score to ${fmt(champScore)}.`, [
        `${champ.name} has moved past ${listNames(caught.map((l) => `${l.name} (${fmt(l.score)})`))} on the all-time list. The ${event.name} title takes the GOAT score to ${fmt(champScore)}.`,
        `The ledger now reads ${hc.slam} Grand Slams, ${hc.finals} ATP Finals, ${hc.masters} Masters 1000 titles, ${hc.weeks} weeks at No. 1 and ${hc.ye} year-end No. 1 finishes, at the age of ${champ.age}.`,
      ], [["GOAT score", fmt(champScore)], ["Slams", hc.slam], ["Masters", hc.masters], ["Weeks at No. 1", hc.weeks]], [champ.id])
    );
  }
  return {
    ...state,
    players,
    records: { ...state.records, feats },
    calendar: state.calendar.map((e) => (e.slot === t.slot ? { ...e, champion, runnerUp, score } : e)),
    prevRanks: before,
    currentWeek: state.currentWeek + 1,
    lastResult: { slot: t.slot, champion, runnerUp, score },
    critLog: critical.log,
    power: wrap.power,
    news: fresh.concat(state.news).slice(0, NEWS_LIMIT),
  };
}

// Plays up to maxRounds rounds, or a single match when `pick` is given.
function advanceTournament(state, maxRounds, pick) {
  let t = state.tournament;
  if (!t || t.status === "complete") return state;
  if (pick) {
    const m = t.rounds[pick.r] && t.rounds[pick.r].matches[pick.i];
    if (!m || m.winner || !m.a || !m.b) return state;
  }
  const rng = makeRng(state.seed);
  const event = state.calendar[t.slot];
  const energy = Object.fromEntries(state.players.map((p) => [p.id, p.energy]));
  const h2h = { ...state.h2h };
  let players = state.players;
  let records = state.records;
  let bank = state.bank;
  const filed = []; // stories written while the tournament is still going, oldest first
  let feuds = state.feuds || {};
  for (let i = 0; i < maxRounds && t.status !== "complete"; i++) {
    const byId = indexById(players);
    const step = pick ? playMatches(rng, t, byId, energy, pick.r, pick.i) : playMatches(rng, t, byId, energy, t.roundIndex);
    step.played.forEach(({ m, key }) => {
      // what the two players brought into the match: head-to-head, winning streaks and the closing market price
      m.pre = { h: h2hFor(h2h, m.a, m.b), sk: [byId[m.a].streak, byId[m.b].streak], bk: Math.round(marketProb(byId[m.a], byId[m.b], t, m.en, betKey(t, m.a, m.b)) * 1000) / 1000 };
      addMeeting(h2h, t, event, key, m);
    });
    players = applyMatchStats(players, step.played, t);
    records = matchRecords(records, step.played, t, event);
    t = step.t;
    bank = settleBets(bank, step.played, t);
    filed.push(...roundArticles({ ...state, players, h2h, feuds }, t, event, step.played));
    const words = needleArticles({ ...state, players, h2h, feuds, news: filed.concat(state.news) }, t, event, step.played);
    feuds = words.feuds;
    filed.push(...words.items);
  }
  players = players.map((p) => (p.energy === energy[p.id] ? p : { ...p, energy: energy[p.id] }));
  const next = { ...state, tournament: t, players, records, h2h, bank, feuds, news: filed.reverse().concat(state.news).slice(0, NEWS_LIMIT), seed: rng.seed() };
  return t.status === "complete" ? settleTournament(next, t) : next;
}

/* ────────────────────────────── Off-season ────────────────────────────── */

// Takes a player who has already aged up and applies the bracket for the new age.
function develop(rng, p) {
  const phase = phaseFor(p.age);
  const next = { ...p };
  if (phase === "growth") {
    const gap = p.potential - p.ovr;
    const roll = gap >= 7 ? (rng() < 0.65 ? 3 : 2) : gap >= 4 ? [1, 2, 3][weightedIndex(rng, [2, 5, 3])] : rng() < 0.6 ? 1 : 2;
    const gain = clamp(Math.min(roll, gap), 1, 3);
    next.ovr = Math.min(99, p.ovr + gain);
    ATTRS.forEach((k) => {
      next[k] = Math.min(99, p[k] + clamp(gain + int(rng, -1, 1), 1, 3));
    });
    SURFACE_KEYS.forEach((s) => {
      next[s] = Math.min(99, p[s] + gain);
    });
    next.potential = Math.max(p.potential, next.ovr);
  } else if (phase === "regression") {
    const late = p.age >= 33;
    const movDrop = late ? 2 : int(rng, 1, 2);
    const staDrop = late ? 2 : int(rng, 1, 2);
    next.mov = Math.max(40, p.mov - movDrop);
    next.sta = Math.max(40, p.sta - staDrop);
    const lost = movDrop + staDrop;
    const ovrDrop = lost === 2 ? (rng() < 0.5 ? 0 : 1) : lost === 3 ? 1 : rng() < 0.5 ? 1 : 2;
    next.ovr = Math.max(40, p.ovr - ovrDrop);
    SURFACE_KEYS.forEach((s) => {
      next[s] = Math.max(40, p[s] - ovrDrop);
    });
    next.potential = Math.max(next.ovr, p.potential - ovrDrop);
  }
  const deltas = {};
  ["ovr", ...ATTRS, ...SURFACE_KEYS].forEach((k) => {
    deltas[k] = next[k] - p[k];
  });
  next.lastChange = { phase, deltas };
  return next;
}

function retireChance(age, rank) {
  if (age >= 42) return 1;
  if (age < 35) return age >= 32 && rank > 110 ? 0.1 : 0;
  const base = [0.05, 0.1, 0.2, 0.32, 0.45, 0.6, 0.78][age - 35];
  return clamp(rank <= 10 ? base * 0.5 : rank > 60 ? base + 0.15 : base, 0, 1);
}

function makeRookie(rng, year, taken) {
  let nat;
  let name;
  let tries = 0;
  do {
    nat = NEWGEN[int(rng, 0, NEWGEN.length - 1)];
    name = `${nat.first[int(rng, 0, nat.first.length - 1)]} ${nat.last[int(rng, 0, nat.last.length - 1)]}`;
  } while (taken.has(name) && ++tries < 60);
  if (taken.has(name)) name = `${name} ${year}`;
  taken.add(name);
  const grade = rng();
  // about one arrival in twenty-five is a generational talent, one in seven a blue-chip prospect
  const ovr = grade < 0.04 ? int(rng, 82, 86) : grade < 0.18 ? int(rng, 76, 81) : int(rng, 65, 75);
  const potential = Math.min(99, grade < 0.04 ? int(rng, 95, 99) : grade < 0.18 ? int(rng, 88, 94) : ovr + int(rng, 5, 13));
  const base = { name, country: nat.c, age: int(rng, 18, 19), ovr, potential };
  const favourite = SURFACE_KEYS[int(rng, 0, 2)];
  SURFACE_KEYS.forEach((s) => {
    base[s] = clamp(ovr + (s === favourite ? int(rng, 1, 4) : int(rng, -6, 0)), 50, 99);
  });
  ATTRS.forEach((k) => {
    base[k] = clamp(ovr + int(rng, -5, 8), 50, 97);
  });
  return { ...makePlayer(base, year), id: `ng-${year}-${slug(name)}`, passed: [], rookie: true };
}

// The year rollover. Runs only once the ATP Finals are in the books:
// archive the season, age everyone, apply growth / peak / regression, handle retirements and the rookie class,
// then reset the calendar to week 1 of the new year. Ranking points carry over untouched.
function runOffseason(state) {
  if (state.currentWeek !== OFFSEASON_WEEK) return state;
  const rng = makeRng(state.seed);
  const year = state.currentYear;
  const ranked = rankBy(state.players, totalPoints);
  const ranks = rankMap(ranked);
  const no1 = { id: ranked[0].id, name: ranked[0].name, pts: totalPoints(ranked[0]) };
  const season = {
    year,
    no1,
    events: state.calendar.map((e) => ({ abbr: e.abbr, tier: e.tier, champion: e.champion ? e.champion.name : null })),
  };

  const marks = { ...state.records.season };
  const development = [];
  const retirements = [];
  let staying = [];
  const alumnus = (p, reason) => ({ id: p.id, name: p.name, country: p.country, age: p.age, year, reason, lastRank: ranks[p.id], bestRank: p.bestRank || ranks[p.id], titles: p.titles, legacy: p.legacy, weeksNo1: p.weeksNo1, yeNo1: p.yeNo1, record: p.record });
  ranked.forEach((p, i) => {
    const s = p.stats;
    const won = seasonTitles(p, year);
    const line = { year, age: p.age, ovr: p.ovr, rank: ranks[p.id], pts: totalPoints(p), titles: won, w: s.w, l: s.l };
    marks.wins = keep(marks.wins, { v: s.w, name: p.name, note: `${s.w}–${s.l} in ${year}` });
    marks.titles = keep(marks.titles, { v: won, name: p.name, note: String(year) });
    marks.aces = keep(marks.aces, { v: s.ac, name: p.name, note: `${s.w + s.l} matches in ${year}` });
    marks.points = keep(marks.points, { v: totalPoints(p), name: p.name, note: `year-end ${year}` });
    if (s.w + s.l >= 30) marks.winPct = keep(marks.winPct, { v: Math.round((1000 * s.w) / (s.w + s.l)) / 10, name: p.name, note: `${s.w}–${s.l} in ${year}` });
    const next = develop(rng, { ...p, age: p.age + 1, career: [...p.career, line], totals: sumStats(p.totals, s), stats: blankSeason(), yeNo1: p.yeNo1 + (i === 0 ? 1 : 0), energy: 100, openRank: ranks[p.id], rookie: false });
    const retires = rng() < retireChance(next.age, ranks[p.id]);
    development.push({ id: p.id, name: p.name, age: next.age, rank: ranks[p.id], phase: next.lastChange.phase, ovrFrom: p.ovr, ovrTo: next.ovr, deltas: next.lastChange.deltas, retired: retires });
    if (retires) retirements.push(alumnus(next, "retired"));
    else staying.push(next);
  });

  // A random rookie class arrives every year: one for each retirement plus three to seven more.
  // To make room, the lowest-ranked veterans lose their tour cards (players under 24 are spared first).
  const taken = new Set([...state.players.map((p) => p.name), ...state.retired.map((r) => r.name)]);
  const arrivals = Array.from({ length: retirements.length + int(rng, 3, 7) }, () => makeRookie(rng, year + 1, taken));
  const excess = staying.length + arrivals.length - TOUR_SIZE;
  let dropped = [];
  if (excess > 0) {
    const worstFirst = staying.slice().sort((a, b) => ranks[b.id] - ranks[a.id]);
    const cut = new Set(worstFirst.filter((p) => p.age >= 24).concat(worstFirst.filter((p) => p.age < 24)).slice(0, excess).map((p) => p.id));
    dropped = staying.filter((p) => cut.has(p.id)).map((p) => alumnus(p, "dropped"));
    staying = staying.filter((p) => !cut.has(p.id));
    development.forEach((d) => {
      if (cut.has(d.id)) d.dropped = true;
    });
  }
  // The alumni list keeps everyone with honours and the 250 most recent departures.
  const alumni = [...state.retired, ...retirements, ...dropped];
  const retired = alumni.filter((r, i) => i >= alumni.length - 250 || goatScore(honours(r)) > 0);

  // Head-to-heads survive a departure only if the pair met often enough to be remembered.
  const here = new Set(staying.map((p) => p.id));
  const h2h = {};
  Object.keys(state.h2h).forEach((k) => {
    const rec = state.h2h[k];
    const [a, b] = k.split("|");
    if ((here.has(a) && here.has(b)) || rec[0] + rec[1] >= 6) h2h[k] = rec;
  });

  const fresh = offseasonArticles(state, year, ranked, ranks, retirements, arrivals, staying);

  return {
    ...state,
    seed: rng.seed(),
    currentYear: year + 1,
    currentWeek: 1,
    calendar: buildCalendar(year + 1),
    players: [...staying, ...arrivals],
    tournament: null,
    lastResult: null,
    prevRanks: ranks,
    seasons: [...state.seasons, season],
    retired,
    records: { ...state.records, season: marks },
    critLog: Object.fromEntries(Object.entries(state.critLog).filter(([k]) => here.has(k.split(":")[0]))),
    feuds: Object.fromEntries(Object.entries(state.feuds || {}).filter(([, v]) => (year + 1) * 40 + 1 - v.w <= FEUD_WEEKS)), // old feuds cool off
    h2h,
    news: fresh.concat(state.news).slice(0, NEWS_LIMIT),
    offseason: {
      fromYear: year,
      toYear: year + 1,
      no1,
      slams: season.events.filter((e) => e.tier === "slam" || e.tier === "finals"),
      development,
      retirements,
      dropped,
      arrivals: arrivals.map((p) => ({ id: p.id, name: p.name, country: p.country, age: p.age, ovr: p.ovr, potential: p.potential })),
    },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "START_TOURNAMENT":
      return startTournament(state);
    case "SIM_MATCH":
      return advanceTournament(state, 1, { r: action.r, i: action.i });
    case "SIM_ROUND":
      return advanceTournament(state, 1);
    case "SIM_TOURNAMENT":
      return advanceTournament(state, Infinity);
    case "SIM_SEASON": {
      let s = state;
      for (let guard = 0; guard < 80 && s.currentWeek < OFFSEASON_WEEK; guard++) s = advanceTournament(startTournament(s), Infinity);
      return s;
    }
    case "RUN_OFFSEASON":
      return runOffseason(state);
    case "ADD_ROOKIE": {
      // scouting: one random newcomer joins the tour straight away
      if (state.players.length >= TOUR_LIMIT) return state;
      const rng = makeRng(state.seed);
      const taken = new Set([...state.players.map((p) => p.name), ...state.retired.map((r) => r.name)]);
      const rookie = makeRookie(rng, state.currentYear, taken);
      return { ...state, players: [...state.players, rookie], seed: rng.seed(), scouted: rookie.id };
    }
    case "BET_FUNDS":
      return addFunds(state, action.amount);
    case "BET_PLACE":
      return placeBet(state, action);
    case "BET_RESET":
      return { ...state, bank: blankBank() };
    case "NEW_GAME":
      return createGame(action.seed, action.today);
    default:
      return state;
  }
}

const validSave = (s) =>
  !!s && s.version === SAVE_VERSION && Array.isArray(s.players) && s.players.length >= 128 && !!s.records && !!s.h2h && !!s.critLog && !!s.bank && Array.isArray(s.news) && Array.isArray(s.calendar) && s.calendar.length === EVENTS.length;

function bootGame(initialSave) {
  if (validSave(initialSave)) return initialSave;
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVE_KEY));
    if (validSave(saved)) return saved;
  } catch (err) {
    /* no readable save: start fresh */
  }
  return createGame(Date.now() % 2147483647, localToday());
}

/* ────────────────────────────── Match stories ────────────────────────────── */
// Headlines, previews and reports are written from the match itself: the draw, the rankings going in,
// the head-to-head, energy levels and, once it is played, the scoreline and the stats.

const SURF_NAME = { hard: "Hard", clay: "Clay", grass: "Grass" };
const surfaceName = (e) => (e.indoor ? "indoor hard" : SURF_NAME[e.surface]);
const NO_ARTICLE = { rg: true, wim: true };
const at = (event) => (NO_ARTICLE[event.id] ? event.name : `the ${event.name}`);
const NEXT_STAGE = { F: "win the title", SF: "reach the final", QF: "reach the semifinals", R16: "reach the quarterfinals", R32: "reach the last 16", R64: "reach the third round", R128: "reach the second round" };
const STAKE = { F: "the title", SF: "a place in the final", QF: "a semifinal spot", R16: "a quarterfinal place", R32: "a place in the last 16", R64: "a third-round place", R128: "a second-round place" };
const STRENGTH = {
  srv: "Land first serves and keep the points short",
  fh: "Dictate with the forehand from the middle of the court",
  bh: "Change direction off the backhand and take the ball early",
  mov: "Extend the rallies and make it a physical match",
  sta: "Drag it long; the later sets are an ally",
  men: "Stay level on the big points, where the steadier head wins",
};
const EXPLOIT = {
  srv: "Attack the second serve and get on top in return games",
  fh: "Rush the forehand before it can be set up",
  bh: "Go at the backhand wing under pressure",
  mov: "Move the ball side to side and open the court",
  sta: "Make every rally long and ask the fitness question",
  men: "Apply scoreboard pressure early and keep it on",
};

function isBigMatch(t, r, m) {
  if (!m.a || !m.b) return false;
  const key = t.rounds[r].key;
  const a = t.entries[m.a];
  const b = t.entries[m.b];
  if (key === "F") return true;
  if (key === "SF" && t.tier !== "atp250") return true;
  if (key === "QF" && (t.tier === "slam" || t.tier === "finals")) return true;
  if (a.rank <= 10 && b.rank <= 10) return true;
  if (m.winner) {
    const w = m.winner === m.a ? a : b;
    const l = m.winner === m.a ? b : a;
    if (l.rank <= 5 && w.rank >= 25) return true;
  }
  return false;
}

// Everything the writers need about one match. A and B are the current player objects.
function matchFacts(state, t, r, i) {
  const m = t.rounds[r].matches[i];
  const event = state.calendar[t.slot];
  const key = t.rounds[r].key;
  const P = [state.players.find((p) => p.id === m.a), state.players.find((p) => p.id === m.b)];
  const E = [t.entries[m.a], t.entries[m.b]];
  const N = E.map((e) => shortName(e.name));
  const h = m.pre ? m.pre.h : h2hFor(state.h2h, m.a, m.b);
  const sk = m.pre ? m.pre.sk : P.map((p) => (p ? p.streak : 0));
  const en = m.en || P.map((p) => (p ? Math.round(p.energy) : 100));
  const bo = TIERS[t.tier].bestOf;
  const nextMatch = r + 1 < t.rounds.length ? t.rounds[r + 1].matches[i >> 1] : null;
  const rec = state.h2h[pairKey(m.a, m.b)];
  const raw = rec && rec[5] ? (m.winner ? rec[5].slice(0, -1) : rec[5]) : "";
  const seq = raw.split("").map((c) => {
    const first = c === "0" || c === "a" ? 0 : 1;
    return { w: m.a < m.b ? first : 1 - first, dec: c === "a" || c === "b" };
  });
  const C = P.map((p) => (p ? careerStats(p) : blankSeason()));
  // the road here: matches, sets dropped and minutes on court in the earlier rounds
  const road = [m.a, m.b].map((id) => {
    const z = { wins: 0, dropped: 0, mins: 0 };
    t.rounds.slice(0, r).forEach((rd) =>
      rd.matches.forEach((x) => {
        if (x.winner !== id) return;
        z.wins++;
        z.mins += x.mins;
        z.dropped += x.sets.filter((s) => (x.a === id ? s.a < s.b : s.b < s.a)).length;
      })
    );
    return z;
  });
  const mk = P[0] && P[1] ? matchMarkets(state, t, r, i) : null;
  return { m, t, event, key, P, E, N, h, sk, en, bo, nextMatch, seq, C, r, i, road, mk, pick: hashOf(`${m.a}${m.b}${t.slot}${t.year}${r}`) };
}

function previewHeadline(f) {
  const { N, E, h, key, event } = f;
  const meetings = h[0] + h[1];
  const stake = key === "F" ? `the ${event.name} title` : STAKE[key];
  const fav = E[0].rank <= E[1].rank ? 0 : 1;
  if (key === "F") return meetings >= 6 ? `Chapter ${meetings + 1}: ${N[0]} and ${N[1]} play for the ${event.name} title` : `${N[0]} and ${N[1]} meet for the ${event.name} title`;
  if (meetings >= 6) return `${N[0]} and ${N[1]} renew their rivalry with ${stake} at stake`;
  if (E[0].rank <= 5 && E[1].rank <= 5) return `${N[0]} against ${N[1]}: the ${ROUND_LABEL[key].toLowerCase().replace(/s$/, "")} the draw promised`;
  if (Math.abs(E[0].rank - E[1].rank) >= 30) return `${N[1 - fav]} gets a shot at ${N[fav]} with ${stake} on the line`;
  return `${N[0]} and ${N[1]} play for ${stake}`;
}

function preview(f) {
  const { P, E, N, h, sk, en, key, event, t, bo, m } = f;
  if (!P[0] || !P[1]) return { headline: previewHeadline(f), text: [], sections: [], keys: null, chance: null };
  const surface = surfaceName(event).toLowerCase();
  const text = [];
  const tag = (i) => `${E[i].name} (No. ${E[i].rank}${E[i].seed ? `, seeded ${E[i].seed}` : E[i].tag === "Q" ? ", a qualifier" : E[i].tag === "WC" ? ", a wildcard" : ""})`;
  text.push(`${tag(0)} faces ${tag(1)} in the ${ROUND_LABEL[key].toLowerCase().replace(/s$/, "")} of ${at(event)}, on ${surface}, best of ${bo}.`);

  const meetings = h[0] + h[1];
  let line = meetings === 0 ? "This is their first meeting on record." : h[0] === h[1] ? `The head-to-head is level at ${h[0]}–${h[1]}.` : `${N[h[0] > h[1] ? 0 : 1]} leads the head-to-head ${Math.max(h[0], h[1])}–${Math.min(h[0], h[1])}.`;
  [0, 1].forEach((i) => {
    if (sk[i] >= 5) line += ` ${N[i]} has won ${sk[i]} matches in a row.`;
  });
  if (!m.winner) line += ` Season records: ${N[0]} ${P[0].stats.w}–${P[0].stats.l}, ${N[1]} ${P[1].stats.w}–${P[1].stats.l}.`;
  text.push(line);

  [0, 1].forEach((i) => {
    if (en[i] < 60) text.push(`${N[i]} comes in on ${en[i]}% energy after a heavy run of matches, which costs about ${tiredness(en[i]).toFixed(1)} points of match power.`);
  });

  const chance = winProbability(P[0], P[1], t, en);
  const fav = chance >= 0.5 ? 0 : 1;
  const share = Math.round(Math.max(chance, 1 - chance) * 100);
  text.push(share <= 55 ? `The model cannot split them: ${N[fav]} is a ${share}% favourite.` : `The model makes ${N[fav]} a ${share}% favourite.`);

  const order = (p) => ATTRS.filter((k) => k !== "sta" || bo === 5).sort((x, y) => p[y] - p[x]);
  const weakest = (p) => ATTRS.slice().sort((x, y) => p[x] - p[y])[0];
  const keys = [0, 1].map((i) => [STRENGTH[order(P[i])[0]], EXPLOIT[weakest(P[1 - i])]]);
  return { headline: tidy(previewHeadline(f)), text: text.map(tidy), sections: tendencies(f).map((s) => ({ ...s, text: tidy(s.text) })), keys, chance };
}

function report(f) {
  const { m, E, N, h, sk, en, key, event, t, bo, nextMatch, pick } = f;
  const w = m.winner === m.a ? 0 : 1;
  const l = 1 - w;
  const S = m.st;
  const sets = m.sets.map((x) => (w === 0 ? [x.a, x.b, x.tb] : [x.b, x.a, x.tb]));
  const lostSets = sets.filter((x) => x[0] < x[1]).length;
  const straight = lostSets === 0;
  const comeback = sets[0][0] < sets[0][1];
  const twoDown = bo === 5 && sets.length === 5 && comeback && sets[1][0] < sets[1][1];
  const decider = sets.length === bo;
  const tiebreaks = sets.filter((x) => x[2] != null).length;
  const gamesLost = sets.reduce((n, x) => n + x[1], 0);
  const rout = straight && gamesLost <= sets.length * 2 + 1;
  const marathon = m.mins >= (bo === 5 ? 225 : 160);
  const upset = E[w].rank - E[l].rank >= 15 && E[l].rank <= 20;
  const final = key === "F";
  const one = (list) => list[pick % list.length];

  let headline;
  if (final) headline = rout ? `${N[w]} storms to the ${event.name} title` : twoDown ? `${N[w]} comes from two sets down to win ${at(event)}` : decider || marathon ? `${N[w]} outlasts ${N[l]} in a ${bo === 5 ? "five" : "three"}-set final at ${at(event)}` : comeback ? `${N[w]} fights back to win ${at(event)}` : `${N[w]} beats ${N[l]} to win ${at(event)}`;
  else if (upset) headline = `${E[w].name} stuns ${N[l]} in the ${ROUND_LABEL[key].toLowerCase()}`;
  else if (twoDown) headline = `${N[w]} comes back from two sets down to beat ${N[l]}`;
  else if (marathon) headline = `${N[w]} survives ${N[l]} after ${clock(m.mins)}`;
  else if (comeback) headline = `${N[w]} rallies from a set down to beat ${N[l]}`;
  else if (rout) headline = `${N[w]} sweeps past ${N[l]} for the loss of ${word(gamesLost)} games`;
  else if (straight) headline = one([`${N[w]} sees off ${N[l]} in straight sets`, `${N[w]} too steady for ${N[l]}`, `${N[w]} handles ${N[l]} without dropping a set`]);
  else headline = one([`${N[w]} edges ${N[l]} to ${NEXT_STAGE[key]}`, `${N[w]} gets past ${N[l]} in ${word(sets.length)} sets`]);

  const text = [`${E[w].name} beat ${E[l].name} ${scoreLine(m)} in ${clock(m.mins)} to ${final ? `win ${at(event)}` : NEXT_STAGE[key]}.`];

  // the two most telling numbers
  const share = (x, y) => (y ? Math.round((100 * x) / y) : 0);
  const made = [S[l].bf - S[l].bs, S[w].bf - S[w].bs]; // breaks of serve by winner, by loser
  const fs = [share(S[w].fw, S[w].fi), share(S[l].fw, S[l].fi)];
  const net = [S[w].wn - S[w].ue, S[l].wn - S[l].ue];
  const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "level");
  const notes = [
    { weight: (made[0] - made[1]) * 1.2 + 1, say: `${N[w]} converted ${made[0]} of ${S[l].bf} break points and ${made[1] === 0 ? "was not broken" : `was broken ${made[1] === 1 ? "once" : made[1] === 2 ? "twice" : `${word(made[1])} times`}`}.` },
    { weight: (fs[0] - fs[1]) / 4, say: `${N[w]} won ${fs[0]}% of first-serve points to ${N[l]}'s ${fs[1]}%.` },
    { weight: (net[0] - net[1]) / 6, say: `${N[w]} finished ${sign(net[0])} on winners against unforced errors (${S[w].wn} to ${S[w].ue}); ${N[l]} was ${sign(net[1])}.` },
  ];
  const aceMan = S[w].ac >= S[l].ac ? w : l;
  if (S[aceMan].ac >= 12) notes.push({ weight: S[aceMan].ac / 5, say: `${N[aceMan]} served ${S[aceMan].ac} aces${aceMan === l ? " in defeat" : ""}.` });
  const gap = S[w].pt - S[l].pt;
  if (gap <= 6) notes.push({ weight: 4, say: gap < 0 ? `${N[l]} actually won more points, ${S[l].pt} to ${S[w].pt}, but not the ones that mattered.` : `Only ${word(Math.max(gap, 0))} points separated them: ${S[w].pt} to ${S[l].pt}.` });
  const numbers = notes
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 2)
    .map((n) => n.say)
    .join(" ");
  text.push(numbers);

  // how the match turned
  let turn = "";
  if (twoDown) turn = `${N[l]} led by two sets before ${N[w]} took the last three.`;
  else if (comeback) {
    const gamesAfter = sets.slice(1).reduce((n, x) => n + x[1], 0);
    turn = `${N[l]} took the opening set ${sets[0][1]}–${sets[0][0]}, but ${N[w]} ${gamesAfter <= (sets.length - 1) * 3 ? `lost only ${word(gamesAfter)} games from there` : "took control from there"}.`;
  }
  else if (decider) turn = `It went the distance, and ${N[w]} took the deciding set ${sets[sets.length - 1][0]}–${sets[sets.length - 1][1]}.`;
  if (tiebreaks) {
    const wonTb = sets.filter((x) => x[2] != null && x[0] > x[1]).length;
    turn += `${turn ? " " : ""}${tiebreaks === 1 ? "The one tiebreak" : `${word(tiebreaks).replace(/^./, (c) => c.toUpperCase())} tiebreaks`} went ${wonTb === tiebreaks ? `${N[w]}'s way` : wonTb === 0 ? `to ${N[l]}` : `${wonTb}–${tiebreaks - wonTb} to ${N[w]}`}.`;
  }
  if (turn) text.push(turn);

  // what it means
  const after = [h[w] + 1, h[l]];
  let meaning = "";
  if (after[0] + after[1] >= 2) meaning = after[0] === after[1] ? `The head-to-head is now level at ${after[0]}–${after[1]}.` : after[0] > after[1] ? `${N[w]} now leads the head-to-head ${after[0]}–${after[1]}.` : `${N[w]} cuts the head-to-head deficit to ${after[0]}–${after[1]}.`;
  if (upset) meaning += ` It is a genuine upset: ${N[w]} came in ranked No. ${E[w].rank}, ${N[l]} No. ${E[l].rank}.`;
  if (sk[w] + 1 >= 6) meaning += ` That is ${sk[w] + 1} wins in a row for ${N[w]}.`;
  if (sk[l] >= 8) meaning += ` ${N[l]}'s ${sk[l]}-match winning streak is over.`;
  if (en[l] < 50) meaning += ` ${N[l]} started the match on ${en[l]}% energy and faded.`;
  if (nextMatch) {
    const other = nextMatch.a === m.winner ? nextMatch.b : nextMatch.a;
    if (other) meaning += ` Next for ${N[w]}: ${t.entries[other].name}.`;
  }
  if (meaning.trim()) text.push(meaning.trim());
  return { headline: tidy(headline), text: text.map(tidy), numbers: tidy(numbers), turn: tidy(turn), upset };
}


/* ────────────────────────────── Patterns ────────────────────────────── */
// Analysis is written from patterns rather than totals. Before a match: what each player's season,
// style and shared history say about how it should go. After it: what the point log shows actually happened.
// Each section is { label, text, bars? } where a bar is { label, a, b, pct? } for the two players.

const pctOf = (x, y) => (y ? Math.round((100 * x) / y) : 0);
const capital = (s) => s.replace(/^./, (c) => c.toUpperCase());
const SURFACE_WORD = { hard: "hard courts", clay: "clay", grass: "grass" };

function tendencies(f) {
  const { P, N, E, t, key, sk, seq, C } = f;
  const out = [];
  const S = P.map((p) => p.stats);
  const games = (s) => s.w + s.l;
  const pair = (s, a, b) => `${s[a]}–${s[b]}`;

  // style: who wants the points short, who wants them long, and where the big serves go
  const g = P.map(grindIndex);
  const grinder = g[0] >= g[1] ? 0 : 1;
  const striker = 1 - grinder;
  const spots = P.map((p) => (teeRate(p) >= 0.5 ? "down the T" : "out wide"));
  let style =
    Math.abs(g[0] - g[1]) >= 3
      ? `Short points suit ${N[striker]} and long ones suit ${N[grinder]}. ${N[striker]} has the bigger first strike; ${N[grinder]} moves better and lasts longer. Watch the rally length: the more exchanges run past eight shots, the more this tilts to ${N[grinder]}.`
      : "Their games are built the same way, so this is less about style than execution: first-serve percentage, and who blinks first on break points.";
  style += spots[0] === spots[1] ? ` Both like to serve ${spots[0]} on the big points.` : ` On the big points expect ${N[0]} to serve ${spots[0]} and ${N[1]} ${spots[1]}.`;
  out.push({ label: "The pattern to watch", text: style });

  if (seq.length >= 2) {
    const last = seq[seq.length - 1].w;
    let run = 0;
    for (let i = seq.length - 1; i >= 0 && seq[i].w === last; i--) run++;
    const deciders = seq.filter((x) => x.dec).length;
    const split = [seq.filter((x) => x.w === 0).length, seq.filter((x) => x.w === 1).length];
    let text = run >= 2 ? `${N[last]} has won the last ${word(run)} meetings.` : `They keep trading wins: the last ${word(seq.length)} meetings are split ${split[0]}–${split[1]}.`;
    if (seq.length >= 3 && deciders >= 2) text += ` ${capital(word(deciders))} of the last ${word(seq.length)} went to a deciding set.`;
    else if (seq.length >= 3 && deciders === 0) text += ` None of the last ${word(seq.length)} needed a deciding set.`;
    out.push({ label: "Head-to-head pattern", text });
  }

  const form = P.map((p) => p.form || "");
  if (!f.m.winner && form[0].length >= 5 && form[1].length >= 5) {
    const wins = form.map((s) => s.split("W").length - 1);
    let text = `${N[0]} has won ${word(wins[0])} of the last ${word(form[0].length)} matches, ${N[1]} ${word(wins[1])} of ${word(form[1].length)}.`;
    [0, 1].forEach((i) => {
      const lost = form[i].length - form[i].replace(/L+$/, "").length;
      if (sk[i] >= 4) text += ` ${N[i]} arrives on a ${sk[i]}-match winning run.`;
      else if (lost >= 3) text += ` ${N[i]} has lost the last ${word(lost)}.`;
    });
    out.push({ label: "Form", text, bars: form[0].length === form[1].length ? [{ label: `Wins in the last ${word(form[0].length)}`, a: wins[0], b: wins[1] }] : null });
  }

  // season against career: who is playing above the usual level and who below it
  const drift = [0, 1]
    .map((i) => {
      if (games(S[i]) < 8 || games(C[i]) < games(S[i]) + 15) return null;
      const gaps = [
        { what: "win rate", now: pctOf(S[i].w, games(S[i])), norm: pctOf(C[i].w, games(C[i])), scale: 0.5 },
        { what: "share of service games held", now: pctOf(S[i].hd, S[i].sg), norm: pctOf(C[i].hd, C[i].sg), scale: 1 },
        { what: "share of return games won", now: pctOf(S[i].br, S[i].rg), norm: pctOf(C[i].br, C[i].rg), scale: 1 },
        { what: "first-serve points won", now: pctOf(S[i].fw, S[i].fi), norm: pctOf(C[i].fw, C[i].fi), scale: 1.2 },
      ].sort((x, y) => Math.abs(y.now - y.norm) * y.scale - Math.abs(x.now - x.norm) * x.scale)[0];
      return Math.abs(gaps.now - gaps.norm) * gaps.scale >= 4 ? { i, ...gaps } : null;
    })
    .filter(Boolean);
  if (drift.length)
    out.push({
      label: "Season against career",
      text: drift.map((d) => `${N[d.i]} is ${d.now > d.norm ? "playing above the career level" : "below the usual standard"}: ${d.what} is ${d.now}% this season against ${d.norm}% over the career.`).join(" "),
      bars: [{ label: "Win rate, this season", a: pctOf(S[0].w, games(S[0])), b: pctOf(S[1].w, games(S[1])), pct: true }, { label: "Win rate, career", a: pctOf(C[0].w, games(C[0])), b: pctOf(C[1].w, games(C[1])), pct: true }],
    });

  // the surface, this season and over the career
  const L = t.surface[0];
  const surf = (s) => [s[`${L}W`], s[`${L}L`]];
  const ss = S.map(surf);
  const cs = C.map(surf);
  const count = (r) => r[0] + r[1];
  if (count(cs[0]) >= 6 && count(cs[1]) >= 6) {
    const rate = cs.map((r) => pctOf(r[0], count(r)));
    const now = (i) => (count(ss[i]) >= 3 ? `${ss[i][0]}–${ss[i][1]} this season and ` : "");
    let text = `On ${SURFACE_WORD[t.surface]} ${N[0]} is ${now(0)}${cs[0][0]}–${cs[0][1]} over the career; ${N[1]} is ${now(1)}${cs[1][0]}–${cs[1][1]}.`;
    text += Math.abs(rate[0] - rate[1]) >= 8 ? ` Over the long run the surface has suited ${N[rate[0] > rate[1] ? 0 : 1]} better.` : " Neither has a lasting edge on it.";
    [0, 1].forEach((i) => {
      if (count(ss[i]) < 6) return;
      const gap = pctOf(ss[i][0], count(ss[i])) - rate[i];
      if (Math.abs(gap) >= 12) text += ` This year ${N[i]} is ${gap > 0 ? "well above" : "well below"} that career mark on it.`;
    });
    const bars = [{ label: "Win rate on the surface, career", a: rate[0], b: rate[1], pct: true }];
    if (count(ss[0]) >= 3 && count(ss[1]) >= 3) bars.unshift({ label: "Win rate on the surface, this season", a: pctOf(ss[0][0], count(ss[0])), b: pctOf(ss[1][0], count(ss[1])), pct: true });
    out.push({ label: `On ${SURFACE_WORD[t.surface]}`, text, bars });
  }

  // serve against return, with the career number beside the season one
  if (C[0].sg >= 40 && C[1].sg >= 40) {
    const rates = (s) => ({ hold: pctOf(s.hd, s.sg), brk: pctOf(s.br, s.rg) });
    const cr = C.map(rates);
    const fresh = S[0].sg >= 20 && S[1].sg >= 20;
    const sr = fresh ? S.map(rates) : cr;
    const edge = sr[0].hold + sr[0].brk - sr[1].hold - sr[1].brk;
    let text = fresh
      ? `This season ${N[0]} has held ${sr[0].hold}% of service games (career ${cr[0].hold}%) while ${N[1]} has broken ${sr[1].brk}% of the time (career ${cr[1].brk}%). Turn it round and ${N[1]} holds ${sr[1].hold}% (career ${cr[1].hold}%) against ${N[0]}'s ${sr[0].brk}% on return (career ${cr[0].brk}%).`
      : `Over the career ${N[0]} has held ${cr[0].hold}% of service games and ${N[1]} has broken ${cr[1].brk}% of the time. Turn it round and ${N[1]} holds ${cr[1].hold}% against ${N[0]}'s ${cr[0].brk}% on return.`;
    text += Math.abs(edge) < 5 ? " Those numbers cancel out." : ` Added up, the service-game maths favours ${N[edge > 0 ? 0 : 1]}.`;
    if (sr[0].hold >= 88 && sr[1].hold >= 88) text += " With both holding this often, expect a tiebreak or a single break to settle sets.";
    else if (sr[0].brk >= 28 && sr[1].brk >= 28) text += " Both return well enough that breaks should come in bunches.";
    const bars = [{ label: "Service games won, career", a: cr[0].hold, b: cr[1].hold, pct: true }, { label: "Return games won, career", a: cr[0].brk, b: cr[1].brk, pct: true }];
    if (fresh) bars.unshift({ label: "Service games won, this season", a: sr[0].hold, b: sr[1].hold, pct: true }, { label: "Return games won, this season", a: sr[0].brk, b: sr[1].brk, pct: true });
    out.push({ label: "Serve against return", text, bars });
  }

  // tight moments: tiebreaks, deciding sets, and what happens after losing the first set
  const both = (a, b, n) => C[0][a] + C[0][b] >= n && C[1][a] + C[1][b] >= n;
  const withSeason = (i, a, b, n) => `${pair(C[i], a, b)}${S[i][a] + S[i][b] >= n ? ` (${pair(S[i], a, b)} this season)` : ""}`;
  const tight = [];
  if (both("tbW", "tbL", 6)) tight.push(`In tiebreaks ${N[0]} is ${withSeason(0, "tbW", "tbL", 3)} over the career and ${N[1]} ${withSeason(1, "tbW", "tbL", 3)}.`);
  if (both("dW", "dL", 5)) tight.push(`When a match goes the distance, ${N[0]} is ${withSeason(0, "dW", "dL", 2)} and ${N[1]} ${withSeason(1, "dW", "dL", 2)}.`);
  if (C[0].bN >= 6 && C[1].bN >= 6) tight.push(`After dropping the first set, ${N[0]} has come back to win ${pctOf(C[0].bW, C[0].bN)}% of the time over the career; ${N[1]} ${pctOf(C[1].bW, C[1].bN)}%.`);
  if (tight.length) out.push({ label: "When it gets tight", text: tight.join(" ") });

  const elite = [0, 1].filter((i) => E[1 - i].rank <= 10 && C[i].tW + C[i].tL >= 4);
  if (elite.length) out.push({ label: "Against the top 10", text: elite.map((i) => `${N[i]} is ${withSeason(i, "tW", "tL", 2)} against top-10 opponents over the career.`).join(" ") });
  if (key === "F" && both("fW", "fL", 2)) out.push({ label: "In finals", text: `${N[0]} is ${withSeason(0, "fW", "fL", 1)} in finals over the career; ${N[1]} is ${withSeason(1, "fW", "fL", 1)}.` });

  // the serve in numbers: this season when there is enough of it, the career otherwise
  const line = (i) => (games(S[i]) >= 6 ? S[i] : C[i]);
  const sv = [0, 1].map((i) => {
    const s = line(i);
    const n = Math.max(1, games(s));
    return { aces: s.ac / n, dfs: s.df / n, first: pctOf(s.fw, s.fi), bpWon: pctOf(s.bc, s.bo), bpSaved: pctOf(s.bs, s.bf), sweeps: pctOf(s.zW, Math.max(1, s.w)), mins: Math.round(s.mn / n) };
  });
  if (games(C[0]) >= 6 && games(C[1]) >= 6) {
    const better = sv[0].first === sv[1].first ? -1 : sv[0].first > sv[1].first ? 0 : 1;
    out.push({
      label: "Serving profile",
      text: `${N[0]} averages ${sv[0].aces.toFixed(1)} aces and ${sv[0].dfs.toFixed(1)} double faults a match, winning ${sv[0].first}% of first-serve points. ${N[1]} averages ${sv[1].aces.toFixed(1)} and ${sv[1].dfs.toFixed(1)}, winning ${sv[1].first}%.${better >= 0 && Math.abs(sv[0].first - sv[1].first) >= 4 ? ` The first serve is a clear edge for ${N[better]}.` : " There is little in it on first serve."}`,
      bars: [{ label: "Aces per match", a: Math.round(sv[0].aces * 10) / 10, b: Math.round(sv[1].aces * 10) / 10 }, { label: "First-serve points won", a: sv[0].first, b: sv[1].first, pct: true }],
    });
    out.push({
      label: "Big points",
      text: `${N[0]} converts ${sv[0].bpWon}% of break points and ${N[1]} saves ${sv[1].bpSaved}%. The other way it is ${sv[1].bpWon}% against ${sv[0].bpSaved}%. ${sv[0].bpWon - sv[1].bpSaved > sv[1].bpWon - sv[0].bpSaved + 6 ? `${N[0]} has the better of the break-point maths.` : sv[1].bpWon - sv[0].bpSaved > sv[0].bpWon - sv[1].bpSaved + 6 ? `${N[1]} has the better of the break-point maths.` : "Break points should be an even fight."}`,
      bars: [{ label: "Break points converted", a: sv[0].bpWon, b: sv[1].bpWon, pct: true }, { label: "Break points saved", a: sv[0].bpSaved, b: sv[1].bpSaved, pct: true }],
    });
    out.push({
      label: "How their matches go",
      text: `${N[0]}'s matches average ${clock(sv[0].mins)} and ${sv[0].sweeps}% of the wins come in straight sets. For ${N[1]} it is ${clock(sv[1].mins)} and ${sv[1].sweeps}%.${Math.abs(sv[0].mins - sv[1].mins) >= 15 ? ` ${N[sv[0].mins > sv[1].mins ? 0 : 1]} tends to be out there longer, which matters more as a tournament goes on.` : ""}`,
    });
  }

  // the road to this match: time on court this week
  const road = f.road;
  if (f.r > 0 && road[0].wins && road[1].wins) {
    const gap = Math.abs(road[0].mins - road[1].mins);
    const said = (z) => `${clock(z.mins)} on court in ${word(z.wins)} ${z.wins === 1 ? "match" : "matches"}, ${z.dropped === 0 ? "no sets dropped" : `${word(z.dropped)} ${z.dropped === 1 ? "set" : "sets"} dropped`}`;
    out.push({
      label: "The road here",
      text: `${N[0]}: ${said(road[0])}. ${N[1]}: ${said(road[1])}.${gap >= 60 ? ` That is ${clock(gap)} more in ${N[road[0].mins > road[1].mins ? 0 : 1]}'s legs.` : " Neither has had a markedly harder week."}`,
      bars: [{ label: "Minutes on court this week", a: road[0].mins, b: road[1].mins }, { label: "Energy coming in", a: f.en[0], b: f.en[1], pct: true }],
    });
  }

  // what the result is worth
  const tier = TIERS[t.tier];
  const after = key === "F" ? "W" : tier.rounds[tier.rounds.indexOf(key) + 1];
  if (!f.m.winner) {
    let stake = `The winner is guaranteed ${fmt(tier.points[after])} ranking points${key === "F" ? " and the title" : ""}; the loser leaves with ${fmt(tier.points[key])}.`;
    [0, 1].forEach((i) => {
      const last = P[i].rankingPoints[t.slot];
      if (!last || last.year !== t.year - 1 || !last.pts) return;
      stake += ` ${N[i]} has ${fmt(last.pts)} points from this event last year${tier.points[key] < last.pts ? `, so defeat here would be a net loss of ${fmt(last.pts - tier.points[key])}` : ", already matched"}.`;
    });
    out.push({ label: "What is at stake", text: stake });
  }

  // the market, and the single most likely scoreline
  if (f.mk) {
    const mk = f.mk;
    const fav = mk.p >= 0.5 ? 0 : 1;
    const model = Math.round(mk.model * 100);
    const implied = Math.round(Math.max(mk.p, 1 - mk.p) * 100);
    const modelFav = fav === 0 ? model : 100 - model;
    const gapPts = modelFav - implied;
    out.push({
      label: "The market",
      text: `The bookmakers make ${N[fav]} the ${american(mk.win[fav])} favourite, with ${N[1 - fav]} at ${american(mk.win[1 - fav])}. That prices ${N[fav]} at about ${implied}%. The model has ${N[fav]} at ${modelFav}%${Math.abs(gapPts) >= 4 ? `, ${Math.abs(gapPts)} points ${gapPts > 0 ? "more than the market, so the price on the favourite is generous" : `less than the market, so the value, if there is any, is on ${N[1 - fav]}`}` : ", so the two agree"}.`,
      bars: [{ label: "Chance of winning, market", a: Math.round(mk.p * 100), b: 100 - Math.round(mk.p * 100), pct: true }, { label: "Chance of winning, model", a: model, b: 100 - model, pct: true }],
    });
    const dist = scoreDist(mk.model, f.bo).slice().sort((x, y) => y.prob - x.prob);
    const top = dist[0];
    const side = top.a > top.b ? 0 : 1;
    const distance = scoreDist(mk.model, f.bo).filter((x) => x.a + x.b === f.bo).reduce((n, x) => n + x.prob, 0);
    out.push({ label: "The call", text: `${N[side]} in ${word(top.a + top.b)} sets. It is the single most likely scoreline at ${Math.round(top.prob * 100)}%, and there is a ${Math.round(distance * 100)}% chance the match goes the distance.` });
  }
  return out;
}

// What the point log shows. Rally length always leads; the three strongest other patterns follow.
function matchPatterns(log, f) {
  const { m, N } = f;
  const w = m.winner === m.a ? 0 : 1;
  const l = 1 - w;
  const pts = log.points;
  const rest = [];

  // rally length: who won the short points, who won the long ones
  const rl = [[0, 0], [0, 0], [0, 0]];
  pts.forEach((p) => {
    rl[p.n <= 4 ? 0 : p.n <= 8 ? 1 : 2][p.w]++;
  });
  const lead = (b) => (rl[b][0] === rl[b][1] ? w : rl[b][0] > rl[b][1] ? 0 : 1);
  const rate = (b, i) => pctOf(rl[b][i], rl[b][0] + rl[b][1]);
  const short = lead(0);
  const long = lead(2);
  const nShort = rl[0][0] + rl[0][1];
  const nLong = rl[2][0] + rl[2][1];
  let rally;
  if (nLong < 6) rally = `This was first-strike tennis: ${nShort} of the ${pts.length} points were over inside four shots, and ${N[short]} won ${rate(0, short)}% of them.`;
  else if (short === long) rally = `${N[short]} won the rally battle at every length: ${rate(0, short)}% of the points that ended inside four shots and ${rate(2, short)}% of those that went nine or more.`;
  else rally = `The match split by rally length. ${N[short]} won ${rate(0, short)}% of the points that ended inside four shots; ${N[long]} won ${rate(2, long)}% of the exchanges that went nine shots or longer.${nShort > nLong * 2 ? ` There were ${nShort} short points to ${nLong} long ones, which tells you whose terms it was played on.` : ""}`;
  const first = { label: "Rally length", text: rally, bars: [{ label: "Points won, 0–4 shots", a: rl[0][0], b: rl[0][1] }, { label: "Points won, 5–8 shots", a: rl[1][0], b: rl[1][1] }, { label: "Points won, 9+ shots", a: rl[2][0], b: rl[2][1] }] };

  // serve placement: favourite target, what it earned, and where the serve went on break points
  const serve = [0, 1].map((i) => {
    const z = { T: [0, 0], wide: [0, 0], bpT: 0, bpWide: 0 };
    pts.forEach((p) => {
      if (p.s !== i || !p.f || !z[p.spot]) return;
      z[p.spot][0]++;
      if (p.w === i) z[p.spot][1]++;
      if (p.bp) z[p.spot === "T" ? "bpT" : "bpWide"]++;
    });
    return z;
  });
  const gapOf = (z) => (z.T[0] >= 6 && z.wide[0] >= 6 ? Math.abs(pctOf(z.T[1], z.T[0]) - pctOf(z.wide[1], z.wide[0])) : 0);
  const sv = gapOf(serve[0]) >= gapOf(serve[1]) ? 0 : 1;
  if (gapOf(serve[sv]) >= 8) {
    const z = serve[sv];
    const fav = z.T[0] >= z.wide[0] ? "T" : "wide";
    const other = fav === "T" ? "wide" : "T";
    const say = { T: "down the T", wide: "out wide" };
    let text = `${N[sv]} sent ${pctOf(z[fav][0], z.T[0] + z.wide[0])}% of first serves ${say[fav]} and won ${pctOf(z[fav][1], z[fav][0])}% of those points, against ${pctOf(z[other][1], z[other][0])}% ${say[other]}.`;
    [l, w].forEach((i) => {
      const y = serve[i];
      const n = y.bpT + y.bpWide;
      const top = Math.max(y.bpT, y.bpWide);
      if (n >= 3 && top / n >= 0.66) text += ` Facing break point, ${N[i]} went ${y.bpT >= y.bpWide ? "down the T" : "out wide"} on ${word(top)} of ${word(n)} first serves.`;
    });
    rest.push({ label: "Serve patterns", text, weight: gapOf(serve[sv]) * 1.5 + 10, bars: [{ label: "First-serve points won down the T", a: pctOf(serve[0].T[1], serve[0].T[0]), b: pctOf(serve[1].T[1], serve[1].T[0]), pct: true }, { label: "First-serve points won out wide", a: pctOf(serve[0].wide[1], serve[0].wide[0]), b: pctOf(serve[1].wide[1], serve[1].wide[0]), pct: true }] });
  }

  // shot-making: which wing produced the winners, which one leaked the errors
  const wing = [0, 1].map(() => ({ fh: 0, bh: 0, net: 0, ufh: 0, ubh: 0 }));
  pts.forEach((p) => {
    if (p.k === "W" && wing[p.w][p.fin] != null) wing[p.w][p.fin]++;
    else if (p.k === "U") wing[1 - p.w][p.fin === "fh" ? "ufh" : "ubh"]++;
  });
  const shots = [];
  let shotWeight = 0;
  const ground = wing[w].fh + wing[w].bh;
  if (ground >= 8) {
    const top = wing[w].fh >= wing[w].bh ? "fh" : "bh";
    const part = pctOf(wing[w][top], ground);
    shots.push(part >= 60 ? `${N[w]} did the damage off the ${STROKE[top]}: ${wing[w][top]} of ${ground} groundstroke winners.` : `${N[w]}'s winners came off both wings: ${wing[w].fh} forehand, ${wing[w].bh} backhand.`);
    shotWeight = Math.max(shotWeight, part - 40);
  }
  const errs = wing[l].ufh + wing[l].ubh;
  if (errs >= 8) {
    const top = wing[l].ufh >= wing[l].ubh ? "ufh" : "ubh";
    const part = pctOf(wing[l][top], errs);
    if (part >= 60) {
      shots.push(`${N[l]}'s ${top === "ufh" ? "forehand" : "backhand"} was the leak, giving up ${wing[l][top]} of ${errs} unforced errors.`);
      shotWeight = Math.max(shotWeight, part - 35);
    }
  }
  [w, l].forEach((i) => {
    if (wing[i].net >= 5) shots.push(`${N[i]} finished ${word(wing[i].net)} points at the net.`);
  });
  if (shots.length) rest.push({ label: "Shot patterns", text: shots.join(" "), weight: shotWeight + 12, bars: [{ label: "Forehand winners", a: wing[0].fh, b: wing[1].fh }, { label: "Backhand winners", a: wing[0].bh, b: wing[1].bh }] });

  // momentum: the longest run of games, and of points
  let best = { len: 0, who: 0, start: 0 };
  let cur = { len: 0, who: -1, start: 0 };
  log.games.forEach((g, i) => {
    cur = g.w === cur.who ? { ...cur, len: cur.len + 1 } : { who: g.w, len: 1, start: i };
    if (cur.len > best.len) best = cur;
  });
  let run = { len: 0, who: 0 };
  let now = { len: 0, who: -1 };
  pts.forEach((p) => {
    now = p.w === now.who ? { who: now.who, len: now.len + 1 } : { who: p.w, len: 1 };
    if (now.len > run.len) run = now;
  });
  if (best.len >= 4) {
    const g0 = log.games[best.start];
    const prev = best.start > 0 && log.games[best.start - 1].set === g0.set ? log.games[best.start - 1].g : [0, 0];
    let text = `${N[best.who]} won ${word(best.len)} games in a row from ${prev[best.who]}–${prev[1 - best.who]} in the ${ORDINAL[g0.set - 1]} set${best.who === w ? ", the stretch that decided it." : `, and ${N[w]} still found a way back.`}`;
    if (run.len >= 8) text += ` ${N[run.who]} also took ${word(run.len)} points in succession at one stage.`;
    rest.push({ label: "Momentum", text, weight: best.len * 8 + (best.who === w ? 6 : 12) });
  }

  // pressure: break points, the first break of each set, and the points from 4–4 onward
  const bp = [0, 1].map((i) => {
    const z = { n: 0, saved: 0, first: 0 };
    pts.forEach((p) => {
      if (!p.bp || p.s !== i) return;
      z.n++;
      if (p.w === i) z.saved++;
      if (p.f) z.first++;
    });
    return z;
  });
  const bySet = {};
  log.games.forEach((g) => {
    (bySet[g.set] = bySet[g.set] || []).push(g);
  });
  let broken = 0;
  let firstBreakWon = 0;
  Object.keys(bySet).forEach((k) => {
    const games = bySet[k];
    const fb = games.find((g) => g.brk);
    if (!fb) return;
    broken++;
    const end = games[games.length - 1].g;
    if (fb.w === (end[0] > end[1] ? 0 : 1)) firstBreakWon++;
  });
  const late = [0, 0];
  pts.forEach((p) => {
    if (p.late) late[p.w]++;
  });
  let pressure = `${N[w]} faced ${word(bp[w].n)} break ${bp[w].n === 1 ? "point" : "points"} and saved ${word(bp[w].saved)}${bp[w].n >= 3 ? `, finding a first serve on ${word(bp[w].first)} of them` : ""}; ${N[l]} saved ${word(bp[l].saved)} of ${word(bp[l].n)}.`;
  if (broken >= 2) pressure += ` Whoever broke first took ${firstBreakWon === broken ? "every set" : `${word(firstBreakWon)} of the ${word(broken)} sets that had a break`}.`;
  const lateAll = late[0] + late[1];
  const closer = late[0] >= late[1] ? 0 : 1;
  if (lateAll >= 10) pressure += ` From 4–4 onward and in tiebreaks, ${N[closer]} won ${late[closer]} of the ${lateAll} points.`;
  rest.push({ label: "Under pressure", text: pressure, weight: 30 + (lateAll >= 10 ? Math.abs(late[0] - late[1]) * 2 : 0), bars: [{ label: "Break points saved", a: pctOf(bp[0].saved, bp[0].n), b: pctOf(bp[1].saved, bp[1].n), pct: true }].concat(lateAll >= 10 ? [{ label: "Points won from 4–4 onward", a: late[0], b: late[1] }] : []) });

  // second serve: where the breaks came from
  const second = [0, 1].map((i) => {
    let n = 0;
    let lost = 0;
    pts.forEach((p) => {
      if (p.s !== i || p.f) return;
      n++;
      if (p.w !== i) lost++;
    });
    return { n, lost };
  });
  const attack = pctOf(second[l].lost, second[l].n);
  const defend = pctOf(second[w].lost, second[w].n);
  if (second[l].n >= 8 && second[w].n >= 8 && attack - defend >= 10)
    rest.push({ label: "Second serve", text: `${N[w]} won ${attack}% of the points on ${N[l]}'s second serve (${second[l].lost} of ${second[l].n}) and gave up only ${defend}% the other way. That gap is where the breaks came from.`, weight: (attack - defend) * 2, bars: [{ label: "Points won returning second serves", a: w === 0 ? attack : defend, b: w === 0 ? defend : attack, pct: true }] });

  // a first serve that faded or arrived late
  const firstIn = (i, set) => {
    let n = 0;
    let inside = 0;
    pts.forEach((p) => {
      if (p.s !== i || p.set !== set) return;
      n++;
      if (p.f) inside++;
    });
    return n >= 10 ? pctOf(inside, n) : null;
  };
  if (m.sets.length > 1) {
    const drift = [l, w].map((i) => ({ i, from: firstIn(i, 1), to: firstIn(i, m.sets.length) })).filter((d) => d.from != null && d.to != null && Math.abs(d.from - d.to) >= 15)[0];
    if (drift) rest.push({ label: "Serve trend", text: `${N[drift.i]}'s first serve ${drift.to < drift.from ? "faded" : "arrived late"}: ${drift.from}% in during the opening set, ${drift.to}% in the last.`, weight: Math.abs(drift.from - drift.to) * 1.4 });
  }

  // against the norm: the serving day set beside the season and the career
  const S = f.P.map((p) => (p ? p.stats : blankSeason()));
  const serving = (s, second) => [pctOf(s.fi, s.sp), pctOf(s.fw, s.fi), pctOf(second, s.sp - s.fi)];
  const SAY = [(x) => `landed ${x}% of first serves`, (x) => `won ${x}% of first-serve points`, (x) => `won ${x}% of second-serve points`];
  const norms = [w, l]
    .map((i) => {
      if (f.C[i].sp < 400) return null;
      const today = serving(m.st[i], m.st[i].sw);
      const season = serving(S[i], S[i].s2);
      const career = serving(f.C[i], f.C[i].s2);
      const k = [0, 1, 2].sort((x, y) => Math.abs(today[y] - career[y]) - Math.abs(today[x] - career[x]))[0];
      const gap = today[k] - career[k];
      return Math.abs(gap) >= 8 ? { i, gap, text: `${N[i]} ${SAY[k](today[k])}, ${gap > 0 ? "well up on" : "well down on"} ${season[k]}% this season and ${career[k]}% over the career.` } : null;
    })
    .filter(Boolean);
  if (norms.length)
    rest.push({
      label: "Against the norm",
      text: norms.map((x) => x.text).join(" "),
      weight: Math.max(...norms.map((x) => Math.abs(x.gap))) * 1.8,
      bars: [{ label: "First-serve points won, this match", a: pctOf(m.st[0].fw, m.st[0].fi), b: pctOf(m.st[1].fw, m.st[1].fi), pct: true }, { label: "First-serve points won, career", a: pctOf(f.C[0].fw, f.C[0].fi), b: pctOf(f.C[1].fw, f.C[1].fi), pct: true }],
    });

  return [first].concat(rest.sort((x, y) => y.weight - x.weight).slice(0, 3)).map((s) => ({ ...s, text: tidy(s.text) }));
}


/* ────────────────────────────── After the match: the long read ────────────────────────────── */
// On top of the patterns: the match set by set, the moment it turned, a grade for each part of each
// player's game, what the market made of it, and what it leaves both players with.

const letter = (value, marks) => (value >= marks[0] ? "A" : value >= marks[1] ? "B" : value >= marks[2] ? "C" : value >= marks[3] ? "D" : "F");
const GRADE_POINTS = { A: 4, B: 3, C: 2, D: 1, F: 0 };

function matchExtras(log, f) {
  const { m, N, P, E, t, key, en, nextMatch } = f;
  const w = m.winner === m.a ? 0 : 1;
  const l = 1 - w;
  const pts = log.points;
  const out = [];

  // set by set
  const lines = m.sets.map((s, k) => {
    const games = log.games.filter((g) => g.set === k + 1);
    const took = s.a > s.b ? 0 : 1;
    const breaks = [0, 1].map((i) => games.filter((g) => g.brk && g.w === i).length);
    const inSet = pts.filter((p) => p.set === k + 1);
    const loserServes = inSet.filter((p) => p.s === 1 - took);
    const firstIn = pctOf(loserServes.filter((p) => p.f).length, loserServes.length);
    const won = [0, 1].map((i) => inSet.filter((p) => p.w === i).length);
    let how;
    if (s.tb != null) how = breaks[0] + breaks[1] === 0 ? "no breaks of serve, settled in the tiebreak" : `${word(breaks[0] + breaks[1])} breaks traded, then the tiebreak`;
    else if (breaks[1 - took] === 0) how = breaks[took] === 1 ? `one break was enough, in game ${games.find((g) => g.brk).no}` : `${word(breaks[took])} breaks and none conceded`;
    else how = `${word(breaks[took])} breaks to ${word(breaks[1 - took])}`;
    return `${capital(ORDINAL[k])} set, ${N[took]} ${Math.max(s.a, s.b)}–${Math.min(s.a, s.b)}${s.tb != null ? ` (${s.tb})` : ""}: ${how}. Points ${won[took]}–${won[1 - took]}${firstIn < 52 ? `; ${N[1 - took]} landed only ${firstIn}% of first serves` : ""}.`;
  });
  out.push({ label: "Set by set", lines });

  // the turning point: the break in the last set that was never given back, or the tiebreak that settled it
  const lastSet = m.sets.length;
  const finalGames = log.games.filter((g) => g.set === lastSet);
  const decisive = finalGames.filter((g) => g.brk && g.w === w).pop();
  if (decisive) {
    const idx = finalGames.indexOf(decisive);
    const prev = idx > 0 ? finalGames[idx - 1].g : [0, 0];
    const chances = pts.slice(decisive.from, decisive.to + 1).filter((p) => p.bp).length;
    const gotBack = finalGames.slice(idx + 1).some((g) => g.brk && g.w === l);
    out.push({
      label: "The turning point",
      text: `${prev[w]}–${prev[l]} in the ${ORDINAL[lastSet - 1]} set. ${N[w]} broke on the ${nth(chances)} break point of the game${chances >= 3 ? `, after ${N[l]} had saved ${word(chances - 1)}` : ""}${gotBack ? `. ${N[l]} got one break back but never the second` : ` and ${N[l]} never got it back`}. ${m.sets.length > (f.bo + 1) / 2 ? `After ${clock(m.mins)} it came down to that one game.` : `${N[w]} was in front from there to the finish.`}`,
    });
  } else if (finalGames.length && finalGames[finalGames.length - 1].tb) {
    out.push({ label: "The turning point", text: `There was no break in the ${ORDINAL[lastSet - 1]} set, so it came down to the tiebreak. ${finalGames[finalGames.length - 1].text} A handful of points decided ${clock(m.mins)} of tennis.` });
  }

  // grades: each part of each player's game, marked on the day
  const S = m.st;
  const serveWon = [0, 1].map((i) => pctOf(S[i].fw + S[i].sw, S[i].sp));
  const returnWon = [0, 1].map((i) => 100 - serveWon[1 - i]);
  const clutch = [0, 1].map((i) => {
    const n = S[i].bf + S[1 - i].bf;
    return n >= 3 ? pctOf(S[i].bs + (S[1 - i].bf - S[1 - i].bs), n) : null;
  });
  const shots = [0, 1].map((i) => pctOf(S[i].wn, S[i].wn + S[i].ue));
  const grades = [0, 1].map((i) => ({
    Serve: letter(serveWon[i], [72, 67, 62, 57]),
    Return: letter(returnWon[i], [42, 38, 34, 30]),
    "Big points": clutch[i] == null ? "–" : letter(clutch[i], [65, 55, 45, 35]),
    "Shot-making": letter(shots[i], [62, 55, 48, 42]),
  }));
  const overall = grades.map((g) => {
    const marks = Object.values(g).filter((x) => x !== "–");
    const avg = marks.reduce((n, x) => n + GRADE_POINTS[x], 0) / marks.length;
    return avg >= 3.5 ? "A" : avg >= 2.6 ? "B" : avg >= 1.8 ? "C" : avg >= 1 ? "D" : "F";
  });
  const areas = Object.keys(grades[0]);
  const weakest = areas.slice().sort((x, y) => (GRADE_POINTS[grades[l][x]] === undefined ? 9 : GRADE_POINTS[grades[l][x]]) - (GRADE_POINTS[grades[l][y]] === undefined ? 9 : GRADE_POINTS[grades[l][y]]))[0];
  const best = areas.slice().sort((x, y) => (GRADE_POINTS[grades[w][y]] || 0) - (GRADE_POINTS[grades[w][x]] || 0))[0];
  const detail = { Serve: (i) => `${serveWon[i]}% of service points won`, Return: (i) => `${returnWon[i]}% of return points won`, "Big points": (i) => `${clutch[i]}% of the break points won`, "Shot-making": (i) => `${S[i].wn} winners to ${S[i].ue} unforced errors` };
  out.push({
    label: "Match grades",
    text: `${N[w]} earns ${/^[AF]/.test(overall[w]) ? "an" : "a"} ${overall[w]} overall, built on ${best.toLowerCase()}: ${detail[best](w)}. ${N[l]} gets ${/^[AF]/.test(overall[l]) ? "an" : "a"} ${overall[l]}, and ${weakest.toLowerCase()} is where it was lost: ${detail[weakest](l)}.`,
    rows: areas.map((a) => [grades[0][a], a, grades[1][a]]).concat([[overall[0], "Overall", overall[1]]]),
  });

  // what the market made of it
  if (f.mk) {
    const mk = f.mk;
    const fav = mk.p >= 0.5 ? 0 : 1;
    const paid = mk.win[w];
    const sa = m.sets.filter((s) => s.a > s.b).length;
    const score = mk.scores.find((x) => x.key === `${sa}-${m.sets.length - sa}`);
    out.push({
      label: "The market",
      text: `${N[w]} went off at ${american(paid)}${w === fav ? `, the favourite, and obliged: a $100 stake returned ${usd(paid * 100)}` : `, the outsider, against ${N[l]} at ${american(mk.win[l])}. A $100 stake on the upset returned ${usd(paid * 100)}`}.${score ? ` The exact set score, ${Math.max(sa, m.sets.length - sa)}–${Math.min(sa, m.sets.length - sa)}, was priced at ${american(score.odds)}.` : ""} The model had ${N[w]} at ${Math.round((w === 0 ? mk.model : 1 - mk.model) * 100)}% before a ball was hit.`,
    });
  }

  // what it leaves them with
  const tier = TIERS[t.tier];
  const after = key === "F" ? "W" : tier.rounds[tier.rounds.indexOf(key) + 1];
  const left = P[w] ? Math.max(0, Math.round(en[w] - matchCost(P[w], m.mins))) : null;
  let means = key === "F" ? `${N[w]} takes ${fmt(tier.points.W)} ranking points and the title; ${N[l]} leaves with ${fmt(tier.points.F)}.` : `${N[w]} is now guaranteed ${fmt(tier.points[after])} ranking points and ${N[l]} leaves with ${fmt(tier.points[key])}.`;
  if (left != null && key !== "F") means += ` ${N[w]} walked off with about ${left}% energy${left < 50 ? ", which is a concern with more tennis to come" : ""}.`;
  if (nextMatch) {
    const other = nextMatch.a === m.winner ? nextMatch.b : nextMatch.a;
    if (other) means += ` ${t.entries[other].name}, ranked No. ${t.entries[other].rank}, is next.`;
  }
  out.push({ label: "What it means", text: means });
  return out.map((s) => (s.text ? { ...s, text: tidy(s.text) } : { ...s, lines: s.lines.map(tidy) }));
}

/* ────────────────────────────── Articles ────────────────────────────── */
// Every story is a full article written from the state of the tour at that moment:
//   { id, y, w, city, k (kind), h (headline), dek, body [paragraphs], facts [[label, value]], ids [players], road? }
// Nothing here quotes anyone: the pieces are built from results, numbers and context.

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
const nth = (n) => ORDINALS[n] || `${n}th`;
const article = (stamp, k, h, dek, body, facts, ids, extra) => ({ id: `${stamp.y}-${stamp.w}-${k}-${hashOf(h) % 99991}`, ...stamp, k, h: tidy(h), dek: tidy(dek), body: body.filter(Boolean).map(tidy), facts: facts || [], ids: ids || [], ...(extra || {}) });
const wonThisYear = (p, year) => EVENTS.filter((e, i) => p.rankingPoints[i] && p.rankingPoints[i].year === year && p.rankingPoints[i].round === "W").map((e) => e.id);
const REACHED = { W: "the title", F: "the final", SF: "the semifinals", QF: "the quarterfinals", R16: "the round of 16", R32: "the round of 32", R64: "the round of 64", R128: "the first round" };
const titlesPhrase = (n) => (n === 0 ? "no titles yet" : `${word(n)} ${n === 1 ? "title" : "titles"}`);
const setsLost = (m, id) => m.sets.filter((s) => (m.a === id ? s.a < s.b : s.b < s.a)).length;

function previewArticles(state, t, event) {
  const stamp = { y: t.year, w: event.week, city: event.city };
  const byId = indexById(state.players);
  const tier = TIERS[t.tier];
  const big = !OPTIONAL[t.tier];
  const seeds = Object.values(t.entries)
    .filter((e) => e.seed)
    .sort((a, b) => a.seed - b.seed);
  const [top, second] = seeds;
  const holder = state.players.find((p) => {
    const e = p.rankingPoints[event.slot];
    return e && e.round === "W" && e.year === t.year - 1;
  });
  const missing = t.out.filter((o) => o.rank <= 10 && o.why !== "cut");
  const star = t.out.find((o) => o.rank <= 2 && o.why !== "cut");
  const ranked = rankBy(state.players, totalPoints);
  const h = h2hFor(state.h2h, top.id, second.id);
  const meetings = h[0] + h[1];
  const [a, b] = [shortName(top.name), shortName(second.name)];

  let headline;
  if (t.tier === "finals") headline = `The eight best of ${t.year} gather in Turin`;
  else if (star && big) headline = `${shortName(star.name)}'s absence opens up ${at(event)}`;
  else if (top.rank === 1 && second.rank === 2 && big) headline = meetings >= 6 ? `${a} and ${b} on a collision course in ${event.city}` : `${a} and ${b} lead the field in ${event.city}`;
  else if (holder && t.entries[holder.id]) headline = `${shortName(holder.name)} returns to defend in ${event.city}`;
  else if (!big && missing.length >= 6) headline = `With the stars resting, ${event.city} is ${a}'s to lose`;
  else headline = `${a} headlines the field in ${event.city}`;

  const body = [];
  body.push(`${top.name} is the top seed at ${at(event)}, ${t.tier === "finals" ? "the season-ending championship for the top eight in the Race" : `a ${tier.label} on ${surfaceName(event).toLowerCase()}`}. ${second.name} is seeded second${seeds[3] ? `, with ${seeds[2].name} and ${seeds[3].name} next in line` : ""}.`);
  if (holder) {
    const pts = holder.rankingPoints[event.slot].pts;
    body.push(t.entries[holder.id] ? `${holder.name} won here last year and has ${fmt(pts)} points to defend. Anything short of the title costs ranking points.` : `Last year's champion, ${holder.name}, is not in the field, so ${fmt(pts)} points come off the ranking without a ball being hit.`);
  }
  if (missing.length) {
    const reason = (o) => (o.why === "fatigue" ? `short of energy at ${Math.round(byId[o.id].energy)}%` : o.why === "schedule" ? "keeping the schedule light" : "choosing to rest");
    body.push(
      missing.length > 3
        ? `${capital(word(missing.length))} of the top 10 have skipped the week${event.beforeSlam ? ", with a Grand Slam starting in seven days" : ""}. ${listNames(missing.slice(0, 3).map((o) => o.name))} are among those sitting out.`
        : `Missing from the top 10: ${listNames(missing.map((o) => `${o.name}, ${reason(o)}`))}.`
    );
  }
  const inForm = seeds
    .map((e) => byId[e.id])
    .filter((p) => p.streak >= 5)
    .sort((x, y) => y.streak - x.streak)[0];
  const cold = seeds
    .slice(0, 8)
    .map((e) => byId[e.id])
    .find((p) => (p.form || "").endsWith("LLL"));
  if (inForm || cold) body.push(`${inForm ? `The form player is ${inForm.name}, unbeaten in ${inForm.streak} matches.` : ""}${inForm && cold ? " " : ""}${cold ? `${cold.name} arrives having lost the last three.` : ""}`);
  if (meetings >= 4 && t.tier !== "finals") body.push(`If the seedings hold, ${a} and ${b} would meet in the final for the ${nth(meetings + 1)} time. ${h[0] === h[1] ? `The head-to-head is level at ${h[0]}–${h[1]}` : `${h[0] > h[1] ? a : b} leads ${Math.max(h[0], h[1])}–${Math.min(h[0], h[1])}`}.`);
  const gap = totalPoints(ranked[0]) - totalPoints(ranked[1]);
  if (big && gap <= tier.points.W && t.entries[ranked[0].id] && t.entries[ranked[1].id]) body.push(`The No. 1 ranking is in play. ${ranked[1].name} trails ${ranked[0].name} by ${fmt(gap)} points, with ${fmt(tier.points.W)} on offer to the champion.`);

  const items = [
    article(stamp, "preview", headline, `The draw, the absentees and what is at stake at ${at(event)}.`, body, [
      ["Level", tier.label],
      ["Surface", surfaceName(event)],
      ["Draw", `${tier.draw} players`],
      ["Champion's points", fmt(tier.points.W)],
      ["Top seed", top.name],
      ["Defending", holder ? holder.name : "–"],
    ], seeds.slice(0, 4).map((e) => e.id)),
  ];

  // a top-five name missing from a Slam or Masters is a story of its own
  t.out
    .filter((o) => o.rank <= 5 && big && o.why !== "cut")
    .forEach((o) => {
      const p = byId[o.id];
      const last = p.rankingPoints[event.slot];
      const heir = seeds.find((e) => e.rank > o.rank);
      items.unshift(
        article(stamp, "withdraw", `${o.name} pulls out of ${at(event)}`, o.why === "fatigue" ? `The world No. ${o.rank} is on ${Math.round(p.energy)}% energy and will rest instead.` : `The world No. ${o.rank} is skipping the event to manage the schedule.`, [
          o.why === "fatigue" ? `${o.name} will not play ${at(event)}. After a ${p.stats.w}–${p.stats.l} season so far the tank is at ${Math.round(p.energy)}%, low enough that playing would cost roughly ${tiredness(p.energy).toFixed(1)} points of match power.` : `${o.name} will not play ${at(event)}. At ${p.age}, the plan is fewer events and more recovery between the ones that matter most.`,
          last && last.pts > 0 ? `It is not a free week: ${shortName(o.name)} had ${fmt(last.pts)} points from this event last year, and they now come off the ranking.` : `There is no ranking cost: ${shortName(o.name)} had no points to defend here.`,
          heir ? `The draw shifts as a result. ${heir.name} moves up the seedings, and the quarter that would have belonged to ${shortName(o.name)} is open.` : "",
        ], [["Ranking", `No. ${o.rank}`], ["Energy", `${Math.round(p.energy)}%`], [`${t.year} record`, `${p.stats.w}–${p.stats.l}`]], [o.id])
      );
    });
  return items;
}

function resultArticles(state, t, event, players, before, after, h2h) {
  const stamp = { y: t.year, w: event.week, city: event.city };
  const year = t.year;
  const tier = TIERS[t.tier];
  const byId = indexById(players);
  const was = indexById(state.players);
  const world = { ...state, players, h2h };
  const last = t.rounds.length - 1;
  const final = t.rounds[last].matches[0];
  const champ = byId[t.championId];
  const ru = byId[t.runnerUpId];
  const short = shortName(champ.name);
  const h = honours(champ);
  const haul = seasonTitles(champ, year);
  const won = wonThisYear(champ, year);
  const ranked = rankBy(players, totalPoints);
  const race = rankMap(rankBy(players, (p) => racePoints(p, year)));
  const items = [];

  // ── the champion ──
  const road = [];
  let dropped = 0;
  let hardest = null;
  t.rounds.forEach((rd) =>
    rd.matches.forEach((m) => {
      if (m.winner !== champ.id) return;
      const opp = t.entries[m.a === champ.id ? m.b : m.a];
      road.push([ROUND_LABEL[rd.key].replace(/s$/, ""), `${opp.name}${opp.seed ? ` (${opp.seed})` : ""}`, scoreLine(m)]);
      dropped += setsLost(m, champ.id);
      if (rd.key !== "F" && (!hardest || m.mins > hardest.m.mins)) hardest = { m, opp, key: rd.key };
    })
  );
  const prev = was[champ.id] && was[champ.id].rankingPoints[t.slot];
  const defended = !!prev && prev.round === "W" && prev.year === year - 1;
  const slamsNow = won.filter((id) => EVENTS.find((e) => e.id === id).tier === "slam").length;
  let headline;
  if (t.tier === "slam" && h.slam === 1) headline = `${champ.name} wins a first Grand Slam title at ${at(event)}`;
  else if (t.tier === "slam" && slamsNow >= 3) headline = `${short} makes it ${word(slamsNow)} Slams in ${year} at ${at(event)}`;
  else if (event.id === "wim" && won.includes("rg")) headline = `${short} completes the Roland Garros and Wimbledon double`;
  else if (t.tier === "slam") headline = `${short} wins ${at(event)} for Grand Slam No. ${h.slam}`;
  else if (t.tier === "finals") headline = `${short} ends ${year} as ATP Finals champion`;
  else if (event.id === "mia" && won.includes("iw")) headline = `${short} completes the Sunshine Double in Miami`;
  else if (event.id === "rom" && won.includes("mc") && won.includes("mad")) headline = `${short} sweeps the clay Masters with victory in Rome`;
  else if (defended) headline = `${short} defends the ${event.name} title`;
  else if (champ.id.startsWith("ng-") && titleCount(champ.titles) === 1) headline = `${champ.name}, ${champ.age}, lifts a first tour title in ${event.city}`;
  else if (champ.streak >= 15) headline = `${short} stretches the winning run to ${champ.streak} with the ${event.name} title`;
  else if (t.entries[champ.id].rank >= 50) headline = `${champ.name}, ranked No. ${t.entries[champ.id].rank}, wins ${at(event)}`;
  else if (champ.country && champ.country === event.country) headline = `Home favourite ${short} wins ${at(event)}`;
  else {
    const many = [`${short} makes it ${word(haul)} titles in ${year} at ${at(event)}`, `Title No. ${haul} of ${year} for ${short} in ${event.city}`, `${short} adds ${at(event)} to a growing ${year} haul`];
    const one = [`${short} takes the ${event.name} title`, `${short} lifts the trophy in ${event.city}`, `${event.city} belongs to ${short}`];
    headline = (haul > 1 ? many : one)[hashOf(champ.id + event.id + year) % 3];
  }

  const finalFacts = matchFacts(world, t, last, 0);
  const rep = report(finalFacts);
  const said = [0, 1].map((side) => interview(world, finalFacts, side).qa[0]);
  const champSide = final.winner === final.a ? 0 : 1;
  const gapTop = ranked.length > 1 ? (after[champ.id] === 1 ? totalPoints(champ) - totalPoints(ranked[1]) : totalPoints(ranked[0]) - totalPoints(champ)) : 0;
  const nextEvent = state.calendar[t.slot + 1];
  const body = [
    `${champ.name} is the ${event.name} champion. The ${champ.age}-year-old beat ${ru.name} ${scoreLine(final)} in ${clock(final.mins)} in ${event.city}${haul > 1 ? `, a ${nth(haul)} title of the season` : ""}.`,
    `${rep.numbers}${rep.turn ? ` ${rep.turn}` : ""}`,
    said[champSide] && said[1 - champSide] ? `“${said[champSide].a}” ${short} said afterwards. ${shortName(ru.name)}, asked the same question from the other side: “${said[1 - champSide].a}”` : "",
    `The road to the title took ${word(road.length)} matches and cost ${dropped === 0 ? "no sets at all" : dropped === 1 ? "a single set" : `${word(dropped)} sets`}.${hardest ? ` The longest of them was the ${ROUND_LABEL[hardest.key].toLowerCase().replace(/s$/, "")} against ${hardest.opp.name}, which ran to ${clock(hardest.m.mins)}.` : ""}`,
    `${short} is now ${champ.stats.w}–${champ.stats.l} for the season${champ.stats.fW + champ.stats.fL >= 2 ? ` and ${champ.stats.fW}–${champ.stats.fL} in finals` : ""}.${champ.streak >= 8 ? ` The winning run stands at ${champ.streak} matches.` : ""}${h2hLine(h2h, champ, ru)}`,
    `In the rankings ${short} ${after[champ.id] < before[champ.id] ? `climbs from No. ${before[champ.id]} to No. ${after[champ.id]}` : `stays at No. ${after[champ.id]}`} and ${after[champ.id] === 1 ? `leads ${ranked[1].name} by ${fmt(gapTop)} points` : `sits ${fmt(gapTop)} points behind ${ranked[0].name}`}. In the Race to Turin ${short} is ${nth(race[champ.id])}.`,
    `${ru.name} leaves with ${fmt(tier.points.F)} points${ru.stats.fW + ru.stats.fL >= 2 ? ` and a ${ru.stats.fW}–${ru.stats.fL} record in finals this year` : ""}.${nextEvent ? ` Next on the calendar is ${at(nextEvent)}; ${short} is on ${Math.round(champ.energy)}% energy${champ.energy < 55 && OPTIONAL[nextEvent.tier] ? " and may well sit it out" : ""}.` : ""}`,
  ];
  items.push(
    article(stamp, "title", headline, `A ${scoreLine(final)} win over ${ru.name} in the final${dropped === 0 ? ", without dropping a set all week" : ""}.`, body, [
      ["Final", scoreLine(final)],
      ["Time", clock(final.mins)],
      ["Sets dropped", dropped],
      [`${year} titles`, haul],
      [`${year} record`, `${champ.stats.w}–${champ.stats.l}`],
      ["Ranking", `No. ${after[champ.id]}`],
    ], [champ.id, ru.id], { road })
  );

  // ── the upset of the week ──
  let shock = null;
  t.rounds.slice(0, -1).forEach((rd, r) =>
    rd.matches.forEach((m, i) => {
      const w = t.entries[m.winner];
      const l = t.entries[m.winner === m.a ? m.b : m.a];
      if (l.seed && l.seed <= 4 && w.rank - l.rank >= 20 && (!shock || l.seed < shock.l.seed)) shock = { w, l, key: rd.key, m, r, i };
    })
  );
  if (shock) {
    const { w, l, m } = shock;
    const shockFacts = matchFacts(world, t, shock.r, shock.i);
    const r2 = report(shockFacts);
    const li = m.winner === m.a ? 1 : 0;
    const heard = [interview(world, shockFacts, 1 - li).qa[0], interview(world, shockFacts, li).qa[0]];
    const round = ROUND_LABEL[shock.key].toLowerCase().replace(/s$/, "");
    const seedName = l.seed === 1 ? "top seed" : `No. ${l.seed} seed`;
    const reached = t.awards[w.id].round;
    const lostPts = was[l.id] && was[l.id].rankingPoints[t.slot] ? was[l.id].rankingPoints[t.slot].pts - t.awards[l.id].pts : 0;
    const heads = [`${w.name} stuns ${seedName} ${shortName(l.name)} at ${at(event)}`, `${shortName(l.name)} out: ${w.name} springs the upset of the week in ${event.city}`, `No. ${w.rank} ${shortName(w.name)} takes out ${shortName(l.name)} in ${event.city}`];
    items.push(
      article(stamp, "upset", heads[hashOf(w.id + l.id) % heads.length], `The ${seedName} is beaten ${scoreLine(m)} in the ${round}.`, [
        `${w.name}, ranked No. ${w.rank}${w.tag === "Q" ? " and through qualifying" : w.tag === "WC" ? " and in the draw on a wildcard" : ""}, beat ${l.name} ${scoreLine(m)} in the ${round} of ${at(event)}. It took ${clock(m.mins)}.`,
        `${r2.numbers}${r2.turn ? ` ${r2.turn}` : ""}`,
        heard[0] && heard[1] ? `“${heard[0].a}” ${shortName(w.name)} said. ${shortName(l.name)} was short in reply: “${heard[1].a}”` : "",
        `${m.en[li] < 60 ? `${shortName(l.name)} went in on ${m.en[li]}% energy, and it showed. ` : ""}${m.pre && m.pre.sk[li] >= 5 ? `A ${m.pre.sk[li]}-match winning run ends here. ` : ""}${lostPts > 0 ? `The early exit costs ${shortName(l.name)} ${fmt(lostPts)} ranking points against last year's result.` : ""}`,
        reached === "W" ? `${shortName(w.name)} did not stop there, going on to win the title.` : `${shortName(w.name)}'s run ended in ${REACHED[reached]}.`,
      ], [["Score", scoreLine(m)], ["Time", clock(m.mins)], ["Rankings", `No. ${w.rank} beat No. ${l.rank}`], ["Round", ROUND_LABEL[shock.key].replace(/s$/, "")]], [w.id, l.id])
    );
  }

  // ── a new world No. 1 ──
  const topBefore = players.find((p) => before[p.id] === 1);
  const topAfter = ranked[0];
  if (topBefore && topBefore.id !== topAfter.id) {
    const lead = totalPoints(topAfter) - totalPoints(ranked[1]);
    items.push(
      article(stamp, "no1", `${topAfter.name} takes over as world No. 1`, `${shortName(topBefore.name)} is overtaken after ${at(event)}.`, [
        `There is a new name at the top of the rankings. ${topAfter.name} moves past ${topBefore.name} after ${at(event)} and leads by ${fmt(lead)} points.`,
        `${shortName(topAfter.name)} has now spent ${honours(topAfter).weeks} weeks at No. 1 in total and is ${topAfter.stats.w}–${topAfter.stats.l} this season with ${titlesPhrase(seasonTitles(topAfter, year))}.`,
        nextEvent ? `It may not last. At ${at(nextEvent)}, ${shortName(topAfter.name)} has ${fmt((topAfter.rankingPoints[nextEvent.slot] || { pts: 0 }).pts)} points coming off and ${shortName(topBefore.name)} ${fmt((topBefore.rankingPoints[nextEvent.slot] || { pts: 0 }).pts)}.` : "",
      ], [["Lead", `${fmt(lead)} pts`], ["Weeks at No. 1", honours(topAfter).weeks], ["Previous No. 1", topBefore.name]], [topAfter.id, topBefore.id])
    );
  }

  // ── rankings: the big movers after a Slam or a Masters ──
  if (t.tier === "slam" || t.tier === "masters") {
    const movers = players
      .filter((p) => after[p.id] <= 60 && before[p.id] - after[p.id] >= 8)
      .sort((x, y) => before[y.id] - after[y.id] - (before[x.id] - after[x.id]))
      .slice(0, 3);
    const faller = players.filter((p) => before[p.id] <= 30 && after[p.id] - before[p.id] >= 6).sort((x, y) => after[y.id] - before[y.id] - (after[x.id] - before[x.id]))[0];
    if (movers.length) {
      const line = (p) => {
        const round = (t.awards[p.id] || {}).round;
        return `${p.name} is up ${word(before[p.id] - after[p.id])} places to No. ${after[p.id]}${round ? ` after ${round === "W" ? "winning the title" : `reaching ${REACHED[round]}`}` : ""}.`;
      };
      items.push(
        article(stamp, "movers", `${shortName(movers[0].name)} jumps ${before[movers[0].id] - after[movers[0].id]} places to No. ${after[movers[0].id]}`, `The biggest moves in the rankings after ${at(event)}.`, [
          `${at(event).replace(/^t/, "T")} has redrawn the rankings. ${line(movers[0])}`,
          movers.slice(1).map(line).join(" "),
          faller ? `Going the other way, ${faller.name} falls from No. ${before[faller.id]} to No. ${after[faller.id]} with last year's points gone.` : "",
          `At the top, ${ranked[0].name} leads ${ranked[1].name} by ${fmt(totalPoints(ranked[0]) - totalPoints(ranked[1]))} points.`,
        ], movers.map((p) => [shortName(p.name), `No. ${before[p.id]} → No. ${after[p.id]}`]), movers.map((p) => p.id))
      );
    }
  }

  // ── arrivals in the top 10, and young players in the top 20 ──
  players.forEach((p) => {
    const best = was[p.id] ? was[p.id].bestRank : null;
    const line = t.awards[p.id];
    const into10 = after[p.id] <= 10 && before[p.id] > 10 && best != null && best > 10;
    const into20 = !into10 && p.age <= 21 && after[p.id] <= 20 && before[p.id] > 20 && best != null && best > 20;
    if (!into10 && !into20) return;
    items.push(
      article(stamp, "rise", into10 ? `${p.name} moves into the top 10` : `${p.name}, ${p.age}, cracks the top 20`, `Up to No. ${after[p.id]} after ${at(event)}, a new high in this save.`, [
        `${p.name} is the world No. ${after[p.id]}, the highest ranking of the ${p.age}-year-old's career in this save.${line ? ` It comes after ${line.round === "W" ? "winning" : `a run to ${REACHED[line.round]} at`} ${at(event)}.` : ""}`,
        `The season so far: ${p.stats.w}–${p.stats.l}, with ${titlesPhrase(seasonTitles(p, year))} and ${fmt(totalPoints(p))} ranking points. ${p.potential - p.ovr >= 5 ? `Rated ${p.ovr} with a potential of ${p.potential}, there is more to come.` : `Rated ${p.ovr}, this is a player close to the ceiling and making it count.`}`,
      ], [["Ranking", `No. ${after[p.id]}`], ["Age", p.age], ["Overall", p.ovr], [`${year} record`, `${p.stats.w}–${p.stats.l}`]], [p.id])
    );
  });

  // ── a leading player who cannot buy a win ──
  Object.values(t.entries).forEach((e) => {
    const p = byId[e.id];
    const lost = (p.form || "").length - (p.form || "").replace(/L+$/, "").length;
    if (e.rank > 20 || lost < 4 || (was[e.id].form || "").endsWith("LLLL")) return;
    items.push(
      article(stamp, "slump", `${p.name}'s losing run reaches ${word(lost)}`, `The world No. ${after[p.id]} is beaten again at ${at(event)}.`, [
        `${p.name} has now lost ${word(lost)} matches in a row after going out in ${REACHED[t.awards[p.id].round]} at ${at(event)}.`,
        `The season record stands at ${p.stats.w}–${p.stats.l}. ${p.energy < 60 ? `Energy is part of it, at ${Math.round(p.energy)}%.` : "Energy is not the issue: the tank is close to full."} ${after[p.id] > before[p.id] ? `The ranking has slipped to No. ${after[p.id]}.` : `The ranking holds at No. ${after[p.id]} for now.`}`,
      ], [["Losing run", lost], ["Ranking", `No. ${after[p.id]}`], [`${year} record`, `${p.stats.w}–${p.stats.l}`]], [p.id])
    );
  });

  // ── the Race is settled after Paris ──
  if (state.calendar[t.slot + 1] && state.calendar[t.slot + 1].tier === "finals") {
    const order = rankBy(players, (p) => racePoints(p, year));
    const eight = order.slice(0, 8);
    const ninth = order[8];
    items.push(
      article(stamp, "race", "The eight for Turin are set", `${eight[0].name} leads the Race; ${ninth.name} misses out.`, [
        `The field for the ATP Finals is complete. ${listNames(eight.map((p) => p.name))} have qualified.`,
        `${eight[0].name} tops the Race with ${fmt(racePoints(eight[0], year))} points. The last place went to ${eight[7].name}, ${fmt(racePoints(eight[7], year) - racePoints(ninth, year))} points clear of ${ninth.name}.`,
      ], eight.map((p, i) => [`${i + 1}. ${shortName(p.name)}`, fmt(racePoints(p, year))]), eight.map((p) => p.id))
    );
  }

  // ── records ──
  const where = `${event.name} ${year}`;
  [
    ["aces", (r) => `${r.name} fires a record ${r.v} aces`, (r) => `${r.v} aces in one match`],
    ["mph", (r) => `${r.name} clocks a record ${r.v} mph serve`, (r) => `${r.v} mph`],
    ["mins", (r) => `Record marathon: ${r.name} in ${clock(r.v)}`, (r) => clock(r.v)],
  ].forEach(([key, say, value]) => {
    const rec = state.records.match[key];
    if (rec && rec.note.endsWith(where) && year > START_YEAR) items.push(article(stamp, "record", say(rec), `A new mark for the record book, set at ${at(event)}.`, [`The record book has a new entry: ${value(rec)}, ${rec.note.startsWith("v ") ? `set ${rec.note}` : `in ${rec.name}, ${rec.note}`}.`, "It is the best mark since this save began in 2026."], [["Record", value(rec)]], []));
  });
  return items;
}

function offseasonArticles(state, year, ranked, ranks, retirements, arrivals, staying) {
  const stamp = { y: year + 1, w: 1, city: "Off-season" };
  const items = [];
  const no1 = ranked[0];
  const slams = state.calendar.filter((e) => e.tier === "slam" || e.tier === "finals");
  const mostTitles = ranked.slice().sort((x, y) => seasonTitles(y, year) - seasonTitles(x, year))[0];
  const newcomer = ranked.find((p) => p.rookie);
  const climber = ranked
    .filter((p) => p.career.length > 0 && ranks[p.id] <= 60)
    .sort((x, y) => y.career[y.career.length - 1].rank - ranks[y.id] - (x.career[x.career.length - 1].rank - ranks[x.id]))[0];
  const aces = ranked.slice().sort((x, y) => y.stats.ac - x.stats.ac)[0];
  items.push(
    article(stamp, "review", `${year} in review: ${shortName(no1.name)} finishes on top`, `The champions, the numbers and the players who defined the season.`, [
      `${no1.name} ends ${year} as the year-end No. 1 with ${fmt(totalPoints(no1))} points, a ${no1.stats.w}–${no1.stats.l} record and ${titlesPhrase(seasonTitles(no1, year))}.`,
      `The biggest prizes went to: ${slams.map((e) => `${e.name}, ${e.champion ? e.champion.name : "nobody"}`).join("; ")}.`,
      `${mostTitles.id === no1.id ? `Nobody won more often than ${shortName(no1.name)}.` : `${mostTitles.name} won the most titles, ${word(seasonTitles(mostTitles, year))}.`} ${aces.name} led the tour in aces with ${fmt(aces.stats.ac)}.`,
      `${climber && climber.career[climber.career.length - 1].rank - ranks[climber.id] >= 8 ? `Most improved: ${climber.name}, up from No. ${climber.career[climber.career.length - 1].rank} a year ago to No. ${ranks[climber.id]}. ` : ""}${newcomer ? `Newcomer of the year: ${newcomer.name}, who finishes a first season at No. ${ranks[newcomer.id]}.` : ""}`,
    ], ranked.slice(0, 6).map((p, i) => [`${i + 1}. ${shortName(p.name)}`, fmt(totalPoints(p))]), ranked.slice(0, 3).map((p) => p.id))
  );
  retirements
    .filter((r) => goatScore(honours(r)) > 0 || r.bestRank <= 10)
    .forEach((r) => {
      const h = honours(r);
      items.push(
        article(stamp, "retire", h.slam ? `${r.name} retires with ${h.slam} Grand Slam ${h.slam === 1 ? "title" : "titles"}` : `${r.name} calls time on a career that peaked at No. ${r.bestRank}`, `${shortName(r.name)} leaves the tour at ${r.age}.`, [
          `${r.name} has played a last match. The ${r.age}-year-old steps away ranked No. ${r.lastRank}, with a career high of No. ${r.bestRank}.`,
          `The honours: ${h.slam} Grand Slams, ${h.finals} ATP Finals, ${h.masters} Masters 1000 titles, ${h.weeks} weeks at No. 1 and ${h.ye} year-end No. 1 finishes. That adds up to a GOAT score of ${fmt(goatScore(h))}.`,
          `In this save ${shortName(r.name)} went ${r.record.w}–${r.record.l}.`,
        ], [["Slams", h.slam], ["Masters", h.masters], ["Weeks at No. 1", h.weeks], ["GOAT score", fmt(goatScore(h))]], [])
      );
    });
  const prospects = arrivals.slice().sort((x, y) => y.potential - x.potential);
  const star = prospects[0];
  items.push(
    article(stamp, "rookie", star.potential >= 95 ? `A generational prospect arrives: ${star.name}, ${star.age}` : `${star.name} leads the rookie class of ${year + 1}`, `${capital(word(arrivals.length))} newcomers join the tour.`, [
      `The class of ${year + 1} is ${word(arrivals.length)} strong. The name to know is ${star.name} of ${star.country}, ${star.age}, rated ${star.ovr} with a potential of ${star.potential}.`,
      prospects.length > 1 ? `Also arriving: ${listNames(prospects.slice(1, 4).map((p) => `${p.name} (${p.country}, ${p.ovr}, potential ${p.potential})`))}.` : "",
      "Rookies start with no ranking points, so the first job is getting through qualifying. Growth comes at each off-season until age 22.",
    ], prospects.slice(0, 4).map((p) => [shortName(p.name), `${p.ovr} / ${p.potential}`]), [star.id])
  );
  return items;
}

/* ────────────────────────────── Critical coverage ────────────────────────────── */
// Critiques go after the tennis and the scheduling, never the person: each one states the charge,
// shows the season and career numbers behind it, gives the case for the defence, and says what has to change.
// The same charge is not levelled at the same player twice within fourteen weeks, and a repeat says so in the headline.

const ROUND_DEPTH = { R128: 0, R64: 1, R32: 2, R16: 3, QF: 4, SF: 5, F: 6, W: 7 };
const expectedDepth = (seed) => (seed <= 2 ? 6 : seed <= 4 ? 5 : seed <= 8 ? 4 : seed <= 16 ? 3 : 2);
const CRIT_GAP = 14;

function critiqueArticles(state, t, event, players, before, after) {
  const stamp = { y: t.year, w: event.week, city: event.city };
  const year = t.year;
  const now = year * 40 + event.week;
  const log = { ...state.critLog };
  const was = indexById(state.players);
  const found = [];
  let again = false; // set while a repeat charge is being written
  const consider = (p, topic, severity, make) => {
    const k = `${p.id}:${topic}`;
    if (!log[k] || now - log[k] >= CRIT_GAP) found.push({ p, k, severity, make, repeat: !!log[k] });
  };
  const piece = (p, h, dek, body, facts) => article(stamp, "critique", again ? `Still unresolved: ${h}` : h, dek, body, facts, [p.id]);

  players.forEach((p) => {
    const award = t.awards[p.id];
    if (!award) return; // only players who were in this week's draw
    const rank = after[p.id];
    const hyped = p.rookie && p.potential >= 93;
    if (rank > 30 && !hyped) return;
    const s = p.stats;
    const c = careerStats(p);
    const n = s.w + s.l;
    const short = shortName(p.name);
    const entry = t.entries[p.id];
    const early = !!entry.seed && ROUND_DEPTH[award.round] <= expectedDepth(entry.seed) - 2;
    const exit = REACHED[award.round];
    const hold = [pctOf(s.hd, s.sg), pctOf(c.hd, c.sg)];
    const brk = [pctOf(s.br, s.rg), pctOf(c.br, c.rg)];
    const seasonLine = [`${year} record`, `${s.w}–${s.l}`];
    const rankLine = ["Ranking", `No. ${rank}`];

    if (award.round === "F" && s.fL >= 3 && s.fL >= s.fW + 2)
      consider(p, "finals", 6 + s.fL, () =>
        piece(p, `${p.name} falls short in another final`, `That is ${word(s.fL)} lost finals this season against ${word(s.fW)} won.`, [
          `${p.name} reached the final of ${at(event)} and lost it. It is becoming a habit: ${short} is ${s.fW}–${s.fL} in finals this season and ${c.fW}–${c.fL} over the career.`,
          `Getting there is not the problem. Through a tournament the numbers are those of a contender: a ${s.w}–${s.l} record and ${hold[0]}% of service games held. The last match is where the level drops.`,
          `In fairness, finals are played against the best. ${short} is ${s.tW}–${s.tL} against the top 10 this season, and a ranking of No. ${rank} belongs to a player doing most things right.`,
          "But titles are what get counted. Until one of these finals goes the other way, the question will keep being asked.",
        ], [["Finals, season", `${s.fW}–${s.fL}`], ["Finals, career", `${c.fW}–${c.fL}`], seasonLine, rankLine])
      );

    if (rank <= 12 && s.tW + s.tL >= 6 && s.tW / (s.tW + s.tL) <= 0.25)
      consider(p, "elite", 5 + s.tL, () =>
        piece(p, `${p.name} still cannot beat the best`, `${s.tW}–${s.tL} against the top 10 this season.`, [
          `${p.name} is ranked No. ${rank}, and the record against the players at the very top explains why it is not higher: ${s.tW}–${s.tL} against top-10 opponents this season.`,
          `Against everyone else ${short} is ${s.w - s.tW}–${s.l - s.tL}. The distance between those two records is the story of the season. Over the career the top-10 record is ${c.tW}–${c.tL}, so this is ${pctOf(s.tW, s.tW + s.tL) < pctOf(c.tW, c.tW + c.tL) - 8 ? "worse than usual" : "nothing new"}.`,
          `There is a case for the defence. ${short} keeps reaching the rounds where those opponents are waiting, which most of the tour cannot say.`,
          "The ranking will not move until those matches start going the other way.",
        ], [["v top 10, season", `${s.tW}–${s.tL}`], ["v top 10, career", `${c.tW}–${c.tL}`], seasonLine, rankLine])
      );

    const tb = s.tbW + s.tbL;
    const dec = s.dW + s.dL;
    if (rank <= 20 && ((tb >= 10 && s.tbW / tb <= 0.36) || (dec >= 6 && s.dW / dec <= 0.34)))
      consider(p, "tight", 5 + Math.max(s.tbL - s.tbW, s.dL - s.dW), () =>
        piece(p, `The tight moments keep getting away from ${p.name}`, `${s.tbW}–${s.tbL} in tiebreaks and ${s.dW}–${s.dL} in deciding sets this season.`, [
          `Close matches are being lost. ${p.name} is ${s.tbW}–${s.tbL} in tiebreaks this season and ${s.dW}–${s.dL} when a match goes the distance.`,
          `The career numbers are ${c.tbW}–${c.tbL} and ${c.dW}–${c.dL}, so ${pctOf(s.tbW + s.dW, tb + dec) < pctOf(c.tbW + c.dW, c.tbW + c.tbL + c.dW + c.dL) - 8 ? "this is a dip rather than a trait" : "this is a pattern, not a blip"}. A mental rating of ${p.men} ${p.men >= 88 ? "says it should not be happening" : "offers part of the explanation"}.`,
          `Tiebreaks are close to a coin toss for most players, and ${short} is still winning ${pctOf(s.w, n)}% of matches overall.`,
          `Still, a handful of points in those sets is the difference between No. ${rank} and several places higher.`,
        ], [["Tiebreaks, season", `${s.tbW}–${s.tbL}`], ["Deciding sets, season", `${s.dW}–${s.dL}`], ["Tiebreaks, career", `${c.tbW}–${c.tbL}`], rankLine])
      );

    if (rank <= 15 && p.energy <= 45 && early) {
      const optional = p.rankingPoints.filter((e, i) => IS_OTHER[i] && e && e.year === year && e.round !== "DNP" && e.round !== "DNQ").length;
      consider(p, "burnout", 7 + (45 - p.energy) / 5, () =>
        piece(p, `${p.name} is paying for a crowded schedule`, `Out in ${exit} at ${at(event)} on ${Math.round(p.energy)}% energy.`, [
          `${p.name} went out in ${exit} at ${at(event)}, seeded ${entry.seed}. The energy reading tells the story: ${Math.round(p.energy)}%.`,
          `${short} has already entered ${word(optional)} of the optional 500 and 250 events this season on top of the mandatory ones. Only the best six count toward the ranking, so every extra week buys little and costs legs.`,
          `The points have to come from somewhere, and ${short} has ${n} matches and a ${s.w}–${s.l} record to show for the workload.`,
          `A player this tired gives up roughly ${tiredness(p.energy).toFixed(1)} points of match power. The fix is a week off, and it is in ${short}'s own hands.`,
        ], [["Energy", `${Math.round(p.energy)}%`], ["Optional events", optional], ["Matches", n], rankLine])
      );
    }

    if (rank <= 25 && s.sg >= 60 && c.sg >= s.sg + 80 && hold[0] <= hold[1] - 5)
      consider(p, "serve", 4 + (hold[1] - hold[0]), () =>
        piece(p, `${p.name}'s serve is not the weapon it was`, `Holding ${hold[0]}% this season against ${hold[1]}% over the career.`, [
          `${p.name} has held serve in ${hold[0]}% of service games this season. The career figure is ${hold[1]}%. Over a season that gap is dozens of extra breaks.`,
          `The detail does not help: ${pctOf(s.fw, s.fi)}% of first-serve points won against a career ${pctOf(c.fw, c.fi)}%, and ${pctOf(s.bs, s.bf)}% of break points saved against ${pctOf(c.bs, c.bf)}%.`,
          brk[0] >= brk[1] ? `The return game has held up, with ${brk[0]}% of return games won against a career ${brk[1]}%, which is why the ranking has not collapsed.` : `The return game has slipped as well, to ${brk[0]}% of return games won from a career ${brk[1]}%, so there is nowhere to hide.`,
          `At No. ${rank}, ${short} cannot keep giving service games away at this rate and expect to stay there.`,
        ], [["Hold, season", `${hold[0]}%`], ["Hold, career", `${hold[1]}%`], ["1st serve won, season", `${pctOf(s.fw, s.fi)}%`], rankLine])
      );

    if (t.tier === "slam" && entry.seed && entry.seed <= 8 && ROUND_DEPTH[award.round] <= 2) {
      let lostTo = null;
      t.rounds.forEach((rd) =>
        rd.matches.forEach((m) => {
          if ((m.a === p.id || m.b === p.id) && m.winner !== p.id) lostTo = m;
        })
      );
      const opp = t.entries[lostTo.winner];
      const mine = lostTo.st[lostTo.a === p.id ? 0 : 1];
      const flops = EVENTS.filter((e, i) => e.tier === "slam" && p.rankingPoints[i] && p.rankingPoints[i].year === year && ROUND_DEPTH[p.rankingPoints[i].round] <= 2).length;
      const prev = was[p.id] ? was[p.id].rankingPoints[t.slot] : null;
      const cost = prev ? prev.pts - award.pts : 0;
      consider(p, "slam", 9 - entry.seed / 2 + flops, () =>
        piece(p, `${p.name} flops at ${at(event)}`, `The ${entry.seed === 1 ? "top seed" : `No. ${entry.seed} seed`} is out in ${exit}.`, [
          `${p.name} came to ${at(event)} seeded ${entry.seed} and is gone in ${exit}. For a player ranked No. ${before[p.id]} going in, that is a failure by any standard.`,
          `The defeat came against ${opp.name}, ranked No. ${opp.rank}, by ${scoreLine(lostTo)}. ${short} was broken ${word(mine.bf - mine.bs)} ${mine.bf - mine.bs === 1 ? "time" : "times"} and made ${mine.ue} unforced errors against ${mine.wn} winners.`,
          flops >= 2 ? `It is not a one-off. That is ${word(flops)} Slams this season that have ended inside the first week.` : `One bad fortnight does not undo a ${s.w}–${s.l} season, and ${short} started the match on ${lostTo.en[lostTo.a === p.id ? 0 : 1]}% energy.`,
          cost > 0 ? `It is expensive too: ${fmt(cost)} ranking points gone against last year's result here.` : "The Slams are where reputations are settled, and this one will be remembered for the wrong reason.",
        ], [["Seed", entry.seed], ["Lost in", capital(exit.replace(/^the /, ""))], ["Beaten by", `${shortName(opp.name)} (No. ${opp.rank})`], rankLine])
      );
    }

    if (p.openRank && p.openRank <= 20 && rank - p.openRank >= 10 && n >= 15)
      consider(p, "slide", 4 + (rank - p.openRank) / 2, () =>
        piece(p, `${p.name} is sliding: from No. ${p.openRank} to No. ${rank}`, `A ${s.w}–${s.l} season has cost ${rank - p.openRank} places.`, [
          `${p.name} started ${year} ranked No. ${p.openRank}. After ${at(event)} the number is ${rank}.`,
          `The season record is ${s.w}–${s.l}, a win rate of ${pctOf(s.w, n)}% against ${pctOf(c.w, c.w + c.l)}% over the career. ${short} is holding serve ${hold[0]}% of the time (career ${hold[1]}%) and breaking ${brk[0]}% (career ${brk[1]}%).`,
          p.age >= 31 ? `Age is part of the explanation at ${p.age}, with movement and stamina both on the way down.` : `There is no easy excuse: at ${p.age} this should be the best tennis of ${short}'s career.`,
          "Points from last year keep dropping off. Without results soon, the slide has further to run.",
        ], [["Start of season", `No. ${p.openRank}`], ["Now", `No. ${rank}`], seasonLine, ["Win rate, career", `${pctOf(c.w, c.w + c.l)}%`]])
      );

    if (hyped && n >= 10 && s.w / n <= 0.34)
      consider(p, "hype", 5 + (n - s.w * 3) / 4, () =>
        piece(p, `The hype has outrun the results for ${p.name}`, `${s.w}–${s.l} in a first season on tour.`, [
          `${p.name} arrived with a potential rating of ${p.potential} and a lot of noise. The first season reads ${s.w}–${s.l}.`,
          `The ranking is No. ${rank}. ${short} is holding serve ${hold[0]}% of the time and winning ${brk[0]}% of return games, numbers that belong to a qualifier rather than a prodigy.`,
          `The defence is simple: ${short} is ${p.age} and rated ${p.ovr} today. The growth comes at each off-season until 22, and the ceiling has not moved.`,
          "Judge the talent in three years. Judge the results now, and they are not there yet.",
        ], [["Potential", p.potential], ["Overall", p.ovr], seasonLine, rankLine])
      );

    if (p.age >= 34 && s.rg >= 60 && c.rg >= s.rg + 80 && brk[0] <= brk[1] - 5)
      consider(p, "age", 4 + (brk[1] - brk[0]), () =>
        piece(p, `Time is catching up with ${p.name}`, `At ${p.age}, the return game has fallen away.`, [
          `${p.name} is winning ${brk[0]}% of return games this season. Over the career the figure is ${brk[1]}%. At ${p.age}, the legs are no longer getting to the same balls.`,
          `Movement is rated ${p.mov} and stamina ${p.sta}, and both drop again every off-season. The serve is holding the game together: ${hold[0]}% of service games held.`,
          `${short} is still ranked No. ${rank} with a ${s.w}–${s.l} record, which most players half the age would take.`,
          "But the direction is one way. The question is how many more seasons the serve can cover for the rest.",
        ], [["Return games, season", `${brk[0]}%`], ["Return games, career", `${brk[1]}%`], ["Age", p.age], rankLine])
      );
  });

  // one critique after a 500 or 250, two after a Slam, a Masters or the Finals: the sharpest charges only
  const items = [];
  const used = new Set();
  const room = OPTIONAL[t.tier] ? 1 : 2;
  found
    .sort((x, y) => y.severity - x.severity)
    .forEach((x) => {
      if (items.length >= room || used.has(x.p.id)) return;
      used.add(x.p.id);
      log[x.k] = now;
      again = x.repeat;
      items.push(x.make());
    });

  // after every Slam, the top eight seeds are graded against what their seeding demanded
  if (t.tier === "slam") {
    const ORDER = ["A+", "A", "B", "C", "D", "F"];
    const rows = Object.values(t.entries)
      .filter((e) => e.seed && e.seed <= 8)
      .sort((a, b) => a.seed - b.seed)
      .map((e) => {
        const round = t.awards[e.id].round;
        const gap = ROUND_DEPTH[round] - expectedDepth(e.seed);
        return { e, round, grade: round === "W" ? "A+" : gap >= 1 ? "A" : gap === 0 ? "B" : gap === -1 ? "C" : gap === -2 ? "D" : "F" };
      });
    const ranked = rows.slice().sort((x, y) => ORDER.indexOf(x.grade) - ORDER.indexOf(y.grade) || x.e.seed - y.e.seed);
    const best = ranked[0];
    const worst = rows.slice().sort((x, y) => ORDER.indexOf(y.grade) - ORDER.indexOf(x.grade) || x.e.seed - y.e.seed)[0];
    const list = (grades, say) => {
      const group = rows.filter((r) => grades.includes(r.grade));
      return group.length ? group.map(say).join("; ") : "";
    };
    const top = list(["A+", "A"], (r) => `${r.e.name} (${r.grade}), ${r.round === "W" ? "the champion" : `who reached ${REACHED[r.round]} from seed ${r.e.seed}`}`);
    const par = list(["B"], (r) => `${r.e.name}, seed ${r.e.seed}, ${REACHED[r.round]}`);
    const short = list(["C"], (r) => `${r.e.name}, seed ${r.e.seed}, out in ${REACHED[r.round]}`);
    const fail = list(["D", "F"], (r) => `${r.e.name} (${r.grade}), seed ${r.e.seed}, out in ${REACHED[r.round]}`);
    const surprise = Object.values(t.entries)
      .filter((e) => e.rank > 20 && ROUND_DEPTH[t.awards[e.id].round] >= 4)
      .sort((a, b) => b.rank - a.rank)[0];
    const harsh = worst.grade === "D" || worst.grade === "F";
    items.push(
      article(stamp, "grades", harsh ? `${event.name} report card: top marks for ${shortName(best.e.name)}, ${shortName(worst.e.name)} must do better` : `${event.name} report card: the top seeds graded`, "The top eight seeds, marked against what their seeding demanded.", [
        `Grades for the top eight seeds at ${at(event)}. The standard is the seeding itself: a final for the top two, a semifinal for seeds three and four, a quarterfinal for the rest.`,
        top ? `Top of the class: ${top}.` : "Nobody beat their seeding this time.",
        par ? `On par, which means no more than the minimum: ${par}.` : "",
        short ? `A round short: ${short}.` : "",
        fail ? `Must do better: ${fail}. For players seeded this high, that is not good enough.` : "No seed in the top eight fell badly short, which is rare.",
        surprise ? `The surprise of the fortnight was ${surprise.name}, ranked No. ${surprise.rank}, who reached ${REACHED[t.awards[surprise.id].round]}.` : "",
      ], rows.map((r) => [`${r.e.seed}. ${shortName(r.e.name)}`, r.grade]), rows.map((r) => r.e.id))
    );
  }
  return { items, log };
}

/* ────────────────────────────── The running story ────────────────────────────── */
// Pieces filed while a tournament is still going: the line-up as each late round is set, a full preview
// of the final, winning streaks as they pass milestones and rivalries as they add chapters.

const h2hSentence = (h2h, A, B) => {
  const [x, y] = h2hFor(h2h, A.id, B.id);
  if (x + y === 0) return "They have not met on record.";
  return x === y ? `Their head-to-head is level at ${x}–${y}.` : `${shortName(x > y ? A.name : B.name)} leads their head-to-head ${Math.max(x, y)}–${Math.min(x, y)}.`;
};

function roundArticles(world, t, event, played) {
  const items = [];
  if (!played.length) return items;
  const stamp = { y: t.year, w: event.week, city: event.city };
  const byId = indexById(world.players);
  const big = !OPTIONAL[t.tier];
  const r = played[0].r;
  const last = t.rounds.length - 1;
  const next = t.rounds[r + 1];
  const complete = t.rounds[r].matches.every((m) => m.winner);

  if (complete && next) {
    const ties = next.matches.map((m) => [t.entries[m.a], t.entries[m.b]]);
    const alive = ties.flat();
    const line = ([a, b], i) => {
      const mk = matchMarkets(world, t, r + 1, i);
      const fav = mk.p >= 0.5 ? 0 : 1;
      return `${a.name} (No. ${a.rank}) plays ${b.name} (No. ${b.rank}). ${h2hSentence(world.h2h, a, b)} The market makes ${shortName([a, b][fav].name)} the ${american(mk.win[fav])} favourite.`;
    };
    if (next.key === "F") {
      const f = matchFacts(world, t, last, 0);
      const pv = preview(f);
      const part = (label) => {
        const s = pv.sections.find((x) => x.label === label);
        return s ? s.text : "";
      };
      items.push(
        article(stamp, "live", pv.headline, `${ties[0][0].name} against ${ties[0][1].name} for the ${event.name} title.`, [pv.text[0], pv.text[1], (() => {
          const feud = (world.feuds || {})[pairKey(ties[0][0].id, ties[0][1].id)];
          return feud && t.year * 40 + event.week - feud.w <= FEUD_WEEKS ? `There is needle here too. After ${feud.ev}, ${byId[feud.by] ? byId[feud.by].name : "one of them"} had some pointed words for the other, and neither has forgotten.` : "";
        })(), part("The pattern to watch"), part("The road here"), `${part("The market")} ${part("The call")}`], [
          ["Head-to-head", `${f.h[0]}–${f.h[1]}`],
          [shortName(ties[0][0].name), american(f.mk.win[0])],
          [shortName(ties[0][1].name), american(f.mk.win[1])],
          ["Rankings", `No. ${ties[0][0].rank} v No. ${ties[0][1].rank}`],
        ], [ties[0][0].id, ties[0][1].id])
      );
    } else if (next.key === "SF" && big) {
      const outsider = alive.slice().sort((x, y) => y.rank - x.rank)[0];
      const seeds = alive.filter((e) => e.seed && e.seed <= 4).length;
      items.push(
        article(stamp, "live", outsider.rank > 20 ? `${outsider.name}, ranked No. ${outsider.rank}, crashes the semifinals in ${event.city}` : `Semifinals set in ${event.city}: ${shortName(alive.slice().sort((x, y) => x.rank - y.rank)[0].name)} leads the last four`, `The final four at ${at(event)}.`, [
          `The semifinals at ${at(event)} are set, and ${seeds === 4 ? "all four top seeds are there" : seeds === 0 ? "none of the top four seeds made it" : `${word(seeds)} of the top four seeds ${seeds === 1 ? "is" : "are"} still standing`}.`,
          line(ties[0], 0),
          line(ties[1], 1),
          outsider.rank > 20 ? `The story of the week is ${outsider.name}. Ranked No. ${outsider.rank}${outsider.tag === "Q" ? " and through qualifying" : ""}, ${shortName(outsider.name)} was not supposed to be here.` : "",
        ], alive.map((e) => [shortName(e.name), `No. ${e.rank}`]), alive.map((e) => e.id))
      );
    } else if (next.key === "QF" && (t.tier === "slam" || t.tier === "masters")) {
      const seedsLeft = alive.filter((e) => e.seed && e.seed <= 8).length;
      const gone = Object.values(t.entries)
        .filter((e) => e.seed && e.seed <= 8 && !alive.some((a) => a.id === e.id))
        .sort((x, y) => x.seed - y.seed);
      const top = alive.slice().sort((x, y) => x.rank - y.rank)[0];
      items.push(
        article(stamp, "live", seedsLeft <= 4 ? `Seeds tumble at ${at(event)}: only ${word(seedsLeft)} of the top eight reach the quarterfinals` : `Quarterfinals set at ${at(event)} with ${shortName(top.name)} on course`, `The last eight in ${event.city}, and who is already out.`, [
          `The quarterfinal line-up at ${at(event)} is complete. ${capital(word(seedsLeft))} of the top eight seeds are in it.`,
          `The ties: ${ties.map(([a, b]) => `${shortName(a.name)} against ${shortName(b.name)}`).join("; ")}.`,
          gone.length ? `Gone already: ${listNames(gone.slice(0, 4).map((e) => `${e.name} (seed ${e.seed})`))}.` : "Every one of the top eight seeds has made it this far.",
          `${top.name} is the highest-ranked player left and the one the rest have to stop.`,
        ], ties.map(([a, b], i) => [`QF ${i + 1}`, `${shortName(a.name)} v ${shortName(b.name)}`]), alive.slice(0, 4).map((e) => e.id))
      );
    }
  }

  played.forEach(({ m, key }) => {
    const w = byId[m.winner];
    const loserId = m.winner === m.a ? m.b : m.a;
    const l = byId[loserId];
    const round = ROUND_LABEL[key].toLowerCase().replace(/s$/, "");
    if ([10, 15, 20, 25, 30, 40, 50].includes(w.streak))
      items.push(
        article(stamp, "streak", `${w.name}'s winning run reaches ${w.streak}`, `A ${scoreLine(m)} win in ${event.city} keeps it going.`, [
          `${w.name} has now won ${w.streak} matches in a row after beating ${l.name} ${scoreLine(m)} in the ${round} of ${at(event)}.`,
          `The season record stands at ${w.stats.w}–${w.stats.l}, with ${titlesPhrase(seasonTitles(w, t.year))}. ${w.energy < 55 ? `The one worry is fuel: ${shortName(w.name)} is down to ${Math.round(w.energy)}% energy.` : `Energy is not a concern at ${Math.round(w.energy)}%.`}`,
          w.streak >= 20 ? "Runs like this are rare. Every opponent now walks out knowing they are playing for a place in the story." : "The question is who stops it, and when.",
        ], [["Streak", w.streak], [`${t.year} record`, `${w.stats.w}–${w.stats.l}`], ["Energy", `${Math.round(w.energy)}%`]], [w.id])
      );

    const rec = world.h2h[pairKey(m.a, m.b)];
    if (!rec || !m.pre) return;
    const total = rec[0] + rec[1];
    const now = h2hFor(world.h2h, w.id, l.id);
    const was = m.winner === m.a ? m.pre.h : [m.pre.h[1], m.pre.h[0]];
    // only the rivalries that matter: both in the top 20, or a pair with a long history
    const elite = t.entries[m.a].rank <= 20 && t.entries[m.b].rank <= 20;
    const tookLead = elite && total >= 8 && was[0] <= was[1] && now[0] > now[1];
    if (((elite || total >= 20) && [10, 15, 20, 25, 30, 40].includes(total)) || tookLead)
      items.push(
        article(stamp, "rivalry", tookLead ? `${w.name} takes the head-to-head lead over ${shortName(l.name)}` : `${shortName(w.name)} and ${shortName(l.name)}: ${total} meetings and counting`, `${shortName(w.name)} won the latest, ${scoreLine(m)} in the ${round} of ${at(event)}.`, [
          `${w.name} and ${l.name} have now played each other ${total} times, and ${now[0] === now[1] ? `it could not be closer at ${now[0]}–${now[1]}` : `${shortName(now[0] > now[1] ? w.name : l.name)} leads ${Math.max(now[0], now[1])}–${Math.min(now[0], now[1])}`}.`,
          `The latest went to ${shortName(w.name)}, ${scoreLine(m)} in the ${round} of ${at(event)}. ${capital(word(rec[2]))} of their meetings have been finals.`,
          tookLead ? `It was ${was[0]}–${was[1]} going in, so this is the win that puts ${shortName(w.name)} in front.` : "Neither has been able to pull clear for long, which is what makes it a rivalry.",
        ], [["Head-to-head", `${now[0]}–${now[1]}`], ["Meetings", total], ["Finals", rec[2]]], [w.id, l.id])
      );
  });
  return items;
}

// After the big events: the talking points, and who is hot right now.
function wrapUpArticles(state, t, event, players, before, after) {
  const stamp = { y: t.year, w: event.week, city: event.city };
  const year = t.year;
  const byId = indexById(players);
  const champ = byId[t.championId];
  const items = [];
  if (OPTIONAL[t.tier]) return { items, power: state.power || {} };

  const points = [`The champion. ${champ.name} leaves ${event.city} with the trophy, a ${champ.stats.w}–${champ.stats.l} record for the season and ${titlesPhrase(seasonTitles(champ, year))}.`];
  const deep = Object.values(t.entries)
    .filter((e) => e.rank > 30 && ROUND_DEPTH[t.awards[e.id].round] >= 4)
    .sort((a, b) => ROUND_DEPTH[t.awards[b.id].round] - ROUND_DEPTH[t.awards[a.id].round] || b.rank - a.rank)[0];
  if (deep) points.push(`The breakout. ${deep.name} arrived ranked No. ${deep.rank} and reached ${REACHED[t.awards[deep.id].round]}. The ranking is now No. ${after[deep.id]}.`);
  const flop = Object.values(t.entries)
    .filter((e) => e.seed && e.seed <= 8 && ROUND_DEPTH[t.awards[e.id].round] <= expectedDepth(e.seed) - 2)
    .sort((a, b) => a.seed - b.seed)[0];
  points.push(flop ? `The disappointment. ${flop.name}, seeded ${flop.seed}, went out in ${REACHED[t.awards[flop.id].round]}. For a seed that high it is a week to forget.` : "The seeds. For once the leading names all did roughly what was expected of them.");
  let aces = null;
  let longest = null;
  t.rounds.forEach((rd) =>
    rd.matches.forEach((m) => {
      [0, 1].forEach((i) => {
        if (!aces || m.st[i].ac > aces.n) aces = { n: m.st[i].ac, name: t.entries[i === 0 ? m.a : m.b].name };
      });
      if (!longest || m.mins > longest.mins) longest = m;
    })
  );
  points.push(`The numbers. ${aces.name} hit ${aces.n} aces in one match, the most of the tournament. The longest match ran ${clock(longest.mins)}: ${t.entries[longest.winner].name} over ${shortName(t.entries[longest.winner === longest.a ? longest.b : longest.a].name)}, ${scoreLine(longest)}.`);
  const tired = players.filter((p) => after[p.id] <= 10 && p.energy < 45).sort((a, b) => a.energy - b.energy);
  const upcoming = state.calendar[t.slot + 1];
  if (tired.length) points.push(`The fuel gauge. ${listNames(tired.slice(0, 3).map((p) => `${p.name} (${Math.round(p.energy)}%)`))} ${tired.length === 1 ? "is" : "are"} short of energy${upcoming ? ` with ${at(upcoming)} next` : ""}. Expect some rest weeks.`);
  const mover = players.filter((p) => after[p.id] <= 50).sort((a, b) => before[b.id] - after[b.id] - (before[a.id] - after[a.id]))[0];
  if (mover && before[mover.id] - after[mover.id] >= 5) points.push(`The climber. ${mover.name} is up ${word(before[mover.id] - after[mover.id])} places to No. ${after[mover.id]}.`);
  items.push(article(stamp, "talking", `${capital(word(points.length))} talking points from ${at(event)}`, `The champion, the surprises and the numbers that stood out in ${event.city}.`, points, [["Champion", champ.name], ["Most aces", `${aces.n} (${shortName(aces.name)})`], ["Longest match", clock(longest.mins)]], [champ.id]));

  // power rankings: form over the last ten matches, the live streak, and points from the last four events
  const heat = (p) => {
    const form = p.form || "";
    const recent = p.rankingPoints.slice(Math.max(0, t.slot - 3), t.slot + 1).reduce((n, e) => n + (e && e.year === year ? e.pts : 0), 0);
    return (form.split("W").length - 1) * (10 / Math.max(5, form.length)) + p.streak * 0.3 + recent / 250;
  };
  const order = players
    .filter((p) => (p.form || "").length >= 5)
    .sort((a, b) => heat(b) - heat(a))
    .slice(0, 8);
  const old = state.power || {};
  const power = Object.fromEntries(order.map((p, i) => [p.id, i + 1]));
  const move = (p, i) => (old[p.id] == null ? "new" : old[p.id] === i + 1 ? "no change" : old[p.id] > i + 1 ? `up ${word(old[p.id] - i - 1)}` : `down ${word(i + 1 - old[p.id])}`);
  const note = (p) => {
    const form = p.form || "";
    const wins = form.split("W").length - 1;
    const here = t.awards[p.id];
    return `${wins} of the last ${form.length}${p.streak >= 4 ? `, ${p.streak} wins in a row` : ""}${here ? `, ${here.round === "W" ? "champion" : here.round === "F" ? "runner-up" : `out in ${REACHED[here.round]}`} here` : ", did not play here"}`;
  };
  if (order.length >= 5)
    items.push(
      article(stamp, "power", old[order[0].id] === 1 ? `Power rankings: ${shortName(order[0].name)} stays on top` : `Power rankings: ${shortName(order[0].name)} takes top spot`, `Who is playing the best tennis right now, after ${at(event)}.`, [
        "The power rankings measure form, not the ranking table: results over the last ten matches, the current winning run and points from the last four events.",
        ...order.map((p, i) => `${i + 1}. ${p.name} (${move(p, i)}). ${capital(note(p))}.`),
        (() => {
          const out = Object.keys(old).filter((id) => power[id] == null && byId[id]);
          return out.length ? `Dropping out: ${listNames(out.map((id) => byId[id].name))}.` : "";
        })(),
      ], order.slice(0, 6).map((p, i) => [`${i + 1}. ${shortName(p.name)}`, move(p, i)]), order.slice(0, 3).map((p) => p.id))
    );
  return { items, power };
}

/* ────────────────────────────── Betting ────────────────────────────── */
// Play money only. The bank lives in the save: { balance, deposited, staked, returned, won, lost, open, history, series }.
// Prices are quoted as American odds. The market's probability is mostly the match model, shaded toward reputation
// (ranking points) and nudged by a little noise, then a bookmaker margin is added. That gap between the
// market and what actually happens on court is the only way to beat it.

const BOOK_MARGIN = 0.05; // match winner
const SCORE_MARGIN = 0.1; // set score
const OUTRIGHT_MARGIN = 0.18; // tournament winner
const round2 = (v) => Math.round(v * 100) / 100;
const blankBank = () => ({ balance: 0, deposited: 0, staked: 0, returned: 0, won: 0, lost: 0, open: [], history: [], series: [], nextId: 1 });
// American odds: −150 means staking 150 to win 100, +130 means a 100 stake wins 130.
// Internally a price is kept as its decimal equivalent (stake included), which is what payouts multiply by.
const toAmerican = (d) => (d >= 2 ? (d - 1) * 100 : -100 / (d - 1));
const toDecimal = (a) => (a > 0 ? 1 + a / 100 : 1 + 100 / -a);
// A book quotes in steps: fives up to 1000, 25s up to 3000, hundreds beyond. The payout uses exactly the quoted price.
function snapPrice(d) {
  const a = toAmerican(d);
  const size = Math.abs(a);
  const step = size < 1000 ? 5 : size < 3000 ? 25 : 100;
  const quoted = Math.min(Math.max(100, Math.round(size / step) * step), a > 0 ? 50000 : 10000);
  return Math.round(toDecimal(a > 0 || quoted === 100 ? quoted : -quoted) * 1e9) / 1e9;
}
const price = (prob, margin) => snapPrice(clamp(1 / (prob * (1 + margin)), 1.01, 501));
const american = (d) => {
  const a = Math.round(toAmerican(d));
  return a <= -100 ? `−${-a}` : `+${Math.max(100, a)}`;
};
const usd = (v) => `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const betKey = (t, a, b) => `${t.year}:${t.slot}:${pairKey(a, b)}`;

function marketProb(A, B, t, en, key) {
  const model = winProbability(A, B, t, en);
  const ra = totalPoints(A) + 400;
  const rb = totalPoints(B) + 400;
  const wobble = ((hashOf(key) % 1000) / 1000 - 0.5) * 0.05;
  return clamp(0.82 * model + 0.18 * (ra / (ra + rb)) + wobble, 0.02, 0.98);
}

// From a match probability back to the chance of winning any one set, then out to every set score.
function setChance(p, bestOf) {
  const match = (s) => (bestOf === 3 ? s * s * (3 - 2 * s) : s * s * s * (10 - 15 * s + 6 * s * s));
  let lo = 0.01;
  let hi = 0.99;
  for (let k = 0; k < 28; k++) {
    const mid = (lo + hi) / 2;
    if (match(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
function scoreDist(p, bestOf) {
  const s0 = setChance(p, bestOf);
  const one = (s) => {
    const q = 1 - s;
    return bestOf === 3 ? [s * s, 2 * s * s * q, 2 * q * q * s, q * q] : [s * s * s, 3 * s * s * s * q, 6 * s * s * s * q * q, 6 * q * q * q * s * s, 3 * q * q * q * s, q * q * q];
  };
  // form carries from set to set, so sweeps are a little likelier than independent sets would suggest
  const hot = one(clamp(s0 + 0.06, 0.02, 0.98));
  const cold = one(clamp(s0 - 0.06, 0.02, 0.98));
  const keys = bestOf === 3 ? [[2, 0], [2, 1], [1, 2], [0, 2]] : [[3, 0], [3, 1], [3, 2], [2, 3], [1, 3], [0, 3]];
  const mix = keys.map((k, i) => (hot[i] + cold[i]) / 2);
  const total = mix.reduce((x, y) => x + y, 0);
  return keys.map(([a, b], i) => ({ key: `${a}-${b}`, a, b, prob: mix[i] / total }));
}

// Every price on one match. Works before the match (live) and after it (the closing price it went off at).
function matchMarkets(state, t, r, i) {
  const m = t.rounds[r].matches[i];
  if (!m.a || !m.b) return null;
  const A = state.players.find((p) => p.id === m.a);
  const B = state.players.find((p) => p.id === m.b);
  if (!A || !B) return null;
  const en = m.en || [Math.round(A.energy), Math.round(B.energy)];
  // rounded exactly as the closing price is stored, so a match is quoted the same before and after it is played
  const p = m.pre && m.pre.bk != null ? m.pre.bk : Math.round(marketProb(A, B, t, en, betKey(t, m.a, m.b)) * 1000) / 1000;
  const bestOf = TIERS[t.tier].bestOf;
  return {
    p,
    model: winProbability(A, B, t, en),
    win: [price(p, BOOK_MARGIN), price(1 - p, BOOK_MARGIN)],
    scores: scoreDist(p, bestOf).map((x) => ({ ...x, odds: price(x.prob, SCORE_MARGIN) })),
  };
}

const knockedOut = (t, id) => t.rounds.some((rd) => rd.matches.some((m) => m.winner && m.winner !== id && (m.a === id || m.b === id)));

// Chance of each player lifting the trophy from here: every possible path through the remaining bracket.
function outrightProbs(state, t) {
  const byId = indexById(state.players);
  const pair = (a, b) => marketProb(byId[a], byId[b], t, [Math.round(byId[a].energy), Math.round(byId[b].energy)], betKey(t, a, b));
  let level = t.rounds[0].matches.flatMap((m) => [m.a, m.b]).map((id) => new Map([[id, 1]]));
  for (let r = 0; r < t.rounds.length; r++) {
    const next = [];
    for (let k = 0; k < level.length; k += 2) {
      const m = t.rounds[r].matches[k >> 1];
      const out = new Map();
      if (m.winner) out.set(m.winner, 1);
      else
        level[k].forEach((pa, a) => {
          level[k + 1].forEach((pb, b) => {
            const p = pair(a, b);
            out.set(a, (out.get(a) || 0) + pa * pb * p);
            out.set(b, (out.get(b) || 0) + pa * pb * (1 - p));
          });
        });
      next.push(out);
    }
    level = next;
  }
  return level[0];
}
function outrightMarket(state, t) {
  if (t.status === "complete") return [];
  const probs = outrightProbs(state, t);
  return Array.from(probs.entries())
    .filter(([, p]) => p > 0)
    .sort((x, y) => y[1] - x[1])
    .map(([id, prob]) => ({ id, name: t.entries[id].name, seed: t.entries[id].seed, prob, odds: price(prob, OUTRIGHT_MARGIN) }));
}

function addFunds(state, amount) {
  const sum = round2(Number(amount));
  if (!(sum > 0) || sum > 1e7) return state;
  const bank = state.bank;
  return { ...state, bank: { ...bank, balance: round2(bank.balance + sum), deposited: round2(bank.deposited + sum) } };
}

// The price is always worked out here from the state of the tour, never taken from the screen.
function placeBet(state, a) {
  const t = state.tournament;
  const bank = state.bank;
  const stake = round2(Number(a.stake));
  if (!t || t.status === "complete" || !(stake > 0) || stake > bank.balance) return state;
  const event = state.calendar[t.slot];
  let bet;
  if (a.kind === "out") {
    if (!t.entries[a.pick] || knockedOut(t, a.pick)) return state;
    const line = outrightMarket(state, t).find((x) => x.id === a.pick);
    if (!line) return state;
    bet = { mid: `${t.year}:${t.slot}:out`, kind: "out", pick: a.pick, odds: line.odds, label: `${line.name} to win ${at(event)}`, round: "Outright" };
  } else {
    const m = t.rounds[a.r] && t.rounds[a.r].matches[a.i];
    if (!m || m.winner || !m.a || !m.b) return state;
    const mk = matchMarkets(state, t, a.r, a.i);
    if (!mk) return state;
    const names = [t.entries[m.a].name, t.entries[m.b].name];
    const round = ROUND_LABEL[t.rounds[a.r].key].replace(/s$/, "");
    if (a.kind === "win" && (a.pick === "a" || a.pick === "b")) {
      const side = a.pick === "a" ? 0 : 1;
      bet = { kind: "win", pick: a.pick, odds: mk.win[side], label: `${names[side]} to beat ${shortName(names[1 - side])}`, round };
    } else if (a.kind === "score") {
      const line = mk.scores.find((x) => x.key === a.pick);
      if (!line) return state;
      const side = line.a > line.b ? 0 : 1;
      bet = { kind: "score", pick: a.pick, odds: line.odds, label: `${names[side]} to win ${Math.max(line.a, line.b)}–${Math.min(line.a, line.b)} in sets against ${shortName(names[1 - side])}`, round };
    } else return state;
    bet.mid = betKey(t, m.a, m.b);
  }
  bet = { id: bank.nextId, y: t.year, w: event.week, ev: event.abbr, stake, ...bet };
  return { ...state, bank: { ...bank, balance: round2(bank.balance - stake), open: bank.open.concat([bet]), nextId: bank.nextId + 1 } };
}

// Settles every open bet that the freshly played matches decide. t is the tournament after those matches.
function settleBets(bank, played, t) {
  if (!bank.open.length) return bank;
  const done = {};
  const beaten = new Set();
  played.forEach(({ m }) => {
    done[betKey(t, m.a, m.b)] = m;
    beaten.add(m.winner === m.a ? m.b : m.a);
  });
  const outKey = `${t.year}:${t.slot}:out`;
  let { balance, staked, returned, won, lost } = bank;
  const open = [];
  const settled = [];
  bank.open.forEach((b) => {
    let hit = null;
    const m = done[b.mid];
    if (m && b.kind === "win") hit = (b.pick === "a" ? m.a : m.b) === m.winner;
    else if (m && b.kind === "score") hit = b.pick === `${m.sets.filter((s) => s.a > s.b).length}-${m.sets.filter((s) => s.b > s.a).length}`;
    else if (b.kind === "out" && b.mid === outKey) {
      if (t.status === "complete") hit = b.pick === t.championId;
      else if (beaten.has(b.pick)) hit = false;
    }
    if (hit == null) {
      open.push(b);
      return;
    }
    const ret = hit ? round2(b.stake * b.odds) : 0;
    balance += ret;
    staked += b.stake;
    returned += ret;
    if (hit) won++;
    else lost++;
    settled.push({ ...b, res: hit ? "won" : "lost", ret });
  });
  if (!settled.length) return bank;
  return {
    ...bank,
    balance: round2(balance),
    staked: round2(staked),
    returned: round2(returned),
    won,
    lost,
    open,
    history: settled.reverse().concat(bank.history).slice(0, 200),
    series: bank.series.concat([round2(returned - staked)]).slice(-300),
  };
}

/* ────────────────────────────── Interviews ────────────────────────────── */
// Simulated post-match interviews. Nothing here is a real quote: every answer is assembled from what
// happened in the match (the shape of the score, the serve, the break points, streaks, the head-to-head,
// energy, recent criticism) and from the speaking style the game gives each player.
// Questions come back in order of relevance; the screen shows the first few and reveals more on request.

const VOICES = ["measured", "blunt", "upbeat", "intense", "dry"];
// A game setting, like any other rating: [how the player talks, how much needle they bring (0 never, 3 enjoys it)].
// Set by hand for well-known names so the talk fits the player; everyone else, rookies included, is drawn from their id.
const TEMPER = {
  "jannik-sinner": ["measured", 0], "carlos-alcaraz": ["upbeat", 0], "alexander-zverev": ["blunt", 1], "daniil-medvedev": ["dry", 3],
  "ben-shelton": ["upbeat", 2], "novak-djokovic": ["intense", 2], "f-auger-aliassime": ["measured", 0], "alex-de-minaur": ["upbeat", 0],
  "frances-tiafoe": ["upbeat", 2], "flavio-cobolli": ["upbeat", 1], "arthur-fils": ["intense", 2], "taylor-fritz": ["blunt", 1],
  "casper-ruud": ["measured", 0], "jack-draper": ["measured", 1], "lorenzo-musetti": ["measured", 0], "holger-rune": ["intense", 3],
  "stefanos-tsitsipas": ["dry", 1], "alexander-bublik": ["dry", 3], "andrey-rublev": ["intense", 0], "denis-shapovalov": ["intense", 2],
  "karen-khachanov": ["blunt", 1], "grigor-dimitrov": ["measured", 0], "tommy-paul": ["upbeat", 0], "hubert-hurkacz": ["measured", 0],
  "joao-fonseca": ["upbeat", 1], "jakub-mensik": ["intense", 1], "corentin-moutet": ["dry", 3], "nick-kyrgios": ["blunt", 3],
  "gael-monfils": ["upbeat", 1], "stan-wawrinka": ["blunt", 2], "alejandro-davidovich-fokina": ["intense", 1], "learner-tien": ["measured", 0],
  "matteo-berrettini": ["upbeat", 0], "sebastian-korda": ["measured", 0], "cameron-norrie": ["measured", 0], "ugo-humbert": ["measured", 1],
};
const voiceOf = (p) => (TEMPER[p.id] ? TEMPER[p.id][0] : VOICES[hashOf(`${p.id}:voice`) % VOICES.length]);
// short lead-ins and sign-offs give each style its sound; blanks keep it from becoming a tic
const LEAD = {
  measured: ["Look,", "To be honest,", "Of course,", "", ""],
  blunt: ["Listen,", "Simple:", "", ""],
  upbeat: ["Honestly,", "Yeah,", "Oh man,", "", ""],
  intense: ["Believe me,", "", "", ""],
  dry: ["Well,", "Funny you should ask.", "", ""],
};
const SIGN = {
  won: {
    measured: ["I'm satisfied with that.", "We go again tomorrow.", "Step by step.", "", ""],
    blunt: ["That's it.", "Nothing more to add.", "Job done.", "", ""],
    upbeat: ["I'm really enjoying my tennis.", "What a day.", "I love playing here.", "", ""],
    intense: ["But I want more.", "There is still a lot to improve.", "Tomorrow it starts again.", "", ""],
    dry: ["I'll take it.", "My legs may have a different opinion.", "Somebody tell my physio.", "", ""],
  },
  lost: {
    measured: ["I'll learn from it.", "Credit where it's due.", "It's part of the sport.", "", ""],
    blunt: ["Not good enough.", "That's it.", "Next.", "", ""],
    upbeat: ["I'll be back.", "There are positives to take.", "Head up, keep going.", "", ""],
    intense: ["For me that's not acceptable.", "I hate losing, simple as that.", "It will stay with me tonight.", "", ""],
    dry: ["I've had better days.", "Ask me again in a week.", "Not my finest work.", "", ""],
  },
};
// what a badly beaten player says when they do not want to be there
const CURT = {
  blunt: ["No.", "Next question.", "I don't want to talk about that today.", "You saw the match."],
  intense: ["Not today.", "I have nothing to say about that.", "Ask me another time.", "You know the answer already."],
};
const CURT_AGAIN = {
  blunt: ["No.", "I think I was clear.", "That's all."],
  intense: ["No. Thank you.", "I said what I said.", "Next one, please."],
};
const TOPIC_WORDS = { finals: "your record in finals", elite: "your results against the top 10", tight: "the close matches you have been losing", burnout: "your schedule", serve: "your serve", slam: "your Grand Slam results", slide: "your ranking", hype: "the expectations around you", age: "how long you can keep going" };
// The press room is invented: these outlets do not exist. The local paper gets the questions about home.
const PRESS = ["Tour Desk Live", "Baseline Bulletin", "The Changeover", "Courtside Wire", "Net Post Weekly", "Second Serve Radio", "Clay Court Review", "Grass Notes", "Hard Court Daily", "Rally Report"];

// A line written for everyone, or in a version for each speaking style:
// lines is a list, or { all: [...], measured: [...], blunt: [...], upbeat: [...], intense: [...], dry: [...] }.
function lineFor(voice, rnd, lines) {
  if (Array.isArray(lines)) return lines[Math.floor(rnd() * lines.length)];
  const own = lines[voice] || [];
  const all = lines.all || [];
  const pool = own.length && (!all.length || rnd() < 0.72) ? own : all.length ? all : own;
  return pool[Math.floor(rnd() * pool.length)];
}

// The shape of a finished match, shared by every question.
function shapeOf(f) {
  const { m, bo, E } = f;
  const w = m.winner === m.a ? 0 : 1;
  const l = 1 - w;
  const sets = m.sets.map((x) => (w === 0 ? [x.a, x.b, x.tb] : [x.b, x.a, x.tb]));
  const lostSets = sets.filter((x) => x[0] < x[1]).length;
  const gamesLost = sets.reduce((n, x) => n + x[1], 0);
  return {
    w,
    l,
    sets,
    straight: lostSets === 0,
    rout: lostSets === 0 && gamesLost <= sets.length * 2 + 1,
    comeback: sets[0][0] < sets[0][1],
    decider: sets.length === bo,
    tiebreaks: sets.filter((x) => x[2] != null).length,
    marathon: m.mins >= (bo === 5 ? 225 : 160),
    upset: E[w].rank - E[l].rank >= 15 && E[l].rank <= 20,
    final: f.key === "F",
  };
}

// What the point-by-point record says about a finished match: the moments a press room asks about.
// The record is rebuilt from the match seed (it is never stored), so the answer is kept for a while.
const MOMENTS = new Map();
function momentsOf(f) {
  const { m, P, t } = f;
  if (!m.winner || !P[0] || !P[1]) return null;
  const key = `${t.year}:${t.slot}:${m.seed}`;
  if (MOMENTS.has(key)) return MOMENTS.get(key);
  const re = simMatch(m.seed, P[0], P[1], t, true, m.en);
  let out = null;
  if (re.winner === m.winner && re.sets.length === m.sets.length) {
    const { points, games } = re.log;
    out = { mpHad: [0, 0], mpSaved: [0, 0], servedFor: [], longest: null, run: [0, 0], breakBack: [0, 0], firstBreak: {} };
    const runNow = [0, 0];
    games.forEach((g, gi) => {
      for (let k = g.from; k <= g.to; k++) {
        const p = points[k];
        let holder = null;
        if ((p.tags || []).includes("Match point")) {
          if (g.tb) {
            const after = p.score.split("–").map(Number);
            after[p.w]--; // the score before this point
            holder = after[0] > after[1] ? 0 : 1;
          } else holder = p.bp ? 1 - p.s : p.s;
          out.mpHad[holder]++;
          if (p.w !== holder) out.mpSaved[1 - holder]++;
        }
        if (!out.longest || p.n > out.longest.n) out.longest = { n: p.n, w: p.w, set: p.set };
        runNow[p.w]++;
        runNow[1 - p.w] = 0;
        out.run[p.w] = Math.max(out.run[p.w], runNow[p.w]);
      }
      if (!g.tb) {
        const servingForIt = points.slice(g.from, g.to + 1).find((p) => !p.bp && (p.tags || []).some((x) => x === "Set point" || x === "Match point"));
        if (servingForIt && g.w !== g.s) {
          const before = g.g.slice();
          before[g.w]--;
          out.servedFor.push({ side: g.s, set: g.set, kind: servingForIt.tags.includes("Match point") ? "match" : "set", at: `${before[g.s]}–${before[1 - g.s]}` });
        }
      }
      if (g.brk && out.firstBreak[g.set] == null) out.firstBreak[g.set] = { w: g.w, at: `${g.g[g.w]}–${g.g[1 - g.w]}` };
      const prev = games[gi - 1];
      if (g.brk && prev && prev.set === g.set && prev.brk && prev.w === 1 - g.w) out.breakBack[g.w]++;
    });
  }
  MOMENTS.set(key, out);
  if (MOMENTS.size > 48) MOMENTS.delete(MOMENTS.keys().next().value);
  return out;
}

// who: 0 or 1 (the player's side in the match). state supplies criticism, schedule and standing.
// Each answer can carry follow-ups ("more") that the screen reveals one at a time.
function interview(state, f, who) {
  const { m, N, P, E, t, event, key, sk, h, en, mk, nextMatch, seq } = f;
  const sh = shapeOf(f);
  const me = P[who];
  if (!me) return { voice: "measured", qa: [] };
  const opp = N[1 - who];
  const them = P[1 - who];
  const won = who === sh.w;
  const mood = won ? "won" : "lost";
  const voice = voiceOf(me);
  const S = m.st[who];
  const O = m.st[1 - who];
  const year = t.year;
  const mo = momentsOf(f);
  const out = [];
  // a beaten player with a short fuse keeps a couple of answers very short
  let curtLeft = !won && (voice === "blunt" || voice === "intense") && (sh.rout || sh.final || E[who].rank + 20 <= E[1 - who].rank) && hashOf(`${m.seed}:${who}:curt`) % 4 !== 0 ? 2 : 0;
  // a lead-in or sign-off is used at most once per interview, and never on answers about other people
  const spent = new Set();
  const once = (list, rnd) => {
    const choice = list[Math.floor(rnd() * list.length)];
    if (!choice || spent.has(choice) || spent.size >= 3) return "";
    spent.add(choice);
    return choice;
  };
  // opts: plain (no sign-off), local (asked by the local paper), keep (never cut short), more: [{ q: [...], a: lines }]
  const add = (topic, weight, questions, answers, opts = {}) => {
    const rnd = makeRng(hashOf(`${m.seed}:${who}:${topic}`));
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    const by = opts.local ? `Local press, ${event.city}` : PRESS[hashOf(`${m.seed}:${who}:${topic}:press`) % PRESS.length];
    const q = tidy(pick(questions));
    if (curtLeft > 0 && !opts.keep && weight < 9 && CURT[voice]) {
      curtLeft--;
      out.push({ topic, by, weight: weight + rnd() * 0.5, q, a: pick(CURT[voice]), more: [{ by, q: pick(["Can you say a little more?", "Is there anything you would add?", "Could you expand on that at all?"]), a: pick(CURT_AGAIN[voice]) }] });
      return;
    }
    const core = lineFor(voice, rnd, answers);
    const lead = /^I[ ']/.test(core) ? once(LEAD[voice], rnd) : "";
    const sign = opts.plain || core.length < 30 ? "" : once(SIGN[mood][voice], rnd); // a two-word answer does not need a sign-off as well
    const more = (opts.more || []).filter(Boolean).map((x) => ({ by, q: tidy(pick(x.q)), a: tidy(lineFor(voice, rnd, x.a)) }));
    out.push({ topic, by, weight: weight + rnd() * 0.5, q, a: tidy([lead, core, sign].filter(Boolean).join(" ")), more });
  };
  const fw = pctOf(S.fw, S.fi);
  const broken = S.bf - S.bs;
  const breaks = O.bf - O.bs;
  const round = ROUND_LABEL[key].toLowerCase().replace(/s$/, "");
  const mySets = sh.sets.map((x) => (won ? x : [x[1], x[0], x[2]]));
  const ord = (n) => ORDINAL[n - 1] || nth(n);

  // the hardest match on the way here, for champions looking back on the week
  let hardest = null;
  t.rounds.slice(0, f.r).forEach((rd) =>
    rd.matches.forEach((x) => {
      if (x.winner !== me.id || (hardest && x.mins <= hardest.m.mins)) return;
      hardest = { m: x, key: rd.key, opp: t.entries[x.a === me.id ? x.b : x.a] };
    })
  );
  const turnedAt = mo && won && sh.comeback ? mo.firstBreak[2] : null;

  // ── how it went ──
  if (won && sh.final) {
    add("summary", 10, [`How does it feel to win ${at(event)}?`, `Champion in ${event.city}. Can you put it into words?`, "What will you remember about today?", `You are the ${event.name} champion. What is going through your head?`], {
      all: ["It's hard to describe. You work all year for weeks like this one.", "I'm proud of the whole week, not only today. Every round asked a different question.", "Finals are never comfortable. I found a way, and that is all that counts."],
      measured: ["It's a great feeling. The work over the last months is paying off, and that makes it special.", "I'm happy, of course. I'm also proud of how I handled the difficult moments."],
      blunt: ["It feels good. I came here to win it and I did.", "Very good. That's the honest answer."],
      upbeat: ["Unbelievable! I'm so happy, I don't even know what to say.", "This is the best feeling in the world. I want to remember every second of it."],
      intense: ["Relief first, then joy. I put so much into this week.", "I wanted this one badly. Really badly."],
      dry: ["Better than losing it, I can tell you that.", "Good. Ask me again tomorrow, when it has sunk in."],
    }, {
      keep: true,
      more: [
        { q: ["What was the hardest moment of the week?", "Was there a point this week when you thought it might not happen?"], a: hardest && hardest.m.sets.some((s) => (hardest.m.a === me.id ? s.a < s.b : s.b < s.a)) ? [`The ${ROUND_LABEL[hardest.key].toLowerCase().replace(/s$/, "")} against ${shortName(hardest.opp.name)}. ${clock(hardest.m.mins)} out there, and I was close to going home.`, `${shortName(hardest.opp.name)} in the ${ROUND_LABEL[hardest.key].toLowerCase().replace(/s$/, "")}. I was in real trouble in that one.`] : [`Honestly, today. ${opp} made me work for everything.`, "The first match. The first one of any week is always the most nervous."] },
        { q: ["How will you celebrate?", "What happens tonight?"], a: { all: ["A good dinner with the people who helped me this week. Then sleep."], measured: ["A quiet dinner with the team, and then I'll start thinking about the next one."], blunt: ["Sleep."], upbeat: ["Dinner with everyone who helped this week. Maybe a little dancing, we'll see."], intense: ["Tonight I enjoy it. Tomorrow I'm back on the practice court."], dry: ["My physio has already told me what I'm doing tonight. It involves ice."] } },
      ],
    });
  } else if (!won && sh.final) {
    add("summary", 10, ["What will you take from the week?", "So close to the title. How do you feel?", `Was ${opp} simply too good today?`], {
      all: [`I gave everything. ${opp} was better today and deserves the title.`, "A final is a good week, even if it does not feel like one right now."],
      measured: [`Disappointed, but I can see the bigger picture. ${opp} played a great final.`],
      blunt: ["Losing a final is losing. I'm not happy."],
      upbeat: ["It hurts now, but I'll look back at this week with a smile."],
      intense: ["Right now I don't care about the week. I came here for the trophy."],
      dry: ["Second place gets a smaller plate. I've checked."],
    }, { keep: true, more: [{ q: ["What did you say to each other at the net?", `What did you tell ${opp} at the net?`], a: { all: ["I said well played. What else is there to say?", "Congratulations, and see you soon."], dry: ["I said well played. I meant about sixty percent of it."], intense: ["Well played. And that I'll see them again."] } }] });
  } else if (won && sh.upset) {
    add("summary", 10, [`Where does beating ${opp} rank among your wins?`, "Did you believe that result was possible when you walked out?", "That is a big scalp. How did you do it?"], {
      all: ["I'd put it right up there with the best wins I've had.", "I believed I could do it, but believing and doing are different things.", "I had nothing to lose and I played like it from the first point."],
      measured: [`It's one of my best wins, for sure. I respect ${opp} a lot, which makes it even more special.`],
      blunt: [`It's a big win. I knew I could beat ${opp} if I played well, and I played well.`],
      upbeat: ["I'm still shaking! This is the kind of day you dream about."],
      intense: ["I came here to win matches like this, not to take photos with the top players."],
      dry: ["I'd say top five. Maybe top one. Give me a minute to check."],
    }, { more: [{ q: ["Did you look at the draw before the tournament?", "When did you start to believe?"], a: { all: ["I never look at the draw. Today I'm glad I didn't.", "Somewhere in the second set. I felt the momentum and I went with it."], dry: ["I looked. I'm glad nobody asked me about it then."], upbeat: ["From the warm-up! Okay, maybe not the warm-up. The second set."] } }] });
  } else if (won && sh.rout) {
    add("summary", 10, ["That looked very comfortable. Was it?", `${mySets.map((x) => `${x[0]}–${x[1]}`).join(", ")}. Did everything go to plan?`, "Is that as well as you can play?"], {
      all: ["I played close to my best. Everything I tried came off.", "I felt the ball well from the first game. Days like this do not come often.", "It was one of those days where the plan worked from start to finish."],
      measured: [`It was a very good performance. I don't think ${opp} was at their best either, so I'll stay humble.`],
      blunt: ["It was easy today. It won't be next round."],
      upbeat: ["Everything was going in! I wish I could bottle this feeling."],
      intense: ["Comfortable on the scoreboard. I still found things I need to do better."],
      dry: ["Comfortable for me. I'd ask the other locker room how it felt."],
    }, { more: [{ q: ["Is there anything you would still improve?"], a: { all: ["Always. The first-serve percentage, maybe. There is always something."], blunt: ["Nothing today."], intense: ["The concentration at the end. I let two games go that I should not have."], dry: ["The walk to the net for the handshake. It was a bit slow."] } }] });
  } else if (won && sh.comeback) {
    add("summary", 10, ["You lost the first set. What changed after that?", "How did you turn that around?", `${opp} was in control early. What did you adjust?`], {
      all: ["I didn't start well, but I stayed calm and kept looking for solutions.", "I think losing the first set woke me up. After that I played much more freely.", `${opp} was better early on. I had to change something, so I took the ball earlier and it worked.`],
      measured: ["I stayed patient. I knew my level would come if I kept making good decisions."],
      blunt: ["I was bad in the first set and better after it. That's the story."],
      upbeat: ["I just kept fighting and enjoying it, and the crowd helped me a lot."],
      intense: ["I got angry with myself after the first set, and I used it."],
      dry: ["I decided to start playing tennis. It seemed to help."],
    }, { more: [{ q: ["Was there one moment when you felt it turn?", "When did you feel the match change?"], a: turnedAt && turnedAt.w === who ? [`The break at ${turnedAt.at} in the second set. After that I felt ${opp} start to doubt.`, `When I broke for ${turnedAt.at} in the second. You could feel the energy change.`] : ["I don't think it was one point. It was a feeling that slowly came back.", "When I started making returns. Everything comes from the return."] }] });
  } else if (won && sh.decider) {
    add("summary", 10, ["That went the distance. How did you get over the line?", "What decided it in the final set?", `After ${clock(m.mins)}, what was the difference?`], {
      all: ["It could have gone either way. A couple of points decided it.", "I just tried to stay brave on the big points in the last set.", "Matches like that are why we play. I'm proud of how I handled the end."],
      measured: ["Small margins. I think I made slightly better decisions on the important points."],
      blunt: ["I won more of the big points. That's it."],
      upbeat: ["What a match! I'm exhausted and so happy."],
      intense: ["I refused to lose that match. In the last set it was pure will."],
      dry: ["The difference was that I won. That's usually the difference."],
    }, { more: [{ q: ["What were you thinking before the final game?"], a: { all: ["Don't think about winning. Think about the first point.", "First serves. Just make first serves."], dry: ["Mostly about not thinking. Which, as you know, is impossible."], intense: ["That I had worked too hard to give it away now."] } }] });
  } else if (won) {
    add("summary", 10, ["Into the next round. How do you assess that?", `A solid win in the ${round}. Happy with the level?`, "What pleased you most about that?"], {
      all: ["I was solid in the moments that mattered, and that was the difference.", "It was closer than the score makes it look. I had to work for every game.", "I'm happy to get through without spending too long out there."],
      measured: ["It was a good, professional performance. That is what I wanted.", "Solid. I managed the important moments well and didn't waste energy.", "I'm pleased. Not perfect, but very solid."],
      blunt: ["I won. I'm through. Good.", "It was fine. Next.", "Good enough. That's the job today."],
      upbeat: ["Really happy! It feels great to be in the next round.", "I'm having so much fun out there right now.", "Great day! The crowd was amazing and I felt good."],
      intense: ["I'm happy to win, but the level has to go up from here.", "I won, but I'm not satisfied. I want to play better.", "Good result. The tennis can be better and it will be."],
      dry: ["I'm through, and I didn't pull anything. A good day by my standards.", "I won. My coach will now tell me everything I did wrong.", "Pleasant enough. Nobody got hurt. Well, one of us got knocked out."],
    });
  } else if (sh.rout) {
    add("summary", 10, ["That was a tough one to take. What happened?", `${opp} gave you very little. Is there an explanation?`, "How do you explain that scoreline?"], {
      all: ["I was second best in every department. No excuses.", `Nothing worked today. Credit to ${opp}, that was too good.`, "It was a bad day. I have to accept it and move on quickly."],
      measured: [`${opp} played very well and I could not find answers. I'll look at it calmly tomorrow.`],
      blunt: ["I was bad. Really bad."],
      upbeat: ["One of those days. Tomorrow the sun comes up again."],
      intense: ["Embarrassing. I'm not going to hide from that word."],
      dry: ["I'd explain it, but I'd need to have been there in spirit."],
    }, { keep: true });
  } else if (sh.comeback) {
    add("summary", 10, ["You won the first set. Where did it get away from you?", "You were ahead. What changed?", `How did ${opp} turn it around?`], {
      all: ["I had it in my hands and let it go. That one will stay with me for a while.", `After the first set my level dropped a little and ${opp} raised it.`, "I started well, but I could not keep it up for long enough."],
      measured: [`${opp} changed something after the first set and I was slow to react.`],
      blunt: ["I stopped playing well. Simple."],
      upbeat: ["I was flying in the first set! Then it just slipped away a little."],
      intense: ["I let it go. That's the worst feeling in tennis."],
      dry: ["The first set went very well. I recommend it."],
    }, { keep: true });
  } else {
    add("summary", 10, ["A narrow defeat. What was the difference?", "So close. What will you take from it?", "Where was that match decided?"], {
      all: [`It came down to a few points and ${opp} played them better.`, "I had my chances and did not take them. That is tennis.", "It hurts because I was close. The margins at this level are tiny."],
      measured: ["Small details. I'll look at them with my team, but I'm not far away.", `A few points. ${opp} was a little braver on them, and I have to accept that.`],
      blunt: ["I lost the important points. That's all.", "I wasn't good enough when it mattered.", "Close doesn't count."],
      upbeat: ["I'm close! Very close. It will come.", "It was a great match to be part of. I just wish I was on the other side of it."],
      intense: ["Close is not enough. Close is nothing.", "I can't accept losing matches like that. I won't."],
      dry: ["The difference was about four points. I've been counting them since.", "I lost by a small amount, which is still the whole amount."],
    }, { keep: true });
  }

  // ── the moments in the match itself ──
  if (mo) {
    if (won && mo.mpSaved[who] > 0)
      add("matchpoint", 9.6, [`You saved ${mo.mpSaved[who] === 1 ? "a match point" : `${word(mo.mpSaved[who])} match points`}. What goes through your head at that moment?`, "You were a point from defeat. Did you think it was over?"], {
        all: ["I just told myself to make the return and make them play.", "You don't think. If you think, you lose that point."],
        measured: ["I tried to stay in the present. One point, then the next one."],
        blunt: ["Hit the ball. That's all I thought."],
        upbeat: ["I was smiling inside, I don't know why. I felt I could still turn it around."],
        intense: ["I refused to lose that point. Simple as that."],
        dry: ["I thought about my flight home. Then I thought better of it."],
      }, { keep: true, more: [{ q: ["Do you remember the point itself?"], a: { all: ["Not really. It's a blur. I'll watch it later."], dry: ["Vaguely. I remember closing my eyes at one stage."], upbeat: ["Every shot! I'll be dreaming about it."] } }] });
    if (!won && mo.mpHad[who] > 0)
      add("matchpoint", 9.6, [`You had ${mo.mpHad[who] === 1 ? "a match point" : `${word(mo.mpHad[who])} match points`}. How much does that hurt?`, "You were a point away. How do you process that?"], {
        all: ["A lot. I'll be thinking about it tonight.", `I had my chances. ${opp} played the big points better.`],
        measured: ["Those moments decide matches. Today they went the other way."],
        blunt: ["It hurts. What do you want me to say?"],
        upbeat: ["It hurts, but I was one point from winning. I'll take the positives later."],
        intense: ["It hurts. It will hurt for a few days."],
        dry: ["On a scale of one to ten? Eleven."],
      }, { keep: true });
    const mine = mo.servedFor.find((x) => x.side === who);
    const theirs = mo.servedFor.find((x) => x.side === 1 - who);
    if (mine && won)
      add("servedfor", 8.6, [`You were broken serving for the ${mine.kind} at ${mine.at} in the ${ord(mine.set)} set. Did doubt creep in?`], {
        all: ["Of course. You're human. I just tried to reset straight away.", "A little. But I knew I was still the one in front."],
        measured: ["For a moment, yes. Then I reminded myself how well I had played to get there."],
        blunt: ["Yes. Then it went away."],
        upbeat: ["A little bit! But I kept smiling and it worked out."],
        intense: ["I was furious with that game. I used it."],
        dry: ["Doubt? We had a whole conversation."],
      });
    if (mine && !won)
      add("servedfor", 9.1, [`You served for the ${mine.kind} at ${mine.at} in the ${ord(mine.set)} set and were broken. What happened in that game?`, `What happened when you served for the ${mine.kind}?`], {
        all: ["I got tight. There's no other way to say it.", `${opp} played a great return game. Maybe I could have been braver.`],
        measured: ["I went a little passive. Lesson learned."],
        blunt: ["I choked that game. It happens."],
        upbeat: ["It happens to everyone. I'll serve it out next time."],
        intense: ["I got nervous, and I hate that I got nervous."],
        dry: ["The arm forgot what it was doing for about four points."],
      }, { keep: true });
    if (theirs && won)
      add("servedfor", 8.2, [`${opp} served for the ${theirs.kind} at ${theirs.at} and you broke. What changed in that game?`], {
        all: ["I told myself to make every return and see what happens.", "I felt a little tension on the other side, and I tried to use it."],
        blunt: ["I returned better. That's all."],
        upbeat: ["The crowd got loud, I got loud, and suddenly we were back on serve!"],
        intense: ["That was the moment. I knew if I broke there, the match was mine."],
        dry: ["I decided it wasn't over. It's amazing what that does."],
      });
    if (mo.longest && mo.longest.n >= 28)
      add("rally", 6, [`There was a ${mo.longest.n}-shot rally in the ${ord(mo.longest.set)} set. Do you remember it?`, `That ${mo.longest.n}-shot rally. Who won it, in your head?`], mo.longest.w === who ? {
        all: [`I won it, and I needed it. ${mo.longest.n} shots, my legs still remember every one.`, "I won it. I'm still not sure how."],
        upbeat: ["That was so much fun! Tiring, but so much fun."],
        dry: ["I won it. I think it cost me a year of my life, but I won it."],
        intense: ["I won it. I was ready to run all night for that point."],
      } : {
        all: ["Not me, unfortunately. But I think it cost us both something.", "I lost it, but I made a point. A different kind of point."],
        dry: ["The one where I ran the most and won nothing? Lovely, thank you."],
        blunt: ["I lost it. Next question."],
      }, { plain: true });
    if (mo.breakBack[who] >= 2 && won)
      add("breakback", 6.5, [`You broke straight back ${word(mo.breakBack[who])} times. Is that something you focus on?`], {
        all: ["Always. The game after a break is the most important one.", "If you let them consolidate, the set is gone. I try never to allow that."],
        dry: ["I like to keep it interesting for everybody."],
        intense: ["Every time I lose my serve I get angry, and I take it out on the next return game."],
      }, { plain: true });
  }
  const tbW = mySets.filter((x) => x[2] != null && x[0] > x[1]).length;
  const tbL = mySets.filter((x) => x[2] != null && x[0] < x[1]).length;
  if (tbW >= 2 && won) add("tiebreak", 7, [`You won ${word(tbW)} tiebreaks. What is the secret?`, "You were very strong in the tiebreaks. Why?"], { all: ["In a tiebreak you have to go for it. I went for it.", "I just tried to win my service points and make one good return."], dry: ["Practice. And a bit of luck. Mostly luck, don't tell anyone."], intense: ["Tiebreaks are about nerve. I trust my nerve."] });
  if (tbL >= 2 && !won) add("tiebreak", 8, [`${capital(word(tbL))} tiebreaks went against you. Was that the difference?`], { all: ["Yes. The match was decided in those few points.", `${opp} played the tiebreaks better. I was a little passive.`], blunt: ["Yes."], dry: ["The tiebreaks and I are not speaking at the moment."] });
  const bagelFor = mySets.findIndex((x) => x[0] === 6 && x[1] === 0);
  const bagelAgainst = mySets.findIndex((x) => x[0] === 0 && x[1] === 6);
  if (won && bagelFor >= 0) add("bagel", 6, [`You won the ${ord(bagelFor + 1)} set 6–0. Did you feel ${opp} drop?`], { all: ["I felt a little drop, yes, and I wanted to use it immediately.", "I don't think it was a drop. I think I raised my level."], dry: ["I felt something drop. I'm not sure what. Possibly the will to live."], measured: [`I don't think ${opp} dropped much. I just played a very clean set.`] }, { plain: true });
  if (!won && bagelAgainst >= 0) add("bagel", 6.5, [`The ${ord(bagelAgainst + 1)} set went 6–0. What happened there?`], { all: ["I lost the thread completely for twenty minutes. It can't happen.", `${opp} played an incredible set and I had no answers.`], dry: ["A short set. Efficient, at least."], intense: ["I disappeared. I'm angry about that set more than anything."] });

  // ── the serve ──
  const serveMore = { q: ["Have you changed anything on the serve?", "Is that something you have been working on?"], a: { all: ["A little bit on the toss. Small things make a big difference."], measured: ["Small details on the rhythm. We have been working on it for months."], blunt: ["No. I just hit it better today."], upbeat: ["Yes! We worked a lot on it in the off-season and it's paying off."], intense: ["Every single day. I am never satisfied with my serve."], dry: ["I've been told to hit it harder. I'm trying that out."] } };
  if (won && S.ac >= 10)
    add("serve", 6 + S.ac / 8, [`${S.ac} aces today. Was the serve the key?`, `You hit ${S.ac} aces. Did it feel as good as it looked?`], { all: [`I think the serve got me out of trouble more than once. ${capital(word(S.ac))} aces helps.`, "I found my spots early and never really lost them.", `I served ${word(S.ac)} aces, but the ones on the big points are the ones I'll remember.`], dry: [`${capital(word(S.ac))} aces. I'd have liked eighteen, but fine.`], upbeat: ["It felt amazing! When the serve is on, tennis is easy."] }, { more: [serveMore] });
  else if (won && fw >= 80)
    add("serve", 6, [`You won ${fw}% of the points behind your first serve. Was that the platform?`, "You were barely troubled on serve. What was working?"], { all: [`I won ${fw}% behind the first serve. When that happens I can swing freely in the return games.`, "I was hitting my targets, and the first ball after the serve was good too.", "I never felt under pressure on serve, and that changes everything about how you return."] }, { more: [serveMore] });
  if (S.mx >= 138 && them) add("speed", 4.5, [`You hit ${S.mx} mph today. Is there more in there?`], { all: ["Maybe a little. But I'd rather hit my spots than hit the radar.", "Speed is nice for the screen. Placement wins points."], dry: ["There's always more. My shoulder disagrees."], upbeat: ["I think so! Don't tell my coach."], intense: ["There is always more. I want to find it."] }, { plain: true });
  if (!won && S.df >= 6)
    add("serve", 7 + S.df / 2, [`${capital(word(S.df))} double faults today. Was the serve the problem?`, "The second serve seemed to desert you. What happened?"], { all: ["My serve let me down. I never found a rhythm with the toss.", `I can't hit ${word(S.df)} double faults and expect to win at this level.`, "I was going for too much on the second serve because I was worried about the return."], dry: [`${capital(word(S.df))} double faults. Generous of me.`], blunt: ["Yes. The serve was terrible."] });
  else if (!won && broken >= 4)
    add("serve", 7 + broken / 2, [`You were broken ${word(broken)} times. What went wrong on serve?`, "You were under pressure in a lot of service games. Why?"], { all: [`I gave away too many service games. Being broken ${word(broken)} times is not good enough at this level.`, `I was under pressure in almost every service game, and ${opp} made me pay.`, "I did not get enough free points, so every game became a fight."] });

  // ── the big points ──
  if (won && S.bf >= 5 && S.bs / S.bf >= 0.7)
    add("clutch", 7, [`You saved ${word(S.bs)} of ${word(S.bf)} break points. What goes through your mind in those moments?`, "You were in trouble on serve several times and escaped. How?"], { all: ["I try to go for my spots on those points and not think too much.", `I saved ${word(S.bs)} break points, and honestly a few of them were ${opp} missing. You need a little luck.`, "I've been in those positions many times. I trust the serve when it matters."], dry: ["Mostly I hoped. Hope is underrated."] }, { more: [{ q: ["Is that something you can practise?"], a: { all: ["You can practise the pressure a little. The rest is experience."], blunt: ["No. You have it or you don't."], dry: ["We play practice sets where the loser buys dinner. It helps."], measured: ["In practice we play a lot of points from 30–40. It becomes normal."] } }] });
  if (!won && O.bf >= 6 && breaks / O.bf <= 0.3)
    add("clutch", 8, [`You had ${word(O.bf)} break points and converted ${word(breaks)}. Is that where it was lost?`, "So many chances on return. What happened on the break points?"], { all: [`I had ${word(O.bf)} break points and took ${word(breaks)}. That is the match, right there.`, `I created the chances and did not finish them. ${opp} served well on most of them, to be fair.`, "I was too passive on the break points. I waited for a mistake that never came."], dry: [`${capital(word(O.bf))} break points. I'd like to return some of them, unused.`] });

  // ── the opponent ──
  if (them) {
    const best = ATTRS.slice().sort((x, y) => them[y] - them[x])[0];
    const praise = {
      srv: `${opp}'s serve is one of the best out there. I just tried to get as many returns in play as I could.`,
      fh: `${opp} hits the forehand so heavy that you cannot give any short balls.`,
      bh: `${opp}'s backhand does not break down. You have to find another way through.`,
      mov: `${opp} makes you play one more ball every time. You have to be patient and accept long rallies.`,
      sta: `${opp} does not get tired. If anything the level goes up as the match goes on.`,
      men: `${opp} never gives you a point for free mentally. You have to win every one of them.`,
    };
    add("opponent", 5, [`What makes ${opp} so difficult to play?`, `Your thoughts on ${opp} today?`, `How do you see ${opp}'s level right now?`], {
      all: [praise[best], won ? (sh.rout ? `I have a lot of respect for ${opp}'s game. Today I just did not let it breathe.` : `${opp} pushed me the whole way. I have a lot of respect for that game.`) : `${opp} was the better player today and deserved it.`],
      measured: [won ? `${opp} is a top player. I'm happy with how I managed the game plan.` : `${opp} executed very well. I'll study it.`, praise[best]],
      blunt: [won ? `${opp} is good. I was better today.` : `${opp} was better. End of story.`],
      intense: [won ? `${opp} made me suffer for every point. That's what I respect.` : `${opp} deserved it today. I'll be ready next time.`],
      dry: [won ? `${opp} is very good. I just happened to be slightly more annoying today.` : `${opp} was very good. Rude, even.`, won ? `${opp} played well. I asked them to stop, but nobody listens to me.` : `${opp} played like someone who had read my scouting report.`],
      upbeat: [`${opp} is a great player and a great competitor. It's always a pleasure.`, `I love the way ${opp} plays. It makes for great matches.`],
    }, { plain: true, more: [won ? { q: [`Do you expect to see ${opp} in more big matches?`], a: [`I hope so. Matches like this make you better.`, `For sure. ${opp} will be around the top for a long time.`] } : { q: [`What does ${opp} do better than anyone?`], a: [praise[best], `${opp} makes very few mistakes when it matters.`] }] });
  }

  // ── body and legs ──
  const upcoming = state.calendar[t.slot + 1];
  const nextWeek = upcoming
    ? { q: ["Will you play next week?", `Are you planning to play ${at(upcoming)}?`], a: en[who] < 55 && OPTIONAL[upcoming.tier] ? [`I'm entered in ${at(upcoming)}, but I'll decide with my team. Rest might be the smarter choice.`, "I'll see how the body feels in a couple of days. I'm not going to play hurt."] : [`I'll be there. You don't skip ${at(upcoming)}.`, `Yes. ${capital(at(upcoming))} is a big one for me.`] }
    : null;
  if (en[who] < 55)
    add("body", 7 + (55 - en[who]) / 10, ["You have played a lot of tennis lately. How is the body?", "You looked tired out there. Is fatigue a factor?"], { all: ["I felt it in the legs, I won't pretend otherwise. It has been a long few weeks.", "I'm not at one hundred percent, but at this stage of the season nobody is.", won ? "I managed my energy as well as I could. Now I need to recover." : "I did not have enough in the tank today. That is on me and my schedule."], dry: ["The body is fine. It's the legs, the back and the shoulder that have opinions."], blunt: ["Tired. Very tired."] }, { more: [nextWeek] });
  else if (sh.marathon)
    add("body", 6, [`${clock(m.mins)} on court. How do you feel physically?`, "That was a marathon. Will you recover in time?"], { all: ["I'm running on instinct more than tactics after that long.", "I feel fine now. Ask me again tomorrow morning.", "I've done the work for days like this. The body held up."], dry: ["Fantastic. I'm going to lie on the floor for a while, but fantastic."] }, { more: [nextWeek] });

  // ── form, streaks and the season ──
  if (won && sk[who] + 1 >= 6)
    add("streak", 5 + sk[who] / 5, [`That is ${sk[who] + 1} wins in a row. Are you counting?`, `${sk[who] + 1} straight wins. Is this the best form of your career?`], { all: ["I'm not counting them. The next one is the only one that matters.", "I have a lot of confidence right now, and in this sport that is half of everything.", `${sk[who] + 1} in a row is nice to hear, but it means nothing when I walk out next time.`], dry: ["I wasn't counting. Now I am. Thank you."], upbeat: ["I'm loving every minute! Let's keep it going."] }, { more: [{ q: ["What is working so well right now?", "What has changed in the last few weeks?"], a: { all: ["Nothing magical. I'm healthy, I'm practising well, and I'm making good decisions.", "Confidence. When you win, you stop thinking on the big points."], dry: ["I've stopped reading about myself. Highly recommend it."], intense: ["The work. Nobody sees the work."] } }] });
  if (!won && sk[who] >= 6) add("streak", 8, [`Your run of ${sk[who]} wins is over. How do you reflect on it?`, "The streak had to end sometime. Are you disappointed?"], { all: [`${capital(word(sk[who]))} wins was a good run. Streaks end, and I'll start another one.`, "I'm disappointed, of course. But I would sign for that run again tomorrow."], dry: ["Disappointed. Also slightly relieved to stop being asked about it."] });
  const sw = me.stats.w;
  const sl = me.stats.l;
  if (won && sw >= 15 && sw >= sl * 3) add("season", 4.5, [`You are ${sw}–${sl} this season. Are you surprised by your own consistency?`, `${sw} wins already this year. What has been the key?`], { all: ["I'm not surprised, because I see the work every day. But I'm happy.", "The key is that I'm healthy. When I'm healthy, I can play every week at a good level."], dry: ["I'm a little surprised. Don't tell anyone."], intense: ["I'm not satisfied. The big titles are what count."] }, { plain: true });
  const letter = t.surface[0];
  const surfW = me.stats[`${letter}W`] || 0;
  const surfL = me.stats[`${letter}L`] || 0;
  if (won && surfW >= 8 && surfW >= surfL * 3) add("surface", 4.2, [`That is ${surfW}–${surfL} on ${t.surface === "hard" ? "hard courts" : t.surface} this year. What clicks for you on this surface?`], { all: [`I feel at home on ${t.surface === "hard" ? "hard courts" : t.surface}. My game makes sense here.`, "I've learned to be patient on this surface. It took me a few years."], dry: ["I like it because I win on it. It's a simple relationship."] }, { plain: true });

  // ── history with this opponent ──
  const mine = h[who] + (won ? 1 : 0);
  const theirs = h[1 - who] + (won ? 0 : 1);
  if (mine + theirs >= 5)
    add("rivalry", 6 + (mine + theirs) / 6, [`That is ${mine + theirs} meetings between you and ${opp}. What does this rivalry mean to you?`, `It is ${mine}–${theirs} between you now. Do you think about the head-to-head?`], { all: ["We know each other's games inside out, so it comes down to execution on the day.", `${opp} brings out the best in me. I think we push each other.`, `It is ${mine}–${theirs} now, but every match starts at zero.`], dry: [`${mine}–${theirs}. I check it before I go to sleep.`], intense: [`It matters. Of course it matters. I want to be on the right side of it.`] }, { plain: true, more: [{ q: ["Is there extra pressure when you see that name in your section?"], a: { all: ["A little. You know it will be a proper fight.", "No. It's another match. A special one, but another match."], dry: ["Pressure? No. A sigh, maybe."] } }] });
  if (won && seq.length && seq[seq.length - 1].w === 1 - who && edgeOf(me) === 0)
    add("revenge", 5.5, [`${opp} beat you the last time you played. Did that sit with you?`], { all: ["A little. I watched that match again before today.", "You remember those. Today I wanted to show it was not the real me last time."], measured: ["I learned from the last one. That's all."], upbeat: ["A bit! It feels good to turn it around."] }, { plain: true });

  // ── the market ──
  if (won && mk && mk.win[who] >= 3.2) add("odds", 6, [`The bookmakers had you at ${american(mk.win[who])}. Did you know you were that big an outsider?`, "Very few people gave you a chance. Does that motivate you?"], { all: ["I don't look at any of that. I look at the ball.", "I heard I was a big outsider. Good, I hope somebody backed me.", "I think people forget that everyone in this draw can play."], dry: ["I'd have backed myself, but I'm told that's not allowed."] }, { plain: true });

  // ── criticism ──
  const now = year * 40 + event.week;
  const charge = Object.keys(TOPIC_WORDS).find((k) => state.critLog[`${me.id}:${k}`] && now - state.critLog[`${me.id}:${k}`] <= 12);
  if (charge)
    add("critics", 8, [`There has been criticism of ${TOPIC_WORDS[charge]} recently. Does it get to you?`, `People have been questioning ${TOPIC_WORDS[charge]}. What is your response?`], won ? { all: ["I read it. Today is my answer.", "I don't play for the people who write about me. I play for my team and for myself.", "I understand the questions. The only way to change the story is on the court, and I did that today."], dry: ["I'm told there was criticism. I'm told it was very good writing."], intense: ["Everything they wrote is in my head when I practise. Thank you to them."] } : { all: ["I read it, I'm not going to pretend I don't. Some of it is fair.", "I understand the questions. Results like this do not help me answer them.", "I know what I need to work on. I do not need to be told."], dry: ["They're going to write another one, aren't they?"] }, { plain: true, more: [{ q: ["Who are you trying to prove wrong?"], a: { all: ["Nobody. Maybe myself, a little.", "Nobody in particular. I just want to be the best version of my tennis."], intense: ["Everybody who said I couldn't."], dry: ["The list is long. I keep it in my bag."] } }] });

  // ── home, age, the occasion ──
  if (me.country && me.country === event.country)
    add("home", 6, ["How much did the home crowd help?", "What is it like playing in front of your own fans?"], { all: [won ? "I think the crowd carried me through the tough moments. Playing at home is special." : "I'm sorry I could not give the crowd more. They were incredible.", "I get goosebumps every time I walk out here."], upbeat: ["It's the best! I wish I could play every week at home."], dry: ["They were wonderful. Some of them even knew the score."] }, { plain: true, local: true, more: [won && !sh.final ? { q: ["What would it mean to win the title here?"], a: ["Everything. But there is a long way to go.", "I try not to think about that yet. One match at a time, even at home."] } : null] });
  if (me.age <= 20) add("age", 5, [`You are ${me.age}. Are you surprised to be at this level already?`], { all: [`I'm ${me.age}, and I'm here to learn. But I'm also here to win.`, "I try not to think about my age. On court it is just two players and a ball."], upbeat: ["I'm just enjoying it! Every week is a new adventure."] }, { plain: true });
  else if (me.age >= 35) add("age", 5, [`At ${me.age}, what keeps you going?`], { all: [`I appreciate these days more at ${me.age}. I do not know how many are left.`, "I still love the competition. The day that goes, I go."], dry: ["Stubbornness, mostly. And very good physios."] }, { plain: true });
  const lastYear = state.seasons.find((s) => s.year === year - 1);
  const defended = lastYear && lastYear.events.find((e) => e.abbr === event.abbr && e.champion === me.name);
  if (defended) add("defending", won && sh.final ? 8.8 : 6.5, won && sh.final ? ["You defended your title. Is that harder than winning it the first time?"] : won ? ["You are the defending champion here. Does that add pressure?"] : ["You came in as the defending champion. How much does this one sting?"], won ? { all: ["Defending is always harder. Everyone has watched you win here.", "I love this place, and I think it shows."], dry: ["I'm told it's harder. It felt about the same, but I'll take their word for it."] } : { all: ["It stings, but I have great memories here. I'll be back.", "The ranking points hurt a little. The memories don't."], blunt: ["It stings. Of course it stings."] }, { plain: !won });
  const indoorOrOut = event.indoor ? "indoor" : t.surface;
  if (hashOf(`${m.seed}:${who}:conditions`) % 2 === 0) add("conditions", 3.4, ["How were the conditions out there?", `How did the court feel today in ${event.city}?`], {
    indoor: ["Indoors there is nowhere to hide. No wind, no sun, just tennis.", "The ball flies a little indoors. You have to adjust the timing."],
    clay: ["Heavy today. The ball was not going through the court, so you had to build every point.", "Slow and heavy. Perfect if you like long points. Not perfect if you have a train to catch."],
    grass: ["The grass is still quick, and the bounce keeps you honest.", "Low and fast. You have to bend your knees all day."],
    hard: ["Quite quick today. The serve was getting a lot of help.", "A little wind at one end, so you had to be careful with the toss."],
  }[indoorOrOut], { plain: true, local: true });
  if (won && sh.final) {
    const n = seasonTitles(me, year);
    const big = honours(me);
    add("title", 9, t.tier === "slam" ? [`That is Grand Slam number ${big.slam}. What does that number mean to you?`, "Does this one feel different from the others?"] : [`Title number ${n} of the season. Are you surprised by your own consistency?`, `What does winning ${at(event)} mean to you?`], t.tier === "slam" ? { all: ["I dreamed about one of these as a kid. To be counting them is hard to believe.", `I never take a Slam for granted. ${capital(word(big.slam))} of them is beyond what I imagined.`], intense: ["It means I'm not finished. I want more of them."], dry: [`${capital(word(big.slam))}. I'm told it's a good number. I'd like a bigger one.`] } : { all: [`I don't take any of them for granted. ${capital(word(n))} this season is special.`, "I think every title has its own story. This one was about staying patient."], blunt: ["It means I'm playing well. Simple."] }, { keep: true });
  }
  if (!won && sh.final && me.stats.fL >= 2) add("title", 9, [`That is ${word(me.stats.fL)} finals lost this season. How do you deal with that?`], { all: ["I can't pretend losing finals does not hurt. But I keep putting myself there, and one will go my way.", "I would rather lose finals than lose in the first round. I'll keep knocking."], dry: ["I'm collecting silver. It goes with everything."] });
  if (E[who].rank <= 2) add("ranking", 4, ["How much do you think about the No. 1 ranking?"], { all: ["I think the ranking takes care of itself if I keep winning matches.", E[who].rank === 1 ? "I'm proud to be No. 1, but staying there is harder than getting there." : "I want to be No. 1. I'm not going to hide that."], dry: [E[who].rank === 1 ? "Every morning, briefly, and then I brush my teeth." : "I think about it the way you think about a holiday you haven't booked."] }, { plain: true });

  // ── what comes next ──
  if (won && nextMatch) {
    const other = nextMatch.a === m.winner ? nextMatch.b : nextMatch.a;
    if (other) {
      const nextName = shortName(t.entries[other].name);
      const [a2, b2] = h2hFor(state.h2h, me.id, other);
      add("next", 5, [`${nextName} is next. What do you expect?`, `How do you prepare for ${nextName}?`], { all: [`It will be a completely different match against ${nextName}, and I need to recover well first.`, `I'll watch a little of ${nextName} tonight and make a plan with my team.`, `${nextName} is playing great tennis. I will have to be at my best.`], dry: [`${nextName}? I'll prepare by sleeping. Then by worrying.`], intense: [`I'm ready for ${nextName}. I'm ready for anyone this week.`] }, {
        more: [a2 + b2 > 0 ? { q: [`You are ${a2}–${b2} against ${nextName}. Does that matter?`], a: a2 > b2 ? ["A little confidence, maybe. But the past doesn't win you points.", `It's nice to have, but ${nextName} will have a plan for me.`] : a2 < b2 ? ["It matters only if I let it. I'll try to write a new chapter.", `${nextName} has had the better of me. That's the challenge.`] : ["It's level, so it's a fresh start. I like that."] } : { q: [`What is the key against ${nextName}?`], a: ["Serve well and take my chances. It sounds simple. It isn't.", `Don't let ${nextName} dictate. I want to be the one moving them around.`] }],
      });
    }
  }
  if (!won) add("next", 4, ["What comes next for you?", "How do you bounce back from this?"], { all: [upcoming ? `I'll take a couple of days, then it is back to work. ${capital(at(upcoming))} comes around quickly.` : "I'll take a proper break now. It has been a long season.", "I'll go back to the practice court. That is the only answer I know."], dry: ["A sad dinner, a good sleep, and back to work. In that order."], upbeat: ["Back to work tomorrow! Every loss teaches you something."] });

  // ── the needle ──
  const heard = needle(state, f, 1 - who);
  const barb = heard && !won ? null : needle(state, f, who); // when the winner has had a go, the loser answers it and leaves it there
  const press = (topic) => PRESS[hashOf(`${m.seed}:${who}:${topic}:press`) % PRESS.length];
  if (barb) out.push({ topic: "needle", by: press("needle"), weight: 9.6, q: barb.q, a: barb.text, more: [] });
  if (heard && !(barb && won)) out.push({ topic: "reply", by: press("reply"), weight: 9.3, q: `${opp} said this about you: “${heard.text}” What is your response?`, a: needleReply(f, who, state).text, more: [] });
  add("numbers", 3, [`${S.wn} winners and ${S.ue} unforced errors. Is that the balance you want?`, `You hit ${S.wn} winners. Were you happy with how aggressive you were?`], {
    all: [S.wn >= S.ue ? "I'm happy with that balance. When I'm aggressive and it stays inside the lines, I'm hard to beat." : "I made too many errors, and I know it. I would rather miss going for it than push the ball, but there is a limit.", S.wn >= S.ue ? "That's the balance I want. Take the ball early, but stay patient." : "Too many errors. Some were bad decisions, some were bad execution."],
    measured: [S.wn >= S.ue ? "It's a healthy balance. I made good decisions about when to go." : "The errors came at the wrong moments. I'll look at that."],
    blunt: [S.wn >= S.ue ? "Yes." : "No. Too many errors."],
    dry: [S.wn >= S.ue ? "More winners than errors. My coach will frame it." : "I'd like to blame the balls. I won't. Mostly."],
    intense: [S.wn >= S.ue ? "It's a good number. I want it better." : "Unacceptable error count. I'll fix it in practice tomorrow."],
    upbeat: [S.wn >= S.ue ? "I was going for my shots and they were going in! Best feeling." : "I was going for it! Some days they go in, some days they don't."],
  });

  return { voice, qa: out.sort((x, y) => y.weight - x.weight).map(({ q, a, topic, by, more }) => ({ q, a, topic, by, more: more || [] })) };
}

// Before the match: two questions each, built only from what was known before the first ball
// (the head-to-head going in, the streaks, the road through the draw, the market, any feud on file).
function pressCall(state, f) {
  const { m, N, P, E, t, event, key, sk, h, en, mk, seq, road } = f;
  if (!P[0] || !P[1]) return [];
  const now = t.year * 40 + event.week;
  const filed = (state.feuds || {})[pairKey(m.a, m.b)];
  const feud = filed && filed.w === now ? filed.prev || null : filed; // nothing said after this match counts here
  const warm = !!feud && now - feud.w <= FEUD_WEEKS;
  const lastYear = state.seasons.find((s) => s.year === t.year - 1);
  const holder = lastYear && (lastYear.events.find((e) => e.abbr === event.abbr) || {}).champion;
  const stage = key === "F" ? `the ${event.name} title` : STAKE[key];
  return [0, 1].map((who) => {
    const me = P[who];
    const opp = N[1 - who];
    const voice = voiceOf(me);
    const rnd = makeRng(hashOf(`${m.a}:${m.b}:${t.slot}:${t.year}:${who}:pre`));
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    const meetings = h[0] + h[1];
    const last = seq.length ? seq[seq.length - 1].w : -1;
    const odds = mk ? mk.win[who] : 2;
    const topics = [];
    const ask = (topic, weight, questions, answers) => topics.push({ topic, weight: weight + rnd() * 1.5, questions, answers });

    if (warm)
      ask("feud", 9, [`There were words between you and ${opp} after ${feud.ev}. Is that on your mind?`, `Last time, things were said with ${opp}. Will that add anything tomorrow?`], edgeOf(me) >= 2
        ? { all: ["I haven't forgotten. I don't think anyone has.", `${opp} knows where to find me. On the court.`], dry: ["I've been told I'm supposed to be angry. I'll try my best."], blunt: ["It's on my mind. It'll be on the scoreboard too."], intense: ["Every word is still in my head. Good. I'll need it."] }
        : { all: ["That's in the past. Tomorrow is a tennis match.", "I don't need extra motivation. It's a big match anyway."], measured: [`I respect ${opp}. Whatever was said, it stays off the court.`], upbeat: ["I'm just excited to play! The rest is noise."] });
    if (meetings >= 5)
      ask("rivalry", 7, [`It is ${h[who]}–${h[1 - who]} between you and ${opp}. What does this matchup come down to?`, `Meeting number ${meetings + 1} with ${opp}. Is there anything left to surprise each other with?`], h[who] > h[1 - who]
        ? { all: ["I know what works against this game. Now I have to do it again.", "The record is good, but it doesn't give me a single point tomorrow."], dry: [`${h[who]}–${h[1 - who]}. I try not to bring it up. Except when asked. Like now.`] }
        : h[who] < h[1 - who]
          ? { all: [`${opp} has had my number. I'm working on a new number.`, "I've lost more of these than I've won. That only makes me hungrier."], intense: ["I hate that record. Tomorrow I start changing it."] }
          : { all: ["It's level, so it's anyone's. I like that.", "Nothing between us over the years. It'll come down to a few points again."] });
    else if (last === 1 - who)
      ask("rematch", 6.5, [`${opp} won your last meeting. What will you do differently?`, "You lost the last one against this opponent. Have you looked at that match again?"], { all: ["I watched it back twice. There are things I can do better, and I know what they are.", "Be braver. That's the summary."], dry: ["I watched it once. Once was plenty."], intense: ["I've thought about that match more than I'd like to admit."], upbeat: ["Of course! It's a new day and a new chance."] });
    else if (last === who)
      ask("rematch", 6, [`You won the last meeting with ${opp}. Does that give you an edge?`], { all: ["Maybe a little in my head. But it will be a new match with new problems.", `${opp} will have watched that match. I expect something different.`], dry: ["It gives me a pleasant memory. That's about all."] });
    if (odds >= 3)
      ask("outsider", 8, [`You are a big outsider against ${opp}. How do you approach it?`, "Most people expect you to lose. Does that free you up?"], { all: ["No pressure on me. All of it is on the other side of the net.", "I'll go out and swing. If it goes in, we'll see what happens."], dry: ["I'm told I have no chance. I've been told that before. Sometimes they were right."], blunt: ["I don't care what people expect."], intense: ["I'm not here to make up the numbers."], upbeat: ["I love these matches! Nothing to lose, everything to enjoy."] });
    else if (odds <= 1.3 && E[1 - who].rank >= 25)
      ask("favourite", 6, ["You are the clear favourite. Is there a danger of taking it lightly?", `On paper you should beat ${opp}. How do you stay switched on?`], { all: ["No match is easy at this level. I'll treat it like a final.", `${opp} has nothing to lose, which makes them dangerous.`], dry: ["The paper doesn't play. Unfortunately, I do."], blunt: ["I don't take anybody lightly."] });
    if (key === "F")
      ask("stage", 8.5, [`One match from ${stage}. How do you handle the nerves?`, "What does it mean to be in this final?"], { all: ["I'll be nervous, and that's good. It means it matters.", "I try to treat it like any other match. I know it isn't."], dry: ["I'll be terrified, but very professionally terrified."], intense: ["I didn't come here for a final. I came for the trophy."], upbeat: ["I'm so excited! These are the matches you play for."], measured: ["Calm preparation, a good sleep, and then we see."] });
    else if (t.tier === "slam" && (key === "SF" || key === "QF"))
      ask("stage", 7.5, [`${capital(stage)} is on the line. Does it feel different at a major?`], { all: ["Everything is bigger at a Slam. The stadium, the noise, the nerves.", "It's best of five, so you have time. That changes how you think."], dry: ["It's the same tennis with louder people watching."] });
    const z = road[who];
    if (z.wins >= 3 && z.dropped === 0)
      ask("road", 6.5, ["You haven't dropped a set all week. Can you keep that going?", `${word(z.wins)} matches, no sets lost. What has been working?`], { all: ["I'm not thinking about sets. I'm thinking about the next point.", "I've been serving well, and that makes everything easier."], dry: ["Please don't say that out loud. You'll jinx it."], blunt: ["It doesn't matter how I got here."] });
    else if (z.mins >= (TIERS[t.tier].bestOf === 5 ? 600 : 360))
      ask("road", 7, [`You have spent ${clock(z.mins)} on court this week. How are the legs?`], { all: ["The legs are fine. Adrenaline helps at this stage.", "I'll be fine. I've done the work for weeks like this one."], dry: ["The legs have filed a complaint. I've ignored it."], intense: ["I could play another ten hours if I have to."] });
    if (en[who] < 55)
      ask("tired", 7.5, ["You have played a lot recently. Are you running on empty?"], { all: ["I'm a bit tired, of course. Everybody is at this point.", "I'll recover as well as I can tonight. That's all I can do."], dry: ["Empty is a strong word. Low. Very low."], blunt: ["I'm tired. I'll play anyway."] });
    if (sk[who] >= 6)
      ask("streak", 6, [`${sk[who]} wins in a row. Does the streak weigh on you?`], { all: ["I don't think about it. I think about the next match.", "It gives me confidence. I'm not going to pretend otherwise."], dry: [`I didn't know it was ${sk[who]}. Now I'll think about nothing else, thanks.`] });
    if (me.country && me.country === event.country)
      ask("home", 6.5, ["What do you expect from the home crowd?", "Is there extra pressure playing at home?"], { all: ["They'll be loud. I'm counting on it.", "There's pressure, but it's the good kind."], upbeat: ["I can't wait! It's the best atmosphere I play in all year."], dry: ["They'll cheer. I'll try to give them reasons."] });
    if (holder === me.name)
      ask("holder", 7, ["You won this title last year. Does defending it change anything?"], { all: ["It's a new year and a new draw. I start from zero like everyone else.", "I have good memories here. I want to make some more."], dry: ["It changes the photos on the walls, that's about it."] });
    ask("opponent", 4, [`What do you expect from ${opp}?`, `How do you see ${opp}'s game right now?`, `What is the key against ${opp}?`, `How do you plan to play ${opp}?`], {
      all: [`${opp} is playing well. I'll have to be at my best.`, `I know ${opp}'s game. The question is who imposes theirs first.`, "Serve well, return deep, and be patient. It sounds simple.", `${opp} doesn't give you much. I'll have to earn everything.`],
      measured: [`${opp} is a complete player. I'll need a clear plan and patience.`, "I'll stick to my game and adjust if I need to. Nothing fancy.", `I've watched a lot of ${opp} this week. There are a few things I want to try.`],
      blunt: [`${opp} is good. So am I.`, "I'll play my game. If it works, I win.", `I'm not worried about ${opp}. I'm worried about me.`],
      upbeat: [`${opp} is a great player and it'll be a fun match.`, "I can't wait! It's going to be a great battle.", `I love playing ${opp}. We always have good matches.`],
      intense: [`I respect ${opp}. Tomorrow I don't.`, "I'm ready. I've been ready since this morning.", "It will be a fight. Good. I like fights."],
      dry: [`I expect ${opp} to hit the ball over the net a lot. I'll try to do it more.`, `I'll do my best impression of someone who beats ${opp}.`, "A plan? Yes. I'm not telling you, obviously."],
    });

    const chosen = topics.sort((a, b) => b.weight - a.weight).slice(0, 2);
    return {
      side: who,
      name: E[who].name,
      voice,
      lines: chosen.map((x) => ({ topic: x.topic, by: PRESS[hashOf(`${m.a}:${m.b}:${who}:${x.topic}:pre`) % PRESS.length], q: tidy(pick(x.questions)), a: tidy(lineFor(voice, rnd, x.answers)) })),
    };
  });
}

/* ────────────────────────────── Needle ────────────────────────────── */
// Trash talk, when the player is the type and the moment has earned it. It is competitive needle about
// the tennis and nothing else: the scoreboard, the rivalry, a streak, the odds, the critics.
// A player's edge runs from 0 (never) to 3 (enjoys it); measured and upbeat characters stop at an occasional jab.

const edgeOf = (p) => {
  if (TEMPER[p.id]) return TEMPER[p.id][1];
  const roll = hashOf(`${p.id}:edge`) % 10;
  const edge = roll < 4 ? 0 : roll < 7 ? 1 : roll < 9 ? 2 : 3;
  const voice = voiceOf(p);
  return voice === "measured" || voice === "upbeat" ? Math.min(edge, 1) : edge;
};
const FEUD_WEEKS = 40; // a feud stays warm for about a season

// Returns { kind, q, text } when this player has something pointed to say after this match, or null.
function needle(state, f, who) {
  const { m, N, P, E, t, event, sk, h, mk, seq, key } = f;
  const me = P[who];
  if (!me || !P[1 - who] || !m.winner) return null;
  const edge = edgeOf(me);
  if (!edge) return null;
  const sh = shapeOf(f);
  const won = who === sh.w;
  const opp = N[1 - who];
  const voice = voiceOf(me);
  const mine = h[who] + (won ? 1 : 0);
  const theirs = h[1 - who] + (won ? 0 : 1);
  const lastWent = seq.length ? seq[seq.length - 1].w : -1;
  const now = t.year * 40 + event.week;
  const filed = (state.feuds || {})[pairKey(m.a, m.b)];
  const feud = filed && filed.w === now ? filed.prev || null : filed; // words that came out of this match are not its history
  const warm = !!feud && now - feud.w <= FEUD_WEEKS;
  const rounds = warm ? feud.n || 1 : 0; // exchanges already on file between these two
  if (feud && feud.by === me.id && now > feud.w && now - feud.w < 20) return null; // the same jab at the same opponent does not get repeated within 20 weeks
  const criticised = Object.keys(TOPIC_WORDS).some((k) => state.critLog[`${me.id}:${k}`] && now - state.critLog[`${me.id}:${k}`] <= 12);

  // what has built up: each reason adds heat, and the first one listed that applies supplies the line
  const reasons = [];
  if (warm && feud.by !== me.id) reasons.push(["feud", 1]); // the one who was talked about has a reason to answer
  if (won) {
    if (lastWent === 1 - who) reasons.push(["revenge", seq[seq.length - 1].dec ? 2 : 1]); // a close defeat last time stings more
    if (mk && mk.win[who] >= 3.5) reasons.push(["upset", 2]);
    if (mine - theirs >= 4 || (seq.length >= 4 && seq.slice(-4).every((x) => x.w === who))) reasons.push(["dominance", 2]);
    if (sk[1 - who] >= 8) reasons.push(["streak", 1]);
    if (sh.rout && E[1 - who].rank <= 10) reasons.push(["rout", 1]);
    if (criticised) reasons.push(["critics", 1]);
  } else {
    if (mine > theirs && mine + theirs >= 5) reasons.push(["stillAhead", 2]);
    if (!sh.straight && mine + theirs >= 6) reasons.push(["nextTime", 2]);
  }
  if (mine + theirs >= 6) reasons.push(["rivalry", 1]);
  if (key === "F") reasons.push(["stage", 1]);
  const heat = reasons.reduce((n, x) => n + x[1], 0);
  // the bar: a player who rarely does this needs a lot of reasons, one who enjoys it needs fewer
  if (heat < (edge === 1 ? 6 : edge === 2 ? 5 : 4)) return null;
  if (!won && !reasons.some(([k]) => k === "stillAhead" || k === "nextTime")) return null;

  const lines = {
    feud: {
      q: [`Things were said after ${feud ? feud.ev : "your last meeting"}. Was today the answer?`, `There has been needle between you and ${opp}. Did this one mean more?`],
      a: won
        ? {
            all: [`I heard what was said after ${feud ? feud.ev : "last time"}. I prefer to answer out there.`, `${opp} had a lot to say last time. Today I did not hear very much.`, "Some people talk in press rooms. I talk between the lines.", "I said nothing all week on purpose. This was the reply."].concat(rounds >= 2 ? [`This is round ${word(rounds + 1)} between us. I'm starting to enjoy it.`, `${opp} keeps the conversation going. I keep winning it.`] : []),
            dry: ["I was told there were some words. I brought a racquet instead. It seemed to work.", `I'd quote ${opp} back, but I've forgotten what was said. Today helped.`],
            blunt: ["They talked. I won. That's the whole story.", `${opp} should talk less and serve better.`],
            intense: ["I remembered every word. Every single word. Today I answered.", "I don't forget things like that. Ever."],
          }
        : { all: [`${opp} can enjoy this one. It does not change what I think.`, "The talking will stop when I win the next one, and I will.", "I'll keep saying what I think. One result does not change it."], dry: [`${opp} won a tennis match. Congratulations. The conversation continues.`], blunt: ["One match. I still mean what I said."] },
    },
    revenge: {
      q: [`${opp} beat you last time. Did that make this one sweeter?`, `You had a score to settle with ${opp}. Is it settled?`],
      // "had my number" only makes sense from the player who has been losing these
      a: [`I remembered the last one all week. I think ${opp} will remember this one.`, `Last time there was a lot of celebrating on the other side of the net. Today it was very quiet over there.`, "I kept the highlights from last time on my phone. I can delete them now.", `I owed ${opp} one. Consider it paid.`, "Everyone called the last one a turning point. It turned back today."].concat(theirs >= mine ? [`People said ${opp} had my number. I'd suggest they look at the scoreboard.`] : [`${opp} got one last time. Normal service has resumed.`]).concat(voice === "dry" ? ["I've been told revenge is a dish best served cold. Today it was served in straight lines."] : voice === "intense" ? ["I thought about the last one every day in practice. Every day."] : voice === "blunt" ? [`${opp} beat me once. That's enough.`] : []),
    },
    upset: {
      q: [`Not many people gave you a chance against ${opp}. Anything to say to them?`, `You were ${mk ? american(mk.win[who]) : "a big outsider"} with the bookmakers. Any message?`],
      a: [`Everybody had ${opp} in the next round already. Somebody forgot to tell me.`, "The number next to my name did not hit a single ball today.", `Maybe next time ${opp}'s team will watch some video of me first.`, `I saw the odds this morning. Somebody lost a lot of money on ${opp} today.`, "Rankings are for the draw sheet. On the court it was two players, and one of them was better."].concat(voice === "dry" ? ["I'm sorry to everyone who had money on the other side. Not very sorry."] : voice === "blunt" ? ["Write me off again. Please."] : []),
    },
    dominance: {
      q: [`It is ${mine}–${theirs} against ${opp} now. Is this still a rivalry?`, `You keep beating ${opp}. Why does this matchup suit you so well?`],
      a: [`It is ${mine}–${theirs} now. At some point it stops being a rivalry.`, `${opp} keeps trying new things against me. I keep getting the same result.`, `I like this matchup. I'm not sure ${opp} does.`, "I'd like to say it gets harder every time. It doesn't.", `Ask ${opp} what the plan was. I never found out.`].concat(voice === "dry" ? [`${opp} is a wonderful player. Against other people.`] : voice === "intense" ? ["I don't relax against anybody. Especially not when it's going this well."] : []),
    },
    streak: {
      q: [`You ended a run of ${sk[1 - who]} wins for ${opp}. How does that feel?`],
      a: ["Streaks are nice until you run into someone who does not care about them.", `${capital(word(sk[1 - who]))} in a row, and then me.`, `Everybody wanted to talk about the streak this week. Nobody will ask ${opp} about it tomorrow.`],
    },
    rout: {
      q: [`That was very one-sided against a top-10 player. Were you surprised?`],
      a: ["I expected more of a fight, to be honest.", `If that is the level ${opp} has right now, I'd be a little worried in that camp.`, "I had a dinner reservation. I'll make it with time to spare."],
    },
    critics: {
      q: ["A lot has been written about you lately. Is this win a reply?"],
      a: ["To everyone who wrote me off last month: please keep writing.", "I read all of it. I keep a list, and today I crossed a few names off.", "Funny how quiet it gets after a result like this."],
    },
    stillAhead: {
      q: [`${opp} got the better of you today. Does it change the picture between you?`],
      a: [`One match does not change who has been winning these. It is still ${mine}–${theirs}.`, `${opp} needed that one more than I did. Check the head-to-head.`, `Let ${opp} have a good night. The record between us says plenty.`],
    },
    nextTime: {
      q: [`You and ${opp} will surely meet again. What happens next time?`],
      a: [`${opp} played the big points well today. Let's see if that holds the next time we play.`, `Enjoy it. I'll see ${opp} again soon enough.`, `That was the best ${opp} can play, and it was still close. I know which of us has more to find.`],
    },
    rivalry: {
      q: [`You and ${opp} have a lot of history. Is there any love lost?`],
      a: [`${opp} keeps saying how much these matches are wanted. Be careful what you wish for.`, "We are not friends on the court. We can be friends after we retire.", `We have played ${mine + theirs} times now. I think I enjoy these more than ${opp} does.`],
    },
  };
  const kind = (reasons.find(([k]) => lines[k] && (won || k === "stillAhead" || k === "nextTime" || k === "feud")) || [])[0];
  if (!kind) return null;
  const rnd = makeRng(hashOf(`${m.seed}:${who}:needle`));
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const q = pick(lines[kind].q);
  return { kind, q, text: tidy(lineFor(voice, rnd, lines[kind].a)), rounds };
}

// What a player says when the other side's words are read back. state (optional) tells it whether this has happened before.
function needleReply(f, who, state) {
  const { m, N, P, h, t, event } = f;
  const me = P[who];
  const opp = N[1 - who];
  const won = m.winner === (who === 0 ? m.a : m.b);
  const mine = h[who] + (won ? 1 : 0);
  const theirs = h[1 - who] + (won ? 0 : 1);
  const voice = voiceOf(me);
  const now = t.year * 40 + event.week;
  const filed = state && (state.feuds || {})[pairKey(m.a, m.b)];
  const feud = filed && filed.w === now ? filed.prev || null : filed;
  const again = !!feud && now - feud.w <= FEUD_WEEKS;
  const rnd = makeRng(hashOf(`${m.seed}:${who}:reply`));
  const sharp = edgeOf(me) >= 2;
  const lines = sharp
    ? {
        all: [
          mine > theirs ? `Talk is cheap. It is ${mine}–${theirs}, and that is the only quote I need.` : "Talk is cheap. I'll remember it the next time we play.",
          `${opp} is very brave in a press room. We'll see about next time.`,
          "I'll remember that. I have a good memory for these things.",
          `That is a lot of talk from ${opp}. I'll save my answer for the court.`,
          won ? "It is easy to talk. It is harder to win, as we saw today." : "Enjoy the microphone. It is a long season.",
        ].concat(again ? ["Again? I'll answer the same way as last time: on the court.", `${opp} must really enjoy talking about me. I'm flattered.`] : []),
        dry: [`${opp} said that? Lovely. I'll have it framed.`, "I'm told it was a very good line. I'll have to take everyone's word for it.", "I'd respond, but I'd hate to spoil the mystery."],
        blunt: ["Whatever. See you next time.", `${opp} can say what they like. I'll be there next time.`, "Words don't win sets."],
        intense: ["Good. I'll use it. Every word.", `Tell ${opp} I heard it. That's all.`, "I'm writing it down. Literally."],
        upbeat: ["Ha! Fine. That makes the next one even more fun.", "I love it. Bring on the next match."],
      }
    : {
        all: ["I'm not going to get into that. The tennis can do the talking.", "Everyone is entitled to an opinion. I'll answer on the court.", "I did not hear it, and I do not need to.", "I have nothing to add. The match is over and the result is the result.", "That is one way to see it. I see it differently, and I'll leave it there.", "I respect every opponent. I'd rather talk about the tennis."].concat(again ? ["We've done this before. I'll pass again."] : []),
        measured: [`I have a lot of respect for ${opp}. That doesn't change because of one comment.`, "I'll let that one go. There's no point adding to it."],
        upbeat: ["Ha, okay! I'm just happy playing my tennis.", "I'll send a smile back. That's my answer."],
        dry: ["I'm told it was a strong line. I'll take their word for it.", "I've been called worse by my own coach."],
        blunt: ["Don't care.", "Fine. Next question."],
        intense: ["I don't need to answer that. I'll answer with my tennis."],
      };
  return { sharp, text: tidy(lineFor(voice, rnd, lines)) };
}

// When the reply was sharp, a player who enjoys this gets the last word in the story.
function needleLastWord(f, side) {
  const { m, N, P } = f;
  const me = P[side];
  const target = N[1 - side];
  const rnd = makeRng(hashOf(`${m.seed}:${side}:last`));
  return tidy(lineFor(voiceOf(me), rnd, {
    all: [`Tell ${target} I said hello.`, "That's fine. The scoreboard keeps the minutes.", "Good. Then we both have something to look forward to."],
    dry: ["I'm told there was a reply. I'll read it on the plane, if the film is bad.", `Lovely. ${target} gets the last word, I get the win. Seems fair.`],
    blunt: ["Fine. See you on court.", "Good. Then we agree on one thing: the next match."],
    intense: ["I meant every word. Nothing has changed.", "Good. I want them angry. Angry players miss."],
    upbeat: ["Ha! I like it. See you next time!"],
  }));
}

// Words exchanged after a match become a story, and the feud is remembered for next time.
function needleArticles(world, t, event, played) {
  const feuds = { ...(world.feuds || {}) };
  const items = [];
  const stamp = { y: t.year, w: event.week, city: event.city };
  const now = t.year * 40 + event.week;
  // one exchange per tournament is plenty
  const already = (world.news || []).some((n) => n.k === "words" && n.y === t.year && n.w === event.week);
  played.forEach(({ m, r, key }) => {
    if (already || items.length) return;
    if (!isBigMatch(t, r, m)) return; // only the matches that already had the spotlight
    const f = matchFacts(world, t, r, t.rounds[r].matches.indexOf(m));
    if (!f.P[0] || !f.P[1]) return;
    const w = m.winner === m.a ? 0 : 1;
    const side = needle(world, f, w) ? w : needle(world, f, 1 - w) ? 1 - w : -1;
    if (side < 0) return;
    const barb = needle(world, f, side);
    const back = needleReply(f, 1 - side, world);
    const last = back.sharp && edgeOf(f.P[side]) >= 2 ? needleLastWord(f, side) : null;
    const [speaker, target] = [f.E[side], f.E[1 - side]];
    const hh = h2hFor(world.h2h, speaker.id, target.id);
    const before = feuds[pairKey(m.a, m.b)];
    const round = ROUND_LABEL[key].toLowerCase().replace(/s$/, "");
    items.push(
      article(stamp, "words", back.sharp ? `${shortName(speaker.name)} and ${shortName(target.name)} trade words in ${event.city}` : `${shortName(speaker.name)} has a message for ${shortName(target.name)} after ${event.city} ${side === w ? "win" : "defeat"}`, `It started on court, in the ${round} of ${at(event)}, and carried on afterwards.`, [
        `${f.E[w].name} beat ${f.E[1 - w].name} ${scoreLine(m)} in the ${round} of ${at(event)}. What was said afterwards may be remembered just as long.`,
        `${speaker.name}, asked about ${shortName(target.name)}: “${barb.text}”`,
        `${target.name}, when the words were read back: “${back.text}”`,
        last ? `Told of the reply, ${shortName(speaker.name)} had the last word: “${last}”` : "",
        `${hh[0] === hh[1] ? `It is ${hh[0]}–${hh[1]} between them` : `${shortName(hh[0] > hh[1] ? speaker.name : target.name)} leads their head-to-head ${Math.max(hh[0], hh[1])}–${Math.min(hh[0], hh[1])}`}.${before && now - before.w <= FEUD_WEEKS ? ` It is not the first time: there were words after ${before.ev} as well${(before.n || 1) >= 2 ? `, and ${word(before.n)} exchanges before that` : ""}.` : ""} The next meeting has just become more interesting.`,
      ].filter(Boolean), [["Head-to-head", `${hh[0]}–${hh[1]}`], ["Result", scoreLine(m)], ["Round", ROUND_LABEL[key].replace(/s$/, "")]], [speaker.id, target.id])
    );
    const warmBefore = before && now - before.w <= FEUD_WEEKS;
    feuds[pairKey(m.a, m.b)] = { w: now, ev: `${at(event)} ${t.year}`, by: speaker.id, n: (warmBefore ? before.n || 1 : 0) + 1, prev: warmBefore ? { w: before.w, ev: before.ev, by: before.by, n: before.n || 1 } : null };
  });
  return { items, feuds };
}

/* ────────────────────────────── GOAT debate ────────────────────────────── */
// Three rooms arguing over the same list: the players vote, the analysts each rank by their own yardstick,
// and the fans react to whatever just happened. Everything is rebuilt from the save, so the debate moves as
// titles are won. All of it is generated: nobody named here said these words.

// Where the retired greats won their majors, for the arguments about range.
const LEGEND_SLAMS = {
  "Rafael Nadal": { ao: 2, rg: 14, wim: 2, uso: 4 },
  "Roger Federer": { ao: 6, rg: 1, wim: 8, uso: 5 },
  "Pete Sampras": { ao: 2, wim: 7, uso: 5 },
  "Andre Agassi": { ao: 4, rg: 1, wim: 1, uso: 2 },
  "Andy Murray": { wim: 2, uso: 1 },
};
const MAJOR_NAME = Object.fromEntries(SLAM_IDS.map((id) => [id, at(EVENTS.find((e) => e.id === id))])); // "the Australian Open", "Roland Garros"
const MAJOR_ABBR = { ao: "AO", rg: "RG", wim: "W", uso: "US" };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n));

// The names in the argument: the top of the all-time list, with the detail each room needs.
function goatField(state) {
  const ranked = rankBy(state.players, totalPoints);
  const ranks = rankMap(ranked);
  const source = {};
  const rows = state.players
    .map((p) => ({ id: p.id, name: p.name, kind: "active", age: p.age, country: p.country, h: honours(p), rank: ranks[p.id] }))
    .concat(
      state.retired.map((r) => ({ id: r.id, name: r.name, kind: "retired", age: r.age, country: r.country, h: honours(r), rank: null })),
      LEGENDS.map(([name, country, v]) => ({ id: `legend-${slug(name)}`, name, kind: "legend", age: null, country, h: { slam: v[0], finals: v[1], masters: v[2], weeks: v[3], ye: v[4] }, rank: null }))
    )
    .map((r) => ({ ...r, score: goatScore(r.h) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.h.slam - a.h.slam || (a.id < b.id ? -1 : 1));
  state.players.concat(state.retired).forEach((p) => {
    source[p.id] = p;
  });
  const field = rows.slice(0, 8).map((c, i) => {
    const majors = { ao: 0, rg: 0, wim: 0, uso: 0, ...(source[c.id] ? Object.fromEntries(slamBreakdown(state, source[c.id]).map((x) => [x.id, x.n])) : LEGEND_SLAMS[c.name]) };
    return {
      ...c,
      place: i + 1,
      short: shortName(c.name),
      majors,
      big: c.h.slam + c.h.finals + c.h.masters,
      range: SLAM_IDS.reduce((n, id) => n + Math.min(majors[id], 4), 0), // no more than four counted at any one major
    };
  });
  return { field, ranked, ranks, source, rows: rows.map((r) => ({ ...r, short: shortName(r.name) })) };
}

/* ── Room one: the players ── */
// Each player in the top 40 has a way of judging greatness, and a vote. Most count something; a good few go on feel.
const DEBATE_LENS = ["majors", "majors", "majors", "ledger", "ledger", "top", "top", "eye", "eye", "eye", "eye", "eye"];

function lockerRoom(state, F, salt) {
  const { field, ranked, ranks, source } = F;
  const most = (pick) => Math.max(1, ...field.map(pick));
  const top = { slam: most((c) => c.h.slam), score: most((c) => c.score), weeks: most((c) => c.h.weeks), ye: most((c) => c.h.ye) };
  const voters = ranked.slice(0, 40);

  const ballots = voters.map((v) => {
    const lens = DEBATE_LENS[hashOf(`${v.id}:lens`) % DEBATE_LENS.length];
    const scored = field
      .filter((c) => c.id !== v.id)
      .map((c) => {
        const taste = (hashOf(`${v.id}:${c.id}:taste`) % 100) / 100;
        const base = lens === "majors" ? c.h.slam / top.slam : lens === "ledger" ? c.score / top.score : lens === "top" ? 0.7 * (c.h.weeks / top.weeks) + 0.3 * (c.h.ye / top.ye) : 0.5 * (c.score / top.score) + 0.5 * taste;
        const home = c.country && c.country === v.country ? 0.12 : 0; // a compatriot gets the benefit of the doubt
        const met = c.kind === "active" ? h2hFor(state.h2h, v.id, c.id) : [0, 0];
        const faced = met[0] + met[1] >= 3 && met[1] > met[0] ? 0.08 : 0; // losing to someone is persuasive
        return { c, met, home, faced, value: base + taste * 0.14 + home + faced };
      })
      .sort((a, b) => b.value - a.value);
    const [best, next] = scored;
    const reason = best.home && next && best.value - best.home < next.value ? "home" : best.faced && next && best.value - best.faced < next.value ? "faced" : lens;
    return { v, pick: best.c, met: best.met, reason };
  });

  const say = (b) => {
    const { v, pick, met, reason } = b;
    const P = pick.short;
    const h = pick.h;
    const done = pick.kind !== "active";
    const mine = honours(v);
    const lines = {
      majors: [
        `${P}. ${plural(h.slam, "Grand Slam")}. For me the conversation ends there.`,
        `You count the majors and you have your answer. It is ${P}, with ${h.slam}.`,
        `Two weeks, seven matches, best of five. That is the real test, and ${P} passed it ${h.slam} times.`,
        `Ask any kid what they dream about. It is not a ranking. It is a major. ${P}.`,
        h.slam >= top.slam ? `The Slams are what we all play for, and nobody has more than ${P}.` : `The Slams are what we all play for, and ${P} ${done ? "won" : "has"} ${h.slam} of them.`,
      ],
      ledger: [
        `Add everything up, the Slams, the Masters, the weeks at No. 1, and it is ${P}.`,
        `${P}. Look at the whole record, not one line of it.`,
        `People pick one number that suits their favourite. Take all of the numbers and it is ${P}.`,
        `${plural(h.slam, "Slam")}, ${h.masters} Masters, ${h.weeks} weeks at No. 1. I don't know what else ${P} ${done ? "was" : "is"} supposed to do.`,
      ],
      top: [
        mine.weeks > 0 ? `${h.weeks} weeks at No. 1. I know how hard it is to stay there. ${P}.` : `${h.weeks} weeks at No. 1. I have not had one. It has to be ${P}.`,
        `Winning a big title is two good weeks. ${h.weeks} weeks at No. 1 is years of never having a bad one. ${P}.`,
        h.ye > 1 ? `Anyone can have a great month. ${P} finished ${word(h.ye)} seasons as No. 1.` : `Getting to No. 1 is hard. Staying there for ${h.weeks} weeks is something else. ${P}.`,
      ],
      eye:
        pick.place === 1
          ? [`The numbers say ${P} and so do my eyes. That makes it easy.`, `${P}. I have watched all of them on video more times than I can count. Nothing else compares.`, `Everybody has a favourite. Mine happens to be the one with the best record too. ${P}.`]
          : [`Numbers are numbers. Nobody ${done ? "played" : "plays"} the game like ${P}.`, `I know what the numbers say. I still say ${P}. Watch the tape.`, `If I could have one player's game for a day, it would be ${P}'s. That is my answer.`, `Greatness is what makes you stop and watch. For me that ${done ? "was" : "is"} ${P}.`, `${P}, for the way it ${done ? "looked" : "looks"}. You can't put that in a table.`],
      home: [`I'm biased, I know. ${P} is one of ours, and I'm not changing my vote.`, `Where I come from there is only one answer, and it is ${P}.`, `You can show me any table you like. At home I would not be allowed back in if I said anyone but ${P}.`],
      faced: [
        `I have played ${P} ${word(met[0] + met[1])} times and won ${met[0] ? word(met[0]) : "none"}. That tells you what I think.`,
        `You only understand it when ${P} is on the other side of the net. I have been there ${word(met[0] + met[1])} times.`,
        `Watching ${P} on television is one thing. Trying to win a point is another. I vote with my scars.`,
      ],
    };
    const own = {
      measured: [`It's difficult to compare eras, but for me it's ${P}.`, `There are many great champions. My answer is ${P}.`],
      blunt: [`${P}. Easy.`, `${P}. It's not close.`],
      upbeat: [`${P}, no doubt! What a player.`, `${P}! I could watch that tennis all day.`],
      intense: [`${P}. And one day I want to be in this conversation.`, `${P}. The standard everyone else is chasing.`],
      dry: [`${P}. Next question, and make it a hard one.`, `${P}. I'd explain, but it would take all afternoon.`],
    }[voiceOf(v)];
    const roll = hashOf(`${v.id}:${pick.id}:${state.currentYear}:${Math.floor(state.currentWeek / 8)}:say`); // the wording drifts every couple of months
    const list = roll % 100 < 35 ? own : lines[reason]; // about a third of the time the personality does the talking
    return tidy(list[Math.floor(roll / 128) % list.length]);
  };

  const tally = {};
  ballots.forEach((b) => {
    tally[b.pick.id] = (tally[b.pick.id] || 0) + 1;
  });
  const poll = field
    .filter((c) => tally[c.id])
    .map((c) => ({ id: c.id, name: c.name, short: c.short, votes: tally[c.id], pct: Math.round((100 * tally[c.id]) / ballots.length) }))
    .sort((a, b) => b.votes - a.votes);

  // who gets quoted: the best-ranked voice for each name with support, then whoever is next in line
  const voices = (list, rows, speak, shift) => {
    const turn = (salt * 7 + state.currentWeek * 3 + shift) % list.length; // different voices each week
    const order = list.slice(turn).concat(list.slice(0, turn));
    const quoted = [];
    const heard = new Set(); // nobody repeats a line somebody else just said
    const take = (b) => {
      quoted.push(b);
      heard.add(speak(b));
    };
    rows.slice(0, 4).forEach((row) => {
      const b = order.find((x) => x.pick.id === row.id && !quoted.includes(x) && !heard.has(speak(x)));
      if (b) take(b);
    });
    order.forEach((b) => {
      if (quoted.length < 6 && !quoted.includes(b) && !heard.has(speak(b)) && !quoted.some((x) => x.reason === b.reason && x.pick.id === b.pick.id)) take(b);
    });
    order.forEach((b) => {
      if (quoted.length < 6 && !quoted.includes(b) && !heard.has(speak(b))) take(b);
    });
    return quoted.map((b) => ({ id: b.v.id, name: b.v.name, rank: ranks[b.v.id], pick: b.pick.short, reason: b.reason, text: speak(b) }));
  };
  const count = (list, limit) => {
    const votes = {};
    const who = {};
    list.forEach((b) => {
      votes[b.pick.id] = (votes[b.pick.id] || 0) + 1;
      who[b.pick.id] = b.pick;
    });
    const rows = Object.keys(votes)
      .map((id) => ({ id, name: who[id].name, short: who[id].short, votes: votes[id], pct: Math.round((100 * votes[id]) / list.length) }))
      .sort((a, b) => b.votes - a.votes || (a.id < b.id ? -1 : 1));
    if (rows.length <= limit) return rows;
    const rest = rows.slice(limit - 1).reduce((n, r) => n + r.votes, 0);
    return rows.slice(0, limit - 1).concat([{ id: "others", name: "Others", short: "Others", votes: rest, pct: Math.round((100 * rest) / list.length) }]);
  };
  const quotes = voices(ballots, poll, say, 0);

  // second question: of the players under 30, who ends up highest on the all-time list?
  const young = state.players
    .filter((p) => p.age <= 29)
    .map((p) => {
      const h = honours(p);
      const score = goatScore(h);
      const runway = clamp((33 - p.age) / 12, 0, 1); // seasons left near the top
      const level = clamp((p.ovr - 78) / 20, 0, 1);
      return { id: p.id, name: p.name, short: shortName(p.name), age: p.age, country: p.country, h, score, proj: score + 2600 * runway * level * level };
    })
    .sort((a, b) => b.proj - a.proj)
    .slice(0, 8);
  const bestProj = Math.max(1, ...young.map((c) => c.proj));
  const mostWon = young.reduce((best, c) => (c.score > best.score ? c : best), young[0]);
  const nextBallots = voters.map((v) => {
    const scored = young
      .filter((c) => c.id !== v.id)
      .map((c) => {
        const taste = (hashOf(`${v.id}:${c.id}:next`) % 100) / 100;
        const home = c.country && c.country === v.country ? 0.1 : 0;
        const met = h2hFor(state.h2h, v.id, c.id);
        const faced = met[0] + met[1] >= 3 && met[1] > met[0] ? 0.06 : 0;
        return { c, met, home, faced, value: Math.sqrt(c.proj / bestProj) + taste * 0.34 + home + faced };
      })
      .sort((a, b) => b.value - a.value);
    const [best, next] = scored;
    const reason = best.home && next && best.value - best.home < next.value ? "home" : best.faced && next && best.value - best.faced < next.value ? "faced" : best.c.age <= 22 ? "young" : best.c.id === mostWon.id && best.c.score > 0 ? "numbers" : ranks[best.c.id] === 1 ? "level" : "feel";
    return { v, pick: best.c, met: best.met, reason };
  });
  const sayNext = (b) => {
    const { v, pick, met } = b;
    const P = pick.short;
    const lines = {
      numbers: [
        pick.h.slam ? `${P} already has ${plural(pick.h.slam, "major")} at ${pick.age}. Nobody else in that age group is close.` : `${P} has the titles and the ranking already. The rest of us are chasing.`,
        `Start from what is already won. ${P} has a head start the rest of us can't make up.`,
        `I'd love to say my own name. But look at what ${P} has done already.`,
      ],
      young: [`${P} is ${pick.age}. Think about how many seasons that is.`, `Look at the age and then look at the level. It will be ${P}.`, `Give it five years. Everyone will be talking about ${P}.`],
      level: [`Right now ${P} is the best player in the world, and I don't see that changing soon.`, `I have to play ${P} a few times a year. Trust me on this one.`],
      feel: [`${P}. There is another gear in there that we have not seen yet.`, `It is a feeling more than a number. ${P}.`, `Everyone will say the obvious name. I think ${P} surprises people.`],
      home: [`I'll say ${P}, and yes, I'm allowed to be patriotic.`, `${P} carries the flag for us, so that is my vote.`],
      faced: [`I have played ${P} ${word(met[0] + met[1])} times and won ${met[0] ? word(met[0]) : "none"}. That is my answer.`, `Ask the people who have to return that ball. It is ${P}.`],
    };
    const list = lines[b.reason];
    return tidy(list[hashOf(`${v.id}:${pick.id}:${state.currentYear}:next`) % list.length]);
  };
  const nextPoll = count(nextBallots, 6);

  // third question: who does nobody want to see across the net?
  const feared = ranked.slice(0, 12).map((p) => ({ id: p.id, name: p.name, short: shortName(p.name), p }));
  const TRAIT = [["srv", "serve"], ["fh", "forehand"], ["bh", "backhand"], ["mov", "legs"], ["men", "mind"]];
  const toughBallots = voters.map((v) => {
    const scored = feared
      .filter((c) => c.id !== v.id)
      .map((c) => {
        const taste = (hashOf(`${v.id}:${c.id}:tough`) % 100) / 100;
        const met = h2hFor(state.h2h, v.id, c.id);
        return { c, met, value: 0.45 * clamp((c.p.ovr - 80) / 19, 0, 1) + 0.7 * (met[1] / (met[0] + met[1] + 2)) + taste * 0.32 };
      })
      .sort((a, b) => b.value - a.value);
    const best = scored[0];
    const trait = TRAIT.map(([key, label]) => [best.c.p[key], label]).sort((a, b) => b[0] - a[0])[0];
    const reason = best.met[0] + best.met[1] >= 3 && best.met[1] > best.met[0] ? "record" : trait[0] >= 93 ? trait[1] : "allround";
    return { v, pick: best.c, met: best.met, reason };
  });
  const sayTough = (b) => {
    const { v, pick, met } = b;
    const P = pick.short;
    const lines = {
      record: [`I have played ${P} ${word(met[0] + met[1])} times and won ${met[0] ? word(met[0]) : "none"}. Draw your own conclusion.`, `${P}. I keep thinking I have worked it out, and then I lose again.`, `I see ${P} in my half of the draw and I check the flights home. I'm only half joking.`],
      serve: [`You can't break ${P}. You stand there and hope for a tiebreak.`, `Against ${P} you get one look at a second serve in a set. If you miss it, the set is gone.`],
      forehand: [`The ${P} forehand. You know where it is going and it still goes through you.`, `You leave one ball short against ${P} and the point is over. One ball.`, `${P} hits the forehand like it owes them money. You just try to keep it on the backhand.`, `I've tried every pattern against ${P}'s forehand. It eats all of them.`],
      backhand: [`You can't hide on the backhand side against ${P}. There is no safe place to serve.`, `Most players have a side you can go to under pressure. ${P} does not.`],
      legs: [`${P} gets everything back. You hit three winners to win one point.`, `You think the point is over against ${P}. It is never over.`],
      mind: [`${P} never gives you a cheap point when it matters. Never.`, `At 5–5 in the third there is nobody you want to see less than ${P}.`],
      allround: [`There are no holes. You look for one for three sets and then the match is over.`, `${P} does everything a little better than you do. It adds up.`],
    };
    const list = lines[b.reason];
    return tidy(list[hashOf(`${v.id}:${pick.id}:${state.currentYear}:tough`) % list.length]);
  };
  const toughPoll = count(toughBallots, 6);

  // and the ones still playing who are on the list themselves
  const own = field
    .filter((c) => c.kind === "active")
    .slice(0, 3)
    .map((c) => {
      const ahead = field[c.place - 2];
      const bold = edgeOf(source[c.id]) >= 2;
      const list = !ahead
        ? bold
          ? ["I let the numbers speak. They are quite loud.", "People can argue all they like. I know what is on the shelf at home."]
          : ["I'm proud of the record. Whether it makes me the greatest is for other people to say.", "I try not to think about it while I'm still playing. There will be time for that later."]
        : bold
          ? [`I'm ${fmt(ahead.score - c.score)} points behind ${ahead.short}. I can count, and I'm not finished.`, "Give me a few more years. You won't need to ask."]
          : ["It is not for me to say. I'll look at the numbers when I stop playing.", `I'm ${c.age}. Ask me when the career is finished.`, "It is an honour to be in the sentence. The rest is for other people to decide."];
      return { id: c.id, name: c.name, place: c.place, text: list[hashOf(`${c.id}:${state.currentYear}:${salt}:own`) % list.length] };
    });

  const questions = [
    { id: "goat", label: "Greatest ever", ask: "Who is the greatest of all time?", note: "The top 40 in the rankings each get one vote and cannot pick themselves. Some count majors, some count everything, some go on what they have seen.", poll, quotes },
    { id: "next", label: "The next one", ask: "Of the players under 30, who finishes highest on the all-time list?", note: "Same 40 voters. What is already won counts, and so do age and level: a 21-year-old has more seasons left than a 28-year-old.", poll: nextPoll, quotes: voices(nextBallots, nextPoll, sayNext, 11) },
    { id: "tough", label: "Toughest to face", ask: "Who is the opponent nobody wants in their section of the draw?", note: "Same 40 voters, picking from the current top 12. A losing record against someone counts for a lot.", poll: toughPoll, quotes: voices(toughBallots, toughPoll, sayTough, 23) },
  ];
  return { voters: ballots.length, poll, quotes, own, questions };
}

/* ── Room two: the analysts ── */
// Four desks, four yardsticks. They only agree when the numbers leave them no choice.
function studio(state, F) {
  const { field, ranked, source } = F;
  const leader = field[0];
  const live = field.find((c) => c.kind === "active" && c.place > 1);
  const no1 = ranked[0];
  const majorsLine = (c) => SLAM_IDS.map((id) => c.majors[id]).join("-");
  const bestAt = (c) => SLAM_IDS.map((id) => [id, c.majors[id]]).sort((a, b) => b[1] - a[1])[0];
  const yardsticks = [
    { id: "majors", name: "The majors desk", lens: "Grand Slam titles and nothing else", head: "Slams", value: (c) => c.h.slam, show: (c) => String(c.h.slam) },
    { id: "big", name: "The big-titles desk", lens: "Slams, ATP Finals and Masters 1000s, one point each", head: "Big titles", value: (c) => c.big, show: (c) => String(c.big) },
    { id: "top", name: "The rankings desk", lens: "Weeks spent at No. 1", head: "Weeks", value: (c) => c.h.weeks, show: (c) => fmt(c.h.weeks) },
    { id: "range", name: "The all-court desk", lens: "All four majors, counting no more than four titles at each", head: "AO-RG-W-US", value: (c) => c.range, show: majorsLine },
    { id: "peak", name: "The dominance desk", lens: "The most titles anyone has won at a single major", head: "Best major", value: (c) => bestAt(c)[1], show: (c) => `${bestAt(c)[1]} ${MAJOR_ABBR[bestAt(c)[0]]}` },
  ];
  const desks = yardsticks.map((d) => {
    const list = field.slice().sort((a, b) => d.value(b) - d.value(a) || b.score - a.score);
    const [first, second] = list;
    const gap = d.value(first) - d.value(second);
    let text = "";
    if (d.id === "majors") {
      text = `${first.short} has ${first.h.slam}, ${gap ? `${word(gap)} more than ${second.short}` : `level with ${second.short}`}. This desk has never met a player who would trade a major for anything else, so it does not count anything else.`;
      const next = list.find((c) => c.kind === "active" && c.id !== first.id);
      if (first.kind === "active") text += ` And ${first.short} is still playing.`;
      else if (next) text += ` The live question is ${next.short}, with ${next.h.slam} at ${next.age}: taking the lead needs ${first.h.slam - next.h.slam + 1} more.`;
    } else if (d.id === "big") {
      text = `${first.short} has ${first.big} big titles: ${plural(first.h.slam, "Slam")}, ${first.h.finals} ATP Finals and ${first.h.masters} Masters 1000s. ${second.short} has ${second.big}. A Masters week means beating the same field as a major, and this desk thinks the usual scoring sells that short.`;
    } else if (d.id === "top") {
      text = `${first.short} spent ${fmt(first.h.weeks)} weeks at No. 1 and finished ${plural(first.h.ye, "season")} there. ${second.short} managed ${fmt(second.h.weeks)}. Titles show who peaked. The ranking shows who was the best player in the world on an ordinary Tuesday, and for how long.`;
      if (no1 && no1.id !== first.id) text += ` ${shortName(no1.name)}, the current No. 1, is on ${fmt(honours(no1).weeks)}.`;
    } else if (d.id === "peak") {
      const [where, n] = bestAt(first);
      const [where2, n2] = bestAt(second);
      text = `${first.short} won ${MAJOR_NAME[where]} ${word(n)} times. This desk does not ask who collected the most. It asks who owned one stage more completely than anyone ever has, and ${n - n2 ? `the next best is ${second.short} with ${n2} at ${MAJOR_NAME[where2]}` : `${second.short} matches it with ${n2} at ${MAJOR_NAME[where2]}`}.`;
    } else {
      text = `${first.short}'s majors read ${first.majors.ao} in Australia, ${first.majors.rg} in Paris, ${first.majors.wim} at Wimbledon and ${first.majors.uso} in New York.`;
      const lopsided = list.find((c) => c.id !== first.id && c.h.slam >= 6 && SLAM_IDS.some((id) => c.majors[id] / c.h.slam >= 0.55));
      if (lopsided) {
        const id = SLAM_IDS.find((x) => lopsided.majors[x] / lopsided.h.slam >= 0.55);
        text += ` ${lopsided.short} won ${lopsided.majors[id]} of ${lopsided.h.slam} at ${MAJOR_NAME[id]}, which is why this desk has ${lopsided.short} ${nth(list.indexOf(lopsided) + 1)}.`;
      }
      const gapped = list.slice(0, 5).find((c) => c.h.slam >= 3 && SLAM_IDS.some((id) => !c.majors[id]));
      if (gapped) text += ` ${gapped.short} never won ${listNames(SLAM_IDS.filter((id) => !gapped.majors[id]).map((id) => MAJOR_NAME[id]))}, and this desk does not forgive a gap.`;
    }
    return { id: d.id, name: d.name, lens: d.lens, head: d.head, first: first.short, second: second.short, text, list: list.slice(0, 5).map((c, i) => ({ id: c.id, name: c.name, kind: c.kind, n: i + 1, value: d.show(c) })) };
  });
  const firsts = {};
  desks.forEach((d) => {
    firsts[d.first] = (firsts[d.first] || 0) + 1;
  });
  const [name, n] = Object.entries(firsts).sort((a, b) => b[1] - a[1])[0];
  const split = Object.keys(firsts).length > 1;
  const verdict = split
    ? `The desks are split. ${name} is first on ${n} of ${desks.length}, and ${listNames(Object.keys(firsts).filter((x) => x !== name))} ${Object.keys(firsts).length > 2 ? "lead" : "leads"} the rest. Which desk you believe is the whole argument.`
    : `All ${word(desks.length)} desks have ${name} first. When ${word(desks.length)} different yardsticks give the same answer, the argument moves to second place: ${listNames(
        [...new Set(desks.map((d) => d.second))].map((x) => `${x} for ${listNames(desks.filter((d) => d.second === x).map((d) => d.name.replace(/^The /, "the ").replace(/ desk$/, "")))}`)
      )}.`;

  // the brief for and against each of the leading names
  const lead = (key) => Math.max(...field.map((c) => c.h[key]));
  const cases = field.slice(0, 4).map((c) => {
    const pro = [];
    const con = [];
    const mostAt = SLAM_IDS.reduce((best, id) => (c.majors[id] > c.majors[best] ? id : best), SLAM_IDS[0]);
    const leastAt = SLAM_IDS.reduce((best, id) => (c.majors[id] < c.majors[best] ? id : best), SLAM_IDS[0]);
    const missing = SLAM_IDS.filter((id) => !c.majors[id]);
    const runner = (key) => field.filter((x) => x.h[key] > c.h[key]);
    if (c.h.slam === lead("slam")) pro.push(`Most Grand Slams on the list: ${c.h.slam}.`);
    else if (runner("slam").length === 1) pro.push(`${plural(c.h.slam, "major")}, second only to ${runner("slam")[0].short}.`);
    if (c.h.weeks === lead("weeks")) pro.push(`${fmt(c.h.weeks)} weeks at No. 1, more than anyone.`);
    else if (runner("weeks").length === 1) pro.push(`${fmt(c.h.weeks)} weeks at No. 1, second only to ${runner("weeks")[0].short}.`);
    if (c.majors[leastAt] >= 2) pro.push(`Won every major at least ${c.majors[leastAt] === 2 ? "twice" : `${word(c.majors[leastAt])} times`}.`);
    if (c.majors[mostAt] >= 5 && field.every((x) => SLAM_IDS.every((id) => x.majors[id] <= c.majors[mostAt]))) pro.push(`${capital(word(c.majors[mostAt]))} titles at ${MAJOR_NAME[mostAt]}, the most anyone has won at one major.`);
    else if (c.majors[mostAt] >= 5 && field.every((x) => x.majors[mostAt] <= c.majors[mostAt])) pro.push(`${capital(word(c.majors[mostAt]))} titles at ${MAJOR_NAME[mostAt]}. Nobody on the list has more there.`);
    if (c.h.ye >= 5 && c.h.ye < lead("ye")) pro.push(`Finished ${word(c.h.ye)} seasons as No. 1.`);
    else if (c.h.ye >= 3 && c.h.ye === lead("ye")) pro.push(`Finished ${word(c.h.ye)} seasons as No. 1, the most on the list.`);
    if (c.h.masters === lead("masters")) pro.push(`${c.h.masters} Masters 1000 titles, the most on the list.`);
    if (c.h.finals === lead("finals") && c.h.finals > 0) pro.push(`${capital(word(c.h.finals))} ATP Finals titles, the most on the list.`);
    if (c.kind === "active") pro.push(c.age <= 27 ? `Only ${c.age}, with ${plural(c.h.slam, "major")} already.` : `Still playing at ${c.age}, and still adding to the total.`);
    if (!pro.length) pro.push(`${plural(c.h.slam, "Slam")} and ${fmt(c.h.weeks)} weeks at No. 1.`);

    if (c.h.slam < lead("slam")) con.push(`${capital(word(lead("slam") - c.h.slam))} fewer majors than ${field.find((x) => x.h.slam === lead("slam")).short}.`);
    if (!c.h.finals) con.push("Never won the ATP Finals.");
    if (c.h.slam >= 6 && c.majors[mostAt] / c.h.slam >= 0.55) con.push(`${c.majors[mostAt]} of the ${c.h.slam} majors came at ${MAJOR_NAME[mostAt]}.`);
    if (c.h.slam >= 2 && missing.length) con.push(`Never won ${listNames(missing.map((id) => MAJOR_NAME[id]))}.`);
    if (c.h.weeks < lead("weeks") / 2) con.push(`${fmt(c.h.weeks)} weeks at No. 1, less than half of the record ${fmt(lead("weeks"))}.`);
    if (!con.length) con.push(`The thinnest line on the page is ${c.majors[leastAt]} at ${MAJOR_NAME[leastAt]}, and that is the best argument anyone has.`);
    return { id: c.id, name: c.name, kind: c.kind, place: c.place, pro: pro.slice(0, 3), con: con.slice(0, 3) };
  });

  // what the active names still need
  const elapsed = state.seasons.length + (state.currentWeek - 1) / EVENTS.length;
  const chase = field
    .filter((c) => c.kind === "active")
    .slice(0, 3)
    .map((c) => {
      const p = source[c.id];
      const ahead = field[c.place - 2];
      if (!ahead) {
        const behind = field[1];
        return { id: c.id, name: c.name, text: `${c.short} leads the list by ${fmt(c.score - behind.score)} points and is still playing at ${c.age}. Every title from here only moves the target for everyone else.` };
      }
      const gap = ahead.score - c.score + 1;
      const slams = Math.ceil(gap / GOAT_WEIGHTS.slam);
      const span = Math.min(elapsed, state.currentYear - Math.max(START_YEAR, p.debut) + (state.currentWeek - 1) / EVENTS.length);
      const added = c.score - goatScore({ slam: p.legacy.slam, finals: p.legacy.finals, masters: p.legacy.masters, weeks: p.legacy.weeks, ye: p.legacy.ye });
      let text = `${c.short} is ${fmt(gap)} points short of passing ${ahead.short}, the next name up. That is ${plural(slams, "Grand Slam")}, or the same value in smaller titles and weeks at No. 1.`;
      if (span < 0.5) text += " It is too early in this save to judge the pace.";
      else if (added <= 0) text += ` Nothing has been added since ${Math.max(START_YEAR, p.debut)}, so the gap is not closing.`;
      else {
        const pace = added / span;
        const years = Math.max(1, Math.ceil(gap / pace));
        text += ` At the ${fmt(pace)} points a season ${c.short} has averaged since ${Math.max(START_YEAR, p.debut)}, that takes about ${plural(years, "more season")}, to the age of ${c.age + years}.${c.age + years >= 38 ? " That is asking a lot of any body." : ""}${ahead.kind === "active" ? ` ${ahead.short} is still adding too, so the target moves.` : ""}`;
      }
      return { id: c.id, name: c.name, text };
    });

  return { desks, verdict, consensus: { name, n, of: desks.length }, cases, chase, leader: leader.short, live: live ? live.short : null };
}

/* ── Room three: the fans ── */
// Made-up accounts. The handles are invented and belong to nobody.
const FAN_ACCOUNTS = {
  stats: [["Topspin Ledger", "@TopspinLedger"], ["Second Serve Stats", "@2ndServeStats"], ["Ace Counter", "@AceCounterBot"], ["Break Point Maths", "@BreakPointMaths"], ["Unforced Data", "@UnforcedData"], ["Rally Length Rob", "@RallyLengthRob"], ["The Hold Game", "@TheHoldGame"]],
  old: [["Wood Racquet Dave", "@WoodRacquetDave"], ["Sunday Finals", "@SundayFinals92"], ["Chalk Dust Club", "@ChalkDustClub"], ["Serve and Volley Sal", "@ServeVolleySal"], ["Five Set Frank", "@FiveSetFrank"], ["Centre Court Memories", "@CentreCourtMem"], ["Net Rusher", "@NetRusher88"]],
  stan: [["Baseline Believer", "@BaselineBeliever"], ["Cross Court Carla", "@CrossCourtCarla"], ["Row 12 Seat 4", "@Row12Seat4"], ["Inside Out Otto", "@InsideOutOtto"], ["Fist Pump Fiona", "@FistPumpFiona"], ["Night Session Nate", "@NightSessionNate"], ["Vamos Vicky", "@VamosVicky"]],
  hot: [["Deuce Again Pod", "@DeuceAgainPod"], ["Net Cord Nick", "@NetCordNick"], ["Lucky Loser Lou", "@LuckyLoserLou"], ["Hot Take Henrik", "@HotTakeHenrik"], ["The Contrarian Lob", "@ContrarianLob"], ["Challenge Declined", "@ChallengeDeclined"], ["Tweener Takes", "@TweenerTakes"]],
  fun: [["Moonball Marta", "@MoonballMarta"], ["Tiebreak Tom", "@TiebreakTom"], ["Drop Shot Diaries", "@DropShotDiaries"], ["Ball Kid Barry", "@BallKidBarry"], ["New Balls Pls", "@NewBallsPls"], ["Rain Delay Radio", "@RainDelayRadio"], ["Strawberries First", "@StrawberriesFirst"]],
  media: [["Tour Desk Live", "@TourDeskLive"], ["Baseline Bulletin", "@BaselineBulletin"], ["The Changeover", "@TheChangeoverFM"], ["Courtside Wire", "@CourtsideWire"]],
};
const ACCOUNT_KIND = { stats: "Stats account", old: "Long-time fan", stan: "Superfan", hot: "Opinion", fun: "Fan", media: "News account" };

function stands(state, F, room, salt) {
  const { field, ranked, ranks } = F;
  const t = state.tournament;
  const stamp = `${state.currentYear}:${state.currentWeek}:${t ? `${t.slot}.${t.roundIndex}.${t.status}` : "idle"}`;
  const rng = makeRng(hashOf(`fans:${stamp}`));
  const done = state.calendar.filter((e) => e.champion);
  const last = done.length ? done[done.length - 1] : null;
  const slamsThisYear = state.calendar.filter((e) => e.tier === "slam" && e.champion).map((e) => e.champion.id);
  const no1 = ranked[0];
  const byName = (id) => field.find((c) => c.id === id);

  // the poll: the record counts, but so does whoever was on television last night
  const maxScore = field[0].score;
  const weighed = field
    .map((c) => {
      let buzz = c.kind === "active" ? 0.12 : c.kind === "legend" ? 0.1 : 0.05;
      if (no1 && c.id === no1.id) buzz += 0.15;
      if (last && last.champion.id === c.id) buzz += 0.2;
      buzz += 0.15 * slamsThisYear.filter((id) => id === c.id).length;
      return { c, w: Math.pow(c.score / maxScore, 1.3) * (1 + buzz) * (0.92 + rng() * 0.16) };
    })
    .sort((a, b) => b.w - a.w);
  const named = weighed.slice(0, 5);
  const others = weighed.slice(5).reduce((s, x) => s + x.w, 0) + 0.04;
  const sum = named.reduce((s, x) => s + x.w, 0) + others;
  const poll = named.map((x) => ({ id: x.c.id, name: x.c.name, short: x.c.short, pct: Math.round((100 * x.w) / sum) })).concat([{ id: "other", name: "Someone else", short: "Someone else", pct: 0 }]);
  poll[poll.length - 1].pct = Math.max(1, Math.round((100 * others) / sum));
  poll[0].pct += 100 - poll.reduce((s, x) => s + x.pct, 0); // rounding lands on the leader
  const total = int(rng, 18000, 96000);

  const fanTop = named[0].c;
  const fanSecond = named[1].c;
  const leader = field[0];
  const second = field[1];
  const third = field[2];
  const chaser = field.find((c) => c.kind === "active" && c.place > 1);
  const legend = field.find((c) => c.kind !== "active" && c.place > 1) || field.find((c) => c.kind !== "active");
  const lead = (key) => field.reduce((best, c) => (c.h[key] > best.h[key] ? c : best), field[0]);
  const kid = ranked.find((p) => p.age <= 21);
  const tag = (s) => s.replace(/[^A-Za-z0-9]/g, "");

  const tags = [`#${tag(fanTop.short)}GOAT`, `#Team${tag(fanSecond.short)}`, last ? `#${tag(last.name)}` : null, chaser ? `#${tag(chaser.short)}Watch` : null, "#GOATdebate"]
    .filter(Boolean)
    .map((label, i) => ({ label, posts: Math.round((190 - i * 34) * (0.55 + rng() * 0.4) * 100) }));

  // the feed: every post is hung on something that is true in this save right now
  const pool = [];
  const add = (who, text) => pool.push({ who, text: tidy(text) });
  let pinned = null;
  if (last) {
    const c = byName(last.champion.id);
    const champ = shortName(last.champion.name);
    if (c) {
      const ahead = field[c.place - 2];
      pinned = { who: "stats", text: `${champ} wins ${at(last)}. Slam count ${c.h.slam}, GOAT score ${fmt(c.score)}.${ahead ? ` The gap to ${ahead.short} is down to ${fmt(ahead.score - c.score)}.` : " Still top of the list, and the list is getting longer."}` };
    } else pinned = { who: "fun", text: `${champ} wins ${at(last)} and my timeline is still ${leader.short} against ${second.short}. Some things never change.` };
  }
  const gap = leader.score - second.score;
  add("stats", `GOAT score check. ${leader.short} ${fmt(leader.score)}, ${second.short} ${fmt(second.score)}. The gap is ${fmt(gap)}, which is about ${plural(Math.max(1, Math.round(gap / GOAT_WEIGHTS.slam)), "Grand Slam")}. ${gap >= 300 ? "Not close." : "Closer than people think."}`);
  add("stats", `${lead("weeks").short}: ${fmt(lead("weeks").h.weeks)} weeks at No. 1. That is over ${Math.floor(lead("weeks").h.weeks / 52)} years with nobody above. I think about this number a lot.`);
  add("hot", `Hot take: we underrate Masters 1000s. ${lead("masters").short} has ${lead("masters").h.masters} of them. That is ${lead("masters").h.masters} weeks of beating everybody who matters.`);
  add("hot", "The GOAT score gives 100 for a Slam and 25 for a Masters. Make it 40 for a Masters and watch the list change. I'll wait.");
  add("fun", "Me this morning: I will not argue about the GOAT today. Me now, 40 replies deep: but the weeks at No. 1.");
  add("fun", `My group chat has been arguing ${leader.short} against ${second.short} since breakfast. Nobody has changed their mind. Nobody ever has.`);
  if (legend) {
    add("old", `You had to be there for ${legend.short}. ${fmt(legend.h.weeks)} weeks at No. 1 and it never looked like work.`);
    add("old", `I don't care what the spreadsheet says. ${legend.short} at full flight beats anybody at full flight.`);
    if (chaser) add("fun", `${legend.short} at full flight against ${chaser.short} today, five sets on ${["grass", "clay", "a hard court"][int(rng, 0, 2)]}. Who wins? Wrong answers only.`);
  }
  if (chaser) {
    add("stan", chaser.age <= 27 ? `${chaser.short} has ${plural(chaser.h.slam, "Slam")} at ${chaser.age}. ${leader.short} has ${leader.h.slam}. Count the seasons that are left. It is happening.` : `${chaser.short} is ${chaser.age} with ${plural(chaser.h.slam, "Slam")}. The window is closing and nobody wants to say it.`);
    if (leader.h.slam - chaser.h.slam >= 4) add("hot", `People are crowning ${chaser.short} already. Call me when it is ${Math.ceil(leader.h.slam * 0.75)} Slams, not ${chaser.h.slam}.`);
  }
  if (leader.kind === "active" && leader.age >= 35) add("old", `${leader.short} is ${leader.age} and still out there adding to it. We are going to miss this when it stops.`);
  if ([leader, second, third].every((c) => ["Novak Djokovic", "Rafael Nadal", "Roger Federer"].includes(c.name))) add("old", `${leader.short}, ${second.short} and ${third.short} won ${leader.h.slam + second.h.slam + third.h.slam} Slams between them while playing each other. Whoever you pick, that era is the answer.`);
  const clay = field.reduce((best, c) => (c.majors.rg > best.majors.rg ? c : best), field[0]);
  if (clay.majors.rg >= 5) add("stan", `The clay debate is not a debate. ${clay.short}: ${clay.majors.rg} Roland Garros titles. Next question.`);
  const noFinals = field.slice(0, 4).find((c) => !c.h.finals);
  if (noFinals) add("hot", `Reminder that ${noFinals.short} never won the ATP Finals. I'm not saying it matters. I'm just saying.`);
  if (no1 && no1.id !== lead("weeks").id) add("stats", `${shortName(no1.name)} is on ${fmt(honours(no1).weeks)} weeks at No. 1 in total. ${lead("weeks").short} got to ${fmt(lead("weeks").h.weeks)}. That record is safe for a while.`);
  if (kid) add("stan", `${shortName(kid.name)} is ${kid.age} and already No. ${ranks[kid.id]}. Saving this post for the GOAT debate in ten years.`);
  const playersTop = room.poll[0];
  add("hot", fanTop.id === playersTop.id ? `Fans and players both have ${fanTop.short} first this week. A rare day of peace on here.` : `Fans say ${fanTop.short}. The locker room says ${playersTop.short}. I trust the people who had to play against them.`);
  const spat = state.news.find((n) => n.k === "words");
  if (spat && spat.y >= state.currentYear - 1) {
    const [a, b] = spat.ids.map((id) => state.players.find((p) => p.id === id)).filter(Boolean);
    if (a && b) add("fun", `${shortName(a.name)} against ${shortName(b.name)} is the best thing on tour right now. Give me that final every week.`);
  }
  const knock = state.news.find((n) => n.k === "critique");
  if (knock) {
    const p = state.players.find((x) => x.id === knock.ids[0]);
    if (p) {
      const won = honours(p).slam + honours(p).finals + honours(p).masters + p.titles.atp500 + p.titles.atp250;
      add("stan", won >= 3 ? `Everyone is piling on ${shortName(p.name)} this week. ${shortName(p.name)} has won ${won} titles. Relax.` : p.age <= 24 ? `Everyone is piling on ${shortName(p.name)} this week. ${shortName(p.name)} is ${p.age}. Give it time.` : `Everyone is piling on ${shortName(p.name)} this week. ${shortName(p.name)} is No. ${ranks[p.id]} in the world. Relax.`);
    }
  }

  // the news accounts keep it dry
  if (last && last.runnerUp && typeof last.score === "string") add("media", `FINAL: ${last.champion.name} d. ${last.runnerUp.name} ${last.score} at ${at(last)}.`);
  if (no1) add("media", `RANKINGS: ${no1.name} stays at No. 1. Career total: ${fmt(honours(no1).weeks)} weeks.`);
  add("media", `ALL-TIME LIST: 1. ${leader.short} ${fmt(leader.score)}  2. ${second.short} ${fmt(second.score)}  3. ${third.short} ${fmt(third.score)}.`);
  const marks = milestones(state, F);
  if (marks.length) add("media", `MILESTONE WATCH: ${marks[int(rng, 0, Math.min(2, marks.length - 1))].text}`);
  // the season in front of them
  if (no1 && no1.stats.w + no1.stats.l >= 10) add("stats", `${shortName(no1.name)} is ${no1.stats.w}–${no1.stats.l} this season. That is ${Math.round((100 * no1.stats.w) / (no1.stats.w + no1.stats.l))}% of matches won.`);
  const hot = state.players.reduce((best, p) => (p.streak > best.streak ? p : best), state.players[0]);
  if (hot.streak >= 8) add("fun", `${shortName(hot.name)} has won ${hot.streak} matches in a row. Somebody stop this. Or don't. I'm enjoying it.`);
  const vet = ranked.slice(0, 30).filter((p) => p.age >= 34).sort((a, b) => b.age - a.age)[0];
  if (vet) add("old", `${shortName(vet.name)} is ${vet.age} and still No. ${ranks[vet.id]} in the world. Put some respect on that.`);
  const rookie = ranked.slice(0, 60).find((p) => p.rookie); // only worth a post if the newcomer is actually climbing
  if (rookie) add("stan", `${shortName(rookie.name)} is in a first season on tour and already No. ${ranks[rookie.id]}. Get on the bandwagon while there are seats.`);
  if (chaser) {
    add("stats", `${chaser.short}'s majors by venue: Australia ${chaser.majors.ao}, Paris ${chaser.majors.rg}, Wimbledon ${chaser.majors.wim}, New York ${chaser.majors.uso}.`);
    if (legend) add("fun", `Told my dad that ${chaser.short} could pass ${legend.short} one day. We are no longer speaking.`);
    if (kid && kid.id !== chaser.id) add("fun", `${leader.short} fans, ${chaser.short} fans and ${shortName(kid.name)} fans are all in my replies at the same time. Logging off.`);
  }
  if (third.h.weeks > second.h.weeks) add("hot", `${second.short} over ${third.short} is lazy. ${third.short} spent ${fmt(third.h.weeks)} weeks at No. 1 to ${second.short}'s ${fmt(second.h.weeks)}.`);
  add("hot", `Nobody wants to hear it, but the gap between first and third on the all-time list is ${fmt(leader.score - third.score)} points. It is one name and then a conversation.`);
  add("fun", `Every GOAT thread: reply 1 is a number, reply 2 is a different number, reply 3 is somebody's uncle who saw Laver.`);
  add("stats", `Fan poll this week: ${poll.slice(0, 3).map((r) => `${r.short} ${r.pct}%`).join(", ")}. ${fmt(total)} votes. Nobody over ${Math.ceil((poll[0].pct + 1) / 5) * 5}%.`);
  // the things people who were there will not let anyone forget (all of these happened)
  const inField = (name) => field.some((c) => c.name === name);
  if (inField("Roger Federer")) add("old", "Federer: 23 major semifinals in a row. I don't need another stat.");
  if (inField("Rafael Nadal")) add("old", "Nadal won 81 matches in a row on clay. Eighty-one. Read it again.");
  if (inField("Pete Sampras")) add("old", "Sampras finished six straight years as No. 1 and half this app has never watched a full match.");
  if (inField("Andre Agassi")) add("old", "Agassi won all four majors when the surfaces really were different. That list is shorter than you think.");
  if (inField("Andy Murray")) add("old", "Murray won three majors with those three standing in the way. Adjust for difficulty.");
  if (inField("Novak Djokovic")) add("old", "Djokovic held all four majors at the same time in 2016. People move past that far too quickly.");

  // refresh rotates the feed; the poll only moves when the tour does
  const mix = makeRng(hashOf(`feed:${stamp}:${salt}`));
  const picked = (pinned && salt === 0 ? [{ ...pinned, text: tidy(pinned.text) }] : []).concat(shuffle(mix, pinned && salt ? pool.concat([{ ...pinned, text: tidy(pinned.text) }]) : pool)).slice(0, 10);
  const comebacks = [
    "Finally someone said it.",
    "Respectfully, no.",
    "Saving this for later.",
    "I came here to relax.",
    "The numbers are right there. You can just look at them.",
    `Tell me you started watching in ${state.currentYear - 2} without telling me.`,
    "We are never beating the recency bias allegations.",
    "My timeline is 90% this argument and I'm fine with it.",
    `${leader.short} has ${leader.h.slam}. Scoreboard.`,
    `${second.short} fans will be along shortly.`,
    "Counterpoint: no.",
    "This is the correct take and I'm tired of pretending it isn't.",
    "Bookmarking this to be annoying about it in five years.",
    "Somebody check on the group chat.",
    "I was having a nice day.",
    "Put it on a plaque.",
    "Every week we do this. Every single week.",
    "Muting this thread. Unmuting it in five minutes.",
    `The fan poll has ${fanTop.short} on ${poll[0].pct}%. Just saying.`,
    "Source: vibes.",
    "I need this argument to be over and also never to end.",
    "Write this down and read it back in a year.",
  ];
  const used = new Set();
  let minutes = int(mix, 1, 6);
  const account = (who) => {
    const list = FAN_ACCOUNTS[who];
    let pick = list[int(mix, 0, list.length - 1)];
    // nobody posts twice in one feed: if this crowd is used up, somebody from the general fans steps in
    if (used.has(pick[1])) pick = list.find((a) => !used.has(a[1])) || FAN_ACCOUNTS.fun.concat(FAN_ACCOUNTS.stan, FAN_ACCOUNTS.hot, FAN_ACCOUNTS.stats, FAN_ACCOUNTS.old).find((a) => !used.has(a[1])) || pick;
    used.add(pick[1]);
    return pick;
  };
  const lines = shuffle(mix, comebacks);
  let threads = 0;
  // replies that answer the post itself: whoever it is about gets dragged in
  const mentioned = field.map((c) => c.short).concat(ranked.slice(0, 30).map((p) => shortName(p.name)));
  const aboutOf = (text) => mentioned.filter((n) => text.includes(n)).sort((a, b) => text.indexOf(a) - text.indexOf(b))[0]; // whoever the post opens with
  const answer = (about) => shuffle(mix, [`${about} fans are going to love this.`, `Not more ${about} discourse on my timeline.`, `Nobody tell ${about}.`, `Say it louder for the ${about} doubters at the back.`, `This is the most ${about} take I've ever read.`, `Ok, but what about ${about} on clay?`, `${about} slander will not be tolerated.`, `Imagine explaining ${about} to someone who has never watched tennis.`])[0];
  const posts = picked.map((p, i) => {
    const [name, handle] = account(p.who);
    const likes = Math.round(Math.exp(3.4 + mix() * 5));
    const ago = minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
    minutes += int(mix, 4, 22) * (i + 1);
    // the first few posts have people arguing underneath; the news accounts just get the scoreboard quoted back at them
    const thread = threads < 3 && p.who !== "media" ? [0, 1].map((k) => {
      const [n, h] = account(["fun", "hot", "stan", "old"][int(mix, 0, 3)]);
      const about = k === 0 && mix() < 0.6 ? aboutOf(p.text) : null;
      return { name: n, handle: h, text: about ? answer(about) : lines[threads * 2 + k] };
    }) : [];
    if (thread.length) threads++;
    return { key: `${stamp}:${salt}:${i}`, name, handle, kind: ACCOUNT_KIND[p.who], text: p.text, ago, likes: compact(likes), reposts: compact(Math.round(likes * (0.08 + mix() * 0.2))), replies: compact(Math.max(thread.length, Math.round(likes * (0.04 + mix() * 0.22)))), thread };
  });

  // who the crowd follows: the record builds a following, and so do ranking, youth and a bit of charm
  const maxScore2 = Math.max(1, ...F.rows.map((r) => r.score));
  const bases = state.players
    .map((p) => {
      const rank = ranks[p.id];
      const charm = (hashOf(`${p.id}:charm`) % 100) / 100;
      const m = 0.15 + 9.5 * Math.pow(goatScore(honours(p)) / maxScore2, 0.6) + (rank <= 20 ? (21 - rank) * 0.12 : 0) + charm * 1.2 + (p.age <= 22 && rank <= 30 ? 0.5 : 0);
      const wonLast = last && last.champion.id === p.id;
      const change = (wonLast ? 1.4 + rng() * 1.8 : 0) + (p.streak >= 5 ? 0.6 : 0) + (hashOf(`${p.id}:${stamp}:follow`) % 9) / 10 - 0.3;
      return { id: p.id, name: p.name, m, change };
    })
    .sort((a, b) => b.m - a.m)
    .slice(0, 6);
  const bigBase = bases[0].m;
  return {
    poll,
    total,
    tags: tags.sort((a, b) => b.posts - a.posts).map((x) => ({ label: x.label, posts: compact(x.posts) })),
    posts,
    accounts: Object.values(FAN_ACCOUNTS).reduce((n, list) => n + list.length, 0),
    bases: bases.map((b) => ({ id: b.id, name: b.name, followers: `${b.m.toFixed(1)}M`, pct: Math.round((100 * b.m) / bigBase), change: `${b.change >= 0 ? "+" : "−"}${Math.abs(b.change).toFixed(1)}%`, up: b.change >= 0 })),
  };
}

/* ── The studio panel: four invented pundits who never agree for long ── */
const PANEL = {
  num: { name: "Ines Varga", role: "Numbers desk" },
  pro: { name: "Dale Okoro", role: "Former tour player" },
  hist: { name: "Margit Solheim", role: "Historian" },
  con: { name: "Rafi Castellan", role: "Columnist" },
};

function panelTalk(state, F, room, salt) {
  const { field, ranked } = F;
  const [leader, second, third] = field;
  const chaser = field.find((c) => c.kind === "active" && c.place > 1);
  const no1 = ranked[0];
  const weeksTop = field.reduce((best, c) => (c.h.weeks > best.h.weeks ? c : best), field[0]);
  const topics = [];
  // each line can be written several ways; the wording changes from week to week, the argument does not
  const add = (title, lines) => {
    const pr = makeRng(hashOf(`panel:${state.currentYear}:${state.currentWeek}:${title}`));
    topics.push({ title, lines: lines.filter(Boolean).map(([who, text]) => ({ who, name: PANEL[who].name, role: PANEL[who].role, text: tidy(Array.isArray(text) ? text[Math.floor(pr() * text.length)] : text) })) });
  };

  const edge = [["weeks", "weeks at No. 1"], ["finals", "ATP Finals titles"], ["ye", "year-end No. 1 finishes"], ["masters", "Masters 1000s"]].find(([k]) => third.h[k] > second.h[k]);
  const lockerSecond = room.poll[1];
  add(`Who is second behind ${leader.short}?`, [
    ["hist", [`${leader.short} at the top is the easy part of this list. The interesting argument is who comes next.`, `Nobody in this studio is arguing about first. Second is where it gets loud.`, `Let's skip the obvious. Who is the second-greatest of all time?`]],
    ["num", [`On the full ledger it is ${second.short}, by ${fmt(second.score - third.score)} points over ${third.short}.`, `The ledger says ${second.short}. ${fmt(second.score - third.score)} points clear of ${third.short}, which is closer than it sounds.`]],
    lockerSecond ? ["pro", [`The players have ${lockerSecond.short} next, with ${plural(lockerSecond.votes, "vote")}. They vote for what they had to face, or wish they had.`, `In the locker room it is ${lockerSecond.short}, ${plural(lockerSecond.votes, "vote")}. Players vote with their memories of getting beaten.`]] : null,
    edge ? ["con", [`${third.short} for me. ${fmt(third.h[edge[0]])} ${edge[1]} to ${second.short}'s ${fmt(second.h[edge[0]])}. That is not a detail.`, `I'll go the other way: ${third.short}. ${fmt(third.h[edge[0]])} ${edge[1]} against ${fmt(second.h[edge[0]])}. Explain that away.`]] : ["con", [`I have tried to make the case for ${third.short} over ${second.short}. I can't, and it annoys me.`, `Every week I try to argue for ${third.short}. Every week the numbers stop me.`]],
    ["num", edge ? [`And it is ${second.h.slam} majors for ${second.short} to ${third.h.slam} for ${third.short}. Pick your column.`, `Majors: ${second.h.slam} to ${third.h.slam}. That column is the one people remember.`] : ["For once the columnist and the spreadsheet agree. Write the date down.", "The spreadsheet thanks you for your cooperation."]],
    edge ? ["hist", ["Which column matters most has changed every generation. That is why this argument never ends.", "Twenty years ago the answer would have been different. Twenty years from now it will be different again."]] : null,
  ]);

  if (chaser) {
    const ahead = field[chaser.place - 2];
    const toTop = leader.score - chaser.score;
    add(`Can ${chaser.short} get there?`, [
      ["num", [`${chaser.short} is ${fmt(toTop)} points behind ${leader.short}. That is about ${plural(Math.ceil(toTop / GOAT_WEIGHTS.slam), "Grand Slam")}.`, `The gap from ${chaser.short} to ${leader.short} is ${fmt(toTop)} points. Call it ${plural(Math.ceil(toTop / GOAT_WEIGHTS.slam), "major")}.`]],
      ["pro", chaser.age <= 27 ? [`At ${chaser.age} you think you have forever. You don't. The body sends the bill at 31 or 32, and it does not negotiate.`, `${chaser.age} is young, but I've seen careers change in one bad landing. Nothing is guaranteed.`] : [`At ${chaser.age} the easy years are gone. Every season from here costs double.`, `At ${chaser.age} you start counting tournaments instead of seasons.`]],
      ["hist", ["When Sampras stopped on 14 majors it was called out of reach. At least three players have passed it since. Records are safe until they are not.", "Every record in this sport was once called unbreakable. Most of them have been broken."]],
      ["con", [`Here is the part nobody says: ${chaser.short} does not need to catch ${leader.short} to have played the better tennis.`, `I'll say it: at their best, I'd take ${chaser.short}. The record is a separate argument.`]],
      ["num", ["That is a different argument, and there is no column for it.", "'At their best' is not a statistic. I can't help you there."]],
      ["pro", ahead.id === leader.id ? ["One name left to pass, and it is the hardest one of all.", "Only one name left above. That is the loneliest chase in sport."] : [`There is a column for the next step, though. ${ahead.short} is ${fmt(ahead.score - chaser.score)} points away, and that one I can see happening.`, `Forget the top for now. ${ahead.short} is ${fmt(ahead.score - chaser.score)} points away. That's this season's target.`]],
    ]);
  }

  const gapped = field.slice(0, 6).find((c) => c.h.slam >= 4 && SLAM_IDS.some((id) => !c.majors[id]));
  if (gapped) {
    const miss = SLAM_IDS.filter((id) => !gapped.majors[id]).map((id) => MAJOR_NAME[id]);
    const complete = field.filter((c) => c.id !== gapped.id && SLAM_IDS.every((id) => c.majors[id])).length;
    const live = gapped.kind === "active";
    add(`Does ${gapped.short} need ${miss[0]}?`, [
      ["hist", `${gapped.short} ${live ? "has never won" : "never won"} ${listNames(miss)}. ${capital(word(complete))} of the other ${word(field.length - 1)} names on this list won all four.`],
      ["pro", [`You win where your game fits. ${capital(plural(gapped.h.slam, "major"))} is ${plural(gapped.h.slam, "major")}, wherever they came.`, `I never once heard a player apologise for where their titles came from.`]],
      ["num", ["The all-court desk marks it down hard. The majors desk does not care at all. Same career, two different answers.", "Depends which desk you ask. Range says it matters. The totals say it doesn't."]],
      ["con", [`If ${gapped.short} had one title there and three fewer everywhere else, we would call it a more complete career. That is absurd, and we would still do it.`, `We treat a missing major like a missing tooth. Everyone stares at the gap and ignores the smile.`]],
      live ? ["pro", [`The difference is that ${gapped.short} can still fix it. Ask me again after ${miss[0]}.`, `${gapped.short} still has time. One good fortnight and this topic disappears.`]] : ["hist", ["It is the one line of that record that can never be filled in now, which is why people keep reading it.", "Retired careers are finished sentences. People always read the missing word first."]],
    ]);
  }

  add("Is No. 1 worth more than we give it?", [
    ["num", `The GOAT score gives ${GOAT_WEIGHTS.weeks === 0.5 ? "half a point" : `${GOAT_WEIGHTS.weeks} points`} for each week at No. 1. A full year on top is worth ${Math.round(52 * GOAT_WEIGHTS.weeks)}, about a quarter of one Grand Slam.`],
    ["pro", ["That is too low. Winning a major is seven matches. Finishing the year at No. 1 is turning up every week for eleven months with everyone aiming at you.", "Too low. Being No. 1 means every opponent plays their best match against you. Every week."]],
    ["hist", `${weeksTop.short} ${weeksTop.kind === "active" ? "has" : "had"} ${fmt(weeksTop.h.weeks)} weeks up there.${no1 && no1.id !== weeksTop.id ? ` ${shortName(no1.name)}, today's No. 1, is on ${fmt(honours(no1).weeks)}.` : ""} The distance between those numbers is the story.`],
    ["con", ["Or the ranking rewards whoever enters the most tournaments. The majors are the only weeks when everybody is trying.", "Rankings are a points system. Majors are the history books."]],
    ["pro", ["Spoken like someone who never had to defend points in February.", "Says the person who has never played a 250 in the rain with a sore shoulder."]],
  ]);

  const dissent = room.voters - room.poll[0].votes;
  const lockerTop = room.poll[0].short;
  add("Numbers or the eye test?", [
    ["pro", dissent ? `${capital(word(dissent))} of the ${room.voters} players we asked did not vote for ${lockerTop}. They can read a table. They are telling you something else.` : `All ${room.voters} players voted for ${lockerTop}. I have never seen a locker room agree on anything before.`],
    ["num", ["They are voting on something the numbers can't see. That is exactly my problem with it.", "Feelings are not a column. I'll keep my spreadsheet, thank you."]],
    ["hist", ["Every generation thinks the players it grew up watching were the best. That is memory, not evidence.", "Ask anyone who their GOAT is and you'll learn how old they are."]],
    ["con", ["And every analyst thinks the spreadsheet settles it. Ask which matches people still talk about twenty years later.", "Nobody ever fell in love with tennis because of a spreadsheet."]],
    ["num", `Fine. But when ${lockerTop === leader.short ? "the eye test and the ledger give the same name" : `the ledger says ${leader.short} and the room says ${lockerTop}`}, I know which one I can check.`],
  ]);

  // what happens to the list if the weights change
  const alt = field.map((c) => ({ c, s: c.h.slam * 100 + c.h.finals * 50 + c.h.masters * 40 + c.h.weeks * 1 + c.h.ye * 20 })).sort((a, b) => b.s - a.s);
  const moved = alt.slice(0, 4).findIndex((x, i) => x.c.id !== field[i].id);
  add("Is the GOAT score fair?", [
    ["con", ["A hundred for a Slam, twenty-five for a Masters. Who decided that? Honestly, who?", "I have a problem with the scoring. Masters titles are cheap in this formula."]],
    ["num", moved >= 0 ? [`Try it: make a Masters worth 40 and a week at No. 1 a full point. ${alt[moved].c.short} moves up to ${nth(moved + 1)}. The list is more fragile than it looks.`, `Change two weights, Masters to 40 and weeks to a full point, and ${alt[moved].c.short} jumps to ${nth(moved + 1)}. That's how close this is.`] : ["I ran it with Masters at 40 and a full point per week at No. 1. The top four don't move. The formula isn't deciding this; the careers are.", "Change the weights however you like. The top four stay put. That tells you something."]],
    ["hist", ["Weights are opinions with numbers attached. Every era would set them differently.", "In the seventies people barely counted the Australian Open. Weighting is always of its time."]],
    ["pro", ["From the inside, a Slam is worth far more than four Masters. The pressure is different. The formula is fine.", "Players know what a Slam is worth. Ask anyone who has won one and anyone who hasn't."]],
  ]);

  // the name nobody brings up
  const under = field.slice(3, 8).sort((a, b) => b.h.finals * 50 + b.h.weeks * 0.5 + b.h.masters * 10 - (a.h.finals * 50 + a.h.weeks * 0.5 + a.h.masters * 10))[0];
  if (under)
    add("Who is the most underrated name on the list?", [
      ["con", [`${under.short}. Nobody brings ${under.short} into this, and the record is ${plural(under.h.slam, "major")}, ${under.h.finals} ATP Finals and ${fmt(under.h.weeks)} weeks at No. 1.`, `My pick is ${under.short}. ${plural(under.h.slam, "major")}, ${under.h.masters} Masters, ${fmt(under.h.weeks)} weeks on top. Where is the love?`]],
      ["num", [`${under.short} is ${nth(under.place)} on the all-time list. From fourth down the gaps are small, which is where the real arguments live.`, `${nth(under.place)} on the list, ${fmt(under.score)} points. The middle of this table is badly underrated generally.`]],
      ["hist", ["History is unkind to anyone who plays in the same era as a giant.", "Some careers get remembered for who they lost to rather than what they won."]],
      ["pro", [`I'd have hated playing ${under.short}. That is my underrated vote.`, `Ask the players who faced ${under.short}. Nobody underrated it from across the net.`]],
    ]);

  // the best season this save has seen
  const best = state.records && state.records.season && state.records.season.titles;
  if (best && best.v >= 6)
    add("What is the best season of this era?", [
      ["num", [`${best.name}: ${best.v} titles in ${best.note}. Nobody in this save has had a better year.`, `The benchmark is ${best.name} in ${best.note}, ${best.v} titles. That's the season to beat.`]],
      ["pro", ["A season like that changes how the locker room looks at you. People start losing in the warm-up.", "You can feel it when someone is having a year like that. The draw sheet looks different."]],
      ["hist", ["The very best have had a season like that once or twice. It's the company you keep, not the number.", "Seasons like that are what people remember when the career is over."]],
      ["con", ["Titles are nice. Show me the majors in that season and then we can talk.", "Count the 250s in there before you get excited."]],
    ]);

  // the last eight majors, newest first
  const winners = state.calendar.filter((e) => e.tier === "slam" && e.champion).map((e) => e.champion.name).reverse();
  state.seasons.slice().reverse().forEach((s) => s.events.filter((e) => e.tier === "slam" && e.champion).reverse().forEach((e) => winners.push(e.champion)));
  const recent = winners.slice(0, 8);
  if (recent.length >= 4) {
    const wins = {};
    recent.forEach((n) => {
      wins[n] = (wins[n] || 0) + 1;
    });
    const [first, next] = Object.entries(wins).sort((x, y) => y[1] - x[1]);
    const pa = state.players.find((p) => p.name === first[0]);
    const pb = next && state.players.find((p) => p.name === next[0]);
    const met = pa && pb ? h2hFor(state.h2h, pa.id, pb.id) : [0, 0];
    add("Dominance, or a thin field?", [
      ["con", next ? `${shortName(first[0])} and ${shortName(next[0])} have won ${word(first[1] + next[1])} of the last ${word(recent.length)} majors between them. Is that greatness, or is nobody else good enough?` : `${shortName(first[0])} has won every one of the last ${word(recent.length)} majors. Is that greatness, or is nobody else good enough?`],
      ["hist", ["They said the same about every dominant pair this sport has had. From the outside, dominance always looks like a weak field.", "Every great era was called a weak era by somebody at the time."]],
      ["num", met[0] + met[1] >= 4 ? `The two of them have played ${met[0] + met[1]} times and it stands ${Math.max(met[0], met[1])}–${Math.min(met[0], met[1])}. ${Math.min(met[0], met[1]) / (met[0] + met[1]) >= 0.35 ? "Somebody is being pushed." : "That is not much of a rivalry, which rather makes the columnist's point."}` : `There are ${word(Object.keys(wins).length)} different names on that list of winners. Count them before you call it a closed shop.`],
      ["pro", ["Ask the players ranked three to ten whether the field is weak. They are the ones losing to them every month.", "Go and tell the number five in the world that the field is weak. I'll hold your coat."]],
      ["con", ["I'm only asking the question.", "I'm raising it. Somebody has to."]],
      ["pro", ["You are always only asking the question.", "You raise it every single week."]],
    ]);
  }

  const turn = (hashOf(`panel:${state.currentYear}:${state.currentWeek}`) + salt) % topics.length;
  return { ...topics[turn], n: turn + 1, of: topics.length, cast: Object.values(PANEL) };
}

/* ── The pace: majors by age ── */
// What really happened, by age in each season, for the three benchmarks and for the chasers' seasons before 2026.
const PACE_REAL = {
  "Roger Federer": [[22, 1], [23, 4], [24, 6], [25, 9], [26, 12], [27, 13], [28, 15], [29, 16], [31, 17], [36, 19], [37, 20]],
  "Rafael Nadal": [[19, 1], [20, 2], [21, 3], [22, 5], [23, 6], [24, 9], [25, 10], [26, 11], [27, 13], [28, 14], [31, 16], [32, 17], [33, 19], [34, 20], [36, 22]],
  "Novak Djokovic": [[21, 1], [24, 4], [25, 5], [26, 6], [27, 7], [28, 10], [29, 12], [31, 14], [32, 16], [33, 17], [34, 20], [35, 21], [36, 24], [38, 24]],
  "Carlos Alcaraz": [[19, 1], [20, 2], [21, 4], [22, 6]],
  "Jannik Sinner": [[22, 2], [23, 4]],
};
const PACE_BENCH = ["Novak Djokovic", "Rafael Nadal", "Roger Federer"];

function slamPace(state) {
  const wonIn = {}; // name -> majors won in each year of this save
  const note = (name, year) => {
    const mine = wonIn[name] || (wonIn[name] = {});
    mine[year] = (mine[year] || 0) + 1;
  };
  state.seasons.forEach((s) => s.events.forEach((e) => e.tier === "slam" && e.champion && note(e.champion, s.year)));
  state.calendar.forEach((e) => e.tier === "slam" && e.champion && note(e.champion.name, state.currentYear));

  const curve = (name) => {
    const known = {};
    (PACE_REAL[name] || []).forEach(([age, n]) => {
      known[age] = n;
    });
    const p = state.players.find((x) => x.name === name);
    const r = p ? null : state.retired.find((x) => x.name === name);
    const who = p || r;
    if (who) {
      const lastYear = p ? state.currentYear : r.year;
      const ageIn = (year) => (p ? p.age - (state.currentYear - year) : r.age - 1 - (r.year - year));
      const from = Math.max(START_YEAR, (p && p.debut) || START_YEAR);
      let total = who.legacy.slam;
      if (known[ageIn(from) - 1] == null) known[ageIn(from) - 1] = total; // where the save picked the career up
      for (let year = from; year <= lastYear; year++) {
        total += (wonIn[name] || {})[year] || 0;
        known[ageIn(year)] = total;
      }
    }
    const ages = Object.keys(known).map(Number).sort((a, b) => a - b);
    const pts = [];
    for (let age = ages[0]; age <= ages[ages.length - 1]; age++) pts.push([age, known[age] != null ? known[age] : pts[pts.length - 1][1]]);
    return pts;
  };
  // a finished career keeps its final total at every later age; an open one has no answer yet
  const valueAt = (pts, age, closed) => (age < pts[0][0] ? 0 : age > pts[pts.length - 1][0] ? (closed ? pts[pts.length - 1][1] : null) : pts[age - pts[0][0]][1]);

  const bench = PACE_BENCH.map((name) => ({ id: `bench-${slug(name)}`, name, short: shortName(name), pts: curve(name), closed: !state.players.some((p) => p.name === name) }));
  const chasers = state.players
    .filter((p) => !PACE_BENCH.includes(p.name) && honours(p).slam >= 1 && p.age <= 30) // still young enough for the comparison to mean something
    .sort((a, b) => honours(b).slam - honours(a).slam || a.age - b.age)
    .slice(0, 3)
    .sort((a, b) => (a.id < b.id ? -1 : 1)) // colour follows the player, not the standings
    .map((p, slot) => ({ id: p.id, name: p.name, short: shortName(p.name), age: p.age, n: honours(p).slam, slot, pts: curve(p.name) }));
  const reads = chasers
    .slice()
    .sort((a, b) => b.n - a.n)
    .filter((c) => bench.some((b) => valueAt(b.pts, c.age, b.closed) != null))
    .map((c) => {
      const then = bench.map((b) => [b.short, valueAt(b.pts, c.age, b.closed)]).filter(([, n]) => n != null);
      const ahead = then.filter(([, n]) => c.n > n).length;
      return { id: c.id, text: `At ${c.age}, ${c.short} has ${plural(c.n, "major")}. At the same age ${listNames(then.map(([short, n]) => `${short} had ${n}`))}. ${ahead === then.length ? `${c.short} is ahead of all ${word(then.length)}.` : ahead === 0 ? `${c.short} is behind all ${word(then.length)}.` : `${c.short} is ahead of ${word(ahead)} of the ${word(then.length)}.`}` };
    });
  const all = bench.concat(chasers);
  return {
    bench,
    chasers,
    reads,
    minAge: 18,
    maxAge: Math.max(40, ...all.map((s) => s.pts[s.pts.length - 1][0])),
    maxN: Math.max(25, ...all.map((s) => s.pts[s.pts.length - 1][1])),
    valueAt,
  };
}

/* ── Milestone watch: what is within reach right now ── */
function milestones(state, F = goatField(state)) {
  const { ranked, ranks, rows } = F;
  const out = [];
  const add = (weight, p, text) => out.push({ weight, id: p.id, name: p.name, text });
  ranked.forEach((p) => {
    const h = honours(p);
    const rank = ranks[p.id];
    const short = shortName(p.name);
    if (rank > 60) return;
    if (h.slam >= 3) {
      const majors = slamBreakdown(state, p);
      const missing = majors.filter((x) => !x.n);
      if (missing.length === 1) add(96, p, `${short} needs ${MAJOR_NAME[missing[0].id]} to complete the career Grand Slam.`);
    }
    if (h.slam >= 1) {
      const round = [5, 10, 15, 20, 25, 30, 35].find((n) => n > h.slam);
      if (round && round - h.slam <= 2) add(78 + round, p, `${short} is ${plural(round - h.slam, "Grand Slam")} from ${round}.`);
      const above = rows.filter((r) => r.id !== p.id && r.h.slam > h.slam).sort((a, b) => a.h.slam - b.h.slam)[0];
      if (h.slam >= 2 && rank <= 30 && above && above.h.slam - h.slam <= 2) add(88, p, `${short} is ${plural(above.h.slam - h.slam, "major")} from matching ${above.short}'s ${above.h.slam}.`);
    }
    const tens = [10, 20, 30, 40, 50].find((n) => n > h.masters);
    if (h.masters >= 5 && tens && tens - h.masters === 1) add(58, p, `${short} is one Masters 1000 title from ${tens}.`);
    if (rank === 1) {
      const aboveWeeks = rows.filter((r) => r.id !== p.id && r.h.weeks > h.weeks).sort((a, b) => a.h.weeks - b.h.weeks)[0];
      if (aboveWeeks && aboveWeeks.h.weeks - h.weeks <= 45) add(76, p, `${short} is ${plural(aboveWeeks.h.weeks - h.weeks, "week")} at No. 1 from matching ${aboveWeeks.short}'s ${fmt(aboveWeeks.h.weeks)}.`);
      const mark = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500].find((n) => n > h.weeks);
      if (mark && mark - h.weeks <= 12) add(66, p, `${short} is ${plural(mark - h.weeks, "week")} from ${mark} weeks at No. 1.`);
    }
    const i = rows.findIndex((r) => r.id === p.id);
    if (i > 0 && rows[i].score >= 300 && rows[i - 1].score - rows[i].score <= 120) add(72, p, `${short} is ${fmt(rows[i - 1].score - rows[i].score + 1)} GOAT points from passing ${rows[i - 1].short} for ${nth(i)} on the all-time list.`);
    const hundred = Math.ceil((p.record.w + 1) / 100) * 100;
    if (hundred - p.record.w <= 8) add(40, p, `${short} is ${plural(hundred - p.record.w, "win")} from ${hundred} match wins in this save.`);
    if (rank <= 5 && !h.slam) add(62, p, `${short} is No. ${rank} in the world and still looking for a first Grand Slam.`);
    if (rank <= 10 && p.age <= 20) add(52, p, `${short} is ${p.age} and already in the top 10.`);
    if (rank <= 20 && p.age >= 36) add(46, p, `${short} is ${p.age} and still No. ${rank} in the world.`);
  });
  const seen = {};
  return out
    .sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1))
    .filter((x) => (seen[x.id] = (seen[x.id] || 0) + 1) <= 2)
    .slice(0, 8)
    .map(({ id, name, text }) => ({ id, name, text }));
}

/* ── Between the names: how they did against each other ── */
// Final records between the retired greats (and Djokovic's against them). These are real and closed.
const REAL_H2H = [
  ["Novak Djokovic", "Rafael Nadal", 31, 29],
  ["Novak Djokovic", "Roger Federer", 27, 23],
  ["Rafael Nadal", "Roger Federer", 24, 16],
  ["Pete Sampras", "Andre Agassi", 20, 14],
  ["Novak Djokovic", "Andy Murray", 25, 11],
  ["Rafael Nadal", "Andy Murray", 17, 7],
  ["Roger Federer", "Andy Murray", 14, 11],
];

function greatRivalries(state, F = goatField(state)) {
  const { rows } = F;
  const listed = rows.slice(0, 12);
  const on = (name) => listed.some((r) => r.name === name);
  const closed = REAL_H2H.filter(([a, b]) => on(a) && on(b)).map(([a, b, wa, wb]) => ({ key: `${a}|${b}`, a: shortName(a), b: shortName(b), wa, wb, live: false, ids: [null, null] }));
  const live = [];
  const active = listed.filter((r) => r.kind === "active");
  active.forEach((x, i) =>
    active.slice(i + 1).forEach((y) => {
      const [wx, wy] = h2hFor(state.h2h, x.id, y.id);
      if (wx + wy < 3) return;
      const [lead, trail, wl, wt] = wx >= wy ? [x, y, wx, wy] : [y, x, wy, wx];
      live.push({ key: `${lead.id}|${trail.id}`, a: lead.short, b: trail.short, wa: wl, wb: wt, live: true, ids: [lead.id, trail.id] });
    })
  );
  return { closed, live: live.sort((p, q) => q.wa + q.wb - (p.wa + p.wb)).slice(0, 6) };
}


// The whole debate, and where each room stands right now.
function goatDebate(state, salt = 0) {
  const F = goatField(state);
  const players = lockerRoom(state, F, salt);
  const analysts = { ...studio(state, F), panel: panelTalk(state, F, players, salt) };
  const fans = stands(state, F, players, salt);
  return {
    field: F.field.map(({ id, name, short, kind, place, score }) => ({ id, name, short, kind, place, score })),
    players,
    analysts,
    fans,
    stand: {
      players: { name: players.poll[0].short, note: `${players.poll[0].votes} of ${players.voters} votes in the top 40` },
      analysts: { name: analysts.consensus.name, note: `First on ${analysts.consensus.n} of ${analysts.consensus.of} desks` },
      fans: { name: fans.poll[0].short, note: `${fans.poll[0].pct}% of ${fmt(fans.total)} votes this week` },
    },
  };
}

/* ────────────────────────────── Shared UI ────────────────────────────── */

const SURF = {
  hard: { label: "Hard", fill: "bg-hard" },
  clay: { label: "Clay", fill: "bg-clay" },
  grass: { label: "Grass", fill: "bg-grass" },
};
const surfaceLabel = (e) => (e.indoor ? "Indoor hard" : SURF[e.surface].label);

const PHASES = {
  growth: { label: "Growth", range: "18–22", note: "OVR and attributes +1 to +3, paced by potential", icon: TrendingUp, tone: "text-up" },
  peak: { label: "Peak", range: "23–28", note: "Ratings hold steady", icon: Activity, tone: "text-muted" },
  regression: { label: "Regression", range: "29+", note: "Movement and stamina −1 to −2", icon: TrendingDown, tone: "text-down" },
};

const BTN = {
  primary: "bg-ball text-ink hover:brightness-110",
  outline: "border border-line text-fg hover:border-muted hover:bg-raise",
  ghost: "text-muted hover:bg-raise hover:text-fg",
};
const chip = (on) => `rounded-sm px-2.5 py-1 font-display text-sm font-semibold uppercase tracking-wider transition ${on ? "bg-raise text-fg" : "text-muted hover:text-fg"}`;

function Btn({ variant = "primary", icon: Icon, children, className = "", type = "button", ...rest }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 font-display text-base font-bold uppercase leading-none tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${BTN[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={17} strokeWidth={2.25} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function Panel({ title, aside, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-sm border border-line bg-panel ${className}`}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-bold uppercase leading-none tracking-wide">{title}</h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

function SurfaceTag({ event }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-2 w-2 rounded-full ${SURF[event.surface].fill}`} aria-hidden="true" />
      {surfaceLabel(event)}
    </span>
  );
}

function EventMeta({ event }) {
  const tier = TIERS[event.tier];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted md:max-w-[56%]">
      <span className="font-semibold text-fg">{tier.label}</span>
      <SurfaceTag event={event} />
      <span className="inline-flex items-center gap-1">
        <MapPin size={13} aria-hidden="true" />
        {event.city}
      </span>
      {EVENT_DATES[event.id] && event.year && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={13} aria-hidden="true" />
          {dateRange(event, event.year)}
        </span>
      )}
      <span>
        {tier.draw}-player draw, best of {tier.bestOf}
      </span>
    </div>
  );
}

// Top-down court at true proportions: 78 × 36 ft, service lines 21 ft from the net.
function Court({ surface, className = "" }) {
  const color = `rgb(var(--${surface}))`;
  return (
    <svg viewBox="-7 -7 92 50" className={className} aria-hidden="true">
      <rect x="-7" y="-7" width="92" height="50" fill={color} fillOpacity="0.4" />
      <rect x="0" y="0" width="78" height="36" fill={color} />
      <g fill="none" stroke="rgb(var(--fg))" strokeWidth="0.45">
        <rect x="0" y="0" width="78" height="36" />
        <line x1="0" y1="4.5" x2="78" y2="4.5" />
        <line x1="0" y1="31.5" x2="78" y2="31.5" />
        <line x1="18" y1="4.5" x2="18" y2="31.5" />
        <line x1="60" y1="4.5" x2="60" y2="31.5" />
        <line x1="18" y1="18" x2="60" y2="18" />
        <line x1="39" y1="-3" x2="39" y2="39" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

function PhaseTag({ age }) {
  const phase = PHASES[phaseFor(age)];
  const Icon = phase.icon;
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm font-semibold uppercase tracking-wider ${phase.tone}`}>
      <Icon size={14} aria-hidden="true" />
      {phase.label}
    </span>
  );
}

function Move({ prev, now }) {
  if (prev == null || prev === now) return <Minus size={12} className="text-dim" aria-label="No change" />;
  const up = prev > now;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center font-mono text-xs ${up ? "text-up" : "text-down"}`} aria-label={`${up ? "Up" : "Down"} ${Math.abs(prev - now)}`}>
      <Icon size={12} aria-hidden="true" />
      {Math.abs(prev - now)}
    </span>
  );
}

function Delta({ value }) {
  if (!value) return <span className="w-9" aria-hidden="true" />;
  return <span className={`w-9 text-right font-mono text-xs ${value > 0 ? "text-up" : "text-down"}`}>{signed(value)}</span>;
}

// Shared modal behaviour: focus the close button, close on Escape, lock page scroll.
function useDialog(onClose) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return closeRef;
}

/* ────────────────────────────── Franchise Hub ────────────────────────────── */

function SeasonStrip({ calendar, week }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const centre = () => {
      const box = boxRef.current;
      const cell = box && box.querySelector('[data-current="true"]');
      if (!cell) return;
      const b = box.getBoundingClientRect();
      const c = cell.getBoundingClientRect();
      box.scrollLeft += c.left - b.left - (b.width - c.width) / 2;
    };
    const frame = requestAnimationFrame(centre);
    const timer = setTimeout(centre, 300); // again after the stylesheet and fonts settle
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [week]);
  const cellClass = (current) => `relative min-w-[64px] flex-1 overflow-hidden rounded-sm border px-2 pb-2 pt-2.5 ${current ? "border-ball bg-raise" : "border-line bg-panel"}`;
  return (
    <div ref={boxRef} className="relative overflow-x-auto pb-1">
      <ol className="flex min-w-max gap-1">
        {calendar.map((e) => (
          <li key={e.id} data-current={e.week === week} className={cellClass(e.week === week)}>
            <span className={`absolute inset-x-0 top-0 h-[3px] ${SURF[e.surface].fill}`} aria-hidden="true" />
            <span className="block font-mono text-[10px] text-muted">
              {dayLabel(eventDays(e, e.year).start)}
            </span>
            <span className={`block font-display text-xl font-bold leading-tight ${e.champion ? "text-muted" : "text-fg"}`}>{e.abbr}</span>
            <span className="block truncate text-[11px] text-muted">{e.champion ? shortName(e.champion.name) : TIERS[e.tier].short}</span>
          </li>
        ))}
        <li data-current={week === OFFSEASON_WEEK} className={cellClass(week === OFFSEASON_WEEK)}>
          <span className="block font-mono text-[10px] text-muted">W{OFFSEASON_WEEK} Dec</span>
          <span className="block font-display text-xl font-bold leading-tight">OFF</span>
          <span className="block truncate text-[11px] text-muted">Aging</span>
        </li>
      </ol>
    </div>
  );
}

function RankingsBoard({ state, ranked, onOpenPlayer }) {
  const [board, setBoard] = useState("rankings");
  const [expanded, setExpanded] = useState(false);
  const year = state.currentYear;
  const race = useMemo(() => rankBy(state.players, (p) => racePoints(p, year)), [state.players, year]);
  const isRace = board === "race";
  const list = isRace ? race : ranked;
  const score = isRace ? (p) => racePoints(p, year) : totalPoints;
  const rows = expanded ? list : list.slice(0, 10);
  const top = Math.max(1, score(list[0]));
  const direct = TIERS.masters.draw - TIERS.masters.qual;
  const cut = isRace ? 8 : direct;

  return (
    <Panel
      title={isRace ? `Race to Turin ${year}` : "ATP Rankings"}
      aside={
        <div className="flex gap-1" role="group" aria-label="Standings">
          <button type="button" className={chip(!isRace)} aria-pressed={!isRace} onClick={() => setBoard("rankings")}>
            52-week
          </button>
          <button type="button" className={chip(isRace)} aria-pressed={isRace} onClick={() => setBoard("race")}>
            Race
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="eyebrow text-left">
              <th className="w-12 py-2 pl-4 pr-2 font-semibold">Rk</th>
              {!isRace && <th className="w-10 px-1 py-2 font-semibold"><span className="sr-only">Move</span></th>}
              <th className="px-2 py-2 font-semibold">Player</th>
              <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">Age</th>
              <th className="px-2 py-2 text-right font-semibold">OVR</th>
              <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">W–L</th>
              <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">Titles</th>
              <th className="py-2 pl-2 pr-4 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const pts = score(p);
              const titles = seasonTitles(p, year);
              return (
                <tr key={p.id} className={`cursor-pointer border-t hover:bg-raise ${i === cut && rows.length > cut ? "border-t-2 border-dim" : "border-line"}`} onClick={() => onOpenPlayer(p.id)}>
                  <td className="py-2.5 pl-4 pr-2 font-mono tabular-nums text-muted">{i + 1}</td>
                  {!isRace && (
                    <td className="px-1 py-2.5">
                      <Move prev={state.prevRanks[p.id]} now={i + 1} />
                    </td>
                  )}
                  <td className="px-2 py-2.5">
                    <button type="button" className="flex items-baseline gap-2 text-left font-semibold" onClick={(e) => { e.stopPropagation(); onOpenPlayer(p.id); }}>
                      <span className="whitespace-nowrap">{p.name}</span>
                      {p.country && <span className="hidden font-mono text-[11px] font-normal text-muted sm:inline">{p.country}</span>}
                      {p.rookie && <span className="rounded-sm bg-ball px-1 font-display text-[11px] font-bold tracking-wider text-ink">NEW</span>}
                    </button>
                  </td>
                  <td className="hidden px-2 py-2.5 text-right font-mono tabular-nums text-muted sm:table-cell">{p.age}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{p.ovr}</td>
                  <td className="hidden whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums text-muted sm:table-cell">
                    {p.stats.w}–{p.stats.l}
                  </td>
                  <td className="hidden px-2 py-2.5 text-right font-mono tabular-nums text-muted sm:table-cell">{titles || "–"}</td>
                  <td className="py-2.5 pl-2 pr-4 text-right">
                    <span className="block font-mono font-semibold tabular-nums">{fmt(pts)}</span>
                    <span className="mt-1 block h-0.5 rounded-full bg-raise">
                      <span className="ml-auto block h-full rounded-full bg-ball" style={{ width: `${(pts / top) * 100}%` }} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
        <span>
          {isRace
            ? `Points earned in ${year}. The top 8 after Paris play the ATP Finals.`
            : `Rolling 52 weeks. Slams, Masters and the Finals always count, plus each player's best ${OTHER_COUNT} results from the 500s and 250s.`}
        </span>
        <button type="button" className="font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show top 10" : `Show all ${list.length}`}
        </button>
      </footer>
    </Panel>
  );
}

const LEADERS = [
  { id: "wins", label: "Wins", value: (s) => s.w, show: (s) => `${s.w}–${s.l}`, ok: (s) => s.w > 0 },
  { id: "aces", label: "Aces", value: (s) => s.ac, show: (s) => fmt(s.ac), ok: (s) => s.ac > 0 },
  { id: "hold", label: "Hold %", value: (s) => s.hd / s.sg, show: (s) => pct(s.hd, s.sg), ok: (s) => s.sg >= 30 },
  { id: "break", label: "Break %", value: (s) => s.br / s.rg, show: (s) => pct(s.br, s.rg), ok: (s) => s.rg >= 30 },
];

function SeasonLeaders({ players, onOpenPlayer, onShowAll }) {
  const [cat, setCat] = useState("wins");
  const def = LEADERS.find((l) => l.id === cat);
  const top = players
    .filter((p) => def.ok(p.stats))
    .sort((a, b) => def.value(b.stats) - def.value(a.stats) || b.stats.w - a.stats.w)
    .slice(0, 5);
  return (
    <Panel
      title="Season leaders"
      aside={
        <button type="button" className="inline-flex items-center gap-1 font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={onShowAll}>
          Every stat <ChevronRight size={14} aria-hidden="true" />
        </button>
      }
    >
      <div className="flex flex-wrap gap-1 px-3 pt-3" role="group" aria-label="Statistic">
        {LEADERS.map((l) => (
          <button key={l.id} type="button" className={chip(cat === l.id)} aria-pressed={cat === l.id} onClick={() => setCat(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <ol className="flex flex-col p-2">
        {top.map((p, i) => (
          <li key={p.id}>
            <button type="button" className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-raise" onClick={() => onOpenPlayer(p.id)}>
              <span className="w-4 font-mono text-xs text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="font-mono tabular-nums">{def.show(p.stats)}</span>
            </button>
          </li>
        ))}
        {top.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">{cat === "hold" || cat === "break" ? "Needs 30 service or return games played." : "No matches played yet this season."}</li>}
      </ol>
    </Panel>
  );
}

function Hub({ state, ranked, onStart, onResume, onSimSeason, onOffseason, onOpenPlayer, onShowBracket, onShowReport, onShowLeaders, onShowStories, onOpenArticle }) {
  const { currentYear: year, currentWeek: week, calendar, tournament, lastResult } = state;
  const next = week < OFFSEASON_WEEK ? calendar[week - 1] : null;
  const live = !!tournament && tournament.status !== "complete";
  const defending = next
    ? state.players
        .map((p) => ({ p, e: p.rankingPoints[next.slot] }))
        .filter((x) => x.e && x.e.pts > 0)
        .sort((x, y) => y.e.pts - x.e.pts)
        .slice(0, 5)
    : [];
  const lastEvent = lastResult ? calendar[lastResult.slot] : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-sm border border-line bg-panel">
        {next && <Court surface={next.surface} className="court-art" />}
        <div className="relative flex flex-col gap-5 p-5 md:p-7">
          <p className="eyebrow flex flex-wrap gap-x-4 gap-y-1">
            <span>{year} season</span>
            <span>
              Week {week} of {OFFSEASON_WEEK}
            </span>

          </p>
          {next ? (
            <div className="flex flex-col gap-3">
              <p className="eyebrow text-ball">{live ? "In progress" : "Next on the calendar"}</p>
              <h1 className="font-display text-5xl font-bold uppercase italic leading-[0.9] md:text-7xl">{next.name}</h1>
              <EventMeta event={next} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="eyebrow text-ball">Season complete</p>
              <h1 className="font-display text-5xl font-bold uppercase italic leading-[0.9] md:text-7xl">{year} Off-season</h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <Crown size={15} className="text-ball" aria-hidden="true" />
                <span className="font-semibold text-fg">{ranked[0].name}</span>
                <span>finishes {year} as world No. 1 with {fmt(totalPoints(ranked[0]))} points.</span>
              </p>
              <p className="max-w-[60ch] text-sm text-muted">
                Advancing ages every player by a year, applies growth, peak and regression, brings in a random rookie class, and returns the calendar to week 1 in Brisbane.
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {!next && (
              <Btn icon={Moon} onClick={onOffseason}>
                Run off-season and start {year + 1}
              </Btn>
            )}
            {next && live && (
              <Btn icon={Play} onClick={onResume}>
                Resume tournament
              </Btn>
            )}
            {next && !live && (
              <Btn icon={Play} onClick={onStart}>
                Start next tournament
              </Btn>
            )}
            {next && (
              <Btn variant="outline" icon={FastForward} onClick={onSimSeason}>
                Sim rest of season
              </Btn>
            )}
            {state.offseason && week === 1 && !tournament && (
              <Btn variant="ghost" icon={Moon} onClick={onShowReport}>
                Off-season report
              </Btn>
            )}
          </div>
        </div>
      </section>

      <SeasonStrip calendar={calendar} week={week} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <RankingsBoard state={state} ranked={ranked} onOpenPlayer={onOpenPlayer} />

        <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
          <Panel
            title="Latest stories"
            aside={
              <button type="button" className="inline-flex items-center gap-1 font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={onShowStories}>
                All stories <ChevronRight size={14} aria-hidden="true" />
              </button>
            }
          >
            <StoryList items={state.news.slice(0, 5)} compact onOpen={onOpenArticle} />
          </Panel>
          {lastResult && lastEvent && (
            <Panel title="Last result">
              <div className="flex flex-col gap-2 p-4">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <SurfaceTag event={lastEvent} />
                  <span>{lastEvent.name}</span>
                </p>
                <p className="flex items-center gap-2 font-display text-2xl font-bold uppercase leading-none">
                  <Trophy size={18} className="text-ball" aria-hidden="true" />
                  {lastResult.champion.name}
                </p>
                <p className="text-sm text-muted">
                  d. {lastResult.runnerUp.name} <span className="font-mono text-fg">{lastResult.score}</span>
                </p>
                <button type="button" className="mt-1 inline-flex items-center gap-1 self-start font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={onShowBracket}>
                  View bracket <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Panel>
          )}

          {next && (
            <Panel title="Points coming off">
              <p className="px-4 pt-3 text-xs text-muted">Last season's {next.abbr} points leave the ranking when this event is played.</p>
              <ul className="flex flex-col p-2">
                {defending.map(({ p, e }) => (
                  <li key={p.id}>
                    <button type="button" className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-raise" onClick={() => onOpenPlayer(p.id)}>
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono tabular-nums text-muted">−{fmt(e.pts)}</span>
                    </button>
                  </li>
                ))}
                {defending.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">Nobody has points to defend here.</li>}
              </ul>
            </Panel>
          )}

          <SeasonLeaders players={state.players} onOpenPlayer={onOpenPlayer} onShowAll={onShowLeaders} />

          {state.seasons.length > 0 && (
            <Panel title="Roll of honour">
              <ul className="flex flex-col divide-y divide-line">
                {state.seasons
                  .slice()
                  .reverse()
                  .map((s) => (
                    <li key={s.year} className="flex flex-col gap-1 px-4 py-3 text-sm">
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-xl font-bold leading-none">{s.year}</span>
                        <span className="text-right text-muted">
                          No. 1 <span className="font-semibold text-fg">{s.no1.name}</span>
                        </span>
                      </p>
                      <p className="text-xs leading-relaxed text-muted">
                        {s.events
                          .filter((e) => e.tier === "slam" || e.tier === "finals")
                          .map((e) => `${e.abbr} ${e.champion ? shortName(e.champion) : "–"}`)
                          .join("  ·  ")}
                      </p>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Tournament ────────────────────────────── */

function MatchCard({ m, t, onOpen }) {
  const ready = !!m.a && !!m.b;
  const rows = [m.a, m.b].map((id, row) => {
    const entry = id ? t.entries[id] : null;
    const won = !!m.winner && m.winner === id;
    const lost = !!m.winner && !won;
    return (
      <span key={row} className={`flex h-8 items-center gap-2 border-l-[3px] pl-1.5 pr-2 ${row === 0 ? "border-b border-b-line" : ""} ${won ? "border-l-ball bg-raise" : "border-l-transparent"}`}>
        <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted">{entry ? entry.seed || entry.tag || "" : ""}</span>
        <span className={`min-w-0 flex-1 truncate text-[13px] ${entry && !lost ? "font-semibold text-fg" : "text-muted"}`}>{entry ? shortName(entry.name) : "To be decided"}</span>
        {m.sets && (
          <span className="flex shrink-0 gap-1.5 font-mono text-[13px] tabular-nums">
            {m.sets.map((s, k) => {
              const mine = row === 0 ? s.a : s.b;
              const theirs = row === 0 ? s.b : s.a;
              return (
                <span key={k} className={mine > theirs ? "text-fg" : "text-muted"}>
                  {mine}
                  {s.tb != null && mine < theirs && <sup className="text-[9px]">{s.tb}</sup>}
                </span>
              );
            })}
          </span>
        )}
        {ready && !m.winner && row === 0 && <Eye size={13} className="shrink-0 text-ball" aria-hidden="true" />}
      </span>
    );
  });
  if (!ready) return <div className="rounded-sm border border-line bg-panel">{rows}</div>;
  const label = `${t.entries[m.a].name} against ${t.entries[m.b].name}: ${m.winner ? "open match centre" : "preview or watch"}`;
  return (
    <button type="button" aria-label={label} onClick={onOpen} className="block w-full rounded-sm border border-line bg-panel text-left transition hover:border-muted">
      {rows}
    </button>
  );
}

// Big draws are shown a quarter at a time (16 players, four columns) plus the closing rounds.
function Bracket({ t, onOpenMatch }) {
  const total = t.rounds.length;
  const sections = t.rounds[0].matches.length > 8 ? t.rounds[0].matches.length / 8 : 1;
  const finalFrom = Math.max(0, total - 3);
  const late = t.status === "complete" || t.roundIndex >= finalFrom;
  const [tab, setTab] = useState(sections === 1 || late ? "final" : 0);
  useEffect(() => {
    if (late) setTab("final");
  }, [late]);

  const view = sections === 1 ? "all" : tab;
  const cols =
    view === "all"
      ? t.rounds.map((rd, r) => ({ r, rd, start: 0, count: rd.matches.length }))
      : view === "final"
        ? t.rounds.slice(finalFrom).map((rd, k) => ({ r: finalFrom + k, rd, start: 0, count: rd.matches.length }))
        : t.rounds.slice(0, 4).map((rd, r) => ({ r, rd, start: view * (8 >> r), count: 8 >> r }));

  const topSeed = (s) => {
    let best = null;
    t.rounds[0].matches.slice(s * 8, s * 8 + 8).forEach((m) =>
      [m.a, m.b].forEach((id) => {
        const e = t.entries[id];
        if (e.seed && (!best || e.seed < best.seed)) best = e;
      })
    );
    return best;
  };

  return (
    <div>
      {sections > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-line px-3 py-2" role="group" aria-label="Section of the draw">
          {Array.from({ length: sections }, (_, s) => {
            const seed = topSeed(s);
            return (
              <button key={s} type="button" className={chip(tab === s)} aria-pressed={tab === s} onClick={() => setTab(s)}>
                {sections === 2 ? (s === 0 ? "Top half" : "Bottom half") : `${sections === 4 ? "Quarter" : "Section"} ${s + 1}`}
                {seed && <span className="ml-2 font-body text-xs font-normal normal-case tracking-normal text-muted">{shortName(seed.name)}</span>}
              </button>
            );
          })}
          <button type="button" className={chip(tab === "final")} aria-pressed={tab === "final"} onClick={() => setTab("final")}>
            Final rounds
          </button>
        </div>
      )}
      <div className="overflow-x-auto p-4">
        <div className="bracket" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(214px, 1fr))` }}>
          {cols.map((c) => (
            <p key={c.rd.key} className={`eyebrow ${c.r === t.roundIndex ? "text-ball" : ""}`}>
              {ROUND_LABEL[c.rd.key]}
            </p>
          ))}
          {cols.map((c, k) => (
            <div key={c.rd.key} className="bracket-col">
              {c.rd.matches.slice(c.start, c.start + c.count).map((m, j) => (
                <div key={c.start + j} className={`bracket-slot ${k > 0 ? "has-in" : ""} ${k < cols.length - 1 ? (j % 2 === 0 ? "out-down" : "out-up") : ""}`}>
                  <MatchCard m={m} t={t} onOpen={() => onOpenMatch(c.r, c.start + j)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TournamentView({ state, ranks, dispatch, onStart, onHub, onOffseason, onOpenMatch }) {
  const t = state.tournament;
  const week = state.currentWeek;
  const next = week < OFFSEASON_WEEK ? state.calendar[week - 1] : null;
  const [allAwards, setAllAwards] = useState(false);
  // the matches worth a headline: still to come first, then the most recent results
  const marquee = useMemo(() => {
    if (!t) return [];
    const list = [];
    for (let r = t.rounds.length - 1; r >= 0; r--) t.rounds[r].matches.forEach((m, i) => {
      if (isBigMatch(t, r, m)) list.push({ r, i, m });
    });
    return list.filter((x) => !x.m.winner).concat(list.filter((x) => x.m.winner)).slice(0, 6);
  }, [t]);

  if (!t) {
    return (
      <Panel>
        <div className="flex flex-col items-start gap-4 p-6 md:p-8">
          <p className="eyebrow">No draw yet</p>
          <h1 className="font-display text-4xl font-bold uppercase italic leading-none md:text-5xl">{next ? next.name : `${state.currentYear} Off-season`}</h1>
          {next && <EventMeta event={next} />}
          {next && (
            <p className="max-w-[60ch] text-sm text-muted">
              {next.tier === "finals"
                ? "Start the tournament to make the draw. The top 8 in the Race qualify."
                : `Start the tournament to make the draw. The top ${TIERS[next.tier].draw - TIERS[next.tier].qual} in the rankings enter directly and ${TIERS[next.tier].qual} qualifiers come through from the rest of the tour.`}
            </p>
          )}
          {next ? (
            <Btn icon={Play} onClick={onStart}>
              Start {next.name}
            </Btn>
          ) : (
            <Btn icon={Moon} onClick={onOffseason}>
              Run off-season
            </Btn>
          )}
        </div>
      </Panel>
    );
  }

  const event = state.calendar[t.slot];
  const tier = TIERS[t.tier];
  const done = t.status === "complete";
  const upcoming = !done ? t.rounds[t.roundIndex].key : null;
  const awards = done
    ? Object.keys(t.awards)
        .map((id) => ({ id, ...t.awards[id], entry: t.entries[id] }))
        .sort((x, y) => y.pts - x.pts || x.entry.rank - y.entry.rank)
    : [];
  const shownAwards = allAwards ? awards : awards.slice(0, 16);

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-sm border border-line bg-panel">
        <Court surface={t.surface} className="court-art" />
        <div className="relative flex flex-col gap-4 p-5 md:p-7">
          <p className="eyebrow flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {t.year} · Week {event.week}
            </span>
            <span className={done ? "" : "text-ball"}>{done ? "Final result" : `Up next: ${ROUND_LABEL[upcoming]}`}</span>
          </p>
          <h1 className="font-display text-5xl font-bold uppercase italic leading-[0.9] md:text-6xl">{event.name}</h1>
          <EventMeta event={event} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted md:max-w-[56%]">
            {["W", ...tier.rounds.slice().reverse()].map((key) => (
              <span key={key}>
                {key} <span className="text-fg">{fmt(tier.points[key])}</span>
              </span>
            ))}
          </p>

          {!done && (
            <div className="flex flex-wrap gap-3">
              <Btn icon={FastForward} className="px-6 py-3.5 text-lg" onClick={() => dispatch({ type: "SIM_TOURNAMENT" })}>
                Simulate entire tournament
              </Btn>
              <Btn variant="outline" icon={Play} onClick={() => dispatch({ type: "SIM_ROUND" })}>
                Play {ROUND_LABEL[upcoming].toLowerCase()}
              </Btn>
            </div>
          )}

          {done && (
            <div className="champion flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-1">
                <p className="eyebrow flex items-center gap-2 text-ball">
                  <Trophy size={15} aria-hidden="true" /> Champion
                </p>
                <p className="font-display text-4xl font-bold uppercase leading-none md:text-5xl">{t.entries[t.championId].name}</p>
                <p className="text-sm text-muted">
                  d. {t.entries[t.runnerUpId].name} <span className="font-mono text-fg">{event.score}</span>
                  <span className="ml-3 font-mono text-fg">+{fmt(tier.points.W)} pts</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {next ? (
                  <Btn icon={Play} onClick={onStart}>
                    Start {next.name}
                  </Btn>
                ) : (
                  <Btn icon={Moon} onClick={onOffseason}>
                    Run off-season
                  </Btn>
                )}
                <Btn variant="outline" icon={BarChart3} onClick={() => onOpenMatch(t.rounds.length - 1, 0)}>
                  Final: play-by-play and stats
                </Btn>
                <Btn variant="ghost" icon={LayoutDashboard} onClick={onHub}>
                  Back to hub
                </Btn>
              </div>
            </div>
          )}
        </div>
      </section>

      <Panel
        title="Draw"
        aside={<span className="text-xs text-muted">{t.tier === "finals" ? "Top 8 in the Race, seeded by Race position" : `Seeds 1–${tier.seeds} by ranking · Q = qualifier`}</span>}
      >
        <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs text-muted">
          <Eye size={13} className="shrink-0 text-ball" aria-hidden="true" />
          Select any match: watch it point by point before it is played, or open its play-by-play and stats afterwards.
        </p>
        {t.out.length > 0 && (
          <p className="border-b border-line px-4 py-2 text-xs leading-relaxed text-muted">
            <span className="font-semibold text-fg">Top-20 players not in the field: </span>
            {t.out.map((o) => `${shortName(o.name)} (No. ${o.rank}, ${WHY[o.why]})`).join(" · ")}
          </p>
        )}
        <Bracket key={`${t.year}-${t.slot}`} t={t} onOpenMatch={onOpenMatch} />
      </Panel>

      {marquee.length > 0 && (
        <Panel title="Headline matches">
          <ul className="flex flex-col divide-y divide-line">
            {marquee.map(({ r, i, m }) => {
              const facts = matchFacts(state, t, r, i);
              return (
                <li key={`${r}-${i}`}>
                  <button type="button" className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-left hover:bg-raise" onClick={() => onOpenMatch(r, i)}>
                    <span className="eyebrow w-24 shrink-0">{ROUND_LABEL[t.rounds[r].key].replace(/s$/, "")}</span>
                    <span className="min-w-0 flex-1 font-semibold">{m.winner ? report(facts).headline : previewHeadline(facts)}</span>
                    <span className={`shrink-0 font-mono text-xs ${m.winner ? "text-muted" : "text-ball"}`}>{m.winner ? scoreLine(m) : "Preview"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {done && (
        <Panel
          title="Points awarded"
          aside={
            awards.length > 16 && (
              <button type="button" className="font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={() => setAllAwards(!allAwards)}>
                {allAwards ? "Show last 16" : `Show all ${awards.length}`}
              </button>
            )
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="eyebrow text-left">
                  <th className="py-2 pl-4 pr-2 font-semibold">Player</th>
                  <th className="px-2 py-2 font-semibold">Result</th>
                  <th className="px-2 py-2 text-right font-semibold">Points</th>
                  <th className="py-2 pl-2 pr-4 text-right font-semibold">Ranking</th>
                </tr>
              </thead>
              <tbody>
                {shownAwards.map((a) => (
                  <tr key={a.id} className="border-t border-line">
                    <td className="py-2 pl-4 pr-2 font-semibold">{a.entry.name}</td>
                    <td className="px-2 py-2 text-muted">{RESULT_LABEL[a.round]}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">+{fmt(a.pts)}</td>
                    <td className="py-2 pl-2 pr-4 text-right">
                      <span className="inline-flex items-center justify-end gap-2 font-mono tabular-nums">
                        <Move prev={state.prevRanks[a.id]} now={ranks[a.id]} />
                        <span className="w-7 text-right">{ranks[a.id]}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ────────────────────────────── Match centre ────────────────────────────── */

const SPEEDS = [
  { label: "1×", ms: 1100 },
  { label: "4×", ms: 280 },
  { label: "16×", ms: 60 },
];

function matchStatRows(st) {
  const [a, b] = st;
  const both = (fn) => [fn(a, b), fn(b, a)];
  const row = (label, show, value, lowerIsBetter) => {
    const [sa, sb] = both(show);
    const [va, vb] = both(value);
    return { label, a: sa, b: sb, va, vb, lowerIsBetter: !!lowerIsBetter };
  };
  return [
    row("Aces", (x) => x.ac, (x) => x.ac),
    row("Double faults", (x) => x.df, (x) => x.df, true),
    row("1st serve in", (x) => pct(x.fi, x.sp), (x) => (x.sp ? x.fi / x.sp : 0)),
    row("1st serve points won", (x) => pct(x.fw, x.fi), (x) => (x.fi ? x.fw / x.fi : 0)),
    row("2nd serve points won", (x) => pct(x.sw, x.sp - x.fi), (x) => (x.sp - x.fi ? x.sw / (x.sp - x.fi) : 0)),
    row("Break points converted", (x, o) => `${o.bf - o.bs}/${o.bf}`, (x, o) => o.bf - o.bs),
    row("Service games held", (x) => `${x.hd}/${x.sg}`, (x) => (x.sg ? x.hd / x.sg : 0)),
    row("Winners", (x) => x.wn, (x) => x.wn),
    row("Unforced errors", (x) => x.ue, (x) => x.ue, true),
    row("Total points won", (x) => x.pt, (x) => x.pt),
    row("Fastest serve", (x) => (x.mx ? `${x.mx} mph` : "–"), (x) => x.mx),
    row("Average 1st serve", (x) => (x.fi ? `${Math.round(x.sv / x.fi)} mph` : "–"), (x) => (x.fi ? x.sv / x.fi : 0)),
  ];
}

function CompareRow({ label, a, b, va, vb, lowerIsBetter }) {
  const sum = va + vb;
  const share = sum > 0 ? (va / sum) * 100 : 50;
  const aLeads = lowerIsBetter ? va <= vb : va >= vb;
  const bLeads = lowerIsBetter ? vb <= va : vb >= va;
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        <span className={`font-mono text-sm tabular-nums ${aLeads ? "font-semibold text-fg" : "text-muted"}`}>{a}</span>
        <span className="text-center text-xs text-muted">{label}</span>
        <span className={`text-right font-mono text-sm tabular-nums ${bLeads ? "font-semibold text-fg" : "text-muted"}`}>{b}</span>
      </div>
      <div className="flex h-1 gap-0.5" aria-hidden="true">
        <span className="rounded-full bg-fg" style={{ width: `${share}%` }} />
        <span className="flex-1 rounded-full bg-dim" />
      </div>
    </div>
  );
}

function Scoreboard({ entries, board, winner, onOpenPlayer }) {
  return (
    <div className="rounded-sm border border-line bg-bg">
      {entries.map((e, i) => (
        <div key={e.id} className={`flex h-11 items-center gap-2 px-3 ${i === 0 ? "border-b border-line" : ""}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${board.sv === i ? "bg-ball" : "bg-transparent"}`} aria-label={board.sv === i ? "Serving" : undefined} />
          <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted">{e.seed || e.tag || ""}</span>
          <button type="button" className={`min-w-0 flex-1 truncate text-left font-display text-xl font-bold uppercase leading-none hover:underline ${winner != null && winner !== i ? "text-muted" : "text-fg"}`} onClick={() => onOpenPlayer(e.id)}>
            {e.name}
          </button>
          {winner === i && <Trophy size={15} className="shrink-0 text-ball" aria-label="Winner" />}
          <span className="flex shrink-0 gap-2.5 font-mono text-lg tabular-nums">
            {board.sets.map((s, k) => {
              const mine = s[i];
              const theirs = s[1 - i];
              return (
                <span key={k} className={`w-4 text-center ${mine > theirs ? "text-fg" : "text-muted"}`}>
                  {mine}
                  {s[2] != null && mine < theirs && <sup className="text-[10px]">{s[2]}</sup>}
                </span>
              );
            })}
          </span>
          {board.pt[i] !== "" && <span className="w-9 shrink-0 rounded-sm bg-ball text-center font-mono text-sm font-semibold leading-6 text-ink">{board.pt[i]}</span>}
        </div>
      ))}
    </div>
  );
}

function PlayByPlay({ log, n, setNo }) {
  const games = log.games.filter((g) => g.set === setNo && g.from < n);
  if (n === 0 || games.length === 0) return <p className="p-5 text-sm text-muted">{log.names[log.first]} won the toss and serves first.</p>;
  return (
    <>
    <ol className="flex flex-col divide-y divide-line">
      {games.map((g) => {
        const overNow = n > g.to;
        return (
          <li key={`${g.set}-${g.no}`} className="flex flex-col gap-1 px-5 py-3">
            <p className="eyebrow">{g.tb ? "Tiebreak" : `Game ${g.no} · ${log.names[g.s]} serving`}</p>
            <ol className="flex flex-col">
              {log.points.slice(g.from, Math.min(g.to + 1, n)).map((p, k) => (
                <li key={k} className="grid grid-cols-[76px_1fr] gap-3 py-0.5 text-sm">
                  <span className="font-mono text-xs leading-5 text-muted">{p.score}</span>
                  <span className="leading-5">
                    {p.tags.map((tag) => (
                      <span key={tag} className="mr-2 rounded-sm border border-ball px-1 font-display text-[11px] font-semibold uppercase tracking-wider text-ball">
                        {tag}
                      </span>
                    ))}
                    {p.text}
                    {p.note && <span className="text-muted"> {p.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {overNow && (
              <p className={`mt-1 flex items-baseline justify-between gap-3 border-l-2 pl-2 text-sm font-semibold ${g.brk || g.tb ? "border-ball text-fg" : "border-line text-muted"}`}>
                <span>{g.text}</span>
                <span className="font-mono tabular-nums">
                  {g.g[0]}–{g.g[1]}
                </span>
              </p>
            )}
            {overNow && g.end && <p className="font-display text-lg font-bold uppercase leading-tight">{g.end}</p>}
            {overNow && g.booth && (
              <div className="mt-1 flex flex-col gap-0.5 text-sm leading-relaxed">
                {g.booth.map((b, j) => (
                  <p key={j} className="text-muted">
                    <span className="font-semibold text-fg">{BOOTH[b.who]}:</span> “{b.text}”
                  </p>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
    <p className="border-t border-line px-5 py-3 text-xs text-dim">In the booth: {BOOTH.join(" and ")}, invented commentators. Their lines are generated from the match as it happens.</p>
    </>
  );
}

function Analysis({ title, story, names, sections, sectionsTitle }) {
  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">{title}</p>
        <div className="flex max-w-[68ch] flex-col gap-3 text-[15px] leading-relaxed">
          {story.text.map((line, k) => (
            <p key={k} className={k === 0 ? "text-fg" : "text-muted"}>
              {line}
            </p>
          ))}
        </div>
      </div>
      {sections && sections.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 border-b border-line pb-2 font-display text-sm font-semibold uppercase tracking-wider">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-sm bg-fg" aria-hidden="true" />
              {names[0]}
            </span>
            <span className="eyebrow">{sectionsTitle}</span>
            <span className="inline-flex items-center justify-end gap-2">
              {names[1]}
              <span className="h-2 w-2 rounded-sm bg-dim" aria-hidden="true" />
            </span>
          </div>
          {sections.map((s) => (
            <section key={s.label} className="flex flex-col gap-1.5 border-l-2 border-ball pl-4">
              <h3 className="font-display text-lg font-bold uppercase leading-tight tracking-wide">{s.label}</h3>
              {s.text && <p className="max-w-[68ch] text-sm leading-relaxed text-muted">{s.text}</p>}
              {s.lines && (
                <ol className="flex max-w-[68ch] flex-col gap-1.5 text-sm leading-relaxed text-muted">
                  {s.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              )}
              {s.rows && (
                <div className="flex max-w-[68ch] flex-col divide-y divide-line">
                  {s.rows.map(([a, label, b]) => (
                    <div key={label} className={`grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 py-1.5 ${label === "Overall" ? "font-semibold" : ""}`}>
                      <span className="font-mono text-base tabular-nums">{a}</span>
                      <span className="text-center text-xs text-muted">{label}</span>
                      <span className="text-right font-mono text-base tabular-nums">{b}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.bars && (
                <div className="flex max-w-[68ch] flex-col">
                  {s.bars.map((bar) => (
                    <CompareRow key={bar.label} label={bar.label} a={bar.pct ? `${bar.a}%` : bar.a} b={bar.pct ? `${bar.b}%` : bar.b} va={bar.a} vb={bar.b} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {story.keys && (
        <div className="grid gap-4 sm:grid-cols-2">
          {story.keys.map((list, k) => (
            <div key={k} className="flex flex-col gap-1.5 rounded-sm border border-line p-3">
              <p className="eyebrow">Keys for {names[k]}</p>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted">
                {list.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simulated interviews with both players: three answers each to start, more on request.
function Interviews({ state, facts }) {
  const order = facts.m.winner === facts.m.a ? [0, 1] : [1, 0];
  const talks = useMemo(() => order.map((who) => interview(state, facts, who)), [facts.m.seed]);
  const [shown, setShown] = useState([3, 3]);
  const [deeper, setDeeper] = useState({}); // follow-ups revealed under each answer
  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      {order.map((who, k) => {
        const talk = talks[k];
        const visible = talk.qa.slice(0, shown[k]);
        return (
          <section key={who} className="flex flex-col gap-3">
            <p className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="font-display text-xl font-bold uppercase leading-none">{facts.E[who].name}</span>
              <span className="eyebrow">{k === 0 ? "Winner" : "Beaten today"}</span>
            </p>
            {visible.map((x) => {
              const slot = `${who}:${x.topic}`;
              const open = deeper[slot] || 0;
              return (
                <div key={x.topic} className="flex max-w-[68ch] flex-col gap-1">
                  <p className="text-sm text-muted">
                    <span className="mr-2 font-display text-xs font-semibold uppercase tracking-wider text-dim">Q</span>
                    {x.q}
                    {x.by && <span className="ml-1.5 text-xs text-dim">· {x.by}</span>}
                  </p>
                  <p className="border-l-2 border-ball pl-3 text-[15px] leading-relaxed">“{x.a}”</p>
                  {x.more.slice(0, open).map((y, j) => (
                    <div key={j} className="ml-3 mt-1 flex flex-col gap-1 border-l border-line pl-3">
                      <p className="text-sm text-muted">
                        <span className="mr-2 font-display text-xs font-semibold uppercase tracking-wider text-dim">Follow-up</span>
                        {y.q}
                      </p>
                      <p className="text-[15px] leading-relaxed">“{y.a}”</p>
                    </div>
                  ))}
                  {open < x.more.length && (
                    <button type="button" className="ml-3 self-start font-display text-xs font-semibold uppercase tracking-wider text-muted hover:text-ball" onClick={() => setDeeper({ ...deeper, [slot]: open + 1 })}>
                      Follow up
                    </button>
                  )}
                </div>
              );
            })}
            {shown[k] < talk.qa.length ? (
              <Btn variant="outline" className="self-start px-3 py-2" onClick={() => setShown(shown.map((n, j) => (j === k ? n + 1 : n)))}>
                Ask another question
              </Btn>
            ) : (
              <p className="text-xs text-muted">No more questions. {shortName(facts.E[who].name)} has left the room.</p>
            )}
          </section>
        );
      })}
      <p className="text-xs text-dim">Simulated interviews. Every question and answer is generated by the game from what happened in the match; these are not real quotes, and the outlets asking are invented.</p>
    </div>
  );
}

function MatchCentre({ state, ranks, at, dispatch, onClose, onOpenPlayer }) {
  const closeRef = useDialog(onClose);
  const t = state.tournament;
  const m = t.rounds[at.r].matches[at.i];
  const event = state.calendar[t.slot];
  const byId = useMemo(() => indexById(state.players), [state.players]);
  const A = byId[m.a];
  const B = byId[m.b];
  const entries = [t.entries[m.a], t.entries[m.b]];
  const facts = matchFacts(state, t, at.r, at.i);
  const before = preview(facts);
  const after = m.winner ? report(facts) : null;
  const calls = useMemo(() => pressCall(state, facts), [m.a, m.b, m.winner, state.feuds]);
  const big = isBigMatch(t, at.r, m);

  // The point-by-point log is rebuilt from the match seed and the energy both players took in; the stored result is the source of truth.
  const log = useMemo(() => {
    if (!m.winner || !A || !B) return null;
    const replay = simMatch(m.seed, A, B, t, true, m.en);
    return replay.winner === m.winner && replay.sets.length === m.sets.length ? replay.log : null;
  }, [m.seed, m.winner]);
  const total = log ? log.points.length : 0;
  const patterns = useMemo(() => (log ? matchPatterns(log, facts).concat(matchExtras(log, facts)) : []), [log]);
  const myBets = m.winner ? state.bank.history.filter((b) => b.mid === betKey(t, m.a, m.b)) : [];

  const [cursor, setCursor] = useState(null); // null shows the finished match
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [picked, setPicked] = useState("report");
  const [pickedSet, setPickedSet] = useState(null);
  const listRef = useRef(null);
  const n = cursor == null ? total : Math.min(cursor, total);
  const live = !!log && n < total;
  const tab = !m.winner ? "preview" : live && (picked === "report" || picked === "talk") ? "pbp" : picked; // no spoilers while watching

  useEffect(() => {
    if (!playing || !log) return undefined;
    if (n >= total) {
      setPlaying(false);
      setPicked("report");
      return undefined;
    }
    const id = setTimeout(() => setCursor(n + 1), SPEEDS[speed].ms);
    return () => clearTimeout(id);
  }, [playing, n, total, speed, log]);

  useEffect(() => {
    if (playing && tab === "pbp" && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [n, playing, tab]);

  const watch = () => {
    setCursor(0);
    setPickedSet(null);
    setPicked("pbp");
    setPlaying(true);
    if (!m.winner) dispatch({ type: "SIM_MATCH", r: at.r, i: at.i });
  };

  const finalBoard = m.sets ? { sets: m.sets.map((s) => [s.a, s.b, s.tb]), pt: ["", ""], sv: -1 } : { sets: [], pt: ["", ""], sv: -1 };
  const board = !log ? finalBoard : n === 0 ? { sets: [[0, 0, null]], pt: ["0", "0"], sv: log.first } : n === total ? finalBoard : log.points[n - 1].board;
  const winner = m.winner && !live ? (m.winner === m.a ? 0 : 1) : null;
  const stats = log ? statsAt(log, n) : m.st;
  const setsStarted = log ? log.games.filter((g) => g.from < n || g.from === 0).reduce((max, g) => Math.max(max, g.set), 1) : 0;
  const setNo = pickedSet && pickedSet <= setsStarted ? pickedSet : setsStarted;
  const latest = live && n > 0 ? log.points[n - 1] : null;
  const en = facts.en;

  const tape = A && B ? [
    ["Ranking", `No. ${entries[0].rank}`, `No. ${entries[1].rank}`, -entries[0].rank, -entries[1].rank],
    ["Head-to-head", facts.h[0], facts.h[1], facts.h[0], facts.h[1]],
    ["Energy", `${en[0]}%`, `${en[1]}%`, en[0], en[1]],
    ["Age", A.age, B.age, 0, 0],
    ["Overall", A.ovr, B.ovr, A.ovr, B.ovr],
    [`${SURF[t.surface].label} rating`, A[t.surface], B[t.surface], A[t.surface], B[t.surface]],
    ...ATTRS.map((k) => [ATTR_LABEL[k], A[k], B[k], A[k], B[k]]),
  ] : [];
  const chance = before.chance == null ? 0.5 : before.chance;
  const tabs = [
    ["report", "Report"],
    ["talk", "Interviews"],
    ["pbp", "Play-by-play"],
    ["stats", "Match stats"],
    ["preview", "Preview"],
  ].filter(([id]) => !(live && (id === "report" || id === "talk")));

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-bg/80 backdrop-blur-sm md:items-center md:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Match centre" className="sheet flex w-full max-w-3xl flex-col bg-panel md:h-[min(900px,100%)] md:rounded-sm md:border md:border-line" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 px-5 pt-4">
          <div className="flex min-w-0 flex-col gap-1.5 pt-2">
            <p className="eyebrow flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-fg">{event.name}</span>
              <span>{ROUND_LABEL[t.rounds[at.r].key]}</span>
              <SurfaceTag event={event} />
              <span>Best of {TIERS[t.tier].bestOf}</span>
              {m.winner && !live && (
                <span className="inline-flex items-center gap-1">
                  <Timer size={12} aria-hidden="true" />
                  {clock(m.mins)}
                </span>
              )}
            </p>
            <h2 className="font-display text-2xl font-bold uppercase italic leading-[1.05] md:text-3xl">
              {big && <span className="mr-2 align-middle font-display text-xs font-semibold not-italic tracking-[0.14em] text-ball">Headline match</span>}
              {after && !live ? after.headline : before.headline}
            </h2>
          </div>
          <button ref={closeRef} type="button" className="rounded-sm p-2 text-muted hover:bg-raise hover:text-fg" onClick={onClose} aria-label="Close match centre">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-3 px-5 pb-4 pt-3">
          <Scoreboard entries={entries} board={board} winner={winner} onOpenPlayer={onOpenPlayer} />

          {!m.winner && (
            <div className="flex flex-wrap gap-3">
              <Btn icon={Eye} onClick={watch}>
                Watch live
              </Btn>
              <Btn variant="outline" icon={FastForward} onClick={() => dispatch({ type: "SIM_MATCH", r: at.r, i: at.i })}>
                Sim to result
              </Btn>
            </div>
          )}
          {log && live && (
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="outline" icon={playing ? Pause : Play} className="px-3 py-2" onClick={() => setPlaying(!playing)}>
                {playing ? "Pause" : "Play"}
              </Btn>
              <div className="flex gap-1" role="group" aria-label="Playback speed">
                {SPEEDS.map((s, k) => (
                  <button key={s.label} type="button" className={chip(speed === k)} aria-pressed={speed === k} onClick={() => setSpeed(k)}>
                    {s.label}
                  </button>
                ))}
              </div>
              <Btn variant="ghost" icon={SkipForward} className="px-3 py-2" onClick={() => { setCursor(null); setPlaying(false); setPicked("report"); }}>
                Skip to result
              </Btn>
              <span className="ml-auto font-mono text-xs text-muted">
                Point {n} of {total}
              </span>
            </div>
          )}
          {log && !live && (
            <div className="flex flex-wrap items-center gap-3">
              <Btn variant="outline" icon={Play} className="px-3 py-2" onClick={watch}>
                Replay point by point
              </Btn>
              <span className="text-sm text-muted">
                {entries[winner].name} d. {entries[1 - winner].name} <span className="font-mono text-fg">{scoreLine(m)}</span>
              </span>
            </div>
          )}
          {latest && (
            <p className="rounded-sm bg-raise px-3 py-2 text-sm" aria-live="polite">
              {latest.tags.map((tag) => (
                <span key={tag} className="mr-2 font-display text-xs font-semibold uppercase tracking-wider text-ball">
                  {tag}
                </span>
              ))}
              {latest.text}
            </p>
          )}
        </div>

        {m.winner && (
          <div className="flex flex-wrap items-center gap-1 border-y border-line px-4 py-2">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" className={chip(tab === id)} aria-pressed={tab === id} onClick={() => setPicked(id)}>
                {label}
              </button>
            ))}
            {tab === "pbp" && log && (
              <div className="ml-auto flex flex-wrap gap-1" role="group" aria-label="Set">
                {Array.from({ length: setsStarted }, (_, k) => (
                  <button key={k} type="button" className={chip(setNo === k + 1)} aria-pressed={setNo === k + 1} onClick={() => setPickedSet(k + 1)}>
                    Set {k + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={listRef} className={`min-h-0 flex-1 overflow-y-auto ${m.winner ? "" : "border-t border-line"}`}>
          {tab === "report" && myBets.length > 0 && (
            <ul className="flex flex-col gap-1 border-b border-line px-5 py-3 text-sm">
              {myBets.map((b) => (
                <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    <span className="eyebrow mr-2">Your bet</span>
                    {b.label} at {american(b.odds)}
                  </span>
                  <span className={`font-mono font-semibold ${b.res === "won" ? "text-up" : "text-down"}`}>{b.res === "won" ? `Won +${money(b.ret - b.stake)}` : `Lost ${money(-b.stake)}`}</span>
                </li>
              ))}
            </ul>
          )}
          {tab === "report" && after && <Analysis title="Post-match report" story={after} names={facts.N} sections={patterns} sectionsTitle="The match in depth" />}
          {tab === "talk" && m.winner && <Interviews key={m.seed} state={state} facts={facts} />}
          {tab === "preview" && (
            <>
              {!m.winner && <BetPanel state={state} r={at.r} i={at.i} dispatch={dispatch} />}
              {calls.length > 0 && (
                <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
                  <p className="eyebrow">Before the match</p>
                  <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                    {calls.map((c) => (
                      <section key={c.side} className="flex flex-col gap-2.5">
                        <p className="font-display text-lg font-bold uppercase leading-none">{c.name}</p>
                        {c.lines.map((x) => (
                          <div key={x.topic} className="flex flex-col gap-1">
                            <p className="text-sm text-muted">
                              <span className="mr-2 font-display text-xs font-semibold uppercase tracking-wider text-dim">Q</span>
                              {x.q}
                              <span className="ml-1.5 text-xs text-dim">· {x.by}</span>
                            </p>
                            <p className="border-l-2 border-line pl-3 text-[15px] leading-relaxed">“{x.a}”</p>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                </div>
              )}
              <Analysis title="Pre-match analysis" story={before} names={facts.N} sections={before.sections} sectionsTitle={m.winner ? "Season tendencies" : "Tendencies"} />
              <div className="flex flex-col px-5 pb-4">
                <p className="eyebrow pb-2">Tale of the tape</p>
                <div className="flex flex-col gap-1.5 pb-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
                    <span className="font-mono text-sm font-semibold">{Math.round(chance * 100)}%</span>
                    <span className="text-center text-xs text-muted">Win probability (model estimate)</span>
                    <span className="text-right font-mono text-sm font-semibold">{100 - Math.round(chance * 100)}%</span>
                  </div>
                  <div className="flex h-1.5 gap-0.5" aria-hidden="true">
                    <span className="rounded-full bg-fg" style={{ width: `${chance * 100}%` }} />
                    <span className="flex-1 rounded-full bg-dim" />
                  </div>
                </div>
                {tape.map(([label, a, b, va, vb]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 border-t border-line py-2">
                    <span className={`font-mono text-sm tabular-nums ${va >= vb ? "font-semibold text-fg" : "text-muted"}`}>{a}</span>
                    <span className="text-center text-xs text-muted">{label}</span>
                    <span className={`text-right font-mono text-sm tabular-nums ${vb >= va ? "font-semibold text-fg" : "text-muted"}`}>{b}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "pbp" && (log ? <PlayByPlay log={log} n={n} setNo={setNo} /> : <p className="p-5 text-sm text-muted">The point-by-point record for this match is no longer available. The report and match stats are.</p>)}
          {tab === "stats" && m.winner && (
            <div className="flex flex-col px-5 py-3">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 pb-1 font-display text-sm font-semibold uppercase tracking-wider">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-fg" aria-hidden="true" />
                  {shortName(entries[0].name)}
                </span>
                <span className="text-xs font-normal normal-case tracking-normal text-muted">{live ? `After ${n} points` : `${stats[0].pt + stats[1].pt} points played`}</span>
                <span className="inline-flex items-center justify-end gap-2">
                  {shortName(entries[1].name)}
                  <span className="h-2 w-2 rounded-sm bg-dim" aria-hidden="true" />
                </span>
              </div>
              <div className="flex flex-col divide-y divide-line">
                {matchStatRows(stats).map((row) => (
                  <CompareRow key={row.label} {...row} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Roster ────────────────────────────── */

const SORTS = [
  { id: "rank", label: "Ranking" },
  { id: "ovr", label: "OVR" },
  { id: "age", label: "Age" },
  { id: "potential", label: "Potential" },
];
const PAGE = 24;

// The headline honours at a glance, for the roster cards.
function AccoladeBadges({ p }) {
  const h = honours(p);
  const other = p.titles.atp500 + p.titles.atp250;
  const items = [
    [Trophy, h.slam, h.slam === 1 ? "Slam" : "Slams", "text-ball"],
    [Star, h.finals, "Finals", "text-ball"],
    [Medal, h.masters, "Masters", "text-fg"],
    [Award, other, other === 1 ? "other title" : "other titles", "text-muted"],
    [Crown, h.weeks, "wks at No. 1", "text-ball"],
  ].filter((x) => x[1] > 0);
  return (
    <span className="flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      {items.length === 0 && <span className="text-dim">No titles yet</span>}
      {items.map(([Icon, n, label, tone]) => (
        <span key={label} className="inline-flex items-center gap-1 whitespace-nowrap">
          <Icon size={13} className={tone} aria-hidden="true" />
          <span className="font-mono font-semibold text-fg">{n}</span> {label}
        </span>
      ))}
    </span>
  );
}

// The trophy cabinet on the player sheet: big counts, Slams by event, titles in this save, records held.
function Accolades({ state, p, rank }) {
  const h = honours(p);
  const other = p.titles.atp500 + p.titles.atp250;
  const roll = useMemo(() => titleRoll(state, p), [state.seasons, state.calendar, p.id]);
  const slams = useMemo(() => slamBreakdown(state, p), [state.seasons, state.calendar, p.id]);
  const score = goatScore(h);
  const allTime = useMemo(() => {
    if (!score) return null;
    let above = 0;
    state.players.forEach((q) => {
      if (goatScore(honours(q)) > score) above++;
    });
    state.retired.forEach((r) => {
      if (goatScore(honours(r)) > score) above++;
    });
    legendScores().forEach((l) => {
      if (l.score > score) above++;
    });
    return above + 1;
  }, [state.players, state.retired, score]);
  const yeYears = state.seasons.filter((s) => s.no1.id === p.id).map((s) => s.year);
  const held = [];
  RECORD_GROUPS.forEach((group) =>
    group.rows.forEach(([key, label, show]) => {
      const rec = state.records[group.from][key];
      if (rec && (rec.name === p.name || rec.name.startsWith(`${p.name} d. `))) held.push({ label: group.from === "feats" ? label : `${label}, ${group.title.toLowerCase()}`, value: show(rec.v), note: rec.note });
    })
  );
  const cabinet = [
    [Trophy, h.slam, "Grand Slams"],
    [Star, h.finals, "ATP Finals"],
    [Medal, h.masters, "Masters 1000"],
    [Award, other, "500s and 250s"],
    [Crown, h.weeks, "Weeks at No. 1"],
    [Crown, h.ye, "Year-end No. 1"],
  ];
  const hasLegacy = goatScore(p.legacy) > 0;
  const empty = score === 0 && other === 0;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="eyebrow">Accolades</h3>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-6">
        {cabinet.map(([Icon, n, label]) => (
          <div key={label} className="flex flex-col items-start gap-1 bg-panel px-3 py-3">
            <Icon size={16} className={n > 0 ? "text-ball" : "text-dim"} aria-hidden="true" />
            <dd className={`font-display text-4xl font-bold italic leading-none ${n > 0 ? "text-fg" : "text-dim"}`}>{n}</dd>
            <dt className="text-[11px] leading-tight text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      {h.slam > 0 && (
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-sm border border-line bg-line">
          {slams.map((s) => (
            <div key={s.id} className="flex flex-col gap-1 bg-panel px-3 py-2">
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className={`h-2 w-2 shrink-0 rounded-full ${SURF[s.surface].fill}`} aria-hidden="true" />
                <span className="truncate sm:hidden">{s.abbr}</span>
                <span className="hidden truncate sm:inline">{s.name}</span>
              </span>
              <span className={`font-mono text-lg font-semibold ${s.n > 0 ? "text-fg" : "text-dim"}`}>{s.n}</span>
            </div>
          ))}
        </div>
      )}

      <dl className="flex flex-col divide-y divide-line rounded-sm border border-line text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2">
          <dt className="text-muted">Career-high ranking</dt>
          <dd className="font-mono font-semibold">No. {p.bestRank || rank}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2">
          <dt className="text-muted">All-time GOAT list</dt>
          <dd className="font-mono font-semibold">{allTime ? `No. ${allTime} · score ${fmt(score)}` : "Not yet on it"}</dd>
        </div>
        {h.ye > 0 && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2">
            <dt className="text-muted">Year-end No. 1</dt>
            <dd className="text-right font-mono font-semibold">
              {yeYears.length ? yeYears.join(", ") : ""}
              {p.legacy.ye > 0 && <span className="font-normal text-muted">{yeYears.length ? " · " : ""}{p.legacy.ye} before 2026</span>}
            </dd>
          </div>
        )}
      </dl>

      {roll.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">Titles won in this save</p>
          <ul className="flex flex-wrap gap-2">
            {roll.map((e) => (
              <li key={e.id} className={`inline-flex items-baseline gap-2 rounded-sm border px-2.5 py-1 text-sm ${e.tier === "slam" || e.tier === "finals" ? "border-ball" : "border-line"}`}>
                <span className={`h-2 w-2 shrink-0 self-center rounded-full ${SURF[e.surface].fill}`} aria-hidden="true" />
                <span className="font-semibold">{e.name}</span>
                <span className="font-mono text-xs text-muted">{e.years.length <= 3 ? e.years.join(", ") : `${e.years.length} titles, ${e.years[0]}–${e.years[e.years.length - 1]}`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {held.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">Records held in this save</p>
          <ul className="flex flex-col divide-y divide-line rounded-sm border border-line text-sm">
            {held.map((r) => (
              <li key={r.label} className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2">
                <span>
                  {r.label} <span className="text-muted">· {r.note}</span>
                </span>
                <span className="font-mono font-semibold">{r.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted">
        {empty ? "Nothing in the cabinet yet. " : ""}
        {hasLegacy ? "Counts include real honours through 2025; titles listed by year are the ones won in this save." : "Everything here was won in this save."}
      </p>
    </section>
  );
}

function PlayerCard({ p, rank, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(p.id)} className="flex min-w-0 flex-col gap-3 rounded-sm border border-line bg-panel p-4 text-left transition hover:border-muted hover:bg-raise">
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted">
            <span>No. {rank}</span>
            {p.country && <span>{p.country}</span>}
            <span>Age {p.age}</span>
            {p.rookie && <span className="rounded-sm bg-ball px-1 font-display font-bold tracking-wider text-ink">NEW</span>}
          </span>
          <span className="block font-display text-2xl font-bold uppercase leading-none">{p.name}</span>
          <PhaseTag age={p.age} />
        </span>
        <span className="flex shrink-0 flex-col items-end leading-none">
          <span className="font-display text-5xl font-bold italic">{p.ovr}</span>
          <span className="eyebrow mt-1">OVR</span>
        </span>
      </span>
      <AccoladeBadges p={p} />
      <span className="grid grid-cols-3 gap-3">
        {SURFACE_KEYS.map((s) => (
          <span key={s} className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between text-xs text-muted">
              <span>{SURF[s].label}</span>
              <span className="font-mono text-fg">{p[s]}</span>
            </span>
            <span className="block h-1 rounded-full bg-raise">
              <span className={`block h-full rounded-full ${SURF[s].fill}`} style={{ width: `${clamp((p[s] - 50) / 49, 0.05, 1) * 100}%` }} />
            </span>
          </span>
        ))}
      </span>
      <span className="flex items-baseline justify-between gap-3 border-t border-line pt-3 text-xs text-muted">
        <span>
          Potential <span className="font-mono text-fg">{p.potential}</span>
        </span>
        <span className="font-mono">
          {p.stats.w}–{p.stats.l}
        </span>
        <span>
          <span className="font-mono text-sm font-semibold text-fg">{fmt(totalPoints(p))}</span> pts
        </span>
      </span>
    </button>
  );
}

function Roster({ state, ranked, ranks, dispatch, onOpenPlayer }) {
  const [sort, setSort] = useState("rank");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? ranked.filter((p) => p.name.toLowerCase().includes(q) || p.country.toLowerCase() === q) : ranked;
    if (sort === "rank") return pool;
    const dir = sort === "age" ? 1 : -1;
    return pool.slice().sort((a, b) => dir * (a[sort] - b[sort]) || ranks[a.id] - ranks[b.id]);
  }, [ranked, ranks, sort, query]);
  const full = state.players.length >= TOUR_LIMIT;
  const scouted = state.scouted ? state.players.find((p) => p.id === state.scouted && p.rookie) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              {state.currentYear} tour · {state.players.length} players
            </p>
            <h1 className="font-display text-5xl font-bold uppercase italic leading-none">Roster</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 rounded-sm border border-line bg-panel px-2.5 py-1.5 text-sm focus-within:border-muted">
              <Search size={14} className="text-muted" aria-hidden="true" />
              <span className="sr-only">Find a player by name or country code</span>
              <input
                id="roster-search"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder="Name or country code"
                className="w-44 bg-transparent text-fg placeholder:text-dim focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Sort players">
              <span className="eyebrow mr-2">Sort</span>
              {SORTS.map((s) => (
                <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)} className={chip(sort === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border border-line bg-panel px-4 py-3">
          <Btn variant="outline" icon={UserPlus} className="px-3 py-2" disabled={full} onClick={() => dispatch({ type: "ADD_ROOKIE" })}>
            Scout a random rookie
          </Btn>
          <p className="min-w-0 flex-1 basis-64 text-sm text-muted">
            {full
              ? `The tour is full at ${state.players.length} players. More can join after the off-season.`
              : `Adds an 18- or 19-year-old newcomer now. A random rookie class also arrives every off-season, and the tour is trimmed back to ${TOUR_SIZE}.`}
            {scouted && (
              <button type="button" className="ml-2 font-semibold text-fg underline decoration-ball underline-offset-4" onClick={() => onOpenPlayer(scouted.id)}>
                Latest signing: {scouted.name}, {scouted.age}, OVR {scouted.ovr}, potential {scouted.potential}
              </button>
            )}
          </p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
          {Object.keys(PHASES).map((key) => {
            const phase = PHASES[key];
            const Icon = phase.icon;
            return (
              <div key={key} className="flex flex-col gap-1 bg-panel px-4 py-3">
                <dt className={`flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider ${phase.tone}`}>
                  <Icon size={14} aria-hidden="true" />
                  {phase.label} · age {phase.range}
                </dt>
                <dd className="text-xs text-muted">{phase.note}</dd>
              </div>
            );
          })}
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.slice(0, shown).map((p) => (
          <PlayerCard key={p.id} p={p} rank={ranks[p.id]} onOpen={onOpenPlayer} />
        ))}
      </div>
      {list.length === 0 && <p className="text-sm text-muted">No player matches "{query}". Try a surname or a three-letter country code such as ITA.</p>}
      {list.length > shown && (
        <Btn variant="outline" className="self-center" onClick={() => setShown(shown + PAGE)}>
          Show {Math.min(PAGE, list.length - shown)} more of {list.length}
        </Btn>
      )}

      {state.retired.length > 0 && (
        <Panel title="Off the tour" aside={<span className="text-xs text-muted">Most recent 30 of {state.retired.length}</span>}>
          <ul className="flex flex-col divide-y divide-line">
            {state.retired
              .slice(-30)
              .reverse()
              .map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-muted">
                    {r.reason === "dropped" ? "Lost tour card" : "Retired"} after {r.year} at {r.age} · last ranked No. {r.lastRank} · career high No. {r.bestRank} · {r.record.w}–{r.record.l} in this save
                  </span>
                </li>
              ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ────────────────────────────── Player sheet ────────────────────────────── */

const CHART_MAX = 2000;
const CHART_TICKS = [2000, 1500, 1000, 500, 0];

function SeasonChart({ rows, year, summary }) {
  const [hover, setHover] = useState(null);
  const active = hover != null ? rows[hover] : null;
  const readout = active ? `${active.event.name} · ${surfaceLabel(active.event)} · ${active.resultText} · ${fmt(active.pts)} pts` : summary;
  return (
    <div className="flex flex-col gap-3">
      <p className="min-h-[2.5em] text-sm text-muted sm:min-h-0" aria-live="polite">
        {readout}
      </p>
      <div className="overflow-x-auto pt-5">
        <div className="grid min-w-[760px] grid-cols-[38px_1fr] gap-x-2">
          <div className="relative h-40">
            {CHART_TICKS.map((tick) => (
              <span key={tick} className="absolute right-0 -translate-y-1/2 font-mono text-[10px] tabular-nums text-muted" style={{ top: `${(1 - tick / CHART_MAX) * 100}%` }}>
                {fmt(tick)}
              </span>
            ))}
          </div>
          <div className="relative h-40" onMouseLeave={() => setHover(null)}>
            {CHART_TICKS.map((tick) => (
              <span key={tick} className="absolute inset-x-0 border-t border-line" style={{ top: `${(1 - tick / CHART_MAX) * 100}%` }} aria-hidden="true" />
            ))}
            <div className="absolute inset-0 flex">
              {rows.map((row, i) => (
                <div key={row.event.id} className={`relative flex flex-1 items-end justify-center ${hover === i ? "bg-raise/60" : ""}`} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
                  {row.pts > 0 && (
                    <span className={`block w-full max-w-[20px] rounded-t ${SURF[row.event.surface].fill} ${row.current ? "" : "opacity-35"}`} style={{ height: `${Math.max(2, (row.pts / CHART_MAX) * 100)}%` }} />
                  )}
                  {row.current && row.entry.round === "W" && (
                    <Trophy size={12} className="absolute left-1/2 -translate-x-1/2 text-fg" style={{ bottom: `calc(${(row.pts / CHART_MAX) * 100}% + 3px)` }} aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <span />
          <div className="flex pt-1.5">
            {rows.map((row, i) => (
              <span key={row.event.id} className={`flex-1 text-center font-mono text-[10px] ${hover === i ? "text-fg" : "text-muted"}`}>
                {row.event.abbr}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {SURFACE_KEYS.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${SURF[s].fill}`} aria-hidden="true" />
            {SURF[s].label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-fg opacity-35" aria-hidden="true" />
          Faded: not yet played in {year}, last season's points
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Trophy size={11} aria-hidden="true" />
          Title
        </li>
      </ul>
    </div>
  );
}

// Each stat for the season with the career figure beside it.
function statLine(s) {
  const played = s.w + s.l;
  if (!played) return null;
  return [
    ["Record", `${s.w}–${s.l}`],
    ["Win rate", pct(s.w, played)],
    ["Aces per match", (s.ac / played).toFixed(1)],
    ["Double faults per match", (s.df / played).toFixed(1)],
    ["1st serve in", pct(s.fi, s.sp)],
    ["1st serve points won", pct(s.fw, s.fi)],
    ["2nd serve points won", pct(s.s2, s.sp - s.fi)],
    ["Service games won", pct(s.hd, s.sg)],
    ["Break points saved", pct(s.bs, s.bf)],
    ["Return games won", pct(s.br, s.rg)],
    ["Break points converted", pct(s.bc, s.bo)],
    ["Tiebreaks", `${s.tbW}–${s.tbL}`],
    ["Deciding sets", `${s.dW}–${s.dL}`],
    ["v top 10", `${s.tW}–${s.tL}`],
    ["Finals", `${s.fW}–${s.fL}`],
    ["Hard / clay / grass", `${s.hW}–${s.hL} / ${s.cW}–${s.cL} / ${s.gW}–${s.gL}`],
    ["Won after losing set 1", pct(s.bW, s.bN)],
    ["Total points won", pct(s.pt, s.tp)],
  ];
}
function statTiles(season, career) {
  const now = statLine(season);
  const all = statLine(career) || [];
  return all.map(([label, value], i) => [label, now ? now[i][1] : "–", value]);
}

function PlayerSheet({ player: p, rank, state, onClose }) {
  const closeRef = useDialog(onClose);
  const year = state.currentYear;
  const phase = PHASES[phaseFor(p.age)];
  const nextPhase = PHASES[phaseFor(p.age + 1)];
  const deltas = p.lastChange ? p.lastChange.deltas : {};
  const rows = state.calendar.map((event) => {
    const entry = p.rankingPoints[event.slot];
    const current = !!entry && entry.year === year;
    let resultText = "No points";
    const absent = entry && (entry.round === "DNP" || entry.round === "DNQ");
    if (current) resultText = RESULT_LABEL[entry.round];
    else if (absent) resultText = `${RESULT_LABEL[entry.round]} in ${entry.year}`;
    else if (entry) resultText = `Defending from ${entry.year}${entry.round ? ` (${RESULT_LABEL[entry.round].toLowerCase()})` : ""}`;
    return { event, entry, current, pts: entry ? entry.pts : 0, resultText };
  });
  const thisYear = p.rankingPoints.map((e, i) => (e && e.year === year ? { e, other: IS_OTHER[i] } : null)).filter(Boolean);
  const optionalSoFar = thisYear.filter((x) => x.other).length;
  const optionalPlayed = thisYear.filter((x) => x.other && x.e.round !== "DNP" && x.e.round !== "DNQ").length;
  const bigSkipped = thisYear.filter((x) => !x.other && x.e.round === "DNP").length;
  const tiles = [
    { label: "Ranking", value: `No. ${rank}` },
    { label: "Points", value: fmt(totalPoints(p)) },
    { label: `${year} record`, value: `${p.stats.w}–${p.stats.l}` },
    { label: `${year} titles`, value: seasonTitles(p, year) },
    { label: "Race to Turin", value: fmt(racePoints(p, year)) },
    { label: "Age", value: p.age },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-bg/75 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={p.name} className="sheet flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-line bg-panel" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
              <span>No. {rank}</span>
              {p.country && <span>{p.country}</span>}
              <span>Age {p.age}</span>
              <PhaseTag age={p.age} />
            </p>
            <h2 className="font-display text-4xl font-bold uppercase italic leading-[0.95] md:text-5xl">{p.name}</h2>
          </div>
          <button ref={closeRef} type="button" className="rounded-sm p-2 text-muted hover:bg-raise hover:text-fg" onClick={onClose} aria-label="Close player card">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-7 p-5">
          <div className="flex flex-wrap items-stretch gap-4">
            <div className="flex items-end gap-5 rounded-sm border border-line px-5 py-4">
              <div className="leading-none">
                <p className="font-display text-7xl font-bold italic leading-[0.8]">{p.ovr}</p>
                <p className="eyebrow mt-2">Overall</p>
              </div>
              <div className="leading-none">
                <p className="font-display text-4xl font-bold italic leading-[0.8] text-muted">{p.potential}</p>
                <p className="eyebrow mt-2">Potential</p>
              </div>
            </div>
            <dl className="grid min-w-[240px] flex-1 grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
              {tiles.map((s) => (
                <div key={s.label} className="flex flex-col justify-center gap-0.5 bg-panel px-3 py-2">
                  <dt className="text-[11px] text-muted">{s.label}</dt>
                  <dd className="font-mono text-sm font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Accolades state={state} p={p} rank={rank} />

          <div className="flex flex-col gap-2 rounded-sm border border-line px-4 py-3">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <BatteryMedium size={15} aria-hidden="true" /> Energy
              </span>
              <span className="block h-1.5 rounded-full bg-raise">
                <span className={`block h-full rounded-full ${p.energy < 40 ? "bg-down" : p.energy < 60 ? "bg-clay" : "bg-up"}`} style={{ width: `${clamp(p.energy, 3, 100)}%` }} />
              </span>
              <span className="font-mono text-sm tabular-nums">{Math.round(p.energy)}%</span>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              {p.energy < 60 ? `Tired: playing now costs about ${tiredness(p.energy).toFixed(1)} points of match power. ` : "Fresh. "}
              Matches drain energy and rest weeks restore it, so players pick their spots. {year} schedule: {optionalPlayed} of {optionalSoFar} ATP 500 and 250 events entered
              {bigSkipped > 0 ? `, ${bigSkipped} Masters or Slams skipped` : ""}
              {p.streak >= 3 ? `. On a ${p.streak}-match winning streak` : ""}.
            </p>
          </div>
          <p className="rounded-sm bg-raise px-4 py-3 text-sm text-muted">
            <span className={`font-semibold ${phase.tone === "text-muted" ? "text-fg" : phase.tone}`}>
              {phase.label} phase (age {phase.range}).
            </span>{" "}
            Turns {p.age + 1} at the next off-season: {nextPhase.note.charAt(0).toLowerCase() + nextPhase.note.slice(1)}.
            {p.lastChange && p.lastChange.deltas.ovr !== 0 && <span> Last off-season: {signed(p.lastChange.deltas.ovr)} OVR.</span>}
          </p>

          <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2.5">
              <h3 className="eyebrow">Attributes</h3>
              {ATTRS.map((k) => (
                <div key={k} className="grid grid-cols-[76px_1fr_auto_auto] items-center gap-2.5">
                  <span className="text-sm text-muted">{ATTR_LABEL[k]}</span>
                  <span className="block h-1.5 rounded-full bg-raise">
                    <span className="block h-full rounded-full bg-fg" style={{ width: `${clamp((p[k] - 50) / 49, 0.05, 1) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right font-mono text-sm tabular-nums">{p[k]}</span>
                  <Delta value={deltas[k]} />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <h3 className="eyebrow">Surface ratings</h3>
              {SURFACE_KEYS.map((s) => (
                <div key={s} className="grid grid-cols-[76px_1fr_auto_auto] items-center gap-2.5">
                  <span className="text-sm text-muted">{SURF[s].label}</span>
                  <span className="block h-1.5 rounded-full bg-raise">
                    <span className={`block h-full rounded-full ${SURF[s].fill}`} style={{ width: `${clamp((p[s] - 50) / 49, 0.05, 1) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right font-mono text-sm tabular-nums">{p[s]}</span>
                  <Delta value={deltas[s]} />
                </div>
              ))}
              {Object.values(deltas).some(Boolean) && <p className="text-xs text-muted">Coloured changes are from the last off-season.</p>}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="eyebrow">{year} season against career</h3>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
              {statTiles(p.stats, careerStats(p)).map(([label, value, career]) => (
                <div key={label} className="flex flex-col gap-0.5 bg-panel px-3 py-2">
                  <dt className="text-[11px] text-muted">{label}</dt>
                  <dd className="font-mono text-sm font-semibold">{value}</dd>
                  <dd className="font-mono text-[11px] text-muted">Career {career}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-relaxed text-muted">
              The large figure is {year}; career is underneath. Career starts from a simulated pre-2026 baseline season and adds everything played in this save. Record in this save: {p.record.w}–{p.record.l}.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="eyebrow">{year} results, points by event</h3>
            <SeasonChart rows={rows} year={year} summary={`${fmt(racePoints(p, year))} points earned in ${year}, ${fmt(totalPoints(p))} on the 52-week ranking.`} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="eyebrow text-left">
                    <th className="py-2 pr-2 font-semibold">Event</th>
                    <th className="hidden px-2 py-2 font-semibold sm:table-cell">Surface</th>
                    <th className="px-2 py-2 font-semibold">Result</th>
                    <th className="py-2 pl-2 text-right font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.event.id} className="border-t border-line">
                      <td className="py-1.5 pr-2">
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full sm:hidden ${SURF[row.event.surface].fill}`} aria-hidden="true" />
                          {row.event.name}
                        </span>
                      </td>
                      <td className="hidden px-2 py-1.5 text-muted sm:table-cell">
                        <SurfaceTag event={row.event} />
                      </td>
                      <td className={`px-2 py-1.5 ${row.current ? (row.entry.round === "W" ? "font-semibold text-ball" : "text-fg") : "text-muted"}`}>{row.resultText}</td>
                      <td className={`py-1.5 pl-2 text-right font-mono tabular-nums ${row.current ? "text-fg" : "text-muted"}`}>{fmt(row.pts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {p.career.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="eyebrow">Career by season</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="eyebrow text-left">
                      <th className="py-2 pr-2 font-semibold">Season</th>
                      <th className="px-2 py-2 text-right font-semibold">Age</th>
                      <th className="px-2 py-2 text-right font-semibold">OVR</th>
                      <th className="px-2 py-2 text-right font-semibold">Year-end</th>
                      <th className="px-2 py-2 text-right font-semibold">W–L</th>
                      <th className="px-2 py-2 text-right font-semibold">Titles</th>
                      <th className="py-2 pl-2 text-right font-semibold">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.career
                      .slice()
                      .reverse()
                      .map((c) => (
                        <tr key={c.year} className="border-t border-line font-mono tabular-nums">
                          <td className="py-1.5 pr-2">{c.year}</td>
                          <td className="px-2 py-1.5 text-right text-muted">{c.age}</td>
                          <td className="px-2 py-1.5 text-right">{c.ovr}</td>
                          <td className="px-2 py-1.5 text-right">No. {c.rank}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right">
                            {c.w}–{c.l}
                          </td>
                          <td className="px-2 py-1.5 text-right">{c.titles}</td>
                          <td className="py-1.5 pl-2 text-right">{fmt(c.pts)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Stat leaders ────────────────────────────── */

const ratio = (x, y) => (y ? x / y : null);
const perMatch = (x, s) => ratio(x, s.w + s.l);
const one = (v) => v.toFixed(1);

// One leaderboard per stat. value() returns null when a player has nothing to rank.
// rate boards need a minimum number of matches; asc boards rank the lowest value first.
const BOARDS = [
  { id: "wins", group: "Results", label: "Match wins", value: (s) => s.w || null, show: (v) => v, sub: (s) => `${s.w}–${s.l}` },
  { id: "winPct", group: "Results", label: "Win rate", rate: true, value: (s) => ratio(s.w, s.w + s.l), show: (v) => `${one(v * 100)}%`, sub: (s) => `${s.w}–${s.l}` },
  { id: "titles", group: "Results", label: "Titles", value: (s, x) => x.titles || null, show: (v) => v, sub: (s, x) => `${x.slams} Slams` },
  { id: "race", group: "Results", label: "Ranking points earned", seasonOnly: true, value: (s, x) => x.race || null, show: (v) => fmt(v), sub: (s) => `${s.w + s.l} matches` },
  { id: "ptsWon", group: "Results", label: "Total points won", rate: true, value: (s) => ratio(s.pt, s.tp), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.pt)} of ${fmt(s.tp)}` },
  { id: "tb", group: "Results", label: "Tiebreaks won", value: (s) => s.tbW || null, show: (v) => v, sub: (s) => `${s.tbW}–${s.tbL}` },
  { id: "aces", group: "Serve", label: "Aces", value: (s) => s.ac || null, show: (v) => fmt(v), sub: (s) => `${one(perMatch(s.ac, s) || 0)} a match` },
  { id: "acesPer", group: "Serve", label: "Aces per match", rate: true, value: (s) => perMatch(s.ac, s), show: (v) => one(v), sub: (s) => `${fmt(s.ac)} in ${s.w + s.l}` },
  { id: "df", group: "Serve", label: "Fewest double faults per match", rate: true, asc: true, value: (s) => perMatch(s.df, s), show: (v) => one(v), sub: (s) => `${fmt(s.df)} in ${s.w + s.l}` },
  { id: "fsIn", group: "Serve", label: "1st serve in", rate: true, value: (s) => ratio(s.fi, s.sp), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.sp)} service points` },
  { id: "fsWon", group: "Serve", label: "1st serve points won", rate: true, value: (s) => ratio(s.fw, s.fi), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.fw)} of ${fmt(s.fi)}` },
  { id: "ssWon", group: "Serve", label: "2nd serve points won", rate: true, value: (s) => ratio(s.s2, s.sp - s.fi), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.s2)} of ${fmt(s.sp - s.fi)}` },
  { id: "hold", group: "Serve", label: "Service games won", rate: true, value: (s) => ratio(s.hd, s.sg), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.hd)} of ${fmt(s.sg)}` },
  { id: "bpSaved", group: "Serve", label: "Break points saved", rate: true, value: (s) => ratio(s.bs, s.bf), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.bs)} of ${fmt(s.bf)}` },
  { id: "break", group: "Return", label: "Return games won", rate: true, value: (s) => ratio(s.br, s.rg), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.br)} of ${fmt(s.rg)}` },
  { id: "bpConv", group: "Return", label: "Break points converted", rate: true, value: (s) => ratio(s.bc, s.bo), show: (v) => `${one(v * 100)}%`, sub: (s) => `${fmt(s.bc)} of ${fmt(s.bo)}` },
  { id: "breaks", group: "Return", label: "Breaks of serve", value: (s) => s.br || null, show: (v) => fmt(v), sub: (s) => `${one(perMatch(s.br, s) || 0)} a match` },
];
const BOARD_GROUPS = ["Results", "Serve", "Return"];

function LeaderBoard({ board, rows, minMatches, onOpenPlayer }) {
  const [open, setOpen] = useState(false);
  const list = useMemo(
    () =>
      rows
        .filter((r) => !board.rate || r.s.w + r.s.l >= minMatches)
        .map((r) => ({ ...r, v: board.value(r.s, r.x) }))
        .filter((r) => r.v != null)
        .sort((a, b) => (board.asc ? a.v - b.v : b.v - a.v) || b.s.w - a.s.w),
    [board, rows, minMatches]
  );
  const shown = list.slice(0, open ? 20 : 5);
  return (
    <Panel
      title={board.label}
      aside={
        list.length > 5 && (
          <button type="button" className="font-display text-sm font-semibold uppercase tracking-wider text-muted hover:text-fg" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Top 5" : "Top 20"}
          </button>
        )
      }
    >
      <ol className="flex flex-col p-2">
        {shown.map((r, i) => (
          <li key={r.p.id}>
            <button type="button" className="flex w-full items-baseline gap-3 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-raise" onClick={() => onOpenPlayer(r.p.id)}>
              <span className="w-5 shrink-0 font-mono text-xs text-muted">{i + 1}</span>
              <span className={`min-w-0 flex-1 truncate ${i === 0 ? "font-semibold" : ""}`}>{r.p.name}</span>
              <span className="hidden shrink-0 font-mono text-xs text-muted sm:inline">{board.sub(r.s, r.x)}</span>
              <span className={`w-16 shrink-0 text-right font-mono tabular-nums ${i === 0 ? "font-semibold text-ball" : ""}`}>{board.show(r.v)}</span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">{board.rate ? `Nobody has played ${minMatches} matches yet.` : "Nothing to rank yet."}</li>}
      </ol>
    </Panel>
  );
}

function Leaders({ state, onOpenPlayer }) {
  const [mode, setMode] = useState("season");
  const year = state.currentYear;
  const career = mode === "career";
  const eventsPlayed = state.calendar.filter((e) => e.champion).length;
  const minMatches = career ? 30 : clamp(eventsPlayed * 2, 2, 20);
  const rows = useMemo(
    () =>
      state.players.map((p) => ({
        p,
        s: career ? sumStats(p.totals, p.stats) : p.stats,
        x: career
          ? { titles: titleCount(p.titles), slams: p.titles.slam, race: 0 }
          : { titles: seasonTitles(p, year), slams: p.rankingPoints.filter((e, slot) => e && e.year === year && e.round === "W" && EVENTS[slot].tier === "slam").length, race: racePoints(p, year) },
      })),
    [state.players, career, year]
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{career ? "Since the save began in 2026" : `${year} season`}</p>
          <h1 className="font-display text-5xl font-bold uppercase italic leading-none">Stat leaders</h1>
        </div>
        <div className="flex gap-1" role="group" aria-label="Period">
          <button type="button" className={chip(!career)} aria-pressed={!career} onClick={() => setMode("season")}>
            {year} season
          </button>
          <button type="button" className={chip(career)} aria-pressed={career} onClick={() => setMode("career")}>
            Career in this save
          </button>
        </div>
      </header>
      <p className="text-sm text-muted">
        Percentage and per-match boards need at least {minMatches} matches played. Select a player to open the full card.
      </p>
      {BOARD_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-3">
          <h2 className="eyebrow">{group}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {BOARDS.filter((b) => b.group === group && !(career && b.seasonOnly)).map((b) => (
              <LeaderBoard key={`${mode}-${b.id}`} board={b} rows={rows} minMatches={minMatches} onOpenPlayer={onOpenPlayer} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ────────────────────────────── Records and GOAT ────────────────────────────── */

const RECORD_GROUPS = [
  {
    title: "Single match",
    from: "match",
    rows: [
      ["aces", "Most aces", (v) => v],
      ["winners", "Most winners", (v) => v],
      ["mph", "Fastest serve", (v) => `${v} mph`],
      ["mins", "Longest match", (v) => clock(v)],
      ["points", "Most points played", (v) => v],
    ],
  },
  {
    title: "Single season",
    from: "season",
    rows: [
      ["wins", "Most match wins", (v) => v],
      ["winPct", "Best win rate (30+ matches)", (v) => `${v}%`],
      ["titles", "Most titles", (v) => v],
      ["aces", "Most aces", (v) => fmt(v)],
      ["points", "Most year-end ranking points", (v) => fmt(v)],
    ],
  },
  {
    title: "Milestones",
    from: "feats",
    rows: [
      ["youngestSlam", "Youngest Slam champion", (v) => `${v} years`],
      ["oldestSlam", "Oldest Slam champion", (v) => `${v} years`],
      ["youngestNo1", "Youngest world No. 1", (v) => `${v} years`],
      ["oldestNo1", "Oldest world No. 1", (v) => `${v} years`],
      ["lowestChampion", "Lowest-ranked champion", (v) => `No. ${v}`],
    ],
  },
];
const HONOUR_COLS = [
  ["slam", "Slams", "Most Grand Slam titles"],
  ["finals", "Finals", "Most ATP Finals titles"],
  ["masters", "Masters", "Most Masters 1000 titles"],
  ["weeks", "Wks No. 1", "Most weeks at No. 1"],
  ["ye", "YE No. 1", "Most year-end No. 1 finishes"],
];

function RecordRow({ label, value, name, note }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 px-4 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right font-mono text-base font-semibold tabular-nums">{value}</span>
      <span className="col-span-2 text-sm">
        {name ? (
          <>
            <span className="font-semibold">{name}</span>
            {note && <span className="text-muted"> · {note}</span>}
          </>
        ) : (
          <span className="text-muted">Not set yet</span>
        )}
      </span>
    </li>
  );
}

/* ── The GOAT debate: three rooms, one argument ── */
const DEBATE_ROOMS = [
  ["players", "Players", "The locker room"],
  ["analysts", "Analysts", "The studio"],
  ["fans", "Fans and social", "The stands"],
];
const REASON_LABEL = {
  majors: "Counts the majors",
  ledger: "The whole record",
  top: "Time at No. 1",
  eye: "The eye test",
  home: "Home vote",
  faced: "Has played the pick",
  numbers: "What is already won",
  young: "Age and runway",
  level: "Current level",
  feel: "A hunch",
  record: "Head-to-head",
  serve: "The serve",
  forehand: "The forehand",
  backhand: "The backhand",
  legs: "Court coverage",
  mind: "Big points",
  allround: "No weakness",
};

function PollBars({ rows, label }) {
  const top = Math.max(1, ...rows.map((r) => r.pct));
  return (
    <ul className="flex flex-col gap-3" aria-label={label}>
      {rows.map((r, i) => (
        <li key={r.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1.5">
          <span className={`truncate text-sm ${i === 0 ? "font-semibold" : ""}`}>{r.name}</span>
          <span className="font-mono text-sm tabular-nums">
            {r.pct}%{r.votes != null && <span className="text-muted"> · {r.votes}</span>}
          </span>
          <span className="col-span-2 block h-1.5 rounded-full bg-raise">
            <span className={`block h-full rounded-full ${i === 0 ? "bg-ball" : "bg-dim"}`} style={{ width: `${(r.pct / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function DebateHeading({ children, aside }) {
  return (
    <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span className="eyebrow">{children}</span>
      {aside && <span className="text-xs text-muted">{aside}</span>}
    </p>
  );
}

function GoatDebate({ state, onOpenPlayer }) {
  const [room, setRoom] = useState("players");
  const [ask, setAsk] = useState("goat");
  const [salt, setSalt] = useState(0);
  const t = state.tournament;
  const debate = useMemo(() => goatDebate(state, salt), [state.players, state.retired, state.currentWeek, t && t.roundIndex, t && t.status, salt]);
  const { players, analysts, fans } = debate;
  const question = players.questions.find((q) => q.id === ask) || players.questions[0];
  const active = useMemo(() => new Set(state.players.map((p) => p.id)), [state.players]);
  const nameOf = (id, name, className = "font-semibold") =>
    active.has(id) ? (
      <button type="button" className={`${className} text-left hover:text-ball`} onClick={() => onOpenPlayer(id)}>
        {name}
      </button>
    ) : (
      <span className={className}>{name}</span>
    );

  return (
    <Panel title="The GOAT debate" aside={<span className="text-xs text-muted">Three rooms, one argument. It moves as the season is played.</span>}>
      <div role="tablist" aria-label="Who is arguing" className="grid gap-px border-b border-line bg-line sm:grid-cols-3">
        {DEBATE_ROOMS.map(([id, label, place]) => {
          const on = room === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => setRoom(id)} className={`flex flex-col gap-1.5 px-4 py-3 text-left transition ${on ? "bg-raise" : "bg-panel hover:bg-raise"}`}>
              <span className={`eyebrow ${on ? "text-ball" : ""}`}>
                {label} · {place}
              </span>
              <span className="font-display text-2xl font-bold uppercase leading-none">{debate.stand[id].name}</span>
              <span className="text-xs text-muted">{debate.stand[id].note}</span>
            </button>
          );
        })}
      </div>

      {room === "players" && (
        <div role="tabpanel">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
            <span className="eyebrow">We asked</span>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Question put to the players">
              {players.questions.map((q) => (
                <button key={q.id} type="button" aria-pressed={q.id === question.id} className={chip(q.id === question.id)} onClick={() => setAsk(q.id)}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-x-8 gap-y-6 px-4 py-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <p className="font-display text-xl font-bold uppercase leading-tight">{question.ask}</p>
              <DebateHeading aside={`${players.voters} ballots`}>Locker-room vote</DebateHeading>
              <PollBars rows={question.poll.map((r) => ({ ...r, votes: `${r.votes} ${r.votes === 1 ? "vote" : "votes"}` }))} label="Players' vote" />
              <p className="text-xs leading-relaxed text-muted">{question.note}</p>
            </div>
            <div className="flex flex-col gap-5">
              <DebateHeading>What they said</DebateHeading>
              <ul className="flex flex-col gap-4">
                {question.quotes.map((q) => (
                  <li key={q.id} className="flex max-w-[68ch] flex-col gap-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                      {nameOf(q.id, q.name)}
                      <span className="font-mono text-[11px] text-muted">No. {q.rank}</span>
                      <span className="text-xs text-muted">
                        votes {q.pick} · {REASON_LABEL[q.reason]}
                      </span>
                    </p>
                    <p className="border-l-2 border-ball pl-3 text-[15px] leading-relaxed">“{q.text}”</p>
                  </li>
                ))}
              </ul>
              {question.id === "goat" && players.own.length > 0 && (
                <>
                  <DebateHeading>The candidates on themselves</DebateHeading>
                  <ul className="flex flex-col gap-4">
                    {players.own.map((q) => (
                      <li key={q.id} className="flex max-w-[68ch] flex-col gap-1">
                        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          {nameOf(q.id, q.name)}
                          <span className="text-xs text-muted">{nth(q.place)} on the all-time list</span>
                        </p>
                        <p className="border-l-2 border-line pl-3 text-[15px] leading-relaxed">“{q.text}”</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Btn variant="outline" icon={RotateCcw} className="self-start px-3 py-2" onClick={() => setSalt(salt + 1)}>
                Ask other players
              </Btn>
            </div>
          </div>
        </div>
      )}

      {room === "analysts" && (
        <div role="tabpanel" className="flex flex-col gap-6 px-4 py-5">
          <section className="flex flex-col gap-4 rounded-sm border border-line bg-raise/40 p-4">
            <DebateHeading aside={`Topic ${analysts.panel.n} of ${analysts.panel.of}`}>The panel</DebateHeading>
            <h3 className="font-display text-2xl font-bold uppercase leading-none">{analysts.panel.title}</h3>
            <ol className="flex flex-col gap-3">
              {analysts.panel.lines.map((line, i) => (
                <li key={i} className="grid max-w-[78ch] gap-x-4 gap-y-0.5 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{line.name}</span>
                    <span className="block text-xs text-muted">{line.role}</span>
                  </p>
                  <p className="text-[15px] leading-relaxed">{line.text}</p>
                </li>
              ))}
            </ol>
            <Btn variant="outline" icon={ChevronRight} className="self-start px-3 py-2" onClick={() => setSalt(salt + 1)}>
              Next topic
            </Btn>
          </section>

          <div className="flex flex-col gap-3">
            <DebateHeading>Five desks, five yardsticks</DebateHeading>
            <p className="max-w-[72ch] text-[15px] leading-relaxed">{analysts.verdict}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analysts.desks.map((d) => (
              <section key={d.id} className="flex flex-col gap-3 rounded-sm border border-line bg-raise/40 p-4">
                <header className="flex flex-col gap-1">
                  <h3 className="font-display text-lg font-bold uppercase leading-none tracking-wide">{d.name}</h3>
                  <p className="text-xs text-muted">{d.lens}</p>
                </header>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="eyebrow text-left">
                      <th className="w-7 py-1 font-semibold">Rk</th>
                      <th className="py-1 font-semibold">Player</th>
                      <th className="py-1 text-right font-semibold">{d.head}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.list.map((r) => (
                      <tr key={r.id} className="border-t border-line">
                        <td className="py-1.5 font-mono tabular-nums text-muted">{r.n}</td>
                        <td className="py-1.5">{nameOf(r.id, r.name, r.n === 1 ? "font-semibold" : "")}</td>
                        <td className="whitespace-nowrap py-1.5 text-right font-mono tabular-nums">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-sm leading-relaxed text-muted">{d.text}</p>
              </section>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <DebateHeading>The case for and against</DebateHeading>
            <ul className="flex flex-col divide-y divide-line rounded-sm border border-line">
              {analysts.cases.map((c) => (
                <li key={c.id} className="grid gap-x-6 gap-y-2 px-4 py-3 md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)]">
                  <p className="flex items-baseline gap-2">
                    <span className="font-mono text-sm tabular-nums text-muted">{c.place}</span>
                    {nameOf(c.id, c.name)}
                  </p>
                  {[
                    ["For", c.pro],
                    ["Against", c.con],
                  ].map(([side, points]) => (
                    <div key={side} className="flex flex-col gap-1">
                      <span className="eyebrow">{side}</span>
                      <ul className="flex flex-col gap-1 text-sm leading-relaxed">
                        {points.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </div>

          {analysts.chase.length > 0 && (
            <div className="flex flex-col gap-3">
              <DebateHeading>The chase</DebateHeading>
              <ul className="flex flex-col gap-3">
                {analysts.chase.map((c) => (
                  <li key={c.id} className="max-w-[72ch] border-l-2 border-line pl-3 text-sm leading-relaxed">
                    {c.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {room === "fans" && (
        <div role="tabpanel" className="grid gap-x-8 gap-y-6 px-4 py-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <DebateHeading aside={`${fmt(fans.total)} votes`}>Fan poll this week</DebateHeading>
              <PollBars rows={fans.poll} label="Fan poll" />
              <p className="text-xs leading-relaxed text-muted">The record counts, and so does whoever won last. The poll moves every time the tour does.</p>
            </div>
            <div className="flex flex-col gap-2">
              <DebateHeading>Trending</DebateHeading>
              <ul className="flex flex-col divide-y divide-line rounded-sm border border-line">
                {fans.tags.map((x) => (
                  <li key={x.label} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate font-semibold">{x.label}</span>
                    <span className="whitespace-nowrap font-mono text-xs text-muted">{x.posts} posts</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <DebateHeading aside="followers, change this week">Biggest followings</DebateHeading>
              <ul className="flex flex-col gap-3">
                {fans.bases.map((b) => (
                  <li key={b.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1.5">
                    {nameOf(b.id, b.name, "truncate text-sm")}
                    <span className="whitespace-nowrap font-mono text-sm tabular-nums">
                      {b.followers} <span className={b.up ? "text-up" : "text-down"}>{b.change}</span>
                    </span>
                    <span className="col-span-2 block h-1.5 rounded-full bg-raise">
                      <span className="block h-full rounded-full bg-dim" style={{ width: `${b.pct}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <DebateHeading aside={`${fans.accounts} accounts follow the tour`}>The feed</DebateHeading>
            <ul className="flex flex-col divide-y divide-line rounded-sm border border-line">
              {fans.posts.map((p) => (
                <li key={p.key} className="flex flex-col gap-1.5 px-4 py-3">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-semibold">{p.name}</span>
                    <span className="font-mono text-xs text-muted">
                      {p.handle} · {p.ago}
                    </span>
                    <span className="ml-auto whitespace-nowrap text-xs text-dim">{p.kind}</span>
                  </p>
                  <p className="max-w-[62ch] text-[15px] leading-relaxed">{p.text}</p>
                  <p className="font-mono text-xs text-muted">
                    {p.replies} replies · {p.reposts} reposts · {p.likes} likes
                  </p>
                  {p.thread.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-2 border-l border-line pl-3">
                      {p.thread.map((r) => (
                        <li key={r.handle} className="text-sm leading-relaxed">
                          <span className="font-semibold">{r.name}</span> <span className="font-mono text-xs text-muted">{r.handle}</span>
                          <span className="block text-muted">{r.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <Btn variant="outline" icon={RotateCcw} className="self-start px-3 py-2" onClick={() => setSalt(salt + 1)}>
              Refresh feed
            </Btn>
          </div>
        </div>
      )}

      <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-dim">
        Simulated debate. The votes, quotes, panel, desks, accounts and posts are generated by the game from this save. Nobody named here said these words; the pundits and the accounts are invented.
      </p>
    </Panel>
  );
}

/* ── The pace: Grand Slams by age, against the three careers everyone is measured by ── */
const PACE_SLOTS = ["hard", "clay", "grass"]; // a categorical set, checked for colour-blind separation on the panel colour
const PACE_TABLE_AGES = [20, 22, 24, 26, 28, 30, 32, 34, 36, 38];

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.round(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return [ref, width];
}

function PacePanel({ state, onOpenPlayer }) {
  const pace = useMemo(() => slamPace(state), [state.players, state.retired, state.calendar]);
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const W = Math.max(280, width || 640);
  const narrow = W < 520;
  const H = narrow ? 250 : 320;
  const pad = { l: 28, r: narrow ? 74 : 88, t: 14, b: 26 };
  const top = Math.ceil(pace.maxN / 5) * 5;
  const x = (age) => pad.l + ((age - pace.minAge) / (pace.maxAge - pace.minAge)) * (W - pad.l - pad.r);
  const y = (n) => pad.t + (1 - n / top) * (H - pad.t - pad.b);
  const path = (pts) => pts.map(([age, n], k) => `${k ? "L" : "M"}${x(age).toFixed(1)},${y(n).toFixed(1)}`).join(" ");
  const series = pace.bench.map((s) => ({ ...s, bench: true })).concat(pace.chasers);
  const countAt = (s, age) => pace.valueAt(s.pts, age, s.closed);
  const move = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const age = Math.round(pace.minAge + ((e.clientX - box.left - pad.l) / (W - pad.l - pad.r)) * (pace.maxAge - pace.minAge));
    setHover(clamp(age, pace.minAge, pace.maxAge));
  };
  const ages = [];
  for (let age = pace.minAge; age <= pace.maxAge; age += narrow ? 4 : 2) ages.push(age);
  const levels = [];
  for (let n = 0; n <= top; n += 5) levels.push(n);
  const readout = hover == null ? null : series.map((s) => [s.short, countAt(s, hover)]).filter(([, n]) => n != null);

  return (
    <Panel
      title="The pace"
      aside={
        <button type="button" className="font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={() => setAsTable(!asTable)}>
          {asTable ? "Show chart" : "Show table"}
        </button>
      }
    >
      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="max-w-[72ch] text-sm leading-relaxed text-muted">Grand Slam titles by age. The grey lines are the three careers everyone is measured against; the coloured lines are the players still chasing them.</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm" aria-label="Legend">
          {pace.chasers.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span className={`h-0.5 w-5 rounded-full bg-${PACE_SLOTS[c.slot]}`} aria-hidden="true" />
              <button type="button" className="font-semibold hover:text-ball" onClick={() => onOpenPlayer(c.id)}>
                {c.short}
              </button>
              <span className="font-mono text-xs text-muted">
                {c.n} at {c.age}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-dim" aria-hidden="true" />
            <span className="text-muted">Djokovic, Nadal, Federer (named on the chart)</span>
          </li>
        </ul>

        {asTable ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="eyebrow text-left">
                  <th className="py-1.5 pr-3 font-semibold">Majors at age</th>
                  {PACE_TABLE_AGES.map((age) => (
                    <th key={age} className="px-2 py-1.5 text-right font-semibold">
                      {age}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className={`whitespace-nowrap py-1.5 pr-3 ${s.bench ? "text-muted" : "font-semibold"}`}>{s.short}</td>
                    {PACE_TABLE_AGES.map((age) => (
                      <td key={age} className={`px-2 py-1.5 text-right font-mono tabular-nums ${countAt(s, age) ? "" : "text-dim"}`}>
                        {countAt(s, age) == null ? "–" : countAt(s, age)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div ref={ref} className="flex flex-col gap-1">
            <p className="min-h-[2.5em] font-mono text-xs leading-relaxed text-muted sm:min-h-[1.25em]" aria-live="polite">
              {readout ? (
                <>
                  <span className="text-fg">Age {hover}</span>
                  {readout.map(([short, n]) => ` · ${short} ${n}`).join("")}
                </>
              ) : (
                "Move over the chart, or tap it, to compare everyone at the same age."
              )}
            </p>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full touch-pan-y" role="img" aria-label={`Grand Slam titles by age. ${pace.reads.map((r) => r.text).join(" ")}`} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
              {levels.map((n) => (
                <g key={n}>
                  <line x1={pad.l} x2={W - pad.r} y1={y(n)} y2={y(n)} stroke="rgb(var(--line))" strokeWidth="1" />
                  <text x={pad.l - 8} y={y(n) + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="rgb(var(--muted))">
                    {n}
                  </text>
                </g>
              ))}
              {ages.map((age) => (
                <text key={age} x={x(age)} y={H - 8} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="rgb(var(--muted))">
                  {age}
                </text>
              ))}
              <text x={W - pad.r + 10} y={H - 8} fontSize="11" fontFamily="var(--font-mono)" fill="rgb(var(--muted))">
                age
              </text>
              {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--muted))" strokeWidth="1" />}
              {pace.bench.map((s) => {
                const [age, n] = s.pts[s.pts.length - 1];
                return (
                  <g key={s.id}>
                    <path d={path(s.pts)} fill="none" stroke="rgb(var(--dim))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={x(age)} cy={y(n)} r="4" fill="rgb(var(--dim))" stroke="rgb(var(--panel))" strokeWidth="2" />
                    <text x={x(age) + 9} y={y(n) + 4} fontSize="12" fontFamily="var(--font-body)" fill="rgb(var(--muted))">
                      {s.short} {n}
                    </text>
                  </g>
                );
              })}
              {pace.chasers.map((s) => {
                const [age, n] = s.pts[s.pts.length - 1];
                return (
                  <g key={s.id}>
                    <path d={path(s.pts)} fill="none" stroke={`rgb(var(--${PACE_SLOTS[s.slot]}))`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={x(age)} cy={y(n)} r="4.5" fill={`rgb(var(--${PACE_SLOTS[s.slot]}))`} stroke="rgb(var(--panel))" strokeWidth="2" />
                  </g>
                );
              })}
              {hover != null &&
                series.map((s) => {
                  const n = countAt(s, hover);
                  if (n == null || hover < s.pts[0][0] || hover > s.pts[s.pts.length - 1][0]) return null;
                  return <circle key={s.id} cx={x(hover)} cy={y(n)} r="3.5" fill={s.bench ? "rgb(var(--dim))" : `rgb(var(--${PACE_SLOTS[s.slot]}))`} stroke="rgb(var(--panel))" strokeWidth="2" />;
                })}
            </svg>
          </div>
        )}

        {pace.reads.length > 0 && (
          <ul className="flex flex-col gap-2">
            {pace.reads.map((r) => (
              <li key={r.id} className="max-w-[72ch] border-l-2 border-line pl-3 text-sm leading-relaxed">
                {r.text}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs leading-relaxed text-dim">Seasons before {START_YEAR} are what really happened, with age taken as the year minus the birth year. Everything from {START_YEAR} on is this save.</p>
      </div>
    </Panel>
  );
}

/* ── Milestone watch and the head-to-heads between the names on the list ── */
function MilestoneWatch({ state, onOpenPlayer }) {
  const list = useMemo(() => milestones(state), [state.players, state.retired, state.calendar]);
  return (
    <Panel title="Milestone watch" aside={<span className="text-xs text-muted">Within reach right now</span>}>
      {list.length ? (
        <ul className="flex flex-col divide-y divide-line">
          {list.map((m) => (
            <li key={m.text}>
              <button type="button" className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm leading-relaxed hover:bg-raise" onClick={() => onOpenPlayer(m.id)}>
                <span>{m.text}</span>
                <ChevronRight size={14} className="shrink-0 translate-y-0.5 text-dim" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-muted">Nothing is close at the moment. Play on.</p>
      )}
    </Panel>
  );
}

function RivalryRow({ row, onOpenPlayer }) {
  const total = row.wa + row.wb;
  const name = (label, id, className) =>
    id ? (
      <button type="button" className={`${className} hover:text-ball`} onClick={() => onOpenPlayer(id)}>
        {label}
      </button>
    ) : (
      <span className={className}>{label}</span>
    );
  return (
    <li className="flex flex-col gap-1.5 px-4 py-2.5">
      <p className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 text-sm">
        {name(row.a, row.ids[0], "truncate text-left font-semibold")}
        <span className="font-mono tabular-nums">
          {row.wa}–{row.wb}
        </span>
        {name(row.b, row.ids[1], "truncate text-right")}
      </p>
      <span className="flex h-1.5 gap-0.5" aria-hidden="true">
        <span className="rounded-full bg-ball" style={{ width: `${(row.wa / total) * 100}%` }} />
        <span className="flex-1 rounded-full bg-dim" />
      </span>
    </li>
  );
}

function GreatRivalries({ state, onOpenPlayer }) {
  const data = useMemo(() => greatRivalries(state), [state.players, state.retired, state.h2h]);
  return (
    <Panel title="Between the names" aside={<span className="text-xs text-muted">Head-to-heads on the all-time list</span>}>
      {data.live.length > 0 && (
        <>
          <p className="eyebrow border-b border-line px-4 py-2">Still being played</p>
          <ul className="flex flex-col divide-y divide-line">
            {data.live.map((row) => (
              <RivalryRow key={row.key} row={row} onOpenPlayer={onOpenPlayer} />
            ))}
          </ul>
        </>
      )}
      {data.closed.length > 0 && (
        <>
          <p className={`eyebrow border-b border-line px-4 py-2 ${data.live.length ? "border-t" : ""}`}>Closed books</p>
          <ul className="flex flex-col divide-y divide-line">
            {data.closed.map((row) => (
              <RivalryRow key={row.key} row={row} onOpenPlayer={onOpenPlayer} />
            ))}
          </ul>
        </>
      )}
      <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-dim">Closed books are the real final records between retired greats. Live records start from the real ones where the game has them and add every meeting in this save.</p>
    </Panel>
  );
}

function Legacy({ state, onOpenPlayer }) {
  const [all, setAll] = useState(false);
  const rows = useMemo(() => {
    const active = state.players.map((p) => ({ id: p.id, name: p.name, kind: "active", tag: `Active, ${p.age}`, h: honours(p), wins: p.record.w }));
    const gone = state.retired.map((r) => ({ id: r.id, name: r.name, kind: "retired", tag: `${r.reason === "dropped" ? "Off tour" : "Retired"} ${r.year}`, h: honours(r), wins: r.record.w }));
    const legends = LEGENDS.map(([name, , v]) => ({ id: `legend-${slug(name)}`, name, kind: "legend", tag: "Legend", h: { slam: v[0], finals: v[1], masters: v[2], weeks: v[3], ye: v[4] }, wins: 0 }));
    return active.concat(gone, legends).map((r) => ({ ...r, score: goatScore(r.h) }));
  }, [state.players, state.retired]);
  const goat = useMemo(() => rows.filter((r) => r.score > 0).sort((a, b) => b.score - a.score || b.h.slam - a.h.slam), [rows]);
  const shown = all ? goat : goat.slice(0, 15);
  const topScore = goat.length ? goat[0].score : 1;
  const best = (pickValue) => rows.reduce((top, r) => (pickValue(r) > (top ? pickValue(top) : 0) ? r : top), null);
  const mostWins = best((r) => r.wins);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">All-time, through {state.currentYear}</p>
        <h1 className="font-display text-5xl font-bold uppercase italic leading-none">Records and GOAT</h1>
      </header>

      <Panel
        title="GOAT ranking"
        aside={
          goat.length > 15 && (
            <button type="button" className="font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={() => setAll(!all)}>
              {all ? "Show top 15" : `Show all ${goat.length}`}
            </button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="eyebrow text-left">
                <th className="w-12 py-2 pl-4 pr-2 font-semibold">Rk</th>
                <th className="px-2 py-2 font-semibold">Player</th>
                <th className="px-2 py-2 text-right font-semibold">GOAT score</th>
                {HONOUR_COLS.map(([key, short]) => (
                  <th key={key} className={`px-2 py-2 text-right font-semibold last:pr-4 ${key === "slam" ? "" : "hidden sm:table-cell"}`}>
                    {short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.id} className={`border-t border-line ${r.kind === "active" ? "cursor-pointer hover:bg-raise" : ""}`} onClick={r.kind === "active" ? () => onOpenPlayer(r.id) : undefined}>
                  <td className="py-2.5 pl-4 pr-2 font-mono tabular-nums text-muted">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className={`whitespace-nowrap font-semibold ${r.kind === "legend" ? "text-muted" : ""}`}>{r.name}</span>
                      <span className={`whitespace-nowrap font-mono text-[11px] ${r.kind === "active" ? "text-up" : "text-muted"}`}>{r.tag}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="block font-mono font-semibold tabular-nums">{fmt(r.score)}</span>
                    <span className="mt-1 block h-0.5 rounded-full bg-raise">
                      <span className="ml-auto block h-full rounded-full bg-ball" style={{ width: `${(r.score / topScore) * 100}%` }} />
                    </span>
                  </td>
                  {HONOUR_COLS.map(([key]) => (
                    <td key={key} className={`px-2 py-2.5 text-right font-mono tabular-nums last:pr-4 ${key === "slam" ? "" : "hidden sm:table-cell"} ${r.h[key] ? "" : "text-dim"}`}>
                      {r.h[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted">
          GOAT score: {GOAT_WEIGHTS.slam} per Grand Slam, {GOAT_WEIGHTS.finals} per ATP Finals, {GOAT_WEIGHTS.masters} per Masters 1000, {GOAT_WEIGHTS.ye} per year-end No. 1 and {GOAT_WEIGHTS.weeks} per week at No. 1. Real honours
          through 2025 are included, then everything won in this save is added. Legends are retired greats shown as benchmarks; they do not play. A season here stands for 52 weeks at No. 1.
        </p>
      </Panel>

      <GoatDebate state={state} onOpenPlayer={onOpenPlayer} />

      <PacePanel state={state} onOpenPlayer={onOpenPlayer} />

      <div className="grid items-start gap-6 md:grid-cols-2">
        <MilestoneWatch state={state} onOpenPlayer={onOpenPlayer} />
        <GreatRivalries state={state} onOpenPlayer={onOpenPlayer} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Career records" aside={<span className="text-xs text-muted">Real honours plus this save</span>}>
          <ul className="flex flex-col divide-y divide-line">
            {HONOUR_COLS.map(([key, , label]) => {
              const top = best((r) => r.h[key]);
              return <RecordRow key={key} label={label} value={top ? top.h[key] : "–"} name={top && top.name} note={top && top.tag} />;
            })}
            <RecordRow label="Most match wins in this save" value={mostWins ? fmt(mostWins.wins) : "–"} name={mostWins && mostWins.name} note={mostWins && mostWins.tag} />
          </ul>
        </Panel>
        {RECORD_GROUPS.map((group) => (
          <Panel key={group.title} title={`${group.title} records`} aside={<span className="text-xs text-muted">{group.from === "season" ? "This save, updated each off-season" : "Set in this save"}</span>}>
            <ul className="flex flex-col divide-y divide-line">
              {group.rows.map(([key, label, show]) => {
                const rec = state.records[group.from][key];
                return <RecordRow key={key} label={label} value={rec ? show(rec.v) : "–"} name={rec && rec.name} note={rec && rec.note} />;
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────── Stories and rivalries ────────────────────────────── */

const NEWS_KIND = { title: "Champion", upset: "Upset", preview: "Preview", withdraw: "Withdrawal", no1: "World No. 1", movers: "Rankings", rise: "On the rise", slump: "Slump", race: "Race to Turin", record: "Record", goat: "Legacy", retire: "Retirement", rookie: "Rookies", review: "Season review", critique: "Critique", grades: "Report card", live: "Tournament", talking: "Talking points", power: "Power rankings", streak: "Streak", rivalry: "Rivalry", words: "War of words" };
const KIND_TONE = { words: "text-down", live: "text-fg", power: "text-up", streak: "text-up", rivalry: "text-ball", talking: "text-fg", critique: "text-down", grades: "text-ball", title: "text-ball", goat: "text-ball", review: "text-ball", no1: "text-ball", upset: "text-down", withdraw: "text-down", slump: "text-down", rise: "text-up", rookie: "text-up" };
const dateline = (n) => `${n.city ? `${n.city} · ` : ""}${n.y}, week ${n.w}`;

function KindTag({ n }) {
  return <span className={`font-display text-xs font-semibold uppercase tracking-[0.14em] ${KIND_TONE[n.k] || "text-muted"}`}>{NEWS_KIND[n.k] || "News"}</span>;
}

// Headlines as a list of links. Each one opens the full article.
function StoryList({ items, compact, onOpen }) {
  if (items.length === 0) return <p className="p-4 text-sm text-muted">No stories yet. Start a tournament.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((n) => (
        <li key={n.id}>
          <button type="button" onClick={() => onOpen(n.id)} className={`group flex w-full flex-col gap-1 px-4 text-left transition hover:bg-raise ${compact ? "py-2.5" : "py-4"}`}>
            <span className="flex flex-wrap items-center gap-x-3 font-mono text-[11px] text-muted">
              <KindTag n={n} />
              <span>{dateline(n)}</span>
            </span>
            <span className={`font-semibold leading-snug group-hover:underline ${compact ? "text-sm" : "text-lg"}`}>{n.h}</span>
            {!compact && <span className="max-w-[70ch] text-sm leading-relaxed text-muted">{n.dek}</span>}
            {!compact && (
              <span className="mt-0.5 inline-flex items-center gap-1 font-display text-xs font-semibold uppercase tracking-wider text-muted group-hover:text-ball">
                Read the story <ChevronRight size={13} aria-hidden="true" />
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

// A rivalry is a pair that keeps meeting: ranked by matches played, with finals counting double.
function rivalryRows(state) {
  const names = {};
  state.players.forEach((p) => {
    names[p.id] = { name: p.name, active: true };
  });
  state.retired.forEach((r) => {
    if (!names[r.id]) names[r.id] = { name: r.name, active: false };
  });
  return Object.keys(state.h2h)
    .map((key) => {
      const [a, b] = key.split("|");
      const rec = state.h2h[key];
      return { key, a, b, A: names[a], B: names[b], rec, weight: rec[0] + rec[1] + rec[2] * 2 };
    })
    .filter((r) => r.A && r.B && r.rec[0] + r.rec[1] >= 3)
    .sort((x, y) => y.weight - x.weight);
}

function Stories({ state, onOpenPlayer, onOpenArticle }) {
  const [kind, setKind] = useState("all");
  const rivalries = useMemo(() => rivalryRows(state).slice(0, 14), [state.h2h, state.players, state.retired]);
  const items = kind === "all" ? state.news : state.news.filter((n) => n.k === kind);
  const kinds = ["all", "title", "live", "talking", "power", "critique", "grades", "upset", "words", "streak", "rivalry", "no1", "movers", "rise", "slump", "withdraw", "race", "goat", "record", "review", "rookie", "retire", "preview"].filter((k) => k === "all" || state.news.some((n) => n.k === k));
  // the lead is the newest piece that is a result rather than a preview
  const lead = kind === "all" ? items.slice(0, 10).find((n) => n.k === "title" || n.k === "live" || n.k === "upset" || n.k === "no1" || n.k === "review") || items[0] : null;
  const rest = lead ? items.filter((n) => n.id !== lead.id) : items;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {state.currentYear} season · week {Math.min(state.currentWeek, OFFSEASON_WEEK)}
          </p>
          <h1 className="font-display text-5xl font-bold uppercase italic leading-none">Stories</h1>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Kind of story">
          {kinds.map((k) => (
            <button key={k} type="button" className={chip(kind === k)} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === "all" ? "All" : NEWS_KIND[k]}
            </button>
          ))}
        </div>
      </header>

      {lead && (
        <button type="button" onClick={() => onOpenArticle(lead.id)} className="group flex flex-col gap-3 rounded-sm border border-line bg-panel p-5 text-left transition hover:border-muted md:p-7">
          <span className="flex flex-wrap items-center gap-x-3 font-mono text-xs text-muted">
            <KindTag n={lead} />
            <span>{dateline(lead)}</span>
          </span>
          <span className="max-w-[24ch] font-display text-4xl font-bold uppercase italic leading-[0.95] group-hover:text-ball md:text-6xl">{lead.h}</span>
          <span className="max-w-[60ch] text-lg leading-snug text-muted">{lead.dek}</span>
          <span className="max-w-[70ch] text-sm leading-relaxed text-muted">{lead.body[0]}</span>
          <span className="inline-flex items-center gap-1 font-display text-sm font-semibold uppercase tracking-wider text-fg group-hover:text-ball">
            Read the full story <ChevronRight size={14} aria-hidden="true" />
          </span>
        </button>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={kind === "all" ? "More stories" : NEWS_KIND[kind]} aside={<span className="text-xs text-muted">{rest.length} articles</span>}>
          <StoryList items={rest} onOpen={onOpenArticle} />
        </Panel>

        <Panel title="Rivalries" aside={<span className="text-xs text-muted">Head-to-head</span>}>
          {rivalries.length === 0 && <p className="p-4 text-sm text-muted">Rivalries appear once players have met three times.</p>}
          <ul className="flex flex-col divide-y divide-line">
            {rivalries.map((r) => {
              const lead2 = r.rec[0] === r.rec[1] ? -1 : r.rec[0] > r.rec[1] ? 0 : 1;
              const recent = (r.rec[5] || "").split("").map((c) => (c === "0" || c === "a" ? 0 : 1));
              const side = (who, idx, id) => (
                <button type="button" disabled={!who.active} onClick={() => onOpenPlayer(id)} className={`min-w-0 truncate text-sm enabled:hover:underline ${idx === 1 ? "text-right" : "text-left"} ${lead2 === idx ? "font-semibold text-fg" : "text-muted"}`}>
                  {shortName(who.name)}
                </button>
              );
              return (
                <li key={r.key} className="flex flex-col gap-1.5 px-4 py-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
                    {side(r.A, 0, r.a)}
                    <span className="font-mono text-base font-semibold tabular-nums">
                      {r.rec[0]}–{r.rec[1]}
                    </span>
                    {side(r.B, 1, r.b)}
                  </div>
                  {recent.length > 0 && (
                    <div className="flex items-center justify-center gap-1" aria-label={`Recent meetings, oldest first: ${recent.map((x) => shortName(x === 0 ? r.A.name : r.B.name)).join(", ")}`}>
                      {recent.map((x, k) => (
                        <span key={k} className={`h-1.5 w-4 rounded-full ${x === 0 ? "bg-fg" : "bg-dim"}`} />
                      ))}
                    </div>
                  )}
                  <p className="text-center text-xs text-muted">
                    {r.rec[2]} {r.rec[2] === 1 ? "final" : "finals"} · last: {r.rec[3]}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted">
            The strip shows recent meetings, oldest first: light for the player on the left, dark for the right. Tracked for top-40 meetings, semifinals and finals. Sinner, Alcaraz and Djokovic start with their real head-to-heads through 2025.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function ArticleReader({ state, article: n, onClose, onOpenPlayer, onOpenArticle }) {
  const closeRef = useDialog(onClose);
  const boxRef = useRef(null);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = 0;
  }, [n.id]);
  const people = n.ids.map((id) => state.players.find((p) => p.id === id)).filter(Boolean);
  const related = state.news.filter((x) => x.id !== n.id && x.ids.some((id) => n.ids.includes(id))).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-bg/75 backdrop-blur-sm" onClick={onClose}>
      <article ref={boxRef} role="dialog" aria-modal="true" aria-label={n.h} className="sheet flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-line bg-panel" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 px-5 pt-5 md:px-8 md:pt-7">
          <p className="flex flex-wrap items-center gap-x-3 pt-2 font-mono text-xs uppercase text-muted">
            <KindTag n={n} />
            <span>{dateline(n)}</span>
          </p>
          <button ref={closeRef} type="button" className="rounded-sm p-2 text-muted hover:bg-raise hover:text-fg" onClick={onClose} aria-label="Close article">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-6 px-5 pb-8 pt-3 md:px-8">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-4xl font-bold uppercase italic leading-[0.95] md:text-5xl">{n.h}</h2>
            <p className="max-w-[60ch] text-lg leading-snug text-muted">{n.dek}</p>
          </div>

          <div className="flex max-w-[66ch] flex-col gap-4 text-base leading-relaxed">
            {n.body.map((para, k) => (
              <p key={k} className={k === 0 ? "text-fg" : "text-fg/85"}>
                {para}
              </p>
            ))}
          </div>

          {n.facts.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow">By the numbers</h3>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
                {n.facts.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5 bg-panel px-3 py-2">
                    <dt className="text-[11px] text-muted">{label}</dt>
                    <dd className="font-mono text-sm font-semibold">{value}</dd>
                  </div>
                ))}
                {n.facts.length % 3 !== 0 && <div className="hidden bg-panel sm:block" style={{ gridColumn: `span ${3 - (n.facts.length % 3)}` }} aria-hidden="true" />}
                {n.facts.length % 2 !== 0 && <div className="bg-panel sm:hidden" aria-hidden="true" />}
              </dl>
            </section>
          )}

          {n.road && (
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow">Road to the title</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {n.road.map(([round, opponent, score]) => (
                      <tr key={round} className="border-t border-line">
                        <td className="whitespace-nowrap py-1.5 pr-3 text-muted">{round}</td>
                        <td className="py-1.5 pr-3">d. {opponent}</td>
                        <td className="whitespace-nowrap py-1.5 text-right font-mono tabular-nums">{score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {people.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow">In this story</h3>
              <div className="flex flex-wrap gap-2">
                {people.map((p) => (
                  <button key={p.id} type="button" onClick={() => onOpenPlayer(p.id)} className="inline-flex items-baseline gap-2 rounded-sm border border-line px-3 py-1.5 text-sm font-semibold transition hover:border-muted hover:bg-raise">
                    {p.name}
                    <span className="font-mono text-xs font-normal text-muted">OVR {p.ovr}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <p className="text-xs text-dim">Simulated coverage. Results, numbers and any quotes are generated by the game; nobody quoted here actually said these words.</p>

          {related.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow">Related stories</h3>
              <div className="rounded-sm border border-line">
                <StoryList items={related} compact onOpen={onOpenArticle} />
              </div>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}

/* ────────────────────────────── Betting ────────────────────────────── */

const money = (v) => `${v < 0 ? "−" : ""}$${Math.abs(Number(v)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STAKES = [10, 25, 50, 100];

// The slip: one selection, a stake, and what it would return. sel = { kind, r, i, pick, odds, label }.
function Slip({ sel, bank, dispatch, onDone, idBase }) {
  const [stake, setStake] = useState("25");
  const amount = Number(stake);
  const valid = amount > 0 && amount <= bank.balance;
  const place = () => {
    dispatch({ type: "BET_PLACE", kind: sel.kind, r: sel.r, i: sel.i, pick: sel.pick, stake: amount });
    onDone();
  };
  return (
    <form
      className="flex flex-col gap-3 rounded-sm border border-ball bg-raise p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) place();
      }}
    >
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 font-semibold">{sel.label}</span>
        <span className="font-mono text-lg font-semibold tabular-nums">{american(sel.odds)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${idBase}-stake`} className="text-xs text-muted">
          Stake
        </label>
        <input
          id={`${idBase}-stake`}
          type="number"
          min="1"
          step="1"
          inputMode="decimal"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="w-24 rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-sm text-fg focus:border-muted focus:outline-none"
        />
        {STAKES.map((v) => (
          <button key={v} type="button" className={chip(amount === v)} onClick={() => setStake(String(v))}>
            {v}
          </button>
        ))}
        <button type="button" className={chip(false)} onClick={() => setStake(String(Math.floor(bank.balance)))}>
          All in
        </button>
      </div>
      <p className="font-mono text-xs text-muted">
        {amount > 0 ? `Returns ${money(amount * sel.odds)} · profit ${money(amount * sel.odds - amount)}` : "Enter a stake."}
        {amount > bank.balance && <span className="ml-2 text-down">Only {money(bank.balance)} in the bank.</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn type="submit" className="px-3 py-2" disabled={!valid}>
          Place bet
        </Btn>
        <Btn variant="ghost" className="px-3 py-2" onClick={onDone}>
          Cancel
        </Btn>
        {bank.balance < 1 && (
          <Btn variant="outline" className="px-3 py-2" onClick={() => dispatch({ type: "BET_FUNDS", amount: 100 })}>
            Add $100
          </Btn>
        )}
      </div>
    </form>
  );
}

function PriceButton({ label, odds, note, on, onClick }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`flex min-w-0 items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left transition ${on ? "border-ball bg-raise" : "border-line hover:border-muted hover:bg-raise"}`}>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {note && <span className="block font-mono text-[11px] text-muted">{note}</span>}
      </span>
      <span className="shrink-0 font-mono text-base font-semibold tabular-nums">{american(odds)}</span>
    </button>
  );
}

// Every market on one match, with its own slip. Shown inside the match centre before the match is played.
function BetPanel({ state, r, i, dispatch }) {
  const t = state.tournament;
  const m = t.rounds[r].matches[i];
  const mk = matchMarkets(state, t, r, i);
  const [sel, setSel] = useState(null);
  if (!mk) return null;
  const bank = state.bank;
  const names = [t.entries[m.a].name, t.entries[m.b].name];
  const mine = bank.open.filter((b) => b.mid === betKey(t, m.a, m.b));
  const implied = [Math.round(mk.p * 100), 100 - Math.round(mk.p * 100)];
  const choose = (kind, pick, odds, label) => setSel({ kind, r, i, pick, odds, label });
  return (
    <section className="flex flex-col gap-3 border-b border-line px-5 py-4">
      <p className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="eyebrow">Betting · play money</span>
        <span className="font-mono text-xs text-muted">Bank {money(bank.balance)}</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1].map((k) => (
          <PriceButton key={k} label={names[k]} note={`To win · market ${implied[k]}%`} odds={mk.win[k]} on={!!sel && sel.kind === "win" && sel.pick === "ab"[k]} onClick={() => choose("win", "ab"[k], mk.win[k], `${names[k]} to beat ${shortName(names[1 - k])}`)} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {mk.scores.map((x) => {
          const side = x.a > x.b ? 0 : 1;
          const text = `${shortName(names[side])} ${Math.max(x.a, x.b)}–${Math.min(x.a, x.b)}`;
          return <PriceButton key={x.key} label={text} note="Set score" odds={x.odds} on={!!sel && sel.kind === "score" && sel.pick === x.key} onClick={() => choose("score", x.key, x.odds, `${names[side]} to win ${Math.max(x.a, x.b)}–${Math.min(x.a, x.b)} in sets`)} />;
        })}
      </div>
      {sel && <Slip key={`${sel.kind}-${sel.pick}`} sel={sel} bank={bank} dispatch={dispatch} onDone={() => setSel(null)} idBase={`m${r}-${i}`} />}
      {mine.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {mine.map((b) => (
            <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-sm bg-raise px-3 py-1.5">
              <span>{b.label}</span>
              <span className="font-mono text-xs text-muted">
                {money(b.stake)} at {american(b.odds)} · returns {money(b.stake * b.odds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Profit over time, one point per settled batch of bets.
function ProfitChart({ series }) {
  const [hover, setHover] = useState(null);
  const data = [0].concat(series);
  const W = 640;
  const H = 180;
  const pad = { l: 54, r: 16, t: 14, b: 22 };
  const lo = Math.min(0, ...data);
  const hi = Math.max(0, ...data);
  const span = hi - lo || 1;
  const x = (k) => pad.l + (k / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);
  const path = data.map((v, k) => `${k === 0 ? "M" : "L"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${path} L${x(data.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const last = data.length - 1;
  const shown = hover == null ? last : hover;
  const move = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const k = Math.round((((e.clientX - box.left) / box.width) * W - pad.l) / ((W - pad.l - pad.r) / Math.max(1, data.length - 1)));
    setHover(clamp(k, 0, last));
  };
  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="font-mono text-xs text-muted" aria-live="polite">
        {shown === 0 ? "Start" : `After ${shown} settled ${shown === 1 ? "round" : "rounds"} of bets`}: <span className={data[shown] >= 0 ? "text-up" : "text-down"}>{money(data[shown])}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Profit over time, currently ${money(data[last])}`} onMouseMove={move} onMouseLeave={() => setHover(null)}>
        {[hi, 0, lo].filter((v, k, list) => list.indexOf(v) === k).map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgb(var(--line))" strokeWidth="1" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="rgb(var(--muted))">
              {Math.round(v).toLocaleString("en-US")}
            </text>
          </g>
        ))}
        <path d={area} fill="rgb(var(--ball))" fillOpacity="0.1" />
        <path d={path} fill="none" stroke="rgb(var(--ball))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--muted))" strokeWidth="1" />}
        <circle cx={x(shown)} cy={y(data[shown])} r="4.5" fill="rgb(var(--ball))" stroke="rgb(var(--panel))" strokeWidth="2" />
      </svg>
    </div>
  );
}

function Betting({ state, dispatch, onOpenMatch }) {
  const bank = state.bank;
  const t = state.tournament;
  const live = !!t && t.status !== "complete";
  const [sel, setSel] = useState(null);
  const [custom, setCustom] = useState("250");
  const [confirmReset, setConfirmReset] = useState(false);
  const [allOut, setAllOut] = useState(false);
  const openStakes = bank.open.reduce((n, b) => n + b.stake, 0);
  const profit = round2(bank.returned - bank.staked);
  const roi = bank.staked > 0 ? (profit / bank.staked) * 100 : 0;
  const event = t ? state.calendar[t.slot] : null;

  const matches = useMemo(() => {
    if (!live) return [];
    const list = [];
    t.rounds.forEach((rd, r) =>
      rd.matches.forEach((m, i) => {
        if (m.a && m.b && !m.winner) list.push({ r, i, m, key: rd.key, mk: matchMarkets(state, t, r, i) });
      })
    );
    return list;
  }, [t, state.players, live]);
  const outright = useMemo(() => (live ? outrightMarket(state, t) : []), [t, state.players, live]);
  const tiles = [
    ["Bank", money(bank.balance), ""],
    ["Added", money(bank.deposited), ""],
    ["Open stakes", money(openStakes), ""],
    ["Profit on settled bets", `${profit > 0 ? "+" : ""}${money(profit)}`, profit > 0 ? "text-up" : profit < 0 ? "text-down" : ""],
    ["Return on stakes", bank.staked > 0 ? `${roi > 0 ? "+" : ""}${roi.toFixed(1)}%` : "–", roi > 0 ? "text-up" : roi < 0 ? "text-down" : ""],
    ["Bets won–lost", `${bank.won}–${bank.lost}`, ""],
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Play money · American odds</p>
          <h1 className="font-display text-5xl font-bold uppercase italic leading-none">Betting</h1>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: "BET_FUNDS", amount: Number(custom) });
          }}
        >
          <span className="eyebrow mr-1">Add funds</span>
          {[100, 500, 1000].map((v) => (
            <Btn key={v} variant="outline" className="px-3 py-2" onClick={() => dispatch({ type: "BET_FUNDS", amount: v })}>
              +${v.toLocaleString("en-US")}
            </Btn>
          ))}
          <label htmlFor="funds-custom" className="sr-only">
            Custom amount
          </label>
          <input id="funds-custom" type="number" min="1" step="1" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-24 rounded-sm border border-line bg-panel px-2 py-2 font-mono text-sm text-fg focus:border-muted focus:outline-none" />
          <Btn type="submit" className="px-3 py-2" disabled={!(Number(custom) > 0)}>
            Add
          </Btn>
        </form>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(([label, value, tone]) => (
          <div key={label} className="flex flex-col gap-1 bg-panel px-4 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={`font-mono text-xl font-semibold tabular-nums ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {bank.deposited === 0 && (
        <p className="rounded-sm border border-line bg-panel px-4 py-3 text-sm text-muted">
          Add funds to start. Odds are American: −150 means staking $150 to win $100, and +130 means a $100 stake wins $130. Prices carry a bookmaker's margin and lean toward the bigger names, so the market is not always right: compare it with the model and see whether you can finish ahead.
        </p>
      )}

      {bank.series.length >= 2 && (
        <Panel title="Profit over time" aside={<span className="text-xs text-muted">Settled bets only</span>}>
          <ProfitChart series={bank.series} />
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title={live ? `${event.name}: match odds` : "Match odds"} aside={live && <span className="text-xs text-muted">{matches.length} open</span>}>
            {!live && <p className="p-4 text-sm text-muted">No markets are open. Start the next tournament from the Hub and the prices go up with the draw.</p>}
            {live && matches.length === 0 && <p className="p-4 text-sm text-muted">Every match in this round has been played.</p>}
            <ul className="flex flex-col divide-y divide-line">
              {matches.slice(0, 40).map(({ r, i, m, key, mk }) => {
                const names = [t.entries[m.a].name, t.entries[m.b].name];
                return (
                  <li key={`${r}-${i}`} className="flex flex-col gap-2 px-4 py-3">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="eyebrow">{ROUND_LABEL[key].replace(/s$/, "")}</span>
                      <button type="button" className="inline-flex items-center gap-1 font-display text-xs font-semibold uppercase tracking-wider text-muted hover:text-ball" onClick={() => onOpenMatch(r, i)}>
                        Preview and all markets <ChevronRight size={13} aria-hidden="true" />
                      </button>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[0, 1].map((k) => (
                        <PriceButton
                          key={k}
                          label={names[k]}
                          note={`Market ${k === 0 ? Math.round(mk.p * 100) : 100 - Math.round(mk.p * 100)}% · model ${k === 0 ? Math.round(mk.model * 100) : 100 - Math.round(mk.model * 100)}%`}
                          odds={mk.win[k]}
                          on={!!sel && sel.kind === "win" && sel.r === r && sel.i === i && sel.pick === "ab"[k]}
                          onClick={() => setSel({ kind: "win", r, i, pick: "ab"[k], odds: mk.win[k], label: `${names[k]} to beat ${shortName(names[1 - k])}` })}
                        />
                      ))}
                    </div>
                    {sel && sel.kind !== "out" && sel.r === r && sel.i === i && <Slip key={`${r}-${i}-${sel.pick}`} sel={sel} bank={bank} dispatch={dispatch} onDone={() => setSel(null)} idBase={`list-${r}-${i}`} />}
                  </li>
                );
              })}
            </ul>
            {matches.length > 40 && <p className="border-t border-line px-4 py-3 text-xs text-muted">Showing the first 40 of {matches.length}. Open any match in the draw for its markets.</p>}
          </Panel>

          {live && outright.length > 0 && (
            <Panel
              title="Tournament winner"
              aside={
                outright.length > 12 && (
                  <button type="button" className="font-display text-sm font-semibold uppercase tracking-wider text-fg hover:text-ball" onClick={() => setAllOut(!allOut)}>
                    {allOut ? "Show top 12" : `Show all ${outright.length}`}
                  </button>
                )
              }
            >
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {(allOut ? outright : outright.slice(0, 12)).map((x) => (
                  <PriceButton key={x.id} label={`${x.name}${x.seed ? ` (${x.seed})` : ""}`} note={`Market ${(x.prob * 100).toFixed(x.prob < 0.1 ? 1 : 0)}%`} odds={x.odds} on={!!sel && sel.kind === "out" && sel.pick === x.id} onClick={() => setSel({ kind: "out", pick: x.id, odds: x.odds, label: `${x.name} to win ${at(event)}` })} />
                ))}
              </div>
              {sel && sel.kind === "out" && (
                <div className="px-4 pb-4">
                  <Slip key={sel.pick} sel={sel} bank={bank} dispatch={dispatch} onDone={() => setSel(null)} idBase="outright" />
                </div>
              )}
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Open bets" aside={<span className="font-mono text-xs text-muted">{money(openStakes)} staked</span>}>
            {bank.open.length === 0 && <p className="p-4 text-sm text-muted">No open bets.</p>}
            <ul className="flex flex-col divide-y divide-line">
              {bank.open.map((b) => (
                <li key={b.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm">
                  <span className="font-semibold">{b.label}</span>
                  <span className="font-mono text-xs text-muted">
                    {b.ev} {b.y} · {b.round} · {money(b.stake)} at {american(b.odds)} · returns {money(b.stake * b.odds)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Settled bets" aside={<span className="text-xs text-muted">Latest {Math.min(40, bank.history.length)}</span>}>
            {bank.history.length === 0 && <p className="p-4 text-sm text-muted">Nothing settled yet.</p>}
            <ul className="flex flex-col divide-y divide-line">
              {bank.history.slice(0, 40).map((b) => (
                <li key={b.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
                  <span className="font-semibold">{b.label}</span>
                  <span className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${b.res === "won" ? "text-up" : "text-down"}`}>
                    {b.res === "won" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
                    {b.res === "won" ? `+${money(b.ret - b.stake)}` : money(-b.stake)}
                  </span>
                  <span className="col-span-2 font-mono text-xs text-muted">
                    {b.res === "won" ? "Won" : "Lost"} · {b.ev} {b.y} · {b.round} · {money(b.stake)} at {american(b.odds)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2 rounded-sm border border-line p-3 text-sm">
              <span className="text-muted">Clear the bank, open bets and history?</span>
              <button type="button" className="rounded-sm bg-down px-2.5 py-1.5 font-display font-bold uppercase tracking-wider text-ink" onClick={() => { dispatch({ type: "BET_RESET" }); setConfirmReset(false); setSel(null); }}>
                Clear
              </button>
              <button type="button" className="rounded-sm border border-line px-2.5 py-1.5 font-display font-bold uppercase tracking-wider hover:bg-raise" onClick={() => setConfirmReset(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" className="inline-flex items-center gap-2 self-start text-sm text-muted hover:text-fg" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} aria-hidden="true" /> Reset bankroll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Off-season report ────────────────────────────── */

const changeText = (d) => {
  const parts = ATTRS.filter((k) => d.deltas[k]).map((k) => `${ATTR_SHORT[k]} ${signed(d.deltas[k])}`);
  return parts.length ? parts.join("  ") : "No change";
};

function OffseasonReport({ report, onClose }) {
  const closeRef = useDialog(onClose);
  const group = (key) => report.development.filter((d) => d.phase === key);
  const held = group("peak");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/80 px-4 py-6 backdrop-blur-sm md:py-12" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Off-season report" className="w-full max-w-3xl rounded-sm border border-line bg-panel" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="flex flex-col gap-2">
            <p className="eyebrow text-ball">Off-season report</p>
            <h2 className="font-display text-4xl font-bold uppercase italic leading-none md:text-5xl">
              {report.fromYear} → {report.toYear}
            </h2>
            <p className="text-sm text-muted">Every player is a year older and rested, a new rookie class has arrived, and the calendar is back at week 1.</p>
          </div>
          <button ref={closeRef} type="button" className="rounded-sm p-2 text-muted hover:bg-raise hover:text-fg" onClick={onClose} aria-label="Close report">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-7 p-5">
          <section className="flex flex-col gap-2">
            <h3 className="eyebrow">{report.fromYear} honours</h3>
            <p className="flex flex-wrap items-center gap-x-2 text-sm">
              <Crown size={15} className="text-ball" aria-hidden="true" />
              <span className="text-muted">Year-end No. 1</span>
              <span className="font-semibold">{report.no1.name}</span>
              <span className="font-mono text-muted">{fmt(report.no1.pts)} pts</span>
            </p>
            <p className="text-sm leading-relaxed text-muted">{report.slams.map((e) => `${e.abbr} ${e.champion ? shortName(e.champion) : "–"}`).join("  ·  ")}</p>
          </section>

          {(report.retirements.length > 0 || report.arrivals.length > 0) && (
            <section className="grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <h3 className="eyebrow flex items-center gap-1.5">
                  <UserMinus size={14} aria-hidden="true" /> Retirements
                </h3>
                {report.retirements.length === 0 && <p className="text-sm text-muted">Nobody retired.</p>}
                {report.retirements.map((r) => (
                  <p key={r.id} className="text-sm">
                    <span className="font-semibold">{r.name}</span> <span className="text-muted">at {r.age}, ranked No. {r.lastRank}</span>
                  </p>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="eyebrow flex items-center gap-1.5">
                  <ArrowDown size={14} aria-hidden="true" /> Lost tour card
                </h3>
                {report.dropped.length === 0 && <p className="text-sm text-muted">Nobody dropped off.</p>}
                {report.dropped.map((r) => (
                  <p key={r.id} className="text-sm">
                    <span className="font-semibold">{r.name}</span> <span className="text-muted">{r.age}, ranked No. {r.lastRank}</span>
                  </p>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="eyebrow flex items-center gap-1.5">
                  <UserPlus size={14} aria-hidden="true" /> Rookie class of {report.toYear}
                </h3>
                {report.arrivals.map((a) => (
                  <p key={a.id} className="text-sm">
                    <span className="font-semibold">{a.name}</span>{" "}
                    <span className="text-muted">
                      {a.country}, {a.age}, OVR {a.ovr}, potential {a.potential}
                    </span>
                  </p>
                ))}
              </div>
            </section>
          )}

          {["growth", "regression"].map((key) => {
            const rows = group(key);
            const phase = PHASES[key];
            const Icon = phase.icon;
            return (
              <section key={key} className="flex flex-col gap-2">
                <h3 className={`flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider ${phase.tone}`}>
                  <Icon size={14} aria-hidden="true" />
                  {phase.label} · age {phase.range} · {rows.length} players
                </h3>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted">Nobody in this bracket this year.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        {rows.map((d) => (
                          <tr key={d.id} className="border-t border-line">
                            <td className="w-10 py-1.5 pr-2 font-mono text-xs text-muted">{d.rank}</td>
                            <td className="whitespace-nowrap py-1.5 pr-2 font-semibold">
                              {d.name}
                              {d.retired && <span className="ml-2 font-normal text-muted">retired</span>}
                              {d.dropped && <span className="ml-2 font-normal text-muted">lost tour card</span>}
                            </td>
                            <td className="w-24 whitespace-nowrap px-2 py-1.5 text-right font-mono text-muted">turns {d.age}</td>
                            <td className="w-28 whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums">
                              {d.ovrFrom} → {d.ovrTo}
                            </td>
                            <td className={`w-[300px] whitespace-nowrap py-1.5 pl-2 text-right font-mono text-xs ${phase.tone}`}>{changeText(d)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}

          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider text-muted">
              <Activity size={14} aria-hidden="true" />
              Peak · age 23–28 · ratings held · {held.length} players
            </h3>
            <p className="text-sm leading-relaxed text-muted">{held.length ? held.map((d) => `${shortName(d.name)} (${d.age})`).join(", ") : "Nobody in this bracket this year."}</p>
          </section>

          <Btn icon={Play} className="self-start" onClick={onClose}>
            Begin the {report.toYear} season
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── App shell ────────────────────────────── */

const NAV = [
  { id: "hub", label: "Franchise Hub", short: "Hub", icon: LayoutDashboard },
  { id: "tournament", label: "Tournament", short: "Draw", icon: Swords },
  { id: "roster", label: "Roster", short: "Roster", icon: Users },
  { id: "stories", label: "Stories", short: "News", icon: Newspaper },
  { id: "betting", label: "Betting", short: "Bets", icon: Wallet },
  { id: "leaders", label: "Stat Leaders", short: "Stats", icon: BarChart3 },
  { id: "legacy", label: "Records & GOAT", short: "GOAT", icon: Crown },
];

function BallMark() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className="shrink-0">
      <circle cx="16" cy="16" r="15" fill="rgb(var(--ball))" />
      <path d="M5.5 6c6 5.5 6 14.5 0 20M26.5 6c-6 5.5-6 14.5 0 20" fill="none" stroke="rgb(var(--bg))" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ATPMyLeague({ initialSave }) {
  const [state, dispatch] = useReducer(reducer, initialSave, bootGame);
  const [view, setView] = useState("hub");
  const [playerId, setPlayerId] = useState(null);
  const [matchAt, setMatchAt] = useState(null);
  const [articleId, setArticleId] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Autosave to this browser; the game still runs if storage is unavailable.
  useEffect(() => {
    window.__atpMyLeague = state;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (err) {
      /* storage blocked */
    }
  }, [state]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const ranked = useMemo(() => rankBy(state.players, totalPoints), [state.players]);
  const ranks = useMemo(() => rankMap(ranked), [ranked]);
  const player = playerId ? state.players.find((p) => p.id === playerId) : null;
  const t = state.tournament;
  const live = !!t && t.status !== "complete";
  const week = state.currentWeek;
  const nextEvent = week < OFFSEASON_WEEK ? state.calendar[week - 1] : null;
  const story = articleId ? state.news.find((n) => n.id === articleId) : null;
  const openMatch = matchAt && t && t.rounds[matchAt.r] && t.rounds[matchAt.r].matches[matchAt.i];
  const matchReady = !!openMatch && !!openMatch.a && !!openMatch.b;

  const startNext = () => {
    dispatch({ type: "START_TOURNAMENT" });
    setMatchAt(null);
    setView("tournament");
  };
  const runOffseasonNow = () => {
    dispatch({ type: "RUN_OFFSEASON" });
    setPlayerId(null);
    setMatchAt(null);
    setView("hub");
    setReportOpen(true);
  };
  const newGame = () => {
    dispatch({ type: "NEW_GAME", seed: Date.now() % 2147483647, today: localToday() });
    setConfirmReset(false);
    setPlayerId(null);
    setMatchAt(null);
    setArticleId(null);
    setReportOpen(false);
    setView("hub");
  };

  return (
    <div className="min-h-screen md:flex">
      <aside className="topbar z-30 border-b border-line bg-panel md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 md:px-5 md:pt-6">
          <div className="flex items-center gap-2.5">
            <BallMark />
            <p className="font-display leading-none">
              <span className="block text-[11px] font-semibold tracking-[0.32em] text-muted">ATP</span>
              <span className="block text-2xl font-bold italic">
                My<span className="text-ball">LEAGUE</span>
              </span>
            </p>
          </div>
          <p className="font-mono text-xs text-muted md:hidden">
            {state.currentYear} · W{week}
          </p>
        </div>

        <nav className="grid grid-cols-7 gap-0.5 p-2 md:mt-6 md:grid-cols-1 md:gap-1 md:px-3" aria-label="Views">
          {NAV.map((item) => {
            const on = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-sm px-0.5 py-1.5 font-display text-[10px] font-semibold uppercase tracking-normal transition md:flex-row md:tracking-wider md:justify-start md:gap-2 md:px-3 md:py-2.5 md:text-base ${on ? "bg-raise text-fg" : "text-muted hover:bg-raise hover:text-fg"}`}
              >
                <Icon size={17} className={on ? "text-ball" : ""} aria-hidden="true" />
                <span className="md:hidden">{item.short}</span>
                <span className="hidden md:inline">{item.label}</span>
                {item.id === "tournament" && live && <span className="ml-auto hidden h-2 w-2 rounded-full bg-ball md:block" aria-label="In progress" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto hidden flex-col gap-4 p-5 md:flex">
          <dl className="flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="eyebrow">Season</dt>
              <dd className="font-display text-3xl font-bold leading-none">{state.currentYear}</dd>
            </div>
            <div>
              <dt className="eyebrow">
                Week {week} of {OFFSEASON_WEEK}
              </dt>
              <dd>{nextEvent ? nextEvent.name : "Off-season"}</dd>
            </div>
            <div>
              <dt className="eyebrow">World No. 1</dt>
              <dd>{ranked[0].name}</dd>
            </div>
            {state.bank.deposited > 0 && (
              <div>
                <dt className="eyebrow">Bank</dt>
                <dd className="font-mono">
                  {money(state.bank.balance)}{" "}
                  <span className={state.bank.returned - state.bank.staked >= 0 ? "text-up" : "text-down"}>
                    ({state.bank.returned - state.bank.staked >= 0 ? "+" : ""}
                    {money(state.bank.returned - state.bank.staked)})
                  </span>
                </dd>
              </div>
            )}
          </dl>
          {confirmReset ? (
            <div className="flex flex-col gap-2 rounded-sm border border-line p-3 text-sm">
              <p className="text-muted">Erase this save and start again from today?</p>
              <div className="flex gap-2">
                <button type="button" className="rounded-sm bg-down px-2.5 py-1.5 font-display font-bold uppercase tracking-wider text-ink" onClick={newGame}>
                  Erase
                </button>
                <button type="button" className="rounded-sm border border-line px-2.5 py-1.5 font-display font-bold uppercase tracking-wider hover:bg-raise" onClick={() => setConfirmReset(false)}>
                  Keep playing
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="inline-flex items-center gap-2 self-start text-sm text-muted hover:text-fg" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} aria-hidden="true" /> New franchise
            </button>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
          {view === "hub" && (
            <Hub
              state={state}
              ranked={ranked}
              onStart={startNext}
              onResume={() => setView("tournament")}
              onSimSeason={() => {
                setMatchAt(null);
                dispatch({ type: "SIM_SEASON" });
              }}
              onOffseason={runOffseasonNow}
              onOpenPlayer={setPlayerId}
              onShowBracket={() => setView("tournament")}
              onShowReport={() => setReportOpen(true)}
              onShowLeaders={() => setView("leaders")}
              onShowStories={() => setView("stories")}
              onOpenArticle={setArticleId}
            />
          )}
          {view === "tournament" && (
            <TournamentView state={state} ranks={ranks} dispatch={dispatch} onStart={startNext} onHub={() => setView("hub")} onOffseason={runOffseasonNow} onOpenMatch={(r, i) => setMatchAt({ r, i })} />
          )}
          {view === "roster" && <Roster state={state} ranked={ranked} ranks={ranks} dispatch={dispatch} onOpenPlayer={setPlayerId} />}
          {view === "stories" && <Stories state={state} onOpenPlayer={setPlayerId} onOpenArticle={setArticleId} />}
          {view === "betting" && <Betting state={state} dispatch={dispatch} onOpenMatch={(r, i) => setMatchAt({ r, i })} />}
          {view === "leaders" && <Leaders state={state} onOpenPlayer={setPlayerId} />}
          {view === "legacy" && <Legacy state={state} onOpenPlayer={setPlayerId} />}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted md:hidden">
            {confirmReset ? (
              <span className="flex flex-wrap items-center gap-2">
                Erase this save?
                <button type="button" className="rounded-sm bg-down px-2 py-1 font-display font-bold uppercase tracking-wider text-ink" onClick={newGame}>
                  Erase
                </button>
                <button type="button" className="rounded-sm border border-line px-2 py-1 font-display font-bold uppercase tracking-wider" onClick={() => setConfirmReset(false)}>
                  Keep playing
                </button>
              </span>
            ) : (
              <button type="button" className="inline-flex items-center gap-2 hover:text-fg" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={13} aria-hidden="true" /> New franchise
              </button>
            )}
            <span>Saved in this browser</span>
          </div>
          <p className="text-xs text-dim">Unofficial fan simulation, not affiliated with the ATP. Ratings, results and statistics are generated by the game.</p>
        </div>
      </main>

      {matchReady && (
        <MatchCentre key={`${t.year}-${t.slot}-${matchAt.r}-${matchAt.i}`} state={state} ranks={ranks} at={matchAt} dispatch={dispatch} onClose={() => setMatchAt(null)} onOpenPlayer={setPlayerId} />
      )}
      {story && <ArticleReader state={state} article={story} onClose={() => setArticleId(null)} onOpenPlayer={setPlayerId} onOpenArticle={setArticleId} />}
      {player && <PlayerSheet player={player} rank={ranks[player.id]} state={state} onClose={() => setPlayerId(null)} />}
      {reportOpen && state.offseason && <OffseasonReport report={state.offseason} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

export { reducer, createGame, rankBy, rankMap, totalPoints, racePoints, phaseFor, simMatch, statsAt, winProbability, scoreLine, indexById, honours, goatScore, h2hFor, matchFacts, preview, report, matchPatterns, matchExtras, tendencies, isBigMatch, matchMarkets, outrightMarket, titleRoll, slamBreakdown, interview, needle, needleReply, pressCall, eventDays, dateRange, REAL_FINALS, REAL_SNAPSHOT, edgeOf, voiceOf, goatDebate, slamPace, milestones, greatRivalries, american, scoreDist, marketProb, EVENTS, ATTRS, SURFACE_KEYS, OFFSEASON_WEEK, ROSTER, TIERS, TOUR_SIZE, TOUR_LIMIT, LEGENDS, IS_OTHER, OPTIONAL };
