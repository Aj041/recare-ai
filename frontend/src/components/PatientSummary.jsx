import { FileText } from 'lucide-react'
import AlertCard from './AlertCard.jsx'
import EmptyState from './EmptyState.jsx'
import RecoveryPlanDetails from './RecoveryPlanDetails.jsx'
import { usePatientData } from '../context/usePatientData.js'
import {
  describeOpaqueValue,
  normalizePatientSummary,
} from '../utils/aiOutputAdapters.js'

function formatDate(value) {
  if (typeof value !== 'string' || !value) {
    return 'Not provided'
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function PatientSummary({ displayedAlertIds = [] }) {
  const {
    dataMode,
    selectedPatient,
    recoveryPlans,
    checkIns,
    patientSummaries,
    hasPatientHistoryChanged,
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
  const summary = normalizePatientSummary(
    selectedPatient ? patientSummaries[selectedPatient.id] : null,
  )
  const recoveryPlan = selectedPatient
    ? recoveryPlans[selectedPatient.id]
    : null
  const historyChanged = selectedPatient
    ? hasPatientHistoryChanged(selectedPatient.id)
    : false
  const displayedAlertIdSet = new Set(displayedAlertIds)
  const summaryAlerts = summary?.active_alerts
  const alertsAlreadyDisplayed = summaryAlerts?.filter(
    (alert) => alert?.alert_id && displayedAlertIdSet.has(alert.alert_id),
  )
  const additionalSummaryAlerts = summaryAlerts?.filter(
    (alert) => !alert?.alert_id || !displayedAlertIdSet.has(alert.alert_id),
  )

  return (
    <section
      aria-labelledby="patient-summary-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
          <FileText aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {dataMode === 'demo' ? 'Selected synthetic profile' : 'Selected live profile'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-summary-title">
            Patient summary
          </h2>
        </div>
      </div>

      {!selectedPatient ? (
        <EmptyState
          description="Select a patient to view its summary details."
          title="No patient selected"
        />
      ) : (
        <>
          <p className="text-lg font-semibold text-navy">
            {selectedPatient.displayName}
          </p>
          <p className="mt-1 text-sm text-muted">Patient ID: {selectedPatient.id}</p>

          {dataMode === 'live' ? (
            <>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-canvas p-4">
                  <dt className="text-sm text-muted">Recorded check-ins</dt>
                  <dd className="mt-2 text-2xl font-semibold text-navy">
                    {patientHistoryStatus === 'loading'
                      ? 'Loading'
                      : patientHistoryStatus === 'error'
                        ? 'Unavailable'
                        : patientCheckIns.length}
                  </dd>
                </div>
                <div className="rounded-xl bg-canvas p-4">
                  <dt className="text-sm text-muted">Latest check-in timestamp</dt>
                  <dd className="mt-2 text-sm font-medium text-navy">
                    {patientHistoryStatus === 'loading'
                      ? 'Loading'
                      : patientHistoryStatus === 'error'
                        ? 'Unavailable'
                        : latestCheckIn?.submitted_at
                          ? formatDate(latestCheckIn.submitted_at)
                          : 'Not provided'}
                  </dd>
                </div>
              </dl>

              {patientHistoryStatus === 'loading' ? (
                <p className="mt-4 text-sm text-muted" role="status">
                  Loading live check-in details...
                </p>
              ) : patientHistoryStatus === 'error' ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950" role="alert">
                  Live check-in details are unavailable: {patientHistoryError}
                </p>
              ) : latestCheckIn ? (
                <section className="mt-5 rounded-xl border border-line p-4">
                  <h3 className="font-semibold text-navy">
                    Latest backend-recorded information
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-navy">
                    <span className="font-semibold">Backend symptoms field:</span>{' '}
                    {latestCheckIn.reported_symptoms || 'Not provided'}
                  </p>
                  {latestCheckIn.notes ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-navy">
                      <span className="font-semibold">Backend notes:</span>{' '}
                      {latestCheckIn.notes}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted">
                    Pain level: {latestCheckIn.pain_score ?? 'Not provided'}
                    {' · '}Medication taken: Not provided by backend
                    {' · '}Temperature:{' '}
                    {latestCheckIn.temperature_c === null ||
                    latestCheckIn.temperature_c === undefined
                      ? 'Not provided'
                      : `${latestCheckIn.temperature_c} °C`}
                  </p>
                </section>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  No live check-ins are recorded for this patient.
                </p>
              )}

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line p-4">
                  <dt className="text-sm font-semibold text-navy">
                    Recovery plan availability
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-muted">
                    Unavailable — no recovery-plan retrieval route is confirmed.
                    Extracted PDF text is not a structured plan.
                  </dd>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <dt className="text-sm font-semibold text-navy">
                    Backend-generated summary
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-muted">
                    Unavailable — no doctor-summary endpoint is confirmed.
                  </dd>
                </div>
                <div className="rounded-xl border border-line p-4 sm:col-span-2">
                  <dt className="text-sm font-semibold text-navy">
                    Explainable AI alerts
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-muted">
                    Unavailable — the current alert route returns ordinary
                    database records, not alert-engine evaluations. No live
                    risk or health conclusion is inferred.
                  </dd>
                </div>
              </dl>
            </>
          ) : (
          <>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-canvas p-4">
              <dt className="text-sm text-muted">Recorded check-ins</dt>
              <dd className="mt-2 text-2xl font-semibold text-navy">
                {patientCheckIns.length}
              </dd>
            </div>
            <div className="rounded-xl bg-canvas p-4">
              <dt className="text-sm text-muted">Latest check-in timestamp</dt>
              <dd className="mt-2 text-sm font-medium text-navy">
                {latestCheckIn ? (
                  <time dateTime={latestCheckIn.submitted_at}>
                    {formatDate(latestCheckIn.submitted_at)}
                  </time>
                ) : (
                  'Not provided'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Latest patient-reported information
              </dt>
              {latestCheckIn ? (
                <dd className="mt-2 rounded-xl border border-line p-4 text-sm leading-6 text-navy">
                  <p className="whitespace-pre-wrap break-words">
                    {latestCheckIn.reported_symptoms || 'Not provided'}
                  </p>
                  <p className="mt-2 text-muted">
                    Pain score: {latestCheckIn.pain_score ?? 'Not provided'}
                    {' · '}Medication taken:{' '}
                    {typeof latestCheckIn.medication_taken === 'boolean'
                      ? latestCheckIn.medication_taken
                        ? 'Yes'
                        : 'No'
                      : 'Not provided'}
                    {' · '}Temperature:{' '}
                    {latestCheckIn.temperature_c === null ||
                    latestCheckIn.temperature_c === undefined
                      ? 'Not provided'
                      : `${latestCheckIn.temperature_c} °C`}
                  </p>
                </dd>
              ) : (
                <dd className="mt-2 text-sm text-muted">Not provided</dd>
              )}
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Recovery plan availability
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy">
                {recoveryPlan
                  ? 'Available — synthetic demo fixture'
                  : 'Not provided'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">Missing fields</dt>
              <dd className="mt-1 text-navy">
                {summary.latest_check_in.missing_fields === null
                  ? 'Not provided'
                  : summary.latest_check_in.missing_fields.length > 0
                    ? summary.latest_check_in.missing_fields.join('; ')
                    : 'No missing fields listed in this summary output.'}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-semibold text-navy">
              Structured summary output
            </h3>
            <p
              className={`mt-1 text-xs leading-5 ${
                historyChanged ? 'font-medium text-amber-900' : 'text-muted'
              }`}
              role={historyChanged ? 'status' : undefined}
            >
              {historyChanged
                ? 'Static synthetic summary and alert fixtures have not been recomputed after this patient’s check-in history changed.'
                : 'Synthetic fixture only. No local AI summary is generated.'}
            </p>

            {!summary ? (
              <p className="mt-4 rounded-xl bg-canvas p-4 text-sm text-muted">
                No structured summary output is available for this patient.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-muted">
                  Summary patient ID: {summary.patient_id || 'Not provided'}
                </p>
                <section className="rounded-xl bg-canvas p-4">
                  <h4 className="text-sm font-semibold text-navy">Overview</h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {summary.overview?.trim() || 'Not provided'}
                  </p>
                </section>

                <section className="rounded-xl border border-line p-4">
                  <h4 className="text-sm font-semibold text-navy">
                    Summary output — latest check-in
                  </h4>
                  {summary.latest_check_in ? (
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted">Date</dt>
                        <dd className="mt-1 text-navy">
                          {formatDate(summary.latest_check_in.date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Pain score</dt>
                        <dd className="mt-1 text-navy">
                          {summary.latest_check_in.pain_score ?? 'Not provided'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted">Reported symptoms</dt>
                        <dd className="mt-1 text-navy">
                          {summary.latest_check_in.symptoms.length > 0
                            ? summary.latest_check_in.symptoms.join(', ')
                            : 'Not provided'}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Not provided</p>
                  )}
                </section>

                <section className="rounded-xl border border-line p-4">
                  <h4 className="text-sm font-semibold text-navy">
                    Discharge information
                  </h4>
                  <div className="mt-3">
                    <RecoveryPlanDetails plan={summary.discharge} />
                  </div>
                </section>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-4">
                    <dt className="text-sm font-semibold text-navy">Trends</dt>
                    <dd className="mt-2 text-sm leading-6 text-muted">
                      {describeOpaqueValue(summary.trends)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-line p-4">
                    <dt className="text-sm font-semibold text-navy">
                      Missing information
                    </dt>
                    <dd className="mt-2 text-sm leading-6 text-muted">
                      {summary.missing_information === null
                        ? 'Not provided'
                        : summary.missing_information.length > 0
                          ? summary.missing_information.join('; ')
                          : 'No missing information listed in this summary output.'}
                    </dd>
                  </div>
                </dl>

                <section>
                  <h4 className="text-sm font-semibold text-navy">
                    Active alerts in summary output
                  </h4>
                  {summary.active_alerts === null ? (
                    <p className="mt-2 text-sm text-muted">Not provided</p>
                  ) : additionalSummaryAlerts.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {additionalSummaryAlerts.map((alert, index) =>
                        alert ? (
                          <AlertCard
                            alert={alert}
                            key={alert.alert_id}
                          />
                        ) : (
                          <p
                            className="rounded-xl bg-canvas p-4 text-sm text-muted"
                            key={`unavailable-summary-alert-${index}`}
                          >
                            Alert details are not available.
                          </p>
                        ),
                      )}
                    </div>
                  ) : alertsAlreadyDisplayed.length > 0 ? (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {alertsAlreadyDisplayed.length} active{' '}
                      {alertsAlreadyDisplayed.length === 1 ? 'alert is' : 'alerts are'}{' '}
                      also in the Explainable demo alerts section.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      No active alerts are listed in this summary output. This
                      does not indicate that the patient is well.
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-line bg-canvas/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Backend-generated summary
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Not connected. The structured information above is a synthetic
              fixture, not a locally generated AI summary.
            </p>
          </div>
          </>
          )}
        </>
      )}
    </section>
  )
}

export default PatientSummary
