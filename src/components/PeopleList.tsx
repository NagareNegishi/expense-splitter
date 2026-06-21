import { useState } from 'react'
import { useAppContext } from '../lib/context'
import { canRemovePerson } from '../lib/settlement'
import type { Person } from '../lib/settlement'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function filterName(value: string): string {
  return value.replace(/[^a-zA-Z\s\-']/g, '')
}

/** People section: add, edit, and remove group members with a referential-integrity guard. */
export function PeopleList() {
  const { state, dispatch } = useAppContext()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  // null = no dialog; set to the person's id to show the "can't remove" modal
  const [blockedId, setBlockedId] = useState<string | null>(null)

  function addPerson() {
    const name = capitalize(newName.trim())
    if (!name) return
    dispatch({ type: 'ADD_PERSON', person: { id: crypto.randomUUID(), name } })
    setNewName('')
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setEditName(person.name)
  }

  function commitEdit(id: string) {
    const name = capitalize(editName.trim())
    if (name) dispatch({ type: 'EDIT_PERSON', id, name })
    setEditingId(null)
  }

  function tryRemove(id: string) {
    // Block removal if any expense references this person as payer or participant.
    // Show a dialog instead of silently refusing so the user knows what to fix.
    if (!canRemovePerson(state, id)) {
      setBlockedId(id)
      return
    }
    dispatch({ type: 'REMOVE_PERSON', id })
  }

  const blockedPerson = state.people.find(p => p.id === blockedId)

  return (
    <>
      {/* rounded-[14px]: matches the --radius token from the layout mockup */}
      <section className="mb-[18px] rounded-[14px] border border-line bg-white p-4">
        {/* uppercase tracking-[0.08em]: section label style from mockup */}
        <h2 className="mb-3 mt-0 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-muted">
          People
        </h2>

        {state.people.map((person, i) => (
          <div
            key={person.id}
            // Omit bottom border on the last row so it doesn't double up with the add-field's top margin
            className={`flex items-center gap-[10px] py-[9px] ${
              i < state.people.length - 1 ? 'border-b border-line' : ''
            }`}
          >
            {/* min-w-0: flex children won't shrink below content width without this */}
            <div className="min-w-0 flex-1">
              {editingId === person.id ? (
                <input
                  className="w-full rounded-[9px] border border-line px-[11px] py-[7px] text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  value={editName}
                  onChange={e => setEditName(filterName(e.target.value))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(person.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                />
              ) : (
                <div className="font-medium text-ink">{person.name}</div>
              )}
            </div>

            {editingId === person.id ? (
              <div className="flex gap-2">
                <button
                  className="rounded-[8px] border border-line bg-[#fafafa] px-3 py-1 text-sm text-muted hover:bg-[#f0f0f0]"
                  onClick={() => commitEdit(person.id)}
                >
                  Save
                </button>
                <button
                  className="rounded-[8px] border border-line bg-[#fafafa] px-3 py-1 text-sm text-muted hover:bg-[#f0f0f0]"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-line bg-[#fafafa] text-[0.85rem] text-muted hover:bg-[#f0f0f0]"
                  title="Edit"
                  onClick={() => startEdit(person)}
                >
                  ✎
                </button>
                <button
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-line bg-[#fafafa] text-[0.85rem] text-muted hover:bg-[#f0f0f0]"
                  title="Remove"
                  onClick={() => tryRemove(person.id)}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ))}

        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-[9px] border border-line px-[11px] py-[9px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Add a person…"
            value={newName}
            onChange={e => setNewName(filterName(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
          />
          <button
            className="whitespace-nowrap rounded-[9px] bg-accent px-4 py-[9px] font-semibold text-white hover:brightness-105"
            onClick={addPerson}
          >
            Add
          </button>
        </div>
      </section>

      {/* Modal: rendered outside the card so it can cover the full viewport */}
      {blockedId && blockedPerson && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-lg">
            <h3 className="mb-2 mt-0 font-semibold text-ink">
              Can't remove {blockedPerson.name}
            </h3>
            <p className="mb-4 text-sm text-muted">
              {blockedPerson.name} is referenced in one or more expenses. Delete those
              expenses first, then remove this person.
            </p>
            <button
              className="w-full rounded-[9px] bg-accent py-[9px] font-semibold text-white hover:brightness-105"
              onClick={() => setBlockedId(null)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
