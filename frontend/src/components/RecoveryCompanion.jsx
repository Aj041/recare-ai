import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CircleAlert, LoaderCircle, Play, ShieldCheck, X } from 'lucide-react'
import { apiService } from '../services/api.js'
import { useDoctorAuth } from '../context/useDoctorAuth.js'
import { usePatientData } from '../context/usePatientData.js'
import DoctorLogin from './DoctorLogin.jsx'

const statusStyle = {
  pending: 'bg-amber-50 text-amber-900 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-900 ring-rose-200',
}

function decodeList(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [value]
  }
}

function buildEvidenceMap(historyResponse, planResponse, alertsResponse) {
  const evidence = {}
  for (const record of historyResponse?.history ?? []) {
    evidence[`checkin:${record.id}`] = {
      evidence_id: `checkin:${record.id}`,
      record_type: 'patient_check_in',
      date: typeof record.created_at === 'string' ? record.created_at.slice(0, 10) : null,
      pain_level: record.pain_level,
      symptoms: decodeList(record.symptoms),
      reported_symptoms: record.reported_symptoms,
      notes: record.notes,
    }
  }
  const carePlanId = planResponse?.care_plan_id
  const structuredPlan = planResponse?.structured_plan
  if (carePlanId !== undefined && structuredPlan) {
    const { adherence, ...documentedPlan } = structuredPlan
    evidence[`care_plan:${carePlanId}`] = {
      evidence_id: `care_plan:${carePlanId}`,
      record_type: 'discharge_plan',
      care_plan_id: carePlanId,
      plan: documentedPlan,
    }
    for (const item of adherence?.items ?? []) {
      const id = `adherence:${carePlanId}:${item.item_id}`
      evidence[id] = {
        evidence_id: id,
        record_type: 'patient_reported_adherence',
        care_plan_id: carePlanId,
        item_id: item.item_id,
        instruction: item.instruction,
        status: item.status,
        reported_at: item.reported_at,
        patient_note: item.patient_note,
      }
    }
  }
  for (const alert of alertsResponse?.alerts ?? []) {
    evidence[`alert:${alert.id}`] = {
      evidence_id: `alert:${alert.id}`,
      record_type: 'existing_alert',
      alert_id: alert.id,
      severity: alert.severity,
      message: alert.message,
      rule_triggered: alert.rule_triggered,
      supporting_check_ins: alert.supporting_check_ins ?? [],
      created_at: alert.created_at,
    }
  }
  return evidence
}

function EvidenceList({ references, evidenceById }) {
  if (!references?.length) {
    return <p className="mt-3 text-sm text-muted">No supporting record was returned.</p>
  }

  return (
    <div className="mt-3 space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted">Supporting evidence</h4>
      {references.map((reference) => {
        const record = evidenceById[reference]
        return (
          <details className="rounded-lg border border-line bg-canvas p-3" key={reference}>
            <summary className="cursor-pointer text-sm font-semibold text-navy">
              {record?.record_type?.replaceAll('_', ' ') ?? 'Source record'} · {reference}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted">
              {record
                ? JSON.stringify(record, null, 2)
                : 'This stored observation references the record above. Its snapshot is not available in the current API response.'}
            </pre>
          </details>
        )
      })}
    </div>
  )
}

function RecoveryCompanion() {
  const { dataMode, selectedPatient } = usePatientData()
  const { accessToken, isAuthenticated, logout } = useDoctorAuth()
  const [observations, setObservations] = useState([])
  const [tasks, setTasks] = useState([])
  const [evidenceById, setEvidenceById] = useState({})
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [running, setRunning] = useState(false)
  const [reviewingTaskId, setReviewingTaskId] = useState(null)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const unauthorizedOptions = useMemo(
    () => ({ onUnauthorized: logout }),
    [logout],
  )

  const loadRecords = useCallback(async () => {
    const patientId = selectedPatient?.id
    if (!isAuthenticated || dataMode !== 'live' || patientId === null || patientId === undefined) {
      setObservations([])
      setTasks([])
      setEvidenceById({})
      return
    }

    setLoadingRecords(true)
    setError('')
    setConfirmation('')
    const headers = { Authorization: `Bearer ${accessToken}` }
    try {
      const [nextObservations, nextTasks] = await Promise.all([
        apiService.getRecoveryAgentObservations(patientId, accessToken, unauthorizedOptions),
        apiService.getRecoveryAgentTasks(patientId, accessToken, unauthorizedOptions),
      ])
      setObservations(nextObservations)
      setTasks(nextTasks)

      const evidenceResults = await Promise.allSettled([
        apiService.getPatientHistory(patientId, { ...unauthorizedOptions, headers }),
        apiService.getLatestCarePlanAdherence(patientId, { ...unauthorizedOptions, headers }),
        apiService.getPatientAlerts(patientId, { ...unauthorizedOptions, headers }),
      ])
      const [history, plan, alerts] = evidenceResults.map((result) =>
        result.status === 'fulfilled' ? result.value : null,
      )
      setEvidenceById(buildEvidenceMap(history, plan, alerts))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Recovery Companion data could not be loaded.')
    } finally {
      setLoadingRecords(false)
    }
  }, [
    accessToken,
    dataMode,
    isAuthenticated,
    selectedPatient?.id,
    unauthorizedOptions,
  ])

  useEffect(() => {
    let current = true
    Promise.resolve().then(() => {
      if (current) loadRecords()
    })
    return () => {
      current = false
    }
  }, [loadRecords])

  async function runAgent() {
    if (!selectedPatient || !accessToken || running) return
    setRunning(true)
    setError('')
    setConfirmation('')
    try {
      const result = await apiService.runRecoveryAgent(
        selectedPatient.id,
        accessToken,
        unauthorizedOptions,
      )
      setObservations(result.observations ?? [])
      setTasks(result.proposed_tasks ?? [])
      setEvidenceById(Object.fromEntries(
        (result.evidence ?? []).map((record) => [record.evidence_id, record]),
      ))
      setConfirmation(
        `Agent run complete. ${result.observations?.length ?? 0} observation(s) and ${result.proposed_tasks?.length ?? 0} proposed task(s) are available for doctor review.`,
      )
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'The Recovery Companion run failed.')
    } finally {
      setRunning(false)
    }
  }

  async function reviewTask(task, decision) {
    if (!selectedPatient || !accessToken || reviewingTaskId !== null) return
    setReviewingTaskId(task.id)
    setError('')
    setConfirmation('')
    try {
      const review = decision === 'approved'
        ? await apiService.approveRecoveryAgentTask(
            selectedPatient.id,
            task.id,
            accessToken,
            {},
            unauthorizedOptions,
          )
        : await apiService.rejectRecoveryAgentTask(
            selectedPatient.id,
            task.id,
            accessToken,
            {},
            unauthorizedOptions,
          )
      setTasks((current) => current.map((item) => item.id === review.id ? review : item))
      setConfirmation(`Task “${review.title}” was ${decision}.`)
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'The doctor review could not be saved.')
    } finally {
      setReviewingTaskId(null)
    }
  }

  return (
    <section
      aria-labelledby="recovery-companion-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-dark">
            Supervised recovery intelligence
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="recovery-companion-title">
            Recovery Companion
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Agent outputs are evidence-linked suggestions for doctor review. No clinical action is performed automatically.
          </p>
        </div>
        {isAuthenticated ? (
          <button
            className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas"
            onClick={logout}
            type="button"
          >
            Doctor logout
          </button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <div className="mt-5">
          <DoctorLogin />
        </div>
      ) : dataMode !== 'live' ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
          Select LIVE mode to run the agent against backend patient records. Synthetic demo fixtures are not sent to the agent.
        </p>
      ) : !selectedPatient ? (
        <p className="mt-5 rounded-xl border border-line bg-canvas p-4 text-sm text-muted" role="status">
          Select a live patient to load Recovery Companion records.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">
              Patient: <span className="font-semibold text-navy">{selectedPatient.displayName}</span> · ID {selectedPatient.id}
            </p>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-teal px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              disabled={running || loadingRecords}
              onClick={runAgent}
              type="button"
            >
              {running ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Play aria-hidden="true" size={16} />}
              {running ? 'Running agent…' : 'Run Agent'}
            </button>
            <button
              className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas disabled:opacity-60"
              disabled={loadingRecords || running}
              onClick={loadRecords}
              type="button"
            >
              Refresh
            </button>
          </div>

          {loadingRecords ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted" role="status">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Loading agent observations and tasks…
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950" role="alert">
              <CircleAlert aria-hidden="true" className="mr-2 inline" size={17} />{error}
            </p>
          ) : null}
          {confirmation ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950" role="status">
              <ShieldCheck aria-hidden="true" className="mr-2 inline" size={17} />{confirmation}
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section aria-labelledby="companion-observations-title">
              <h3 className="font-semibold text-navy" id="companion-observations-title">Observations</h3>
              {observations.length === 0 && !loadingRecords ? (
                <p className="mt-3 rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-muted">
                  No observations are stored for this patient yet. Run the agent to review current records.
                </p>
              ) : null}
              <ul className="mt-3 space-y-3">
                {observations.map((observation) => (
                  <li className="rounded-xl border border-line p-4" key={observation.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-navy">{observation.title}</h4>
                      <span className="rounded-full bg-teal-light px-3 py-1 text-xs font-semibold text-teal-dark">
                        {observation.source === 'system_generated' ? 'Deterministic system observation' : 'AI-generated observation'}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{observation.description}</p>
                    <EvidenceList evidenceById={evidenceById} references={observation.evidence_refs} />
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="companion-tasks-title">
              <h3 className="font-semibold text-navy" id="companion-tasks-title">Proposed follow-up tasks</h3>
              {tasks.length === 0 && !loadingRecords ? (
                <p className="mt-3 rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-muted">
                  No proposed tasks are stored for this patient.
                </p>
              ) : null}
              <ul className="mt-3 space-y-3">
                {tasks.map((task) => (
                  <li className="rounded-xl border border-line p-4" key={task.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-navy">{task.title}</h4>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusStyle[task.status] ?? statusStyle.pending}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-navy">{task.description}</p>
                    <p className="mt-2 text-sm leading-6 text-muted"><span className="font-semibold text-navy">Reason:</span> {task.reason}</p>
                    {task.reviewed_at ? (
                      <p className="mt-2 text-xs text-muted">
                        Reviewed by {task.reviewed_by || 'doctor'} · {new Date(task.reviewed_at).toLocaleString()}
                        {task.review_note ? ` · ${task.review_note}` : ''}
                      </p>
                    ) : null}
                    <EvidenceList evidenceById={evidenceById} references={task.evidence_refs} />
                    {task.status === 'pending' ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                          disabled={reviewingTaskId !== null}
                          onClick={() => reviewTask(task, 'approved')}
                          type="button"
                        >
                          {reviewingTaskId === task.id ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Check aria-hidden="true" size={15} />}
                          Approve
                        </button>
                        <button
                          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-rose-300 px-4 text-sm font-semibold text-rose-900 disabled:opacity-50"
                          disabled={reviewingTaskId !== null}
                          onClick={() => reviewTask(task, 'rejected')}
                          type="button"
                        >
                          {reviewingTaskId === task.id ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <X aria-hidden="true" size={15} />}
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </section>
  )
}

export default RecoveryCompanion
