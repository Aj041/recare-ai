import { History } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import ErrorState from './ErrorState.jsx'
import LoadingState from './LoadingState.jsx'
import { usePatientData } from '../context/usePatientData.js'

function PatientHistory() {
  const {
    dataMode,
    checkIns,
    selectedPatient,
    patientHistoryStatus,
    patientHistoryError,
  } = usePatientData()
  const patientCheckIns = selectedPatient
    ? checkIns
        .filter((checkIn) => checkIn.patient_id === selectedPatient.id)
        .slice()
        .sort(
          (first, second) =>
            new Date(first.submitted_at) - new Date(second.submitted_at),
        )
    : []

  return (
    <section
      aria-labelledby="patient-history-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
          <History aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {selectedPatient ? selectedPatient.displayName : 'Patient not selected'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-history-title">
            Patient check-in history
          </h2>
        </div>
      </div>

      {!selectedPatient ? (
        <EmptyState
          description="Select a patient to view its check-in history."
          title="No patient selected"
        />
      ) : patientHistoryStatus === 'loading' ? (
        <LoadingState message="Loading patient history..." />
      ) : patientHistoryStatus === 'error' ? (
        <ErrorState
          description={patientHistoryError}
          title="Patient history unavailable"
        />
      ) : patientCheckIns.length === 0 ? (
        <EmptyState
          description={
            dataMode === 'demo'
              ? 'Submitted synthetic check-ins will appear here.'
              : 'No live check-ins are recorded for this patient.'
          }
          title="No check-ins yet"
        />
      ) : (
        <ol className="space-y-3">
          {patientCheckIns.map((checkIn) => (
            <li
              className="rounded-xl border border-line bg-white p-4"
              key={checkIn.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {checkIn.submitted_at &&
                !Number.isNaN(new Date(checkIn.submitted_at).getTime()) ? (
                  <time
                    className="text-sm font-semibold text-navy"
                    dateTime={checkIn.submitted_at}
                  >
                    {new Date(checkIn.submitted_at).toLocaleString()}
                  </time>
                ) : (
                  <span className="text-sm font-semibold text-muted">
                    Timestamp not provided
                  </span>
                )}
                <span className="rounded-full bg-teal-light px-2.5 py-1 text-xs font-semibold text-teal-dark">
                  {dataMode === 'demo' ? 'Demo entry' : 'Live backend record'}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                {dataMode === 'live' ? (
                  <>
                    <span className="font-semibold text-navy">
                      Backend symptoms field:
                    </span>{' '}
                    {checkIn.reported_symptoms || 'Not provided'}
                  </>
                ) : (
                  checkIn.reported_symptoms || 'Not provided'
                )}
              </p>
              {dataMode === 'live' && checkIn.notes ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                  <span className="font-semibold text-navy">Backend notes:</span>{' '}
                  {checkIn.notes}
                </p>
              ) : null}
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Pain score</dt>
                  <dd className="mt-1 font-medium text-navy">
                    {checkIn.pain_score ?? 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Medication taken</dt>
                  <dd className="mt-1 font-medium text-navy">
                    {typeof checkIn.medication_taken === 'boolean'
                      ? checkIn.medication_taken
                        ? 'Yes'
                        : 'No'
                      : 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Temperature</dt>
                  <dd className="mt-1 font-medium text-navy">
                    {checkIn.temperature_c === null ||
                    checkIn.temperature_c === undefined
                      ? 'Not provided'
                      : `${checkIn.temperature_c} °C`}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs leading-5 text-muted">
        {dataMode === 'demo'
          ? 'Demo history is held in memory and clears when the page is reloaded.'
          : 'Live history is retrieved from the backend. Medication-taking data is not provided by this contract.'}
      </p>
    </section>
  )
}

export default PatientHistory
