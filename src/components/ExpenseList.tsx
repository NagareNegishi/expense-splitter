import { useEffect, useState } from 'react'
import { useAppContext } from '../lib/context'
import type { Expense, Person } from '../lib/settlement'

/** Format integer cents as a dollar string, e.g. 3050 → "$30.50". */
function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function filterAmount(value: string): string {
  const stripped = value.replace(/[^0-9.]/g, '')
  const parts = stripped.split('.')
  // Allow only one decimal point, capped at 2 places — parseDollars rounds to cents anyway,
  // but allowing "10.999" would show a value that differs from what actually gets stored.
  return parts.length > 1 ? parts[0] + '.' + parts[1].slice(0, 2) : stripped
}

function filterDescription(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s.,'\-!?&()/#:]/g, '')
}

/**
 * Parse a dollar-string input to integer cents.
 * Returns null if the value is missing, non-numeric, or not positive.
 * Rounding via Math.round handles inputs like "10.005".
 */
function parseDollars(value: string): number | null {
  const n = parseFloat(value)
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 100)
}

interface FormState {
  description: string
  amount: string        // raw dollar string; converted to cents only on submit
  paidBy: string        // person id
  participants: Set<string>
}

function makeEmptyForm(defaultPaidBy: string, allIds: string[]): FormState {
  return {
    description: '',
    amount: '',
    paidBy: defaultPaidBy,
    // Default to all current members per §9
    participants: new Set(allIds),
  }
}

function expenseToForm(expense: Expense): FormState {
  return {
    description: expense.description,
    amount: (expense.amountCents / 100).toFixed(2),
    paidBy: expense.paidBy,
    participants: new Set(expense.participants),
  }
}

interface ExpenseFormProps {
  people: Person[]
  initial: FormState
  submitLabel: string
  onSubmit: (form: FormState) => void
  onCancel?: () => void
}

/** Shared form used for both adding and editing expenses. */
function ExpenseForm({ people, initial, submitLabel, onSubmit, onCancel }: ExpenseFormProps) {
  const [form, setForm] = useState<FormState>(initial)

  // Sync the form whenever the people list changes:
  // - auto-select any newly added person as a participant
  // - reset paidBy to the first person if the current payer was removed
  useEffect(() => {
    setForm(f => {
      const currentIds = new Set(people.map(p => p.id))

      const next = new Set(f.participants)
      let changed = false
      for (const p of people) {
        if (!next.has(p.id)) {
          next.add(p.id)
          changed = true
        }
      }

      const paidBy = currentIds.has(f.paidBy) ? f.paidBy : (people[0]?.id ?? '')
      if (paidBy !== f.paidBy) changed = true

      return changed ? { ...f, participants: next, paidBy } : f
    })
  }, [people])

  const amountValid = parseDollars(form.amount) !== null

  // Count only participants still in the current people list. Stale IDs from
  // removed people are cleaned up in handleSubmit, but using form.participants.size
  // directly would keep the button enabled even when no real participant is checked.
  const currentPeopleIds = new Set(people.map(p => p.id))
  const validParticipantCount = [...form.participants].filter(id => currentPeopleIds.has(id)).length

  const canSubmit =
    form.description.trim() !== '' &&
    amountValid &&
    form.paidBy !== '' &&
    validParticipantCount > 0

  function toggleParticipant(id: string) {
    setForm(f => {
      const next = new Set(f.participants)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...f, participants: next }
    })
  }

  function handleSubmit() {
    if (!canSubmit) return
    // Filter stale ids in case a person was removed while the form was open
    const validIds = new Set(people.map(p => p.id))
    onSubmit({ ...form, participants: new Set([...form.participants].filter(id => validIds.has(id))) })
  }

  // label style: uppercase micro-text matching the mockup section headers
  const labelClass = 'mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-muted'
  const inputClass =
    'w-full rounded-[9px] border border-line px-[11px] py-[9px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent'

  return (
    <div>
      <div className="mb-[10px]">
        <label className={labelClass}>Description</label>
        <input
          className={inputClass}
          placeholder="e.g. Dinner"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: filterDescription(e.target.value) }))}
        />
      </div>

      <div className="mb-[10px] grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Amount (NZ$)</label>
          <input
            className={inputClass}
            placeholder="0.00"
            inputMode="decimal"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: filterAmount(e.target.value) }))}
          />
        </div>
        <div>
          <label className={labelClass}>Paid by</label>
          <select
            className={inputClass}
            value={form.paidBy}
            onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}
          >
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-[10px]">
        <label className={labelClass}>Shared by</label>
        <div className="flex flex-wrap gap-2">
          {people.map(p => (
            // chip.on style: purple tint when checked, matches mockup palette
            <label
              key={p.id}
              className={`inline-flex cursor-pointer items-center gap-[6px] rounded-full border px-[11px] py-[5px] text-[0.85rem] ${
                form.participants.has(p.id)
                  ? 'border-[#c9c3f3] bg-[#efeefb]'
                  : 'border-line bg-[#fafafa]'
              }`}
            >
              <input
                type="checkbox"
                // accent-accent tints the native checkbox with the brand purple
                className="accent-accent"
                checked={form.participants.has(p.id)}
                onChange={() => toggleParticipant(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-[9px] bg-accent py-[9px] font-semibold text-white hover:brightness-105 disabled:opacity-40"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            className="rounded-[9px] border border-line px-4 py-[9px] text-sm text-muted hover:bg-[#f0f0f0]"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

/** Expense list with inline edit and the add-expense form at the bottom. */
export function ExpenseList() {
  const { state, dispatch } = useAppContext()
  const [editingId, setEditingId] = useState<string | null>(null)
  // Incrementing this key forces the add form to remount (and reset) after each successful add
  const [addFormKey, setAddFormKey] = useState(0)

  const allIds = state.people.map(p => p.id)
  const defaultPaidBy = allIds[0] ?? ''

  function nameOf(id: string): string {
    return state.people.find(p => p.id === id)?.name ?? '?'
  }

  function addExpense(form: FormState) {
    dispatch({
      type: 'ADD_EXPENSE',
      expense: {
        id: crypto.randomUUID(),
        description: form.description.trim(),
        amountCents: parseDollars(form.amount)!,
        paidBy: form.paidBy,
        participants: [...form.participants],
      },
    })
    setAddFormKey(k => k + 1)
  }

  function saveExpense(id: string, form: FormState) {
    dispatch({
      type: 'EDIT_EXPENSE',
      expense: {
        id,
        description: form.description.trim(),
        amountCents: parseDollars(form.amount)!,
        paidBy: form.paidBy,
        participants: [...form.participants],
      },
    })
    setEditingId(null)
  }

  return (
    <section className="mb-[18px] rounded-[14px] border border-line bg-white p-4">
      <h2 className="mb-3 mt-0 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-muted">
        Expenses
      </h2>

      {state.expenses.map((expense, i) => {
        const isLast = i === state.expenses.length - 1
        const isEditing = editingId === expense.id

        return (
          // key on the outer wrapper so React tracks rows by id, not index
          <div key={expense.id}>
            <div
              // Show border-b unless it's the last row without an inline edit form below it
              className={`flex items-center gap-[10px] py-[9px] ${
                !isLast || isEditing ? 'border-b border-line' : ''
              }`}
            >
              {/* min-w-0: prevents the description/sub-line from overflowing its flex cell */}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">{expense.description}</div>
                {/* Sub-line format: "Alice paid · split Alice, Bob, Carol" */}
                <div className="truncate text-[0.8rem] text-muted">
                  {nameOf(expense.paidBy)} paid · split{' '}
                  {expense.participants.map(id => nameOf(id)).join(', ')}
                </div>
              </div>
              <div className="font-semibold tabular-nums text-ink">
                {centsToDisplay(expense.amountCents)}
              </div>
              <button
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-line bg-[#fafafa] text-[0.85rem] text-muted hover:bg-[#f0f0f0]"
                title="Edit"
                onClick={() => setEditingId(isEditing ? null : expense.id)}
              >
                ✎
              </button>
              <button
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-line bg-[#fafafa] text-[0.85rem] text-muted hover:bg-[#f0f0f0]"
                title="Delete"
                onClick={() => {
                  if (editingId === expense.id) setEditingId(null)
                  dispatch({ type: 'DELETE_EXPENSE', id: expense.id })
                }}
              >
                ✕
              </button>
            </div>

            {isEditing && (
              <div className="py-3">
                <ExpenseForm
                  people={state.people}
                  initial={expenseToForm(expense)}
                  submitLabel="Save changes"
                  onSubmit={form => saveExpense(expense.id, form)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Add form: shown only when there are people to pick from */}
      {state.people.length > 0 ? (
        <div className="mt-[14px] border-t border-line pt-[14px]">
          <ExpenseForm
            key={addFormKey}
            people={state.people}
            initial={makeEmptyForm(defaultPaidBy, allIds)}
            submitLabel="Add expense"
            onSubmit={addExpense}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Add some people first.</p>
      )}
    </section>
  )
}
