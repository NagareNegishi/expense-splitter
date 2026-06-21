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
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  // null = no dialog; set to the person's id to show the "can't remove" modal
  const [blockedId, setBlockedId] = useState<string | null>(null)

  function addPerson() {
    const name = capitalize(newName.trim())
    if (!name) return
    if (state.people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setAddError(`${name} is already in the group — try adding a last name or nickname.`)
      return
    }
    dispatch({ type: 'ADD_PERSON', person: { id: crypto.randomUUID(), name } })
    setNewName('')
    setAddError(null)
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setEditName(person.name)
    setEditError(null)
  }

  function commitEdit(id: string) {
    const name = capitalize(editName.trim())
    if (!name) {
      setEditingId(null)
      return
    }
    if (state.people.some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
      setEditError(`${name} is already in the group — try a last name or nickname.`)
      return
    }
    dispatch({ type: 'EDIT_PERSON', id, name })
    setEditingId(null)
    setEditError(null)
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
      <section className="mb-4 rounded-[14px] border border-line bg-white p-5">
        {/* uppercase tracking-[0.08em]: section label style from mockup */}
        <h2 className="mb-3 mt-0 border-l-[3px] border-accent pl-3 text-[0.9rem] font-semibold text-ink">
          People
        </h2>

        {state.people.map((person, i) => (
          <div
            key={person.id}
            // Omit bottom border on the last row so it doesn't double up with the add-field's top margin
            // items-start when editing so the buttons stay at the top if an error message extends the row
            className={`flex gap-[10px] py-[9px] ${editingId === person.id ? 'items-start' : 'items-center'} ${
              i < state.people.length - 1 ? 'border-b border-line' : ''
            }`}
          >
            {/* min-w-0: flex children won't shrink below content width without this */}
            <div className="min-w-0 flex-1">
              {editingId === person.id ? (
                <>
                  <input
                    className="w-full rounded-[9px] border border-line px-[11px] py-[7px] text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    value={editName}
                    onChange={e => { setEditName(filterName(e.target.value)); setEditError(null) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(person.id)
                      if (e.key === 'Escape') { setEditingId(null); setEditError(null) }
                    }}
                    autoFocus
                  />
                  {editError && (
                    <p className="mt-[6px] text-[0.8rem] text-owes">{editError}</p>
                  )}
                </>
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
                  onClick={() => { setEditingId(null); setEditError(null) }}
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

        <div className="mt-3 flex flex-col gap-2">
          <input
            className="w-full rounded-[9px] border border-line px-[11px] py-[9px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="New member's name…"
            value={newName}
            onChange={e => { setNewName(filterName(e.target.value)); setAddError(null) }}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
          />
          {addError && (
            <p className="m-0 text-[0.8rem] text-owes">{addError}</p>
          )}
          <button
            className="w-full rounded-[9px] bg-accent py-[9px] font-semibold text-white hover:brightness-105"
            onClick={addPerson}
          >
            Add member
          </button>
        </div>
      </section>

      {/* Modal: rendered outside the card so it can cover the full viewport */}
      {blockedId && blockedPerson && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-lg">
            <h3 className="mb-2 mt-0 font-semibold text-ink">
              Can't remove {blockedPerson.name} yet
            </h3>
            <p className="mb-4 text-sm text-muted">
              {blockedPerson.name} is linked to one or more expenses. Remove those
              expenses first, then you can remove {blockedPerson.name}.
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
