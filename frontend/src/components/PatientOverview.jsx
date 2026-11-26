import { ClipboardList, UserRound } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import ErrorState from './ErrorState.jsx'
import LoadingState from './LoadingState.jsx'
import RecoveryPlanDetails from './RecoveryPlanDetails.jsx'
import { usePatientData } from '../context/usePatientData.js'

function PatientOverview() {
  const {
    dataMode,
    selectedPatient,
    recoveryPlans,
    recoveryPlanStatus,
    recoveryPlanError,
    refreshLatestCarePlan,
    checkIns,
    patientHistoryStatus,
    patientHistoryError,
  } = usePatientData()
  const patientCheckIns = selectedPatient
    ? checkIns.filter((checkIn) => checkIn.patient_id === selectedPatient.id)
    : []
  const latestCheckIn = patientCheckIns.reduce((latest, checkIn) => {
    if (!latest || checkIn.submitted_at > latest.submitted_at) {
      return checkIn
    }

    return latest
  }, null)
  const recoveryPlan = selectedPatient
    ? recoveryPlans[selectedPatient.id]
    : null

  return (
    <section
      aria-labelledby="patient-overview-title"
      className="surface-panel rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-blue-light text-blue">
          <UserRound aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {dataMode === 'demo' ? 'Selected synthetic profile' : 'Selected live profile'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-overview-title">
            Patient overview
          </h2>
        </div>
      </div>

      {!selectedPatient ? (
        <EmptyState
          description="Select a patient from the shared patient list."
          title="No patient selected"
        />
      ) : (
        <>
          <div className="surface-quiet p-4">
            <p className="text-lg font-semibold text-navy">
              {selectedPatient.displayName}
            </p>
            <p className="mt-1 text-sm text-muted">Patient ID: {selectedPatient.id}</p>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2">
              <ClipboardList aria-hidden="true" className="text-teal-dark" size={18} />
              <h3 className="font-semibold text-navy">Available recovery plan</h3>
            </div>
            {dataMode === 'live' && !recoveryPlan ? (
              <div className="mt-2 space-y-2 text-sm leading-6 text-muted">
                <p>
                  {recoveryPlanStatus === 'loading' || recoveryPlanStatus === 'idle'
                    ? 'Loading the saved recovery plan…'
                    : recoveryPlanStatus === 'error'
                      ? recoveryPlanError
                      : 'No saved recovery plan is available.'}
                </p>
                {recoveryPlanStatus === 'error' ? (
                  <button
                    className="min-h-9 rounded-full border border-line px-3 text-sm font-semibold text-navy"
                    onClick={() => refreshLatestCarePlan(selectedPatient.id)}
                    type="button"
                  >
                    Retry recovery plan
                  </button>
                ) : null}
              </div>
            ) : recoveryPlan ? (
              <>
                <p className="mt-2 text-xs font-medium text-muted">
                  {dataMode === 'demo'
                    ? 'Synthetic demo fixture. Not a clinical recommendation.'
                    : 'Patient-reported adherence shown read-only.'}
                </p>
                <div className="mt-3">
                  <RecoveryPlanDetails
                    dataMode={dataMode}
                    plan={recoveryPlan}
                    readOnly
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Not provided</p>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <h3 className="font-semibold text-navy">Latest patient-reported check-in</h3>
            {patientHistoryStatus === 'loading' ? (
              <div className="mt-3">
                <LoadingState message="Loading selected patient history..." />
              </div>
            ) : patientHistoryStatus === 'error' ? (
              <div className="mt-3">
                <ErrorState
                  description={patientHistoryError}
                  title="Latest check-in unavailable"
                />
              </div>
            ) : !latestCheckIn ? (
              <p className="mt-3 text-sm text-muted">No check-ins recorded.</p>
            ) : (
              <>
                <div className="surface-quiet mt-3 space-y-2 p-4 text-sm leading-6 text-navy">
                  <p className="whitespace-pre-wrap break-words">
                    <span className="font-semibold">
                      {dataMode === 'live'
                        ? 'Backend symptoms field:'
                        : 'Reported symptoms:'}
                    </span>{' '}
                    {latestCheckIn.reported_symptoms || 'Not provided'}
                  </p>
                  {dataMode === 'live' && latestCheckIn.notes ? (
                    <p className="whitespace-pre-wrap break-words">
                      <span className="font-semibold">Backend notes:</span>{' '}
                      {latestCheckIn.notes}
                    </p>
                  ) : null}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted">Pain score</dt>
                    <dd className="mt-1 text-sm font-medium text-navy">
                      {latestCheckIn.pain_score ?? 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Medication taken</dt>
                    <dd className="mt-1 text-sm font-medium text-navy">
                      {typeof latestCheckIn.medication_taken === 'boolean'
                        ? latestCheckIn.medication_taken
                          ? 'Yes'
                          : 'No'
                        : 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Temperature</dt>
                    <dd className="mt-1 text-sm font-medium text-navy">
                      {latestCheckIn.temperature_c === null ||
                      latestCheckIn.temperature_c === undefined
                        ? 'Not provided'
                        : `${latestCheckIn.temperature_c} °C`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Latest check-in</dt>
                    <dd className="mt-1 text-sm font-medium text-navy">
                      <time dateTime={latestCheckIn.submitted_at}>
                        {new Date(latestCheckIn.submitted_at).toLocaleString()}
                      </time>
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default PatientOverview
