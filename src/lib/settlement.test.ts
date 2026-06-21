import { describe, it, expect } from 'vitest';
import {
  computeShares,
  computeNetBalances,
  computeTransactions,
  canRemovePerson,
  type State,
} from './settlement';

// Stable IDs used across all fixtures
const alice = 'alice';
const bob = 'bob';
const carol = 'carol';

function people(...ids: string[]) {
  return ids.map(id => ({ id, name: id[0].toUpperCase() + id.slice(1) }));
}

// ─── 1. Three-way dinner ────────────────────────────────────────────────────

describe('three-way dinner', () => {
  // Alice pays $30 for all three; Bob and Carol each owe $10 back.
  const state: State = {
    people: people(alice, bob, carol),
    expenses: [
      { id: 'e1', description: 'Dinner', amountCents: 3000, paidBy: alice, participants: [alice, bob, carol] },
    ],
  };

  it('produces two outgoing payments', () => {
    const txs = computeTransactions(computeNetBalances(state));
    expect(txs).toHaveLength(2);
  });

  it('bob and carol each pay alice 1000 cents', () => {
    const txs = computeTransactions(computeNetBalances(state));
    const sorted = [...txs].sort((a, b) => a.from.localeCompare(b.from));
    expect(sorted[0]).toEqual({ from: bob, to: alice, amountCents: 1000 });
    expect(sorted[1]).toEqual({ from: carol, to: alice, amountCents: 1000 });
  });
});

// ─── 2. Penny split ─────────────────────────────────────────────────────────

describe('penny split', () => {
  // $10.00 across three: 1000 / 3 = 333 remainder 1.
  // Extra cent goes to a non-payer; payer's share is 333.
  const expense = {
    id: 'e1',
    description: 'Coffee',
    amountCents: 1000,
    paidBy: alice,
    participants: [alice, bob, carol],
  };

  it('shares sum exactly to the expense amount', () => {
    const shares = computeShares(expense);
    const total = [...shares.values()].reduce((s, v) => s + v, 0);
    expect(total).toBe(1000);
  });

  it('payer is not charged the extra cent', () => {
    const shares = computeShares(expense);
    // Base is 333; payer must not get 334
    expect(shares.get(alice)).toBe(333);
  });

  it('extra cent lands on a non-payer', () => {
    const shares = computeShares(expense);
    const nonPayerShares = [shares.get(bob)!, shares.get(carol)!];
    expect(nonPayerShares).toContain(334);
    expect(nonPayerShares.reduce((s, v) => s + v, 0)).toBe(667);
  });
});

// ─── 3. Already settled ─────────────────────────────────────────────────────

describe('already settled', () => {
  it('returns empty transactions when all nets are zero', () => {
    // Alice and Bob split two equal bills they each paid.
    const state: State = {
      people: people(alice, bob),
      expenses: [
        { id: 'e1', description: 'Lunch', amountCents: 2000, paidBy: alice, participants: [alice, bob] },
        { id: 'e2', description: 'Dinner', amountCents: 2000, paidBy: bob, participants: [alice, bob] },
      ],
    };
    const txs = computeTransactions(computeNetBalances(state));
    expect(txs).toHaveLength(0);
  });

  it('returns empty transactions for a group with no expenses', () => {
    const state: State = { people: people(alice, bob), expenses: [] };
    expect(computeTransactions(computeNetBalances(state))).toHaveLength(0);
  });
});

// ─── 4. One person pays for everything ──────────────────────────────────────

describe('one person pays for everything', () => {
  // Alice pays $30 only for Bob and Carol (not herself).
  const state: State = {
    people: people(alice, bob, carol),
    expenses: [
      { id: 'e1', description: 'Supplies', amountCents: 3000, paidBy: alice, participants: [bob, carol] },
    ],
  };

  it('alice is owed the full amount', () => {
    const balances = computeNetBalances(state);
    expect(balances.get(alice)).toBe(3000);
  });

  it('bob and carol each owe half', () => {
    const balances = computeNetBalances(state);
    expect(balances.get(bob)).toBe(-1500);
    expect(balances.get(carol)).toBe(-1500);
  });

  it('produces exactly two transactions back to alice', () => {
    const txs = computeTransactions(computeNetBalances(state));
    expect(txs).toHaveLength(2);
    expect(txs.every(t => t.to === alice)).toBe(true);
  });
});

// ─── 5. Single-person group ─────────────────────────────────────────────────

describe('single-person group', () => {
  it('net is zero and no transactions are produced', () => {
    const state: State = {
      people: people(alice),
      expenses: [
        { id: 'e1', description: 'Solo lunch', amountCents: 1500, paidBy: alice, participants: [alice] },
      ],
    };
    const balances = computeNetBalances(state);
    expect(balances.get(alice)).toBe(0);
    expect(computeTransactions(balances)).toHaveLength(0);
  });
});

// ─── 6. Removal guard ───────────────────────────────────────────────────────

describe('removal guard', () => {
  const state: State = {
    people: people(alice, bob, carol),
    expenses: [
      { id: 'e1', description: 'Lunch', amountCents: 2000, paidBy: alice, participants: [alice, bob] },
    ],
  };

  it('rejects removing the payer', () => {
    expect(canRemovePerson(state, alice)).toBe(false);
  });

  it('rejects removing a participant', () => {
    expect(canRemovePerson(state, bob)).toBe(false);
  });

  it('allows removing an unreferenced person', () => {
    expect(canRemovePerson(state, carol)).toBe(true);
  });

  it('removing the unreferenced person leaves other balances unchanged', () => {
    const withCarol = computeNetBalances(state);
    const withoutCarol = computeNetBalances({
      people: people(alice, bob),
      expenses: state.expenses,
    });
    expect(withoutCarol.get(alice)).toBe(withCarol.get(alice));
    expect(withoutCarol.get(bob)).toBe(withCarol.get(bob));
  });
});

// ─── 7. Debt chain collapses ────────────────────────────────────────────────

describe('debt chain', () => {
  // Bob paid $10 for Bob+Alice → Alice owes Bob $5.
  // Carol paid $10 for Carol+Bob → Bob owes Carol $5.
  // Bob nets to zero; the chain collapses to one payment: Alice → Carol.
  const state: State = {
    people: people(alice, bob, carol),
    expenses: [
      { id: 'e1', description: 'Coffee', amountCents: 1000, paidBy: bob, participants: [bob, alice] },
      { id: 'e2', description: 'Tea', amountCents: 1000, paidBy: carol, participants: [carol, bob] },
    ],
  };

  it('bob nets to zero', () => {
    expect(computeNetBalances(state).get(bob)).toBe(0);
  });

  it('collapses to one transaction', () => {
    const txs = computeTransactions(computeNetBalances(state));
    expect(txs).toHaveLength(1);
  });

  it('alice pays carol directly', () => {
    const txs = computeTransactions(computeNetBalances(state));
    expect(txs[0]).toEqual({ from: alice, to: carol, amountCents: 500 });
  });
});
