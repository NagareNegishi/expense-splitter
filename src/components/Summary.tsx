import { useAppContext } from '../lib/context'
import { computeNetBalances, computeTransactions } from '../lib/settlement'

/** Format integer cents as a dollar string, e.g. 550 → "$5.50". */
function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface SummaryProps {
  selectedExpenseIds: Set<string>
}

/**
 * Summary section: shows each person's net balance and the greedy settle-up list.
 * Both are derived fresh every render — nothing is stored in state.
 */
export function Summary({ selectedExpenseIds }: SummaryProps) {
  const { state } = useAppContext()

  const filteredState = {
    ...state,
    expenses: state.expenses.filter(e => selectedExpenseIds.has(e.id)),
  }

  // Derive balances and transactions on every render; no stale state to manage
  const balances = computeNetBalances(filteredState)
  const transactions = computeTransactions(balances)

  const selectedCount = filteredState.expenses.length
  const totalCount = state.expenses.length
  const isFiltered = selectedCount < totalCount

  function nameOf(id: string): string {
    return state.people.find(p => p.id === id)?.name ?? '?'
  }

  if (state.people.length === 0) {
    return (
      <section className="rounded-[14px] border border-line bg-white p-5">
        <h2 className="mb-3 mt-0 border-l-[3px] border-accent pl-3 text-[0.9rem] font-semibold text-ink">
          Summary
        </h2>
        <p className="text-sm text-muted">Add some people and expenses to see who owes what.</p>
      </section>
    )
  }

  return (
    <section className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
        <h2 className="m-0 text-[0.9rem] font-semibold text-ink">Summary</h2>
        {isFiltered && (
          <span className="text-[0.75rem] text-muted">
            {selectedCount} of {totalCount} expenses
          </span>
        )}
      </div>

      {/* Block 1: per-person net balance */}
      <div>
        <h3 className="mb-2 mt-0 mb-2 mt-0 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted">
          Where everyone stands
        </h3>
        {state.people.map(person => {
          const net = balances.get(person.id) ?? 0
          return (
            // tabular-nums: aligns dollar amounts in a column even with different widths
            <div key={person.id} className="flex justify-between py-[6px] tabular-nums">
              <span className="text-ink">{person.name}</span>
              {net > 0 ? (
                // text-owed: green (#137a4f) — person is in credit
                <span className="font-semibold text-owed">is owed {centsToDisplay(net)}</span>
              ) : net < 0 ? (
                // text-owes: red (#b03636) — person is in debt
                <span className="font-semibold text-owes">owes {centsToDisplay(-net)}</span>
              ) : (
                <span className="text-muted">settled up</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Block 2: greedy transaction list (at most n−1 transfers) */}
      <div className="mt-4 border-t border-line pt-[14px]">
        <h3 className="mb-2 mt-0 mb-2 mt-0 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted">Settle up</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">Everyone is settled up.</p>
        ) : (
          transactions.map((t, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 py-[9px] tabular-nums ${
                i < transactions.length - 1 ? 'border-b border-line' : ''
              }`}
            >
              <span className="flex-1 text-ink">
                {nameOf(t.from)}{' '}
                {/* text-accent arrow matches the mockup's purple directional indicator */}
                <span className="font-bold text-accent">→</span>{' '}
                {nameOf(t.to)}
              </span>
              <span className="font-semibold text-ink">{centsToDisplay(t.amountCents)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
