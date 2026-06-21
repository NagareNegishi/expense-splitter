import { AppProvider } from './lib/context'
import { PeopleList } from './components/PeopleList'
import { ExpenseList } from './components/ExpenseList'
import { Summary } from './components/Summary'

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen px-4 pb-16 pt-6">
        <div className="mx-auto max-w-[560px]">
          <header className="mb-6">
            <h1 className="m-0 text-[1.35rem] font-semibold tracking-tight text-ink">
              Expense Splitter
            </h1>
            <p className="m-0 mt-1 text-sm text-muted">
              Record shared expenses, see who owes whom.
            </p>
          </header>
          <PeopleList />
          <ExpenseList />
          <Summary />
        </div>
      </div>
    </AppProvider>
  )
}

export default App
