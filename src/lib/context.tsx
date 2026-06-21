import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { reducer, initialState, type Action } from './reducer';
import type { State } from './settlement';

interface AppContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
}

// Null default is intentional — useAppContext throws if consumed outside the provider.
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // React 19 context syntax: <Context value={...}> instead of <Context.Provider value={...}>
  return <AppContext value={{ state, dispatch }}>{children}</AppContext>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
