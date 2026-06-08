# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

JuegaPalabras: a Spanish-language web game site for ~8-year-olds (vocabulary/spelling via emojis), built as a **portrait-only mobile PWA**. Pure HTML/CSS/JS — **no build, no dependencies, no framework, works offline**. See `README.md` for the player-facing feature list and how to add words; this file covers architecture and the conventions that aren't obvious from any single file.

## Commands

- **Run locally:** `python3 -m http.server 8137` then open `http://localhost:8137/`. There is no build/lint/test step — edit a file and reload.
- **Service worker needs HTTP** (not `file://`). When testing SW/PWA/auto-update behavior, always go through the local server.
- **Verifying layout changes (mobile fit):** this is visual and can't be eyeballed from source. The established approach is a headless-Chrome harness driven by `puppeteer-core` (system Chrome at `/usr/bin/google-chrome-stable`) that loads each page at a target viewport, **simulates safe-area insets by injecting `.app { padding-top/bottom }`** (env() is 0 in headless), and asserts `scrollingElement.scrollHeight <= clientHeight` plus the keyboard's last row / last memoria card `getBoundingClientRect().bottom <= innerHeight`. Force edge cases via globals (see below): longest word `HELICÓPTERO`, memoria tier via `localStorage 'jp_memoria_level' = '4'` (clear localStorage first or `restoreSession` overrides it).

## Module system (read before touching cross-file references)

Every `js/*.js` module is an **IIFE singleton or const literal assigned to a top-level name** (`Progress`, `Theme`, `Analytics`, `Sound`, `Speech`, `IdleHint`, `WORDS`, `CATEGORIES`, `CAT_MAP`, `CAT_LABEL`). These are **lexical globals, NOT `window` properties** — reference them by bare name (`State`, `Progress`), never `window.Progress` (that's `undefined`). Function *declarations* (e.g. `nextWord`, `buildKeyboard`) *do* land on `window`. This matters when driving the page from a headless harness or console.

There is no import system: each HTML page loads modules via `<script>` tags **in dependency order** (e.g. `words.js` before `theme.js`/`analytics.js`, `progress.js` before `game.js`). Adding a module means adding the tag to every page that needs it.

## Progress is the single source of truth

`js/progress.js` owns stars, levels, medals, word collection, and daily streak — all in one `localStorage` blob `jp_progress`. **All four games funnel every win through `Progress.solve(game, currentStreak, word)`**, which increments stars, records per-game counts and the collected word, re-checks medals, fires analytics, and returns `{ stars, leveledUp, level, newMedals }` — the games use that return value to drive the celebration overlay. Bonus stars (memoria chest) go through `Progress.addBonusStars(n)`. Level thresholds (`LEVELS`) and the 16 achievement conditions (`MEDALS[].cond(data)`) live here; `medallas.html` and `album.html` read from the same `Progress` API.

`localStorage` keys (all `jp_`-prefixed): `jp_progress` (shared progress), `jp_theme` (selected category), `jp_sess_<game>` (per-game resumable session), `jp_memoria_level` (memoria board tier).

## Game structure & shared lifecycle

Each game is `games/<name>/{index.html, style.css, game.js}` and follows the same pattern:
- `buildDeck()` pulls from `Theme.words()` (falling back to all `WORDS` if the theme is empty) and orders **shortest-word-first** for a difficulty ramp.
- A global `State` object holds the deck/current word/streak; `const el = (id) => document.getElementById(id)`.
- **Session resume:** `saveSession()`/`restoreSession()` persist to `jp_sess_<game>` so a child returns to the exact word/streak/board. `init()` (on `DOMContentLoaded`) calls `restoreSession()` and only builds a fresh deck if there's nothing to resume.
- **Accent handling:** `norm()` uppercases and strips accents **but preserves Ñ** — comparisons are tilde-insensitive, yet the correct spelling (with tilde) is shown on success. Keep this when adding word logic.
- Selectable letters are always rendered in **QWERTY positions** (`js/qwerty.js`), with gaps where a letter isn't offered.

`word-guesser` and `ordena` use an on-screen keyboard pinned to the bottom; `letra-perdida` uses 4 letter options; `memoria` uses a flip-card board that grows 2×2 → 3×5 (`TIERS`, odd boards get a center 🎁 chest).

## Mobile-fit / PWA layout system (don't reintroduce scroll)

The games are tuned to fit **one screen with no page scroll** in a standalone PWA. The mechanism, spread across the four `games/*/style.css` fit-blocks:
- `html, body { height: 100dvh; overflow: hidden }` + `.app { min-height: 0; overflow: auto }` (the `overflow:auto` is a safety net so nothing is ever unreachable on smaller-than-expected screens). The chain `body → .app → .game → .board/.options` all carry `min-height: 0`.
- **Heavy elements scale with viewport height** via `clamp(min, N dvh, max)` (emoji, key/tile heights) — tuned so they reach near-full size at the **design floor of 375×667** (iPhone SE2/3) and shrink below it.
- Letter slots/tiles live in a **single non-wrapping flex row** (`flex-wrap: nowrap`, `flex: 1 1 0`, `max-width`) so long words shrink instead of adding rows and pushing the keyboard off-screen.
- Memoria's board uses `grid-auto-rows: 1fr` with `.card { aspect-ratio: 4/3; max-height: 100% }` so cards derive size from available height (contain behavior) rather than a fixed aspect that overflowed tall tiers.
- **Android nav-bar gap:** `.app { padding-bottom: max(env(safe-area-inset-bottom), 20px) }` — Android's button nav bar often doesn't report the inset, so the `max()` floor guarantees breathing room at the bottom.

The **menu/index page intentionally scrolls** (it's legitimately taller than one screen) — the no-scroll lock is scoped to game pages only. Re-verify with the headless harness after any layout edit.

## PWA & releases (every deploy)

`sw.js` precaches the app shell (`PRECACHE` list) and serves **cache-first**, keyed on `CACHE_VERSION`. `js/sw-register.js` (shared by all 7 pages, resolves `sw.js` relative to itself so it works from any subfolder) registers with `updateViaCache:'none'`, calls `reg.update()` on `visibilitychange`, and **auto-reloads** the page when a new SW takes control (with a first-visit guard).

On **every deploy you must bump, in lockstep:**
1. `APP_VERSION` in `js/analytics-config.js` (shown in the footer heart tooltip),
2. `CACHE_VERSION` in `sw.js` (busts the old cache so installed PWAs update),
3. `HEART_EMOJI` in `js/analytics-config.js` — the footer heart **color** signals the published version at a glance (rotation 💜→💙→💚→💛→🧡→❤️→🤍→🖤→…).

Convention: **minor bump = feature, patch = fix** (baseline 1.0.0). **Any new file served to users must be added to `PRECACHE` in `sw.js`** or it won't be cached/offline.

## Privacy: no data collection

Analytics was **removed**. The site collects **nothing** — no analytics, cookies, accounts, PII, or third-party network calls; player progress lives only in `localStorage` (`jp_*`). `js/analytics.js` is now a **no-op** `Analytics` object (`init/track/pageview/catOf` do nothing, load nothing) kept so the remaining `Analytics.*` calls scattered across `game.js`/pages don't throw — don't re-add a real provider without revisiting the kids-app (COPPA/Families) implications. `js/analytics-config.js` keeps its name (to avoid touching every page's `<script>` tag) but now only holds `APP_VERSION` + `HEART_EMOJI`. Data Safety for Play = "no data collected".

## Content & deploy notes

- Add words in `js/words.js` (`{ w, e, c }`); `c` must be a `CATEGORIES` key; don't repeat a word across categories. New categories need a `CATEGORIES` entry and ideally ≥4 short (≤7-letter) words for memoria. Spanish is neutral/Latin American.
- Deploys go to **GitHub Pages from `main`** (the repo commits directly to `main`; site lives at the `/juegapalabras/` subpath, so all asset paths are **relative**, never root-absolute).
