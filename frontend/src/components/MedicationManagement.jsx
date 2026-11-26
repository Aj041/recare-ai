import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, LoaderCircle, Pencil, X } from 'lucide-react'
import { apiService } from '../services/api.js'
import { useDoctorAuth } from '../context/useDoctorAuth.js'
import { usePatientData } from '../context/usePatientData.js'
import DoctorLogin from './DoctorLogin.jsx'

function formatDate(value) {
  if (typeof value !== 'string' || !value) return 'Not recorded'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function MedicationManagement() {
  const {
    dataMode,
    selectedPatient,
    recoveryPlans,
    refreshLatestCarePlan,
  } = usePatientData()
  const { accessToken, isAuthenticated, logout } = useDoctorAuth()
  const [medicationData, setMedicationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedPlan = selectedPatient
    ? recoveryPlans[selectedPatient.id]
    : null
  const knownCarePlanId = selectedPlan?.care_plan_id
  const requestOptions = useMemo(() => ({ onUnauthorized: logout }), [logout])

  const load = useCallback(async () => {
    if (!isAuthenticated || dataMode !== 'live' || !selectedPatient) {
      setMedicationData(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const current = knownCarePlanId
        ? { care_plan_id: knownCarePlanId }
        : await apiService.getCurrentMedications(selectedPatient.id, requestOptions)
      if (!current) {
        setMedicationData(null)
        return
      }
      const response = await apiService.getDoctorMedications(
        selectedPatient.id,
        current.care_plan_id,
        accessToken,
        requestOptions,
      )
      setMedicationData(response)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Medication details could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    dataMode,
    isAuthenticated,
    knownCarePlanId,
    requestOptions,
    selectedPatient,
  ])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) load()
    })
    return () => {
      active = false
    }
  }, [load])

  function beginEdit(medication) {
    setEditingId(medication.medication_id)
    setDraft({
      dosage: medication.dosage,
      frequency: medication.frequency,
      duration: medication.duration,
      instructions: medication.instructions,
      reason: '',
    })
    setConfirmation(null)
    setSuccess('')
    setError('')
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function requestConfirmation(event, medication) {
    event.preventDefault()
    if (!draft) return
    const fields = ['dosage', 'frequency', 'duration', 'instructions', 'reason']
    if (fields.some((field) => !draft[field]?.trim())) {
      setError('Dosage, frequency, duration, instructions, and a reason are required.')
      return
    }
    setError('')
    setConfirmation({ medication, payload: { ...draft } })
  }

  async function confirmUpdate() {
    if (!confirmation || !selectedPatient || !medicationData || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await apiService.updateDoctorMedication(
        selectedPatient.id,
        medicationData.care_plan_id,
        confirmation.medication.medication_id,
        accessToken,
        { ...confirmation.payload, confirmed: true },
        requestOptions,
      )
      setMedicationData(response)
      setConfirmation(null)
      setEditingId(null)
      setDraft(null)
      setSuccess(`Saved the doctor-authorized update for ${confirmation.medication.name}.`)
      await refreshLatestCarePlan(selectedPatient.id)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Medication update could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      aria-labelledby="medication-management-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-dark">
            Doctor-authorized medication records
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="medication-management-title">
            Medication updates and history
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Updates require a reason and explicit confirmation. The AI and patient portal cannot modify medication details.
          </p>
        </div>
        {isAuthenticated && selectedPatient ? (
          <button
            className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas"
            disabled={loading || saving}
            onClick={load}
            type="button"
          >
            Refresh medications
          </button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <div className="mt-5">
          <DoctorLogin />
        </div>
      ) : dataMode !== 'live' ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
          Medication records are available only for LIVE backend patients. Demo medications are read-only fixtures.
        </p>
      ) : !selectedPatient ? (
        <p className="mt-5 rounded-xl border border-line bg-canvas p-4 text-sm text-muted" role="status">
          Select a live patient to review medication details.
        </p>
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            Patient: <span className="font-semibold text-navy">{selectedPatient.displayName}</span> · ID {selectedPatient.id}
          </p>
          {loading ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted" role="status">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Loading medications…
            </p>
          ) : null}
          {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950" role="alert">{error}</p> : null}
          {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">{success}</p> : null}

          {!loading && medicationData?.medications?.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-muted">
              No documented medications are available in this care plan.
            </p>
          ) : null}
          <ul className="mt-5 space-y-4">
            {medicationData?.medications?.map((medication) => (
              <li className="rounded-xl border border-line p-4" key={medication.medication_id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-navy">{medication.name}</h3>
                    <p className="mt-1 text-sm text-muted">Current documented medication details</p>
                  </div>
                  {editingId !== medication.medication_id ? (
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas"
                      disabled={saving}
                      onClick={() => beginEdit(medication)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={15} /> Edit details
                    </button>
                  ) : null}
                </div>
                {editingId === medication.medication_id && draft ? (
                  <form className="mt-4 grid gap-3" onSubmit={(event) => requestConfirmation(event, medication)}>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ['dosage', 'Dosage'],
                        ['frequency', 'Frequency'],
                        ['duration', 'Duration'],
                      ].map(([field, label]) => (
                        <label className="text-xs font-semibold text-navy" key={field}>
                          {label}
                          <input
                            className="mt-1 block min-h-10 w-full rounded-lg border border-line px-3 text-sm font-normal"
                            onChange={(event) => updateDraft(field, event.target.value)}
                            required
                            value={draft[field]}
                          />
                        </label>
                      ))}
                    </div>
                    <label className="text-xs font-semibold text-navy">
                      Instructions
                      <textarea
                        className="mt-1 block min-h-20 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                        onChange={(event) => updateDraft('instructions', event.target.value)}
                        required
                        value={draft.instructions}
                      />
                    </label>
                    <label className="text-xs font-semibold text-navy">
                      Reason for change
                      <textarea
                        className="mt-1 block min-h-20 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                        onChange={(event) => updateDraft('reason', event.target.value)}
                        required
                        value={draft.reason}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button className="min-h-10 rounded-full bg-teal px-4 text-sm font-semibold text-white" type="submit">
                        Review update
                      </button>
                      <button
                        className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy"
                        onClick={() => { setEditingId(null); setDraft(null); setConfirmation(null) }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs text-muted">Dosage</dt><dd className="mt-1 text-navy">{medication.dosage}</dd></div>
                    <div><dt className="text-xs text-muted">Frequency</dt><dd className="mt-1 text-navy">{medication.frequency}</dd></div>
                    <div><dt className="text-xs text-muted">Duration</dt><dd className="mt-1 text-navy">{medication.duration}</dd></div>
                    <div className="sm:col-span-3"><dt className="text-xs text-muted">Instructions</dt><dd className="mt-1 whitespace-pre-wrap text-navy">{medication.instructions}</dd></div>
                  </dl>
                )}
              </li>
            ))}
          </ul>

          {confirmation ? (
            <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4" aria-live="polite">
              <h3 className="font-semibold text-amber-950">Confirm medication update</h3>
              <p className="mt-1 text-sm leading-6 text-amber-950">
                Save the updated details for {confirmation.medication.name} with the documented reason? This creates a permanent history record.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={saving}
                  onClick={confirmUpdate}
                  type="button"
                >
                  {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Check aria-hidden="true" size={15} />}
                  Confirm and save
                </button>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-300 px-4 text-sm font-semibold text-amber-950"
                  disabled={saving}
                  onClick={() => setConfirmation(null)}
                  type="button"
                >
                  <X aria-hidden="true" size={15} /> Return to editing
                </button>
              </div>
            </section>
          ) : null}

          <section className="mt-7" aria-labelledby="medication-history-title">
            <h3 className="font-semibold text-navy" id="medication-history-title">Modification history</h3>
            {medicationData?.history?.length ? (
              <ol className="mt-3 space-y-3">
                {medicationData.history.map((entry) => (
                  <li className="rounded-xl border border-line bg-canvas p-4" key={entry.id}>
                    <p className="font-semibold text-navy">{entry.medication_name}</p>
                    <p className="mt-1 text-sm text-muted">Updated by {entry.doctor_email} · {formatDate(entry.created_at)}</p>
                    <p className="mt-2 text-sm leading-6 text-navy"><span className="font-semibold">Reason:</span> {entry.reason}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Dosage: {entry.previous_details.dosage} → {entry.updated_details.dosage}; frequency: {entry.previous_details.frequency} → {entry.updated_details.frequency}; duration: {entry.previous_details.duration} → {entry.updated_details.duration}.
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-muted">
                No doctor-authorized medication modifications have been recorded for this care plan.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default MedicationManagement
