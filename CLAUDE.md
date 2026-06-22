# CLAUDE.md

Expense Splitter — a frontend web app where a group adds people and shared expenses and sees who owes whom. Building from an empty repo.

## Read first

- `docs/DECISIONS.md` — the authority for every decision: stack, data model, settlement algorithm, UX, shipping. Section numbers (§) are cited below; read the relevant section before implementing that part.
- `docs/layout-mockup.html` — static visual reference for layout, the expense sub-line format (`Alice paid · split Alice, Bob, Carol`), and owed/owes colors (green = owed, red = owes). Take the layout and palette intent, **not** the CSS — the app is React + Tailwind, not vanilla CSS. Its Alice/Bob/Carol example (nets +$17.00 / −$5.50 / −$11.50) is a correct end-to-end integration fixture.

## Guardrails — do not get these wrong

- **Two layers.** `lib/settlement.ts` is pure: no React, no UI, no framework imports. Data in, data out; the UI consumes it. (§2)
- **Money is integer cents everywhere.** Parse the dollar form string to cents once at the input boundary; it stays an integer after. Never floating-point dollars. (§9, §10)
- **Settlement = per-expense rounding + two stages.** Largest-remainder rounding, leftover cents to non-payers and never the payer. Stage 1: net balances. Stage 2: greedy, largest creditor vs largest debtor, at most n−1 transactions. Greedy is near-minimal, not provably minimal — do not chase the true minimum (NP-hard). Full spec and worked numbers in §10.
- **Test the logic first.** Vitest, node environment, `*.test.ts` against the settlement module. No jsdom, no Testing Library. The seven edge cases in §10 are the test list — write them before the UI exists. (§5, §10)
- **State: `useReducer` + one Context, no library.** Stored state is only `{ people, expenses }`; balances are always derived, never stored. Reducer is pure and declared outside the component; actions are a discriminated union; `default` throws with a TypeScript exhaustiveness check. Provider is `<Context value={...}>` (React 19), not `<Context.Provider>`. (§6)
- **Tailwind v4 setup.** `@tailwindcss/vite` plugin plus `@import "tailwindcss";` in the CSS entry. No `tailwind.config.js`, no PostCSS, no `init -p`, no content array. The v3 flow is a dead end where classes silently don't apply. (§4)
- **In-memory state; resets on refresh.** localStorage is a stretch, not part of the core. (§7)
- **Comments: standard format, concise, only where they earn their place.** Use TSDoc `/** */` for exported functions and types. Comment the non-obvious, not the self-evident — explain *why*, not *what*. No restating what the code already says.

## Build order

1. `lib/settlement.ts` and its tests (the seven §10 edge cases). (§5, §10)
2. Reducer and Context (`{ people, expenses }`, pure reducer, discriminated-union actions). (§6)
3. UI: `PeopleList`, `ExpenseList` (plus the add-expense form — the one non-trivial component), summary view. Match `layout-mockup.html`. (§11)
4. Stretch, only if the above is done: localStorage persistence. (§7)

## Run path and environment

- Must run from a clean checkout with `npm install && npm run dev`. Keep it that simple.
- `.devcontainer/` stays in the repo but is dev-only — say so in one README line; it is not required to run the app. (§8, §12)
- Pin Node via `.nvmrc` plus an `engines` field to Vite's current minimum or above. (§12)

## Decisions not in the docs

Follow DECISIONS.md. When it doesn't cover something and there are multiple reasonable options, stop and list them — one-line pro and con each, no detail dump. I'll ask if I need more before choosing.

## Verify, don't assume

Stack details drift. Before implementing the Tailwind v4 setup, the Vite minimum Node version, the React Context provider syntax, and the Vitest config, confirm against current official docs rather than memory. DECISIONS.md records the intended approach; the official docs are the final word at build time.
