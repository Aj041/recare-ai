import { History } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import { usePatientData } from '../context/usePatientData.js'

function PatientHistory() {
  const { checkIns, selectedPatient } = usePatientData()
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

      {patientCheckIns.length === 0 ? (
        <EmptyState
          description="Submitted synthetic check-ins will appear here."
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
                <time
                  className="text-sm font-semibold text-navy"
                  dateTime={checkIn.submitted_at}
                >
                  {new Date(checkIn.submitted_at).toLocaleString()}
                </time>
                <span className="rounded-full bg-teal-light px-2.5 py-1 text-xs font-semibold text-teal-dark">
                  Demo entry
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                {checkIn.reported_symptoms || 'Not provided'}
              </p>
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
        Demo history is held in memory and clears when the page is reloaded.
      </p>
    </section>
  )
}

export default PatientHistory
