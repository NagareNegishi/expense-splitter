import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './reducer';
import type { State } from './settlement';

const alice: State['people'][0] = { id: 'alice', name: 'Alice' };
const bob: State['people'][0] = { id: 'bob', name: 'Bob' };

const expense = {
  id: 'e1',
  description: 'Dinner',
  amountCents: 3000,
  paidBy: 'alice',
  participants: ['alice', 'bob'],
};

// ─── ADD_PERSON ──────────────────────────────────────────────────────────────

describe('ADD_PERSON', () => {
  it('appends the person to the list', () => {
    const next = reducer(initialState, { type: 'ADD_PERSON', person: alice });
    expect(next.people).toHaveLength(1);
    expect(next.people[0]).toEqual(alice);
  });

  it('does not mutate the previous state', () => {
    const prev = { ...initialState };
    reducer(prev, { type: 'ADD_PERSON', person: alice });
    expect(prev.people).toHaveLength(0);
  });
});

// ─── EDIT_PERSON ─────────────────────────────────────────────────────────────

describe('EDIT_PERSON', () => {
  const state: State = { people: [alice, bob], expenses: [] };

  it('updates the target name', () => {
    const next = reducer(state, { type: 'EDIT_PERSON', id: 'alice', name: 'Alicia' });
    expect(next.people.find(p => p.id === 'alice')?.name).toBe('Alicia');
  });

  it('leaves other people unchanged', () => {
    const next = reducer(state, { type: 'EDIT_PERSON', id: 'alice', name: 'Alicia' });
    expect(next.people.find(p => p.id === 'bob')).toEqual(bob);
  });
});

// ─── REMOVE_PERSON ───────────────────────────────────────────────────────────

describe('REMOVE_PERSON', () => {
  const state: State = { people: [alice, bob], expenses: [expense] };

  it('removes an unreferenced person', () => {
    // bob is in the expense; alice is payer — add carol as unreferenced
    const carol = { id: 'carol', name: 'Carol' };
    const s: State = { people: [alice, bob, carol], expenses: [expense] };
    const next = reducer(s, { type: 'REMOVE_PERSON', id: 'carol' });
    expect(next.people).toHaveLength(2);
    expect(next.people.find(p => p.id === 'carol')).toBeUndefined();
  });

  it('silently no-ops when the person is referenced as payer', () => {
    const next = reducer(state, { type: 'REMOVE_PERSON', id: 'alice' });
    expect(next.people).toHaveLength(2);
  });

  it('silently no-ops when the person is a participant', () => {
    const next = reducer(state, { type: 'REMOVE_PERSON', id: 'bob' });
    expect(next.people).toHaveLength(2);
  });
});

// ─── ADD_EXPENSE ─────────────────────────────────────────────────────────────

describe('ADD_EXPENSE', () => {
  const state: State = { people: [alice, bob], expenses: [] };

  it('appends the expense', () => {
    const next = reducer(state, { type: 'ADD_EXPENSE', expense });
    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0]).toEqual(expense);
  });

  it('does not mutate the previous state', () => {
    const prev = { ...state, expenses: [] };
    reducer(prev, { type: 'ADD_EXPENSE', expense });
    expect(prev.expenses).toHaveLength(0);
  });
});

// ─── EDIT_EXPENSE ────────────────────────────────────────────────────────────

describe('EDIT_EXPENSE', () => {
  const expense2 = { id: 'e2', description: 'Coffee', amountCents: 500, paidBy: 'bob', participants: ['bob'] };
  const state: State = { people: [alice, bob], expenses: [expense, expense2] };

  it('updates the target expense', () => {
    const updated = { ...expense, amountCents: 5000 };
    const next = reducer(state, { type: 'EDIT_EXPENSE', expense: updated });
    expect(next.expenses.find(e => e.id === 'e1')?.amountCents).toBe(5000);
  });

  it('leaves other expenses unchanged', () => {
    const updated = { ...expense, amountCents: 5000 };
    const next = reducer(state, { type: 'EDIT_EXPENSE', expense: updated });
    expect(next.expenses.find(e => e.id === 'e2')).toEqual(expense2);
  });
});

// ─── DELETE_EXPENSE ──────────────────────────────────────────────────────────

describe('DELETE_EXPENSE', () => {
  const expense2 = { id: 'e2', description: 'Coffee', amountCents: 500, paidBy: 'bob', participants: ['bob'] };
  const state: State = { people: [alice, bob], expenses: [expense, expense2] };

  it('removes the target expense', () => {
    const next = reducer(state, { type: 'DELETE_EXPENSE', id: 'e1' });
    expect(next.expenses.find(e => e.id === 'e1')).toBeUndefined();
  });

  it('leaves other expenses in place', () => {
    const next = reducer(state, { type: 'DELETE_EXPENSE', id: 'e1' });
    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0]).toEqual(expense2);
  });
});
