import { useEffect, useState } from 'react'
import { AppProvider } from './lib/context'
import { useAppContext } from './lib/context'
import { PeopleList } from './components/PeopleList'
import { ExpenseList } from './components/ExpenseList'
import { Summary } from './components/Summary'

function AppContent() {
  const { state } = useAppContext()
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(
    () => new Set(state.expenses.map(e => e.id))
  )

  // Auto-select newly added expenses; drop IDs for deleted ones
  useEffect(() => {
    const currentIds = new Set(state.expenses.map(e => e.id))
    setSelectedExpenseIds(prev => {
      const next = new Set([...prev].filter(id => currentIds.has(id)))
      for (const id of currentIds) {
        if (!prev.has(id)) next.add(id)
      }
      return next
    })
  }, [state.expenses])

  function toggleExpense(id: string) {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setAll(checked: boolean) {
    setSelectedExpenseIds(checked ? new Set(state.expenses.map(e => e.id)) : new Set())
  }

  return (
    <>
      <PeopleList />
      <ExpenseList
        selectedExpenseIds={selectedExpenseIds}
        onToggleExpense={toggleExpense}
        onSetAll={setAll}
      />
      <Summary selectedExpenseIds={selectedExpenseIds} />
    </>
  )
}

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen px-4 pb-16 pt-6">
        <div className="mx-auto max-w-[560px]">
          <header className="mb-4 rounded-[14px] border border-line bg-white p-5 text-center">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-ink">
              Expense Splitter
            </h1>
            <div className="mx-auto mt-2 h-[3px] w-12 rounded-full bg-accent" />
            <p className="m-0 mt-2 text-sm text-muted">
              Record shared expenses, see who owes whom.
            </p>
          </header>
          <AppContent />
        </div>
      </div>
    </AppProvider>
  )
}

export default App
