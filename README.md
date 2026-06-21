# Expense Splitter

<!-- FILL: one line on what the app does, e.g. "Split shared group expenses and see who owes whom." -->

## Setup

<!-- FILL: confirm the pinned Node version (.nvmrc) and the dev URL against the real build. Commands only. -->

Requires Node `<NODE_VERSION>` (see `.nvmrc`).

```bash
npm install
npm run dev      # serves at <LOCAL_URL>
npm test         # runs the settlement tests
```

`.devcontainer/` is the development environment. It is not needed to run the app.

## Architecture

<!-- FILL: name the two layers and where the settlement logic lives (lib/settlement.ts).
     State that it has no framework or UI imports and its tests run in plain Node. Two or three sentences. -->

## Settlement

<!-- FILL: brief. Money is integer cents. Per expense, leftover cents are handed out one each
     to non-payers first, so shares sum back to the exact amount. Who-pays-whom is greedy and
     near-minimal, not guaranteed minimal. Point to DECISIONS.md for the full reasoning. -->

## Assumptions

<!-- FILL: NZ dollars, single group, in-memory state (resets on refresh), even split across the
     chosen participants. Half a sentence on why an expense can be shared by a subset rather than
     always everyone. -->

## What I'd do next

<!-- FILL: uneven splits, persistence (if not done), UX polish. List only what is not finished. -->

## See also

- `DECISIONS.md` — decision log and full reasoning.
- <!-- FILL: link to the written answers doc. -->
