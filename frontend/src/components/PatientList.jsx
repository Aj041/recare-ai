import { useState } from 'react'
import { CircleUserRound, Search } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import { usePatientData } from '../context/usePatientData.js'
import { normalizeAlertEvaluation } from '../utils/aiOutputAdapters.js'

function getLatestCheckIn(checkIns, patientId) {
  return checkIns
    .filter((checkIn) => checkIn.patient_id === patientId)
    .reduce((latest, checkIn) => {
      if (!latest || checkIn.submitted_at > latest.submitted_at) {
        return checkIn
      }

      return latest
    }, null)
}

function PatientList() {
  const {
    patients,
    selectedPatientId,
    checkIns,
    alertEvaluations,
    selectPatient,
  } = usePatientData()
  const [searchTerm, setSearchTerm] = useState('')
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredPatients = patients.filter((patient) =>
    `${patient.displayName} ${patient.id}`
      .toLowerCase()
      .includes(normalizedSearch),
  )

  return (
    <section
      aria-labelledby="patient-list-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
          <CircleUserRound aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Shared synthetic profiles
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-list-title">
            Patient list
          </h2>
        </div>
      </div>

      <label className="sr-only" htmlFor="patient-search">
        Search patients by name or ID
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          size={18}
        />
        <input
          autoComplete="off"
          className="min-h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-navy placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          id="patient-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search name or patient ID"
          type="search"
          value={searchTerm}
        />
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-muted">
        {filteredPatients.length} of {patients.length} demo patients
      </p>

      {filteredPatients.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            description="Try another patient name or ID."
            title="No patients match this search"
          />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {filteredPatients.map((patient) => {
            const latestCheckIn = getLatestCheckIn(checkIns, patient.id)
            const evaluation = normalizeAlertEvaluation(
              alertEvaluations[patient.id],
            )
            const reviewStatus = {
              alerts_returned: 'Review suggested',
              insufficient_history: 'Insufficient history',
              completed_no_alerts: 'Evaluation completed · no alerts',
              unavailable: 'Evaluation unavailable',
            }[evaluation.state]
            const isSelected = patient.id === selectedPatientId

            return (
              <li className="py-2 first:pt-1 last:pb-1" key={patient.id}>
                <button
                  aria-pressed={isSelected}
                  className={`flex min-h-20 w-full flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                    isSelected ? 'bg-teal-light/70' : 'hover:bg-canvas'
                  }`}
                  onClick={() => selectPatient(patient.id)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy">
                      {patient.displayName}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      ID: {patient.id}
                    </span>
                  </span>
                  <span className="text-left sm:text-right">
                    <span className="block text-xs font-medium text-muted">
                      Latest check-in
                    </span>
                    {latestCheckIn ? (
                      <time
                        className="mt-1 block text-sm text-navy"
                        dateTime={latestCheckIn.submitted_at}
                      >
                        {new Date(latestCheckIn.submitted_at).toLocaleString()}
                      </time>
                    ) : (
                      <span className="mt-1 block text-sm text-muted">
                        Not provided
                      </span>
                    )}
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        evaluation.state === 'alerts_returned'
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-canvas text-muted'
                      }`}
                    >
                      {reviewStatus}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-4 text-xs leading-5 text-muted">
        Evaluation labels reflect only static synthetic fixtures. An unavailable
        evaluation or an evaluation with no alerts is not a health assessment.
      </p>
    </section>
  )
}

export default PatientList
