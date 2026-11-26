import { normalizeRecoveryPlan } from '../utils/aiOutputAdapters.js'
import { useEffect, useMemo, useState } from 'react'

function InformationList({ title, items, emptyText = 'Not specified' }) {
  return (
    <section className="rounded-xl border border-line p-4">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted">{emptyText}</p>
      )}
    </section>
  )
}

const adherenceStatusLabels = {
  unreported: 'Not reported',
  completed: 'Completed',
  not_completed: 'Not completed',
  need_help: 'Need help',
  not_applicable: 'Not applicable',
}

function RecoveryAdherenceChecklist({ items, dataMode, readOnly, onUpdateAdherence }) {
  const [drafts, setDrafts] = useState({})
  const [savingItemId, setSavingItemId] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setDrafts(Object.fromEntries(items.map((item) => [
      item.item_id,
      { status: item.status, patient_note: item.patient_note ?? '' },
    ])))
  }, [items])

  const updateDraft = (itemId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], [field]: value },
    }))
  }

  const save = async (item) => {
    const draft = drafts[item.item_id]
    if (
      !draft ||
      savingItemId !== null ||
      dataMode !== 'live' ||
      readOnly ||
      !onUpdateAdherence
    ) return

    setSavingItemId(item.item_id)
    setErrors((current) => ({ ...current, [item.item_id]: '' }))
    try {
      await onUpdateAdherence(item.item_id, {
        status: draft.status,
        patient_note: draft.patient_note.trim() ? draft.patient_note : null,
      })
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [item.item_id]: error instanceof Error ? error.message : 'Could not save this report.',
      }))
    } finally {
      setSavingItemId(null)
    }
  }

  if (items.length === 0) {
    return <InformationList items={[]} title="Recovery instructions" />
  }

  return (
    <section aria-label="Recovery instruction adherence">
      <h3 className="text-sm font-semibold text-navy">Recovery instructions</h3>
      {readOnly ? (
        <p className="mt-2 rounded-lg bg-canvas p-3 text-sm text-muted">
          Patient-reported adherence is shown read-only in the doctor dashboard.
        </p>
      ) : dataMode === 'demo' ? (
        <p className="mt-2 rounded-lg bg-canvas p-3 text-sm text-muted">
          Adherence reports are saved for live patient plans only. This demo checklist is read-only.
        </p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const draft = drafts[item.item_id] ?? {
            status: item.status,
            patient_note: item.patient_note ?? '',
          }
          const isSaving = savingItemId === item.item_id
          return (
            <li className="rounded-xl border border-line p-4" key={item.item_id}>
              <p className="text-sm leading-6 text-navy">{item.instruction}</p>
              <p className="mt-2 text-xs font-medium text-muted">
                Reported status: {adherenceStatusLabels[item.status] ?? 'Not reported'}
                {item.reported_at ? ` · ${new Date(item.reported_at).toLocaleString()}` : ''}
              </p>
              {item.patient_note ? (
                <p className="mt-2 text-sm text-muted">Patient note: {item.patient_note}</p>
              ) : null}
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <label className="block text-xs font-semibold text-navy">
                  Patient-reported status
                  <select
                    className="mt-1 block min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
                    disabled={dataMode !== 'live' || readOnly || savingItemId !== null}
                    onChange={(event) => updateDraft(item.item_id, 'status', event.target.value)}
                    value={draft.status}
                  >
                    {Object.entries(adherenceStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-navy">
                  Optional note
                  <input
                    className="mt-1 block min-h-10 w-full rounded-lg border border-line px-3 text-sm font-normal"
                    disabled={dataMode !== 'live' || readOnly || savingItemId !== null}
                    onChange={(event) => updateDraft(item.item_id, 'patient_note', event.target.value)}
                    value={draft.patient_note}
                  />
                </label>
                <button
                  className="min-h-10 rounded-full bg-teal px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={dataMode !== 'live' || readOnly || savingItemId !== null}
                  onClick={() => save(item)}
                  type="button"
                >
                  {isSaving ? 'Saving…' : 'Save report'}
                </button>
              </div>
              {errors[item.item_id] ? (
                <p className="mt-2 text-sm text-red-700" role="alert">{errors[item.item_id]}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RecoveryPlanDetails({
  plan,
  dataMode = 'demo',
  readOnly = false,
  onUpdateAdherence,
}) {
  const normalizedPlan = useMemo(() => normalizeRecoveryPlan(plan), [plan])

  if (!normalizedPlan) {
    return <p className="text-sm text-muted">Not provided</p>
  }

  return (
    <div className="space-y-4">
      <section aria-label="Medications">
        <h3 className="text-sm font-semibold text-navy">
          Medications
        </h3>
        {normalizedPlan.medications.length > 0 ? (
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {normalizedPlan.medications.map((medication, index) => (
              <li
                className="rounded-xl border border-line bg-white p-4"
                key={`${medication.name}-${index}`}
              >
                <p className="font-semibold text-navy">{medication.name}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Dose</dt>
                    <dd className="mt-1 text-navy">{medication.dose}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Frequency</dt>
                    <dd className="mt-1 text-navy">{medication.frequency}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Duration</dt>
                    <dd className="mt-1 text-navy">{medication.duration}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Instructions</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-navy">{medication.instructions}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-xl border border-line p-4 text-sm text-muted">
            Not specified
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <RecoveryAdherenceChecklist
          dataMode={dataMode}
          items={normalizedPlan.adherence.items}
          onUpdateAdherence={onUpdateAdherence}
          readOnly={readOnly}
        />
        <InformationList
          items={normalizedPlan.warning_signs}
          title="Warning signs"
        />
        <InformationList items={normalizedPlan.follow_up} title="Follow-up" />
        <InformationList
          emptyText={
            normalizedPlan.has_missing_information
              ? 'No missing information listed.'
              : 'Not specified'
          }
          items={normalizedPlan.missing_information}
          title="Missing information"
        />
      </div>
    </div>
  )
}

export default RecoveryPlanDetails
