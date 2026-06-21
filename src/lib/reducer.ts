import type { State, Person, Expense, ID } from './settlement';

// All the things a user can do. Add a variant here and TypeScript will force you to handle it in the reducer.
export type Action =
  | { type: 'ADD_PERSON'; person: Person }
  | { type: 'EDIT_PERSON'; id: ID; name: string }
  | { type: 'REMOVE_PERSON'; id: ID }
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'EDIT_EXPENSE'; expense: Expense }
  | { type: 'DELETE_EXPENSE'; id: ID };

export const initialState: State = { people: [], expenses: [] };

// Lives at module level, not inside a component, so it's a stable reference and testable without React.
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_PERSON': {
      return { ...state, people: [...state.people, action.person] };
    }
    case 'EDIT_PERSON': {
      return {
        ...state,
        people: state.people.map(p =>
          p.id === action.id ? { ...p, name: action.name } : p
        ),
      };
    }
    case 'REMOVE_PERSON': {
      return { ...state, people: state.people.filter(p => p.id !== action.id) };
    }
    case 'ADD_EXPENSE': {
      return { ...state, expenses: [...state.expenses, action.expense] };
    }
    case 'EDIT_EXPENSE': {
      return {
        ...state,
        expenses: state.expenses.map(e =>
          e.id === action.expense.id ? action.expense : e
        ),
      };
    }
    case 'DELETE_EXPENSE': {
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) };
    }
    default: {
      // Exhaustiveness check — if you add a new Action variant and forget a case, this line becomes a type error.
      const _: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(_)}`);
    }
  }
}
