export type ID = string;

export interface Person {
  id: ID;
  name: string;
}

export interface Expense {
  id: ID;
  description: string;
  /** Integer cents, > 0 */
  amountCents: number;
  paidBy: ID;
  participants: ID[];
}

export interface State {
  people: Person[];
  expenses: Expense[];
}

export interface Transaction {
  from: ID;
  to: ID;
  amountCents: number;
}

/**
 * Compute each participant's share for one expense using largest-remainder rounding.
 * Extra cents go to non-payers first so the payer is never charged the rounding surplus.
 */
export function computeShares(expense: Expense): Map<ID, number> {
  const { amountCents, paidBy, participants } = expense;
  const k = participants.length;
  if (k === 0) return new Map();

  const base = Math.floor(amountCents / k);
  let remainder = amountCents - base * k;

  const shares = new Map<ID, number>();

  // Non-payers absorb extra cents first
  for (const id of participants) {
    if (id !== paidBy) {
      shares.set(id, remainder > 0 ? base + 1 : base);
      if (remainder > 0) remainder--;
    }
  }

  // Payer only gets an extra cent if remainder survives the non-payers
  if (participants.includes(paidBy)) {
    shares.set(paidBy, remainder > 0 ? base + 1 : base);
  }

  return shares;
}

/**
 * Compute net balance in cents for every person in the state.
 * Positive = the group owes them; negative = they owe the group.
 */
export function computeNetBalances(state: State): Map<ID, number> {
  const balances = new Map<ID, number>(state.people.map(p => [p.id, 0]));

  for (const expense of state.expenses) {
    const shares = computeShares(expense);

    balances.set(expense.paidBy, (balances.get(expense.paidBy) ?? 0) + expense.amountCents);

    for (const [id, share] of shares) {
      balances.set(id, (balances.get(id) ?? 0) - share);
    }
  }

  return balances;
}

/**
 * Produce a greedy settle-up list from a net-balance map.
 * Matches largest creditor vs largest debtor each step; at most n−1 transactions.
 */
export function computeTransactions(balances: Map<ID, number>): Transaction[] {
  const creditors: { id: ID; amount: number }[] = [];
  const debtors: { id: ID; amount: number }[] = [];

  for (const [id, net] of balances) {
    if (net > 0) creditors.push({ id, amount: net });
    else if (net < 0) debtors.push({ id, amount: -net });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, debt.amount);

    transactions.push({ from: debt.id, to: credit.id, amountCents: amount });

    credit.amount -= amount;
    debt.amount -= amount;

    if (credit.amount === 0) ci++;
    if (debt.amount === 0) di++;
  }

  return transactions;
}

/**
 * Returns true if the person can be safely removed.
 * A person is referenced if they appear as paidBy or in participants in any expense.
 */
export function canRemovePerson(state: State, id: ID): boolean {
  return !state.expenses.some(e => e.paidBy === id || e.participants.includes(id));
}
