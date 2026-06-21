# Expense Splitter: Decision Log

Build a small frontend web app where a group adds people and shared expenses, and the app shows who owes whom so they can settle up. The heart of the task is computing balances correctly and keeping that logic separate from the UI, unit-testable on its own.

## Decisions

### 1. Frontend only, no backend or database

Runs from a clean checkout: `npm install && npm run dev`. Settlement is pure computation: people and expenses in, who-owes-whom out.

### 2. Two layers: pure logic module and UI

Settlement logic lives in `lib/settlement.ts` with no framework or UI imports. Data in, data out. The UI consumes it. Keeps it unit-testable on its own.

### 3. Stack: React + TypeScript + Vite + Tailwind + Vitest

Vitest reads the Vite config by default, so the test runner shares build config with no extra wiring.

### 4. Tailwind v4 setup

v4 dropped `tailwind.config.js`, PostCSS, and `npx tailwindcss init -p`. Current flow:

1. `npm create vite@latest my-app -- --template react-ts`
2. `npm install tailwindcss @tailwindcss/vite`
3. In `vite.config.ts`: `plugins: [react(), tailwindcss()]`
4. In the CSS entry file: `@import "tailwindcss";`

No config file, no content array. The v3 flow leads to a "classes don't apply" dead end.

### 5. Testing

Logic tests only: `npm install -D vitest`, write `*.test.ts` against the settlement module. Node environment, no jsdom, no Testing Library.

### 6. State: `useReducer` plus one Context, no library

Stored state is two arrays, `people` and `expenses`. Everything else (balances, who-owes-whom) is derived by the settlement module, never stored. A `useReducer` holding `{ people, expenses }` keeps every transition in one pure reducer, exposed through a single Context so `PeopleList`, `ExpenseList`, and the summary read and dispatch without prop-drilling. The reducer is a pure `(state, action) => newState` declared outside the component, so it unit-tests in plain Node next to the settlement function.

Conventions (React v19.2):

- Pure reducer: no side effects, new arrays/objects via spreads, never mutate. Reducers run during render, so purity is required.
- `switch` on `action.type`, each `case` braced and ending in `return`.
- `default` throws and includes a TypeScript exhaustiveness check (assign `action` to `never`), so an unhandled action type fails the build.
- Action type is a discriminated union, also the list of everything the app can do.
- Provider syntax is `<Context value={...}>`, not `<Context.Provider value={...}>`.

### 7. Persistence: in-memory, localStorage as a stretch

State resets on refresh, a deliberate choice noted in the README. localStorage is a stretch: persist the `{ people, expenses }` reducer state with a lazy initializer on read and a `useEffect` on write, with a try/catch falling back to empty state. Only if settlement and its tests are done first.

### 8. Dev environment: existing full-stack container, trimmed to frontend

Reused from a working .NET + Postgres + React project, cut to frontend-only. Runs Claude Code in a sandbox with an egress firewall. It is the dev environment, not a requirement for running the app. The README run steps stay plain `npm install && npm run dev`, so a reviewer never opens the container.

Two structural decisions:

- Single-service docker-compose, with the firewall's NET_ADMIN/NET_RAW capabilities granted via cap_add. Do not move to a single Dockerfile with caps in runArgs.
- Kept the `vscode` user and pinned the base to `mcr.microsoft.com/devcontainers/base:ubuntu-22.04`. The shared `claude-credentials` volume targets `/home/vscode/.claude`, so the `vscode` user reuses the existing Claude login without re-auth. The 22.04 pin avoids the Ubuntu 24.04+ behaviour where a separate `ubuntu` user takes UID 1000 and pushes `vscode` to 1001, causing file-ownership friction.

Dropped from the .NET original: postgresql-client, dotnet-ef, NuGet firewall hosts, and the Postgres db service. Firewall, sudoers, and pinned feature versions unchanged.

First-run bootstrap (one-time). The project is scaffolded inside the container (no host Node). An empty workspace has no `package.json`, so `postCreateCommand`'s `npm install` aborts the open until the project exists:

1. Set `postCreateCommand.frontend` to `npm install || true` so the empty workspace opens.
2. In the container terminal: `npm create vite@latest . -- --template react-ts` (choose "Ignore files and continue" to keep `.devcontainer/`), then `npm install` and `npm install tailwindcss @tailwindcss/vite`.
3. Revert `postCreateCommand.frontend` to `npm install`.

In `vite.config.ts`, set `server: { host: true, port: 5173, strictPort: true }` so the forwarded dev server is reachable and the port doesn't drift to 5174.

### 9. Data model: two flat arrays, expenses reference people by id

People and expenses are separate arrays. Expenses reference people by id rather than nesting, because settlement iterates every expense once, edit and remove touch one list, and the removal rule scans one place. Per-person views are derived with a filter, not stored.

```ts
type ID = string; // crypto.randomUUID()

interface Person {
  id: ID;
  name: string;
}

interface Expense {
  id: ID;
  description: string;   // e.g. "Dinner"
  amountCents: number;   // integer cents, > 0
  paidBy: ID;            // who fronted the money
  participants: ID[];    // who shares the cost; default all current member ids
}

interface State {
  people: Person[];
  expenses: Expense[];
}
```

Three choices baked into the types:

- Money is integer cents, never floating-point dollars. The form string is parsed to cents once at the input boundary and stays an integer everywhere after. This keeps the settlement math exact.
- `paidBy` is one person. `participants` is the set who share the cost. Even-split MVP fills `participants` with the selected people, defaulting to all current members. Uneven splits later are a UI change only. The model doesn't move.
- An explicit `participants` list snapshots membership: an expense entered before a new person joins keeps its original split and does not silently re-divide.

Removal rule: a person can be removed only if no expense references them as `paidBy` or participant. If referenced, the confirm dialog says so and asks the user to delete those expenses first. This keeps every id in the model pointing at a real person, without building soft-delete.

### 10. Settlement logic: integer-cents rounding, then a two-stage algorithm

The graded heart of the task.

Rounding, per expense. Shares are never rounded independently. That breaks conservation: $10.00 split three ways, each rounded up, gives $3.34 × 3 = $10.02, money from nowhere. Instead: `base = floor(amountCents / k)` for `k` participants, then `remainder = amountCents - base * k` leftover cents are handed out one each, so shares always sum back to the exact amount. Leftover cents go to non-payers first, so the payer is never made worse off by a rounding cent. $10.00 across three: 334 / 333 / 333 = 1000.

Stage 1: net balances. For each person, `net = (everything they paid) - (their share of everything they participated in)`, in integer cents. Positive means the group owes them, negative means they owe. Every expense's shares sum exactly to its amount, so the nets sum to zero by construction.

Stage 2: who pays whom (greedy). Sort creditors (net > 0) and debtors (net < 0) biggest-first. Match the front of each, transfer the smaller amount, drop whoever hits zero, carry the remainder. Repeat until both lists empty. Each step zeroes at least one person, so at most n−1 transactions. Any complete matching settles everyone (conservation guarantees it), so order affects only the count, not correctness. Biggest-first tends to produce the fewest payments. It is not guaranteed minimal (true minimum is NP-hard), which isn't worth chasing here. The README notes the greedy choice.

Edge cases (also the test list):

1. Three-way dinner: one pays $30 for three; two payments out.
2. Penny split: $10.00 across three → 334 / 333 / 333, payer not charged the extra cent.
3. Already settled: all nets zero → empty transaction list.
4. One person pays for everything: everyone else owes their share to the payer.
5. Single-person group: net zero, no transactions.
6. Removal guard: removing a referenced person is rejected; removing an unreferenced person leaves balances unchanged.
7. Debt chain that simplifies: pairwise debts that net out collapse to fewer direct payments.

### 11. UX: one screen, three stacked regions

A single column: People, Expenses, Summary, top to bottom. No routing, tabs, or multi-page nav: one group with no persistence doesn't need it, and a stacked column reads the same on desktop and mobile.

People: a list of names, each row with edit and remove. Add is one text field plus a button. Remove runs the rule from decision 9.

Expenses: a list of rows showing description, payer, participants, and total, each with edit and delete. Add is a compact form: description, amount in NZ dollars (parsed to integer cents here), single-select "paid by", multi-select "shared by" defaulting to all. The "shared by" control is where the subset-participants choice lives: all-selected is the even-split default, unchecking someone shares the expense among the rest. The row shows payer, participants, and total, not each person's share, which stays in the math.

Summary: two short vertical lists, derived fresh every render, nothing stored. "Where everyone stands" shows each person's net in plain words ("Alice is owed $17.00", "Bob owes $5.50"), owed and owing visually distinct. "Settle up" shows the greedy payment list ("Bob pays Alice $5.50"). The settle-up list is a transaction list, not per-person data, so no columns or per-person tabs. The expense list doubles as the audit trail: "why do I owe that?" is answered by scrolling expenses.

Components: `PeopleList`, `ExpenseList`, and the summary view, all reading and dispatching through the reducer context from decision 6. The add-expense form is the one non-trivial component. The rest are lists.

### 12. Shipping: Node-only runtime, git repo, devcontainer dev-only

Runtime: the only thing a reviewer needs is Node. Run path is plain `npm install && npm run dev`. A Node version is pinned (`.nvmrc` plus `engines`) to Vite's current minimum or above, so a clean-machine install doesn't fail on an unexpected version.

Delivery: a git repo link, not a zip. History and committed skills are the AI-workflow evidence. Ships fresh, no commits or secrets from the original .NET project.

Devcontainer: `.devcontainer/` stays in the repo as evidence for the AI-workflow answer but isn't needed to run the app. The README says in one line that it's the dev environment and the run path is plain npm.
