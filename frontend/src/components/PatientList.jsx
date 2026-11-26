import { useState } from 'react'
import { CircleUserRound, Search } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import ErrorState from './ErrorState.jsx'
import LoadingState from './LoadingState.jsx'
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
    dataMode,
    patients,
    selectedPatientId,
    checkIns,
    alertEvaluations,
    patientListStatus,
    patientListError,
    patientHistoryStatus,
    selectPatient,
    refreshLivePatients,
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
      className="surface-panel rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-blue-light text-blue">
          <CircleUserRound aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {dataMode === 'demo' ? 'Shared synthetic profiles' : 'Backend patient records'}
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
          className="field-control min-h-11 w-full pl-10 pr-3 placeholder:text-muted"
          id="patient-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search name or patient ID"
          type="search"
          value={searchTerm}
        />
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-muted">
        {filteredPatients.length} of {patients.length}{' '}
        {dataMode === 'demo' ? 'demo patients' : 'live patients'}
      </p>

      {dataMode === 'live' &&
      ['idle', 'loading'].includes(patientListStatus) ? (
        <div className="mt-4">
          <LoadingState message="Loading live patient list..." />
        </div>
      ) : patientListStatus === 'error' ? (
        <div className="mt-4 space-y-3">
          <ErrorState
            description={patientListError}
            title="Patient list unavailable"
          />
          {dataMode === 'live' ? (
            <button
              className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              onClick={() => refreshLivePatients()}
              type="button"
            >
              Retry patient list
            </button>
          ) : null}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            description={
              patients.length === 0 && dataMode === 'live'
                ? 'Register a live patient in the Patient Portal. Demo profiles are not included.'
                : 'Try another patient name or ID.'
            }
            title={
              patients.length === 0 && dataMode === 'live'
                ? 'No live patients yet'
                : 'No patients match this search'
            }
          />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-line/70">
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
            const historyWasLoaded =
              dataMode === 'demo' || isSelected
            const latestCheckInLabel =
              dataMode === 'live' && !historyWasLoaded
                ? 'Select patient to load'
                : isSelected && patientHistoryStatus === 'loading'
                  ? 'Loading history...'
                  : isSelected && patientHistoryStatus === 'error'
                    ? 'History unavailable'
                    : latestCheckIn
                      ? new Date(latestCheckIn.submitted_at).toLocaleString()
                      : 'No recorded check-ins'
            const liveReviewStatus =
              dataMode === 'live'
                ? 'AI evaluation unavailable'
                : reviewStatus

            return (
              <li className="py-2 first:pt-1 last:pb-1" key={patient.id}>
                <button
                  aria-pressed={isSelected}
                  className={`flex min-h-20 w-full flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                    isSelected ? 'bg-teal-light/70 ring-1 ring-inset ring-teal/20' : 'hover:bg-canvas'
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
                    {latestCheckIn && historyWasLoaded ? (
                      <time
                        className="mt-1 block text-sm text-navy"
                        dateTime={latestCheckIn.submitted_at}
                      >
                        {new Date(latestCheckIn.submitted_at).toLocaleString()}
                      </time>
                    ) : (
                      <span className="mt-1 block text-sm text-muted">
                        {latestCheckInLabel}
                      </span>
                    )}
                    <span
                      className={`status-chip mt-2 ${
                        evaluation.state === 'alerts_returned'
                          ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                          : 'bg-blue-light text-blue'
                      }`}
                    >
                      {liveReviewStatus}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-4 text-xs leading-5 text-muted">
        {dataMode === 'demo'
          ? 'Evaluation labels reflect only static synthetic fixtures. An unavailable evaluation or an evaluation with no alerts is not a health assessment.'
          : 'Live patient records do not include explainable AI evaluations. An unavailable evaluation is not a health assessment.'}
      </p>
    </section>
  )
}

export default PatientList
