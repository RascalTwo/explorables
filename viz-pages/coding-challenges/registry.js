// registry.js — the ordered list of challenges the gallery renders.
// Add a challenge = drop a file in challenges/ and add its import + array entry here.
// Order is by daily-challenge number (ascending).
import c1 from "./challenges/001-vowel-balance.js";
import c2 from "./challenges/002-base-check.js";
import c3 from "./challenges/003-fibonacci-sequence.js";
import c4 from "./challenges/004-space-jam.js";
import c5 from "./challenges/005-jbelmud-text.js";
import c6 from "./challenges/006-anagram-checker.js";
import c7 from "./challenges/007-targeted-sum.js";
import c8 from "./challenges/008-factorializer.js";
import c9 from "./challenges/009-sum-of-squares.js";
import c10 from "./challenges/010-3-strikes.js";
import c11 from "./challenges/011-mile-pace.js";
import c12 from "./challenges/012-message-decoder.js";
import c13 from "./challenges/013-unnatural-prime.js";
import c14 from "./challenges/014-character-battle.js";
import c15 from "./challenges/015-camel-case.js";
import c16 from "./challenges/016-reverse-parenthesis.js";
import c17 from "./challenges/017-unorder-of-operations.js";
import c18 from "./challenges/018-second-best.js";
import c19 from "./challenges/019-candlelight.js";
import c20 from "./challenges/020-array-duplicates.js";
import c21 from "./challenges/021-hex-generator.js";
import c22 from "./challenges/022-tribonacci-sequence.js";
import c23 from "./challenges/023-rgb-to-hex.js";
import c24 from "./challenges/024-pangram.js";
import c25 from "./challenges/025-vowel-repeater.js";
import c26 from "./challenges/026-ipv4-validator.js";
import c293 from "./challenges/293-best-hand.js";
import c294 from "./challenges/294-parentheses.js";
import c295 from "./challenges/295-schema-validator.js";
import c301 from "./challenges/301-last-load.js";
import c302 from "./challenges/302-jet-lagged.js";
import c303 from "./challenges/303-roommates.js";
import c304 from "./challenges/304-itinerary.js";
import c305 from "./challenges/305-idea-rankings.js";
import c306 from "./challenges/306-html-extractor.js";
import c307 from "./challenges/307-zoning-regulations.js";
import c308 from "./challenges/308-luhn.js";
import c309 from "./challenges/309-number-sort.js";
import c310 from "./challenges/310-british-to-american.js";
import c311 from "./challenges/311-spellcaster.js";
import c312 from "./challenges/312-streaming-cost.js";
import c313 from "./challenges/313-rental-cost.js";
import c314 from "./challenges/314-prime-factorization.js";
import c315 from "./challenges/315-summer-solstice.js";
import c316 from "./challenges/316-leet-speak.js";
import c317 from "./challenges/317-bmi-calculator.js";
import c318 from "./challenges/318-dna-mutations.js";
import c319 from "./challenges/319-frontmatter-parser.js";
import c320 from "./challenges/320-blood-bank.js";
import c321 from "./challenges/321-periodic-spelling.js";
import c322 from "./challenges/322-connect-three.js";
import c323 from "./challenges/323-song-mood.js";
import c324 from "./challenges/324-duplicate-char-count.js";
import c325 from "./challenges/325-lucky-number.js";
import c326 from "./challenges/326-max-profit.js";
import c327 from "./challenges/327-db-migration.js";
import c328 from "./challenges/328-kaprekar.js";
import c329 from "./challenges/329-bucket-fill.js";
import c330 from "./challenges/330-lowercase-words.js";
import c331 from "./challenges/331-nearest-multiple.js";
import c332 from "./challenges/332-issue-triage.js";
import c333 from "./challenges/333-issue-triage-2.js";
import c334 from "./challenges/334-exact-change.js";
import c335 from "./challenges/335-five-dice.js";
import c336 from "./challenges/336-horoscope-match.js";
import c337 from "./challenges/337-tally-counter.js";
import c338 from "./challenges/338-pet-age.js";
import c339 from "./challenges/339-array-chunks.js";
import c340 from "./challenges/340-pig-latin.js";
import c341 from "./challenges/341-birthday-countdown.js";
import c342 from "./challenges/342-dice-odds.js";
import c343 from "./challenges/343-elevator-stops.js";
import c344 from "./challenges/344-golden-ratio.js";
import c345 from "./challenges/345-word-blender.js";
import c346 from "./challenges/346-piggy-bank.js";
import c347 from "./challenges/347-game-theory.js";
import c348 from "./challenges/348-loan-calculator.js";
import c349 from "./challenges/349-cell-signal.js";
import c350 from "./challenges/350-letter-distance.js";
import c351 from "./challenges/351-pronic-number.js";
import c352 from "./challenges/352-contrast-rating.js";
import c353 from "./challenges/353-contrast-rating-2.js";
import c354 from "./challenges/354-contrast-rating-3.js";
import c355 from "./challenges/355-morse-code.js";
import c356 from "./challenges/356-magic-square.js";
import c357 from "./challenges/357-food-chain.js";
import c358 from "./challenges/358-emoji-translator.js";
import c359 from "./challenges/359-golf-handicap.js";
import c360 from "./challenges/360-spoken-duration.js";
import c361 from "./challenges/361-spoken-time.js";
import c362 from "./challenges/362-nonogram-validator.js";
import c363 from "./challenges/363-bucket-fill-2.js";
import c364 from "./challenges/364-between-two-buckets.js";
import c365 from "./challenges/365-bucket-fill-3.js";
import lc39 from "./challenges/039-combination-sum.js";

// Ordered by when each problem was first PUBLISHED (oldest first) — that is,
// by the FIRST entry in each module's `dates` array. No arithmetic off the
// challenge number. LeetCode entries carry an approximate date (#39 is from the
// 2014–15 set, so it sorts ahead of every 2026 daily).
export default [
  c1, c2, c3, c4, c5, c6, c7, c8, c9, c10,
  c11, c12, c13, c14, c15, c16, c17, c18, c19, c20,
  c21, c22, c23, c24, c25, c26,
  c293, c294, c295, c301, c302, c303, c304, c305, c306, c307,
  c308, c309, c310, c311, c312, c313, c314, c315, c316, c317,
  c318, c319, c320,
  c321, c322, c323, c324, c325, c326, c327, c328, c329, c330,
  c331, c332, c333, c334, c335, c336, c337, c338, c339, c340,
  c341, c342, c343, c344, c345, c346, c347, c348, c349, c350,
  c351, c352, c353, c354, c355, c356, c357, c358, c359, c360,
  c361, c362, c363, c364, c365,
  lc39,
].sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
