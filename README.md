# Expense Splitter

Split shared group expenses and see who owes whom.

## Setup

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev      # serves at http://localhost:5173
npm test         # runs the settlement tests
```

`.devcontainer/` is the development environment used during the build. It is not needed to run the app.

## Architecture

There are two layers. `src/lib/settlement.ts` is pure TypeScript with no framework or UI imports: functions take data and return data, and their tests run in plain Node via Vitest. The UI layer (`PeopleList`, `ExpenseList`, `Summary`) reads and writes through a `useReducer` + Context and calls into the settlement module for every computed value.

## Settlement

Money is integer cents throughout. Per expense, shares are computed with floor division; leftover cents are handed out one each to non-payers first, so shares always sum to the exact expense amount. The settle-up list uses a greedy algorithm: match the largest creditor against the largest debtor each step, producing at most n−1 transactions. This is near-minimal in practice but not guaranteed minimal (the true minimum is NP-hard). See `DECISIONS.md` §10 for the full reasoning and worked examples.

## Assumptions

Amounts are in NZ dollars. The app handles a single group with no routing or multi-session support. State is in-memory and resets on page refresh. Expenses split evenly across the chosen participants. Participants can be a subset of the group because membership can change after an expense is recorded, so each expense snapshots exactly who was there.

## What I'd do next

- localStorage persistence so state survives a refresh (the data model is ready; it needs a lazy initialiser on read and a `useEffect` on write)
- Uneven splits (the data model already supports arbitrary `participants` subsets; it needs a UI for entering per-person amounts)

## See also

- `docs/DECISIONS.md` — decision log and full reasoning for every choice above.
- Written answers submitted separately.
