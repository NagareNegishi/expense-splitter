# Todo

Build order follows CLAUDE.md. Check off each item when it's done.

## 1. Project setup
- [x] Vite + React + TypeScript scaffold
- [x] Tailwind v4 wired up (`@tailwindcss/vite` plugin + `@import "tailwindcss"` in index.css)
- [x] Vitest installed, `test` script added
- [x] `.nvmrc` + `engines` field pinned to Node >=20
- [x] Dev server config (`host: true`, port 5173, strictPort)

## 2. Settlement logic (`src/lib/settlement.ts`) — §2, §9, §10
- [x] Types: `ID`, `Person`, `Expense`, `State`, `Transaction`
- [x] `computeShares(expense)` — largest-remainder rounding, payer never gets the extra cent
- [x] `computeNetBalances(state)` — net cents per person
- [x] `computeTransactions(balances)` — greedy two-pointer settle-up, at most n−1 transfers

## 3. Tests (`src/lib/settlement.test.ts`) — §5, §10
- [x] Three-way dinner: one pays $30 for three; two payments out
- [x] Penny split: $10.00 across three → 334 / 333 / 333, payer not charged extra cent
- [x] Already settled: all nets zero → empty transaction list
- [x] One person pays for everything: everyone else owes their share
- [x] Single-person group: net zero, no transactions
- [x] Removal guard: removing a referenced person rejected; unreferenced leaves balances unchanged
- [x] Debt chain: pairwise debts that net out collapse to fewer direct payments

## 4. State (`src/lib/reducer.ts` + `src/lib/context.tsx`) — §6
- [ ] `State`, `Action` discriminated union types
- [ ] Pure reducer (`ADD_PERSON`, `EDIT_PERSON`, `REMOVE_PERSON`, `ADD_EXPENSE`, `EDIT_EXPENSE`, `DELETE_EXPENSE`)
- [ ] `default` throws with exhaustiveness check (`action satisfies never`)
- [ ] `AppContext` + `AppProvider` using React 19 `<Context value={...}>` syntax

## 5. UI (`src/`) — §11, layout-mockup.html
- [ ] `App.tsx` — single column, three regions
- [ ] `PeopleList.tsx` — name rows with edit/remove, inline add field
- [ ] `ExpenseList.tsx` — expense rows with sub-line (`Alice paid · split Alice, Bob, Carol`), add-expense form
- [ ] Add-expense form — description, amount (NZ$→cents), paid-by select, shared-by chips (all checked by default)
- [ ] `Summary.tsx` — "Where everyone stands" (green owed / red owes) + "Settle up" transaction list
- [ ] Remove-person guard dialog (block if person is referenced in any expense)
- [ ] Edit flows for both people and expenses

## 6. Stretch — localStorage persistence — §7
- [ ] Lazy initializer reads `{ people, expenses }` from localStorage (try/catch → empty state)
- [ ] `useEffect` writes state to localStorage on every change
