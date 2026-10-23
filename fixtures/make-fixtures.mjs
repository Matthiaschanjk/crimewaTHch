// Generates the edge-case sheets used to verify index.html.
// Run from the project root:  node fixtures/make-fixtures.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const XLSX = require(join(here, "..", "vendor", "xlsx.full.min.js"));

// The vendored build is the browser bundle and has no fs binding, so serialise
// to a buffer and let Node write it.
const out = (name, sheets) => {
  const wb = XLSX.utils.book_new();
  for (const [tab, aoa] of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), tab);
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
  writeFileSync(join(here, name), buf);
  console.log("wrote", name);
};

const H = ["Name", "Score"];

// 1. two-way and four-way ties -> ranks must read 1,2,2,4 and 1,1,1,1,5
out("ties.xlsx", [["Leaderboard", [
  H, ["Dana", 500], ["Alex", 900], ["Cleo", 700], ["Bo", 700],
]]]);

out("ties4.xlsx", [["Leaderboard", [
  H, ["Delta", 900], ["Alpha", 900], ["Charlie", 900], ["Bravo", 900], ["Echo", 100],
]]]);

// 2. blank rows, missing + non-numeric scores, nameless row
out("messy.xlsx", [["Leaderboard", [
  H,
  ["Mercury", 1200],
  ["", ""],
  ["Saturn", ""],           // blank score -> 0
  ["", 9999],               // no name -> dropped
  ["Neptune", "TBC"],       // non-numeric -> 0
  ["Jupiter", "2,400"],     // thousands separator -> 2400
  ["", ""],
  ["Triton", 800],
]]]);

// 3. fewer than three participants
out("one.xlsx", [["Leaderboard", [H, ["Solo Suspect", 3400]]]]);
out("two.xlsx", [["Leaderboard", [H, ["Ada", 2200], ["Bram", 1100]]]]);
out("empty.xlsx", [["Leaderboard", [H]]]);

// 4. long + non-ASCII names, blank primary name
out("names.xlsx", [["Leaderboard", [
  ["Participant", "Partner", "Points"],
  ["Bartholomew Fitzgerald-Montgomery the Exceedingly Third", "Wu Zhao", 5000],
  ["Zoë Ñuñez-Kaur", "Søren Ødegård", 4000],
  ["李明", "翠花", 3000],
  ["", "Orphaned Partner", 2000],   // blank LYLC -> partner promoted
  ["Ravi", "", 1000],               // no partner -> no sub-line
]]]);

// 5. forty rows -> Show all
out("many.xlsx", [["Leaderboard", [
  H, ...Array.from({ length: 40 }, (_, i) => [`Suspect ${String(i + 1).padStart(2, "0")}`, (40 - i) * 100]),
]]]);

// 6. Scores-shaped mastersheet with real ticks, to prove the tier arithmetic
//    end to end. Mirrors the live sheet's layout exactly.
// Generic stand-ins for the real challenge list. Only the row COUNT and the
// Partner / Challenges / Bonus Points labels matter to the parser; a few keep
// punctuation so quoting quirks stay covered.
const CHALLENGES = [
  "Opening Act", "Street Cred", "Don't Look Now", "Vlog Drop",
  "Sketch or Stretch", "Ghost Protocol",                                   // 200 each
  "Snack Run", "Kitchen Duty", "Costume Call", "Tell Me Your Story",
  "Moonwalk", "The Good Old Days",                                         // 400 each
  "Wake Up Call", "Sign Me Up!", "Big Finish!", "Puppy Eyes",
  "Small Talk", "Offline Hours",                                           // 600 each
  "Trap Run - Mon", "Say Hello! - Tues", "Wayfinding - Wed", "Grand Race - Thurs", // 800 each
];
// expected: Nova 1200 (200+200+800) | Orion 2000 (one of each tier)
// Vega 10400 (all) | Juno 150 (bonus only) | Rhea 0
const PAIRS = [
  { lylc: "Nova", partner: "Quill", ticks: [0, 1, 18], bonus: "" },
  { lylc: "Orion", partner: "Pax", ticks: [0, 6, 12, 18], bonus: "" },
  { lylc: "Vega", partner: "Lyra", ticks: [...CHALLENGES.keys()], bonus: "" },
  { lylc: "Juno", partner: "Atlas", ticks: [], bonus: 150 },
  { lylc: "Rhea", partner: "Castor", ticks: [], bonus: "" },
];
const scoresAoa = [
  ["", ...PAIRS.map((p) => p.lylc)],
  ["Partner", ...PAIRS.map((p) => p.partner)],
  ["Total Score", ...PAIRS.map(() => 0)],
  ["Challenges", ...PAIRS.map(() => "")],
  ...CHALLENGES.map((c, i) => [c, ...PAIRS.map((p) => (p.ticks.includes(i) ? true : false))]),
  ["Bonus Points ", ...PAIRS.map((p) => p.bonus)],
];
out("scores-ticked.xlsx", [
  ["Instructions", [["INSTRUCTIONS"], ["only edit the mastersheet"]]],
  ["Scores", scoresAoa],
  ["Leaderboard", [["Rank", "LYLC", "Partner", "Score"], [1, "Nova", "Quill", 0]]],
]);

// 7. all zero -> pre-event state
out("allzero.xlsx", [["Leaderboard", [
  H, ["Ann", 0], ["Mel", 0], ["Zed", 0], ["Boo", 0],
]]]);

// 8. everyone tied on a real score -> NOT pre-event, "Tied at the top"
out("tiednonzero.xlsx", [["Leaderboard", [
  H, ["Ann", 400], ["Mel", 400], ["Zed", 400],
]]]);

// 9. alias headers + photo column
out("aliases.xlsx", [["Leaderboard", [
  ["TEAM", "TOTAL", "Photo"],
  ["Alpha Crew", 3200, "not-a-url"],
  ["Beta Crew", 2100, "https://example.invalid/nope.jpg"],
  ["Gamma Crew", 1000, ""],
]]]);

// 10. no Leaderboard tab -> must fall back to the first tab
out("firsttab.xlsx", [["Whatever", [H, ["Fallback Fred", 777]]]]);

// 11. a matched pair for testing FLIP reordering: identical names, reversed
//     scores, so every row persists across the refresh and has to move.
const FLIP_NAMES = ["Ann", "Bob", "Cid", "Dee", "Eve", "Fay", "Gus", "Hal", "Ivy", "Jon", "Kit", "Lou"];
out("flip-a.xlsx", [["Leaderboard", [H, ...FLIP_NAMES.map((n, i) => [n, (i + 1) * 100])]]]);
out("flip-b.xlsx", [["Leaderboard", [H, ...FLIP_NAMES.map((n, i) => [n, (FLIP_NAMES.length - i) * 100])]]]);
